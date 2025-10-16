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
      // Construct InvokeArgs for REE Orchestrator
      const invokeArgs: CanisterInvokeArgs = {
        client_info: [], // No additional client info
        intention_set: {
          tx_fee_in_sats: BigInt(5000), // Estimated fee (TODO: Calculate dynamically)
          initiator_address: '', // Will be extracted from PSBT by REE
          intentions: [
            {
              input_coins: [],
              output_coins: [],
              action: metadata?.action || 'stake_babylon',
              exchange_id: this.hodlprotocolExchangeCanisterId, // CRITICAL: Exchange canister ID
              pool_utxo_spent: [],
              action_params: JSON.stringify(metadata || {}),
              nonce: nonce, // CRITICAL: Use nonce from pre_stake() to match exchange validation
              pool_address: '', // Empty for Babylon staking (not using pool)
              pool_utxo_received: [],
            },
          ],
        },
        initiator_utxo_proof: new Uint8Array(0), // Empty proof for now
        psbt_hex: signedPsbtHex,
      };

      console.log('Submitting PSBT to REE Orchestrator...');
      console.log('PSBT length:', signedPsbtHex.length, 'chars');
      console.log('Metadata:', metadata);

      // Call REE Orchestrator canister
      const result = await reeOrchestratorCanisterService.invoke(invokeArgs);

      if ('Ok' in result) {
        // Success - result.Ok contains transaction ID
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
