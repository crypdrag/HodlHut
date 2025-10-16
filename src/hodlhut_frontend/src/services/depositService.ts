// ===============================================
// Deposit Service - Simple Bitcoin Deposits
// ===============================================
// Handles simple P2TR deposits to liquid staking pool
// Much simpler than Babylon covenant PSBTs!

import { hodlprotocolCanisterService, DepositOffer } from './hodlprotocolCanisterService';
import { reeOrchestratorService, InvokeResult } from './reeOrchestratorService';

// ===============================================
// Types
// ===============================================

export interface DepositResult {
  txId: string;
  expectedBlst: bigint;
  nonce: bigint;
  poolAddress: string;
}

export interface DepositParams {
  userBtcAddress: string;
  amountSats: number;
}

// ===============================================
// Deposit Service Class
// ===============================================

class DepositService {
  /**
   * Execute full deposit flow:
   * 1. Call pre_deposit() to validate and get nonce
   * 2. Construct simple deposit PSBT (P2TR transfer to pool)
   * 3. User signs PSBT via wallet
   * 4. Submit signed PSBT to REE Orchestrator with nonce
   *
   * Note: execute_tx() callback will be triggered when deposit is confirmed on Bitcoin
   */
  async depositToPool(
    params: DepositParams,
    walletSignPsbt: (psbtHex: string) => Promise<string>
  ): Promise<DepositResult> {
    const { userBtcAddress, amountSats } = params;

    console.log(`Starting deposit: ${amountSats} sats from ${userBtcAddress}`);

    // Step 1: Pre-deposit validation
    console.log('Step 1: Calling pre_deposit() for validation...');
    const offer: DepositOffer = await hodlprotocolCanisterService.preDeposit(
      userBtcAddress,
      amountSats
    );

    console.log('Pre-deposit successful:', {
      poolAddress: offer.pool_address,
      nonce: offer.nonce.toString(),
      expectedBlst: offer.expected_blst.toString(),
      estimatedApy: offer.estimated_apy
    });

    // Step 2: Construct simple deposit PSBT
    console.log('Step 2: Constructing deposit PSBT...');
    const unsignedPsbt = await this.constructDepositPSBT(
      userBtcAddress,
      offer.pool_address,
      amountSats
    );

    // Step 3: User signs PSBT
    console.log('Step 3: Requesting wallet signature...');
    const signedPsbt = await walletSignPsbt(unsignedPsbt);
    console.log('PSBT signed successfully');

    // Step 4: Submit to REE Orchestrator
    console.log('Step 4: Submitting to REE Orchestrator...');
    const result = await reeOrchestratorService.submitSignedPsbt(
      signedPsbt,
      offer.nonce,
      {
        action: 'deposit_to_pool',
        finality_provider: '', // Not needed for simple deposit
        timelock_blocks: 0,     // Not needed for simple deposit
        amount_sats: amountSats
      }
    );

    console.log('Deposit submitted successfully:', result);

    return {
      txId: result.tx_id,
      expectedBlst: offer.expected_blst,
      nonce: offer.nonce,
      poolAddress: offer.pool_address
    };
  }

