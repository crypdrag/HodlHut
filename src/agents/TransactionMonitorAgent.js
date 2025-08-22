// TransactionMonitorAgent.js - Multi-Chain Transaction Monitoring Agent
const axios = require('axios');

class TransactionMonitorAgent {
  constructor(environment = 'development') {
    this.environment = environment;
    this.activeOperations = new Map(); // operationId -> operation details
    this.monitoringInterval = 5000; // Check every 5 seconds
    this.maxRetries = 10;
    this.timeoutThresholds = {
      bitcoin: 3600000,    // 1 hour timeout
      ethereum: 1800000,   // 30 minutes timeout
      solana: 300000,      // 5 minutes timeout
      dex: 60000          // 1 minute timeout
    };
    
    this.initializeMonitoring();
  }

  // Initialize background monitoring
  initializeMonitoring() {
    this.monitoringActive = true;
    this.startMonitoringLoop();
  }

  // ===================================================================
  // OPERATION TRACKING METHODS
  // ===================================================================

  // Start tracking a new multi-step operation
  async startOperation(operationParams) {
    try {
      const { 
        operationType, 
        steps = [], 
        userPrincipal, 
        totalAmount, 
        fromAsset, 
        toAsset,
        metadata = {}
      } = operationParams || {};

      // Validate required parameters
      if (!operationType) {
        throw new Error('operationType is required');
      }
      if (!userPrincipal) {
        throw new Error('userPrincipal is required');
      }
      if (!steps || steps.length === 0) {
        throw new Error('steps array is required and must not be empty');
      }

      const operationId = this.generateOperationId();
      const operation = {
        id: operationId,
        type: operationType, // 'deposit', 'swap', 'withdrawal', 'hub_routing'
        status: 'initiated',
        userPrincipal: userPrincipal,
        fromAsset: fromAsset || 'unknown',
        toAsset: toAsset || 'unknown',
        totalAmount: totalAmount || 0,
        steps: steps.map((step, index) => ({
          stepIndex: index,
          type: step.type || 'unknown',
          network: step.network || 'unknown',
          estimatedTime: step.estimatedTime || '1 minute',
          ...step,
          status: 'pending',
          attempts: 0,
          startTime: null,
          completionTime: null,
          transactionHash: null,
          error: null
        })),
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        estimatedCompletion: this.calculateEstimatedCompletion(steps),
        metadata: metadata
      };

      this.activeOperations.set(operationId, operation);
      
      // Update operation status to monitoring
      operation.status = 'monitoring';
      
      return {
        success: true,
        operationId: operationId,
        operation: operation,
        message: `Started monitoring ${operationType} operation`
      };
      
    } catch (error) {
      console.error('TransactionMonitorAgent.startOperation error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error in startOperation',
        code: 'OPERATION_START_FAILED'
      };
    }
  }

  // Update step status within an operation
  async updateStepStatus(operationId, stepIndex, statusUpdate) {
    try {
      const operation = this.activeOperations.get(operationId);
      if (!operation) {
        throw new Error(`Operation ${operationId} not found`);
      }

      const step = operation.steps[stepIndex];
      if (!step) {
        throw new Error(`Step ${stepIndex} not found in operation ${operationId}`);
      }

      // Update step details
      Object.assign(step, {
        ...statusUpdate,
        lastUpdate: new Date().toISOString()
      });

      // Update operation timestamp
      operation.lastUpdate = new Date().toISOString();

      // Check if this completes the entire operation
      await this.checkOperationCompletion(operationId);

      return {
        success: true,
        operationId: operationId,
        stepIndex: stepIndex,
        stepStatus: step.status
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        operationId: operationId
      };
    }
  }

