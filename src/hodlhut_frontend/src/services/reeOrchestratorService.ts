/**
 * REE Orchestrator Service
 *
 * Handles submission of signed PSBTs to REE Orchestrator for broadcasting to Bitcoin network.
 *
 * REE (Rune Execution Environment) Orchestrator coordinates:
 * 1. PSBT validation
 * 2. Decentralized PSBT Signing (DPS) for pool UTXOs
 * 3. Broadcasting to Bitcoin network
 * 4. Reporting execution results back to exchange canister
 *
 * Architecture:
 * - Testnet Canister: hvyp5-5yaaa-aaaao-qjxha-cai
 * - Mainnet Canister: kqs64-paaaa-aaaar-qamza-cai
 *
 * References:
 * - docs/REE_ARCHITECTURE_CORRECTED.md (complete flow documentation)
 * - docs/ARCHITECTURE_DECISIONS.md (transaction phases)
 */

import { reeOrchestratorCanisterService } from './reeOrchestratorCanisterService';
import type { InvokeArgs as CanisterInvokeArgs } from './reeOrchestratorCanisterService';

/**
 * Result from REE Orchestrator invoke() call
 */
export interface InvokeResult {
  tx_id: string;           // Bitcoin transaction ID
  status: 'pending' | 'signing' | 'sending' | 'submitted' | 'confirmed';
  output_utxo?: {
    txid: string;
    vout: number;
    value: number;
  };
}

/**
 * Metadata for Babylon staking transaction
 */
export interface StakingMetadata {
  action: string;
  pool_address: string;        // Bitcoin address of the pool
  user_address: string;        // User's Bitcoin address (for change/refunds)
  finality_provider: string;
  timelock_blocks: number;
  amount_sats: number;
}

class ReeOrchestratorService {
  private hodlprotocolExchangeCanisterId = 'plkfy-gyaaa-aaaad-achpq-cai';

  /**
   * Submit signed PSBT to REE Orchestrator for broadcasting
   *
   * @param signedPsbtHex - Hex-encoded signed PSBT from wallet
   * @param nonce - Unique nonce from pre_stake() offer (REQUIRED for exchange validation)
   * @param metadata - Staking metadata (finality provider, timelock, etc.)
   * @returns Bitcoin transaction ID and status
   */
  async submitSignedPsbt(
    signedPsbtHex: string,
    nonce: bigint,
    metadata?: StakingMetadata
  ): Promise<InvokeResult> {
    try {
      // Validate required metadata
      if (!metadata) {
        throw new Error('Metadata is required for REE submission');
      }
      if (!metadata.pool_address || !metadata.user_address) {
        throw new Error('pool_address and user_address are required in metadata');
      }

      // Construct InvokeArgs for REE Orchestrator
      const invokeArgs: CanisterInvokeArgs = {
        client_info: [], // No additional client info
        intention_set: {
          tx_fee_in_sats: BigInt(5000), // Estimated fee (TODO: Calculate dynamically)
          initiator_address: metadata.user_address, // CRITICAL: User's Bitcoin address
          intentions: [
            {
              input_coins: [], // Empty for simple BTC deposit (user spending their own UTXOs, not REE-tracked coins)
              output_coins: [], // Empty for simple deposit (no explicit change output needed)
              action: metadata.action || 'deposit', // Use standard REE action name
              exchange_id: 'HODL_PROTOCOL', // CRITICAL: Custom exchange ID (not canister ID!)
              pool_utxo_spent: [], // Empty for simple deposit
              action_params: '', // Empty for standard deposit action
              nonce: nonce, // CRITICAL: Use nonce from pre_deposit() to match exchange validation
              pool_address: metadata.pool_address, // CRITICAL: Pool Bitcoin address
              pool_utxo_received: [], // Empty - REE will infer from PSBT outputs
            },
          ],
        },
        initiator_utxo_proof: new Uint8Array(0), // Empty proof for now
        psbt_hex: signedPsbtHex,
      };

      console.log('Submitting PSBT to REE Orchestrator...');
      console.log('PSBT length:', signedPsbtHex.length, 'chars');

      // Log InvokeArgs with BigInt-safe serialization
      const logPayload = {
        intention_set: {
          tx_fee_in_sats: invokeArgs.intention_set.tx_fee_in_sats.toString(),
          initiator_address: invokeArgs.intention_set.initiator_address,
          intentions: invokeArgs.intention_set.intentions.map(intent => ({
            action: intent.action,
            exchange_id: intent.exchange_id,
            pool_address: intent.pool_address,
            nonce: intent.nonce.toString(),
            input_coins: intent.input_coins,
            output_coins: intent.output_coins,
            pool_utxo_spent: intent.pool_utxo_spent,
            pool_utxo_received: intent.pool_utxo_received,
          }))
        },
        psbt_hex: `${signedPsbtHex.substring(0, 20)}...${signedPsbtHex.substring(signedPsbtHex.length - 20)}`
      };
      console.log('InvokeArgs:', JSON.stringify(logPayload, null, 2));

      // Call REE Orchestrator canister
      const result = await reeOrchestratorCanisterService.invoke(invokeArgs);

      if ('Ok' in result) {
        // Success - result.Ok contains transaction ID
        console.log('✅ REE Orchestrator accepted transaction:', result.Ok);
        return {
          tx_id: result.Ok,
          status: 'submitted',
        };
      } else {
        // Error - result.Err contains error message
        throw new Error(result.Err);
      }
    } catch (error: any) {
      console.error('REE Orchestrator submission failed:', error);
      throw new Error(`Failed to submit transaction to REE Orchestrator: ${error.message}`);
    }
  }

  /**
   * Query transaction status from REE Orchestrator
   *
   * ⚠️ TODO: Implement status polling
   *
   * @param txId - Bitcoin transaction ID
   * @returns Current transaction status
   */
  async getTransactionStatus(txId: string): Promise<InvokeResult['status']> {
    try {
      // TODO: Implement status query from REE Orchestrator
      console.warn('REE Orchestrator status query not yet implemented');
      console.log('Would query status for tx:', txId);

      // Mock confirmed status
      return 'confirmed';
    } catch (error: any) {
      console.error('REE Orchestrator status query failed:', error);
      throw new Error(`Failed to query transaction status: ${error.message}`);
    }
  }
}

// Export singleton instance
export const reeOrchestratorService = new ReeOrchestratorService();