  /**
   * Construct a simple P2TR deposit PSBT
   *
   * This is MUCH simpler than Babylon covenant PSBTs - it's just a regular Bitcoin transfer!
   * User sends BTC from their Taproot address to the pool's Taproot address.
   */
  private async constructDepositPSBT(
    fromAddress: string,
    toAddress: string,
    amountSats: number
  ): Promise<string> {
    console.log(`Constructing PSBT: ${amountSats} sats from ${fromAddress} to ${toAddress}`);

    try {
      // Import bitcoinjs-lib (available via @babylonlabs-io/btc-staking-ts peer dependency)
      const { Psbt, networks, payments, address: bAddress } = await import('bitcoinjs-lib');

      // Bitcoin Signet uses testnet network parameters
      const network = networks.testnet;

      // Step 1: Fetch user's UTXOs from wallet
      console.log('Step 1: Fetching UTXOs from wallet...');
      const utxos = await this.fetchUserUTXOs(fromAddress);

      if (utxos.length === 0) {
        throw new Error('No UTXOs found. Please ensure your wallet has Bitcoin.');
      }

      console.log(`Found ${utxos.length} UTXOs, total: ${utxos.reduce((sum, u) => sum + u.value, 0)} sats`);

      // Step 2: Estimate fee rate
      console.log('Step 2: Estimating fee rate...');
      const feeRate = await this.estimateFeeRate();
      console.log(`Using fee rate: ${feeRate} sat/vB`);

      // Step 3: Create PSBT
      const psbt = new Psbt({ network });

      // Step 4: Select UTXOs and calculate fees
      // For P2TR inputs, size is ~57.5 vBytes per input
      // For P2TR outputs, size is ~43 vBytes per output
      // Base transaction size: ~10.5 vBytes
      const BYTES_PER_INPUT = 58; // P2TR input (rounded up)
      const BYTES_PER_OUTPUT = 43; // P2TR output
      const BASE_SIZE = 11; // Base transaction overhead

      // Select UTXOs to cover amount + estimated fees
      let selectedValue = 0;
      let selectedUtxos: any[] = [];
      let estimatedSize = BASE_SIZE + BYTES_PER_OUTPUT; // 1 output minimum

      // Sort UTXOs by value (largest first for efficiency)
      const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

      for (const utxo of sortedUtxos) {
        selectedUtxos.push(utxo);
        selectedValue += utxo.value;
        estimatedSize += BYTES_PER_INPUT;

        const estimatedFee = Math.ceil(estimatedSize * feeRate);
        const totalNeeded = amountSats + estimatedFee;

        // Check if we need a change output
        const changeAmount = selectedValue - totalNeeded;
        if (changeAmount > 0) {
          // Add change output to size estimate if it's worth creating
          // (dust threshold is ~546 sats for standard outputs)
          if (changeAmount >= 1000) { // Conservative dust threshold
            estimatedSize += BYTES_PER_OUTPUT;
          }
        }

        // Recalculate with updated size
        const finalFee = Math.ceil(estimatedSize * feeRate);
        const finalTotalNeeded = amountSats + finalFee;

        if (selectedValue >= finalTotalNeeded) {
          console.log(`Selected ${selectedUtxos.length} UTXOs totaling ${selectedValue} sats`);
          console.log(`Estimated fee: ${finalFee} sats (${estimatedSize} vBytes @ ${feeRate} sat/vB)`);
          break;
        }
      }

      // Check if we have enough funds
      const finalFee = Math.ceil(estimatedSize * feeRate);
      const totalRequired = amountSats + finalFee;
      if (selectedValue < totalRequired) {
        throw new Error(
          `Insufficient funds. Need ${totalRequired} sats (${amountSats} + ${finalFee} fee), but only have ${selectedValue} sats`
        );
      }

      // Step 5: Add inputs to PSBT
      console.log('Step 5: Adding inputs to PSBT...');
      for (const utxo of selectedUtxos) {
        // Fetch the full transaction hex for the witness UTXO
        const txHex = await this.fetchTransactionHex(utxo.txid);

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, 'hex'),
            value: utxo.value,
          },
          // For P2TR (Taproot) inputs, we also need the tapInternalKey
          // This will be extracted from the scriptPubKey
        });
      }

      // Step 6: Add outputs
      console.log('Step 6: Adding outputs to PSBT...');

      // Output 1: Deposit to pool address
      psbt.addOutput({
        address: toAddress,
        value: amountSats,
      });

      // Output 2: Change back to user (if needed)
      const changeAmount = selectedValue - amountSats - finalFee;
      if (changeAmount >= 1000) { // Only create change output if above dust threshold
        console.log(`Adding change output: ${changeAmount} sats`);
        psbt.addOutput({
          address: fromAddress,
          value: changeAmount,
        });
      } else if (changeAmount > 0) {
        console.log(`Change ${changeAmount} sats too small, adding to fee`);
      }

      // Return unsigned PSBT as hex
      const psbtHex = psbt.toHex();
      console.log(`PSBT constructed successfully (${psbtHex.length / 2} bytes)`);

      return psbtHex;
    } catch (error: any) {
      console.error('Error constructing PSBT:', error);
      throw new Error(`Failed to construct deposit PSBT: ${error.message}`);
    }
  }

  /**
   * Fetch user's Bitcoin UTXOs from their wallet
   * Follows the same pattern as bitcoinStakingService.ts
   */
  private async fetchUserUTXOs(userBtcAddress: string): Promise<any[]> {
    try {
      // Check if Unisat wallet is available
      if (typeof window !== 'undefined' && (window as any).unisat) {
        const unisat = (window as any).unisat;

        // Get UTXOs from Unisat wallet
        const utxos = await unisat.getBitcoinUtxos();

        console.log('Raw Unisat UTXOs:', JSON.stringify(utxos, null, 2));

        // Enrich UTXOs with transaction data from mempool.space
        const enrichedUtxos = await Promise.all(
          utxos.map(async (utxo: any) => {
            try {
              // Fetch transaction data from mempool.space Signet API
              const txResponse = await fetch(`https://mempool.space/signet/api/tx/${utxo.txid}`);
              if (!txResponse.ok) {
                throw new Error(`Failed to fetch tx ${utxo.txid}`);
              }
              const txData = await txResponse.json();

              // Get the output for this UTXO
              const output = txData.vout[utxo.vout];
              if (!output) {
                throw new Error(`Output ${utxo.vout} not found in tx ${utxo.txid}`);
              }

              // Return enriched UTXO with all required fields
              return {
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.satoshis, // Unisat uses "satoshis" field
                scriptPubKey: output.scriptpubkey, // From mempool.space API (hex string)
              };
            } catch (error: any) {
              console.error(`Error enriching UTXO ${utxo.txid}:${utxo.vout}:`, error);
              throw error;
            }
          })
        );

        return enrichedUtxos;
      }

      throw new Error('No Bitcoin wallet detected. Please install Unisat wallet.');
    } catch (error: any) {
      console.error('Error fetching user UTXOs:', error);
      throw new Error(`Failed to fetch Bitcoin UTXOs: ${error.message}`);
    }
  }

  /**
   * Fetch transaction hex from mempool.space
   * Required for witness UTXO construction
   */
  private async fetchTransactionHex(txid: string): Promise<string> {
    try {
      const response = await fetch(`https://mempool.space/signet/api/tx/${txid}/hex`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction ${txid}`);
      }
      return await response.text();
    } catch (error: any) {
      console.error(`Error fetching transaction hex for ${txid}:`, error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
  }

  /**
   * Estimate fee rate for Bitcoin transaction
   * Uses mempool.space API for Bitcoin Signet testnet
   */
  private async estimateFeeRate(): Promise<number> {
    try {
      // Fetch recommended fee rates from mempool.space Signet API
      const response = await fetch('https://mempool.space/signet/api/v1/fees/recommended');

      if (!response.ok) {
        console.warn('Failed to fetch fee rates from mempool.space, using fallback rate');
        return 5; // 5 sat/vB fallback rate for testnet
      }

      const feeRates = await response.json();

      // Use "halfHourFee" for reasonable confirmation time
      return feeRates.halfHourFee || 5;
    } catch (error: any) {
      console.error('Error estimating fee rate:', error);
      return 5; // 5 sat/vB fallback rate for testnet
    }
  }

  /**
   * Get user's current BLST balance
   */
  async getBlstBalance(userBtcAddress: string): Promise<number> {
    const balance = await hodlprotocolCanisterService.getBlstBalance(userBtcAddress);
    // Convert from BLST units to display (BLST has 3 decimals)
    return Number(balance) / 1000;
  }

  /**
   * Get pool statistics
   */
  async getPoolStats() {
    return await hodlprotocolCanisterService.getPoolStats();
  }

  /**
   * Get pool configuration
   */
  async getPoolConfig() {
    return await hodlprotocolCanisterService.getPoolConfig();
  }
}

// Export singleton instance
export const depositService = new DepositService();