  // Get operation status
  async getOperationStatus(operationId) {
    try {
      const operation = this.activeOperations.get(operationId);
      if (!operation) {
        return {
          success: false,
          error: 'Operation not found',
          operationId: operationId
        };
      }

      // Calculate progress
      const completedSteps = operation.steps.filter(s => s.status === 'completed').length;
      const totalSteps = operation.steps.length;
      const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

      // Get current step
      const currentStep = operation.steps.find(s => ['pending', 'in_progress', 'confirming'].includes(s.status));

      return {
        success: true,
        operation: {
          id: operation.id,
          type: operation.type,
          status: operation.status,
          progress: {
            completed: completedSteps,
            total: totalSteps,
            percentage: progressPercentage
          },
          currentStep: currentStep ? {
            index: currentStep.stepIndex,
            type: currentStep.type,
            status: currentStep.status,
            network: currentStep.network,
            estimatedTime: currentStep.estimatedTime
          } : null,
          estimatedCompletion: operation.estimatedCompletion,
          lastUpdate: operation.lastUpdate,
          fromAsset: operation.fromAsset,
          toAsset: operation.toAsset,
          totalAmount: operation.totalAmount
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        operationId: operationId
      };
    }
  }

  // ===================================================================
  // STEP-SPECIFIC MONITORING
  // ===================================================================

  // Monitor Bitcoin transaction step
  async monitorBitcoinStep(operation, step, bitcoinAgent) {
    try {
      if (!step.transactionHash) {
        // No transaction hash yet, step might still be preparing
        return { continueMonitoring: true };
      }

      const txStatus = await bitcoinAgent.getTransactionStatus(step.transactionHash);
      
      if (txStatus.success) {
        if (txStatus.status === 'confirmed' && txStatus.confirmations >= 1) {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'completed',
            completionTime: new Date().toISOString(),
            confirmations: txStatus.confirmations,
            blockHeight: txStatus.blockHeight
          });
          return { continueMonitoring: false };
        } else if (txStatus.status === 'pending') {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'confirming',
            confirmations: txStatus.confirmations || 0
          });
          return { continueMonitoring: true };
        }
      }

      return { continueMonitoring: true };

    } catch (error) {
      await this.handleStepError(operation, step, error);
      return { continueMonitoring: false };
    }
  }

  // Monitor Ethereum transaction step
  async monitorEthereumStep(operation, step, evmAgent) {
    try {
      if (!step.transactionHash) {
        return { continueMonitoring: true };
      }

      const txStatus = await evmAgent.getTransactionStatus(step.transactionHash);
      
      if (txStatus.success) {
        if (txStatus.status === 'finalized' && txStatus.confirmations >= 12) {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'completed',
            completionTime: new Date().toISOString(),
            confirmations: txStatus.confirmations,
            blockNumber: txStatus.blockNumber,
            gasUsed: txStatus.gasUsed
          });
          return { continueMonitoring: false };
        } else if (['pending', 'confirmed'].includes(txStatus.status)) {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'confirming',
            confirmations: txStatus.confirmations || 0
          });
          return { continueMonitoring: true };
        }
      }

      return { continueMonitoring: true };

    } catch (error) {
      await this.handleStepError(operation, step, error);
      return { continueMonitoring: false };
    }
  }

  // Monitor Solana transaction step
  async monitorSolanaStep(operation, step, solanaAgent) {
    try {
      if (!step.transactionHash) {
        return { continueMonitoring: true };
      }

      const txStatus = await solanaAgent.getTransactionStatus(step.transactionHash);
      
      if (txStatus.success) {
        if (txStatus.status === 'finalized' && txStatus.confirmations >= 32) {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'completed',
            completionTime: new Date().toISOString(),
            slot: txStatus.slot,
            confirmations: txStatus.confirmations
          });
          return { continueMonitoring: false };
        } else if (['pending', 'confirmed'].includes(txStatus.status)) {
          await this.updateStepStatus(operation.id, step.stepIndex, {
            status: 'confirming',
            confirmations: txStatus.confirmations || 0
          });
          return { continueMonitoring: true };
        }
      }

      return { continueMonitoring: true };

    } catch (error) {
      await this.handleStepError(operation, step, error);
      return { continueMonitoring: false };
    }
  }

  // Monitor DEX swap step
  async monitorDEXStep(operation, step, dexAgent) {
    try {
      // DEX swaps on ICP are typically fast (8-15 seconds)
      // This is more about tracking the swap completion
      
      if (step.status === 'in_progress') {
        // Simulate DEX swap completion for local demo
        if (this.environment === 'development') {
          // Mock completion after a few seconds
          const elapsed = new Date() - new Date(step.startTime);
          if (elapsed > 8000) { // 8 seconds
            await this.updateStepStatus(operation.id, step.stepIndex, {
              status: 'completed',
              completionTime: new Date().toISOString(),
              outputAmount: step.expectedOutput || step.inputAmount * 0.997 // Mock 0.3% fee
            });
            return { continueMonitoring: false };
          }
        }
      }

      return { continueMonitoring: true };

    } catch (error) {
      await this.handleStepError(operation, step, error);
      return { continueMonitoring: false };
    }
  }

  // ===================================================================
  // BACKGROUND MONITORING LOOP
  // ===================================================================

  // Main monitoring loop
  async startMonitoringLoop() {
    while (this.monitoringActive) {
      try {
        await this.processActiveOperations();
        await this.sleep(this.monitoringInterval);
      } catch (error) {
        console.warn('Monitoring loop error:', error.message);
        await this.sleep(this.monitoringInterval);
      }
    }
  }

  // Process all active operations
  async processActiveOperations() {
    const operations = Array.from(this.activeOperations.values());
    
    for (const operation of operations) {
      if (operation.status === 'monitoring') {
        await this.processOperation(operation);
      }
    }

    // Cleanup completed operations older than 1 hour
    this.cleanupOldOperations();
  }

  // Process individual operation
  async processOperation(operation) {
    try {
      // Check for timeouts
      if (this.isOperationTimedOut(operation)) {
        await this.timeoutOperation(operation);
        return;
      }

      // Process each step
      for (const step of operation.steps) {
        if (['pending', 'in_progress', 'confirming'].includes(step.status)) {
          await this.processStep(operation, step);
        }
      }

    } catch (error) {
      console.warn(`Error processing operation ${operation.id}:`, error.message);
    }
  }

  // Process individual step based on network
  async processStep(operation, step) {
    // NOTE: In production, these agents would be injected or passed in
    // For now, we'll simulate the monitoring behavior
    
    switch (step.network) {
      case 'bitcoin':
        // Mock Bitcoin monitoring
        return this.mockNetworkMonitoring(operation, step, 600000); // 10 minutes
        
      case 'ethereum':
        // Mock Ethereum monitoring  
        return this.mockNetworkMonitoring(operation, step, 180000); // 3 minutes
        
      case 'solana':
        // Mock Solana monitoring
        return this.mockNetworkMonitoring(operation, step, 5000); // 5 seconds
        
      case 'icp':
        // Mock ICP/DEX monitoring
        return this.mockNetworkMonitoring(operation, step, 15000); // 15 seconds
        
      default:
        console.warn(`Unknown network type: ${step.network}`);
    }
  }

  // Mock network monitoring for local demo
  async mockNetworkMonitoring(operation, step, completionTime) {
    const elapsed = new Date() - new Date(step.startTime || operation.startTime);
    
    if (step.status === 'pending') {
      await this.updateStepStatus(operation.id, step.stepIndex, {
        status: 'in_progress',
        startTime: new Date().toISOString()
      });
    } else if (step.status === 'in_progress' && elapsed > completionTime * 0.7) {
      await this.updateStepStatus(operation.id, step.stepIndex, {
        status: 'confirming'
      });
    } else if (step.status === 'confirming' && elapsed > completionTime) {
      await this.updateStepStatus(operation.id, step.stepIndex, {
        status: 'completed',
        completionTime: new Date().toISOString()
      });
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  // Check if operation is complete
  async checkOperationCompletion(operationId) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    const allStepsCompleted = operation.steps.every(step => step.status === 'completed');
    const hasFailedSteps = operation.steps.some(step => step.status === 'failed');

    if (allStepsCompleted) {
      operation.status = 'completed';
      operation.completionTime = new Date().toISOString();
    } else if (hasFailedSteps) {
      operation.status = 'failed';
      operation.completionTime = new Date().toISOString();
    }
  }

  // Handle step errors
  async handleStepError(operation, step, error) {
    step.attempts = (step.attempts || 0) + 1;
    step.error = error.message;

    if (step.attempts >= this.maxRetries) {
      await this.updateStepStatus(operation.id, step.stepIndex, {
        status: 'failed',
        error: error.message,
        completionTime: new Date().toISOString()
      });
    } else {
      // Retry after delay
      setTimeout(() => {
        step.status = 'pending';
      }, 30000); // 30 second retry delay
    }
  }

  // Check if operation has timed out
  isOperationTimedOut(operation) {
    const elapsed = new Date() - new Date(operation.startTime);
    const maxTimeout = Math.max(...Object.values(this.timeoutThresholds));
    return elapsed > maxTimeout;
  }

  // Timeout an operation
  async timeoutOperation(operation) {
    operation.status = 'timeout';
    operation.completionTime = new Date().toISOString();
    
    // Mark incomplete steps as timed out
    operation.steps.forEach(step => {
      if (!['completed', 'failed'].includes(step.status)) {
        step.status = 'timeout';
        step.error = 'Operation timed out';
      }
    });
  }

  // Calculate estimated completion time
  calculateEstimatedCompletion(steps) {
    const networkTimes = {
      bitcoin: 600,    // 10 minutes
      ethereum: 180,   // 3 minutes
      solana: 5,       // 5 seconds
      icp: 15         // 15 seconds
    };

    let totalSeconds = 0;
    steps.forEach(step => {
      totalSeconds += networkTimes[step.network] || 60;
    });

    const completionTime = new Date(Date.now() + totalSeconds * 1000);
    return completionTime.toISOString();
  }

  // Generate unique operation ID
  generateOperationId() {
    return 'op_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Cleanup old operations
  cleanupOldOperations() {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [operationId, operation] of this.activeOperations.entries()) {
      if (['completed', 'failed', 'timeout'].includes(operation.status)) {
        const operationTime = new Date(operation.completionTime || operation.lastUpdate).getTime();
        if (operationTime < oneHourAgo) {
          this.activeOperations.delete(operationId);
        }
      }
    }
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all active operations
  getActiveOperations() {
    return Array.from(this.activeOperations.values());
  }

  // Stop monitoring
  stopMonitoring() {
    this.monitoringActive = false;
  }

  // Get agent status
  getAgentStatus() {
    return {
      agentType: 'TransactionMonitorAgent',
      environment: this.environment,
      isHealthy: this.monitoringActive,
      version: '1.0.0',
      activeOperations: this.activeOperations.size,
      supportedNetworks: ['bitcoin', 'ethereum', 'solana', 'icp'],
      supportedOperations: [
        'startOperation',
        'updateStepStatus',
        'getOperationStatus',
        'getActiveOperations'
      ],
      features: [
        'Multi-chain transaction tracking',
        'Real-time status updates',
        'Timeout handling',
        'Error recovery and retries',
        'Background monitoring loop'
      ],
      monitoringConfig: {
        interval: this.monitoringInterval,
        maxRetries: this.maxRetries,
        timeouts: this.timeoutThresholds
      }
    };
  }
}

module.exports = { TransactionMonitorAgent };