/**
 * REE Orchestrator Canister Service
 *
 * Provides typed interface to REE Orchestrator canister for PSBT submission.
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './reeOrchestrator.idl';
import type { ReeOrchestratorService, InvokeArgs, Result_3 } from './reeOrchestrator.types';

const REE_ORCHESTRATOR_CANISTER_ID = {
  testnet: 'hvyp5-5yaaa-aaaao-qjxha-cai',
  mainnet: 'kqs64-paaaa-aaaar-qamza-cai',
};

// Use testnet for now
const CANISTER_ID = REE_ORCHESTRATOR_CANISTER_ID.testnet;

class ReeOrchestratorCanisterService {
  private actor: ReeOrchestratorService | null = null;

  private async getActor(): Promise<ReeOrchestratorService> {
    if (this.actor) {
      return this.actor;
    }

    const agent = new HttpAgent({
      host: 'https://ic0.app',
    });

    // Only fetch root key in development
    if (process.env.NODE_ENV !== 'production') {
      await agent.fetchRootKey().catch((err) => {
        console.warn('Unable to fetch root key. Check if the local replica is running');
        console.error(err);
      });
    }

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: CANISTER_ID,
    }) as ReeOrchestratorService;

    return this.actor;
  }

  /**
   * Submit signed PSBT to REE Orchestrator via invoke() method
   */
  async invoke(args: InvokeArgs): Promise<Result_3> {
    const actor = await this.getActor();
    return await actor.invoke(args);
  }
}

// Export singleton instance
export const reeOrchestratorCanisterService = new ReeOrchestratorCanisterService();
export type { InvokeArgs, Result_3 };
