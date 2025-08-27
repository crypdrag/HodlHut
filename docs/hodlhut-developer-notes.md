# HodlHut Development Documentation

<!-- Live-linked TOC -->
<nav id="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><a href="#hodlhut-development-documentation">HodlHut Development Documentation</a></li>
    <li>
      <a href="#system-overview">System Overview</a>
      <ul>
        <li><a href="#what-is-hodlhut">What is HodlHut?</a></li>
        <li><a href="#dex-integrations-canonical-reference">DEX Integrations (Canonical Reference)</a></li>
        <li><a href="#current-working-demo-mvp-status">Current Working Demo (MVP Status)</a></li>
        <li><a href="#development-intentions--next-build-phase">Development Intentions &amp; Next Build Phase</a></li>
      </ul>
    </li>
    <li>
      <a href="#development-roadmap">Development Roadmap</a>
      <ul>
        <li><a href="#implementation-phases">Implementation Phases</a></li>
        <li><a href="#solana-integration-phases">Solana Integration Phases</a></li>
        <li><a href="#dex-integration-phases">DEX Integration Phases</a></li>
      </ul>
    </li>
    <li>
      <a href="#testing-canonical">Testing (Canonical)</a>
      <ul>
        <li><a href="#a-testing-overview">A. Testing Overview</a></li>
        <li><a href="#b-environment--framework">B. Environment &amp; Framework</a></li>
        <li><a href="#c-how-to-run-local">C. How to Run (Local)</a></li>
        <li><a href="#d-how-to-run-mainnet--boundary-net">D. How to Run (Mainnet / Boundary-NET)</a></li>
        <li><a href="#e-agent-test-suites-canonical">E. Agent Test Suites (Canonical)</a></li>
        <li><a href="#f-integration-scenarios">F. Integration Scenarios</a></li>
        <li><a href="#h-results-storage-artifacts">H. Results Storage (Artifacts)</a></li>
        <li><a href="#i-cicd-hooks">I. CI/CD Hooks</a></li>
      </ul>
    </li>
    <li>
      <a href="#operational-procedures">Operational Procedures</a>
      <ul>
        <li><a href="#deployment-process">Deployment Process</a></li>
        <li><a href="#monitoring-requirements">Monitoring Requirements</a></li>
      </ul>
    </li>
    <li>
      <a href="#governance-and-protocol-evolution">Governance and Protocol Evolution</a>
      <ul>
        <li><a href="#activation-window-30minute--state-machine">Activation Window (30-minute) — State Machine</a></li>
        <li><a href="#upgrade-procedures-and-voting-mechanisms">Upgrade Procedures and Voting Mechanisms</a></li>
        <li><a href="#protocol-parameter-management">Protocol Parameter Management</a></li>
      </ul>
    </li>
    <li>
      <a href="#operational-security-and-compliance">Operational Security and Compliance</a>
      <ul>
        <li><a href="#kyt-and-aml-integration">KYT and AML Integration</a></li>
        <li><a href="#regulatory-compliance-framework">Regulatory Compliance Framework</a></li>
        <li><a href="#incident-response-procedures">Incident Response Procedures</a></li>
        <li><a href="#business-continuity-planning">Business Continuity Planning</a></li>
        <li><a href="#disaster-recovery-protocols">Disaster Recovery Protocols</a></li>
      </ul>
    </li>
    <li>
      <a href="#reference-documentation">Reference Documentation</a>
      <ul>
        <li><a href="#network-and-canister-registry">Network and Canister Registry</a></li>
        <li><a href="#api-reference-and-specifications">API Reference and Specifications</a></li>
        <li><a href="#dex-configuration">DEX Configuration</a></li>
        <li><a href="#file-locations">File Locations</a></li>
        <li><a href="#troubleshooting-and-debug-procedures">Troubleshooting and Debug Procedures</a></li>
      </ul>
    </li>
    <li><a href="#appendix-performance--limits">Appendix: Performance &amp; Limits</a></li>
    <li><a href="#audit-results-and-security-reviews-ongoing">Audit Results and Security Reviews (ongoing)</a></li>
  </ul>
</nav>


## System Overview

### What is HodlHut?
HodlHut is a multichain DeFi platform built on the Internet Computer Protocol (ICP) that enables users to manage Bitcoin, Ethereum, Solana, ICRC and other blockchain assets through their own sovereign canister smart contracts. Each user controls their own "MyHut" canister, providing custody of cross-chain assets via Chain Fusion and Dfinity technology.

My Hut canister performs Agent assisted comprehensive swaps involving both ICP DEXs and Chain Fusion. While complexity is abstracted as much as possible for the user, transparency is not. Users are given swap options if DEXs are involved [ckBTC ->ckUSDC-> USDC (ETH)] advising them of slippage, liquidity risk, and DEX fees prior to choosing which ICP DEX to perform the swap. (Custom Agents check ICP as the liquidity bridge for any ckX ↔ ckY swap when the direct pool is thin.)  Chain Fusion gas fees are always real-time and visible. HoldHut Smart Solutions advise the user of any gas necessary for crosschain resolutions on Bitcoin, Ethereum, and Solana, and offers solutions for the easiest way to obtain the appropriate gas if they don't hold ckBTC, ckETH, or ckSolana. 

My Garden is a user's private yield farm where multipliers reward users based on staking diversity. Reef Raffle and Tsunami Sweep are DAO controlled daily lotteries, and a subsequent weekly lotteries. (The ReefRaffleAgent and MyGarden Agent have not been prototyped yet.) DAO and tokenomics designs are on the RoadMap. HodlHut's future build plans to incorporate Bitcoin metaprotocols and complement current BTCFi ICP platforms such as RichSwap, Odin.Fun, Blockminer, and Tyche.

HodlHut is necessarily ambitious to explore the development of AI Agents within the current crosschain ICP environment and the ensuing attack vectors that must be mitigated during the build.   

## DEX Integrations (Canonical Reference)
- **Canonical routing hub:** `ICP`.
- **ICPSwap:** AMM pools; **fees:** vary by pool (0.3% common default); verify pool‑specific fee on trade.
- **KongSwap:** AMM with router API; document max hops and per‑swap constraints.
- **Notes:** Centralize pool IDs, router canister IDs, and route preferences here; other sections should reference this table instead of repeating parameters.

**Core Value Proposition:**
- **Sovereign Custody**: Each user owns and controls their individual MyHut canister
- **Cross-Chain Integration**: Direct blockchain interaction via ICP's Chain Fusion technology
- **Minimized Off-Chain Dependencies**: Bitcoin is native on the IC; Ethereum & Solana via HTTPS outcalls (Chain Fusion) with multi‑provider redundancy and consensus.
- **Unified Interface**: Single interface for Bitcoin, Ethereum, Solana assets and DeFi operations

### Current Working Demo (MVP Status)
**✅ What Users Can Experience Today:**

**Frontend Interface:**
- Functional React-based dashboard with asset selection interfaces
- Working FROM/TO asset dropdowns supporting BTC, ETH, SOL asset selection
- DEX selection interface (`setSelectedDEX('KongSwap')` / `setSelectedDEX('ICPSwap')`)
- Asset deposit triggers (`startDeposit('BTC')`, `startDeposit('ETH')`, `startDeposit('SOL')`)
- Basic navigation and user interface components

**Demo Fee Structure:**
- Predictable hardcoded fees for demonstration purposes:
  - Bitcoin: `0.0005 BTC` 
  - Ethereum: `0.003 ETH`
  - Solana: `0.001 SOL`
- Purpose: Consistent demo behavior for user testing and development

**Basic Agent Framework:**
- 7 prototype agents demonstrating proof-of-concept functionality
- Test suite validating basic agent communication (36 individual + 6 integration tests)
- Agent coordination patterns documented and partially implemented

**⚠️ Current Demo Limitations:**
- **No Real Blockchain Integration**: Demo uses hardcoded values, not live network data
- **No Actual Transactions**: Frontend triggers exist but don't execute real cross-chain operations  
- **Authentication Bypassed**: Internet Identity integration disabled for demo testing
- **Agent Prototypes Only**: Existing agents are proof-of-concept, not production systems
- **No MyHut Canisters**: Individual user canister deployment not implemented

### Development Intentions & Next Build Phase
**🚧 What Needs to Be Built for Production:**

**Multi-Chain Integration:**
- Replace hardcoded fees with real-time blockchain data via Chain Fusion
- Implement actual Bitcoin (5-canister), Ethereum (EVM RPC), and Solana (SOL RPC) integration
- Build production wallet connectivity and transaction signing workflows

**MyHut Sovereign Canister System:**
- Individual user canister factory and deployment mechanisms
- User consent and upgrade procedures for personal canisters
- Sovereign custody implementation with cryptographic principal verification

**Production Agent Architecture:**
- Complete redesign of all 7 agents for multi-canister coordination
- Chain Fusion integration with threshold cryptography (ECDSA/Ed25519)
- Real-time cross-chain transaction monitoring and state management

**DEX Integration Within MyHut:**
- Direct canister-to-canister DEX operations (no external redirects)
- Cross-DEX quote aggregation and route optimization within user canisters
- Automated liquidity management and fee collection

**Target User Experience:**
Users will deploy their own MyHut canister, directly control cross-chain assets, execute trades through integrated DEX protocols, and maintain complete sovereignty over their DeFi operations—all through a single, unified interface powered by ICP's Chain Fusion technology.

## Security Architecture
### Threat Model and Attack Vectors
**High-Risk Attack Surfaces:**
1. **Mint/Burn Lifecycle for Chain‑Key Assets** — Chain Fusion controlled mint/burn processes
2. **AI Agent Coordination Layer** - 7-agent communication and decision-making
3. **Sovereign Canister Architecture** - Individual user hut security
4. **Internet Identity Integration** - Authentication and session management
5. **Multi-Chain Asset Management** - Cross-network transaction coordination

**Attack Vector Classification:**

**CRITICAL - Immediate Mitigation Required:**
- **Agent Decision Poisoning**: Manipulated network data to force suboptimal routing
- **Delegation Token Hijacking**: Compromised II authentication tokens
- **Chain Fusion State Attacks**: Exploitation of mint/burn timing differences
- **Hut Factory Manipulation**: Attacks during 30-minute activation windows
- **Cross-Chain Reorg Exploitation**: Different finality times across networks

**HIGH - Phase 1 Implementation:**
- **Agent Coordination Disruption**: Breaking multi-step operations
- **Canister Upgrade Manipulation**: Unauthorized code changes
- **Bridge State Desynchronization**: Chain Fusion consistency attacks
- **Hub Routing Manipulation**: Forcing routing through attacker pools
- **Multi-Chain MEV Attacks**: Coordinated cross-chain value extraction

**MEDIUM - Phase 2 Implementation:**
- **Oracle Rate Manipulation**: False price/fee data injection
- **UI Misdirection/Frontend Injection**: Client-side attack vectors
- **Agent Impersonation**: Malicious services mimicking agents
- **Liquidity Fragmentation**: Coordinated pool manipulation
- **Resource Exhaustion**: Cycle/memory depletion attacks

**LOW - Phase 3 Monitoring:**
- **Phishing Login Pages**: Social engineering attacks
- **Cross-Canister Spoofing**: Unauthorized inter-canister calls
- **Agent Resource Competition**: Internal system conflicts

**Multi-Agent Trust Model:**
Each of the 7 agents operates in a security-hardened environment with agent isolation, cryptographic verification, multi-source validation, and byzantine fault tolerance. Critical decisions require multi-agent agreement with consensus requirements and rollback mechanisms for compromised agent detection.
### Multi-Chain Security Protocols
**Bitcoin Multi-Canister Architecture:**
- Bitcoin Subnet ID: `w4rem-dv5e3-widiz-wbpea-kbttk-mnzfm-tzrc7-svcj3-kbxyb-zamch-hqe`
  - UTXO queries, mempool analysis, block validation
- ckBTC Minter: `mqygn-kiaaa-aaaar-qaadq-cai`
  - Bitcoin address generation, deposit monitoring, withdrawal execution  
- ckBTC Ledger: `mxzaz-hqaaa-aaaar-qaada-cai`
  - ICRC-1/ICRC-2 transfers, balance queries
- ckBTC Index: dynamically deployed for transaction indexing
- ckBTC Archive: spawned as needed for historical storage

### Chain Fusion Risk Assessment
### Key Management and Cryptographic Controls

#### Threshold Ed25519 status & fallbacks
- **Status:** Threshold Ed25519 signing on IC is limited in surface area today; verify availability per target network components before relying on it end‑to‑end.
- **Plan:** Where threshold signing is not yet supported, use canister‑held keys or client‑side signing with explicit risk notes.
- **Fallback matrix:** _Operation ➝ Signer ➝ Current status ➝ Fallback_
- **Solana transaction signing** ➝ _Canister or client_ ➝ _Prototype_ ➝ _Client‑side signing until t‑Ed25519 available_.
- **Inter‑agent attestations** ➝ _Canister_ ➝ _Available_ ➝ _n/a_.
- **Administrative approvals** ➝ _DAO multi‑sig_ ➝ _Available_ ➝ _Emergency guardian_.

**Bitcoin Threshold Cryptography:**
- Threshold ECDSA via ckBTC Minter for secure address generation
- P2WPKH addresses (bc1q...) for lowest transaction fees
- 6+ confirmation requirements (min_confirmations parameter)
- User principal to deterministic deposit address mapping
- KYT (Know Your Transaction) compliance integration

### Audit Results and Security Reviews

## Token Economics and Asset Management
### Fee Structure and Revenue Model
### Cross-Chain Asset Flow Documentation
**Bitcoin Asset Flow (BTC ↔ ckBTC):**
1. User deposits BTC to Minter-generated address via external wallet
2. Bitcoin Canister validates UTXO and confirmations (6+ required)
3. ckBTC Minter mints equivalent ckBTC to user's Ledger account
4. 1:1 backing maintained in Minter custody
5. Withdrawal: ckBTC burned, BTC released via threshold ECDSA

**Bitcoin Fee Structure:**
- Network fees: Dynamic via Bitcoin Canister mempool analysis (replaces hardcoded 0.0005 BTC)
- KYT compliance fees: Regulatory processing costs
- Withdrawal minimum: 0.0005 BTC (50,000 Satoshi)
- Processing timeout: 10 minutes maximum queue time
- Gas optimization: Priority-based timing (High: 10-20 min, Medium: 30-60 min, Low: 1-3 hours, Economy: 3+ hours)

### Custody Architecture and 1:1 Backing Verification
**Bitcoin Custody Model:**
- ckBTC Minter holds Bitcoin UTXOs in threshold ECDSA addresses
- All Bitcoin held 100% on-chain via ICP threshold cryptography
- No centralized custodian or bridge operator
- Verifiable 1:1 backing through on-chain UTXO verification

### Economic Incentives and Risk Parameters
### Financial Risk Management

## Smart Contract and Canister Architecture
### Core Canister Specifications
**Bitcoin Canister Specification:**
- Subnet: `w4rem-dv5e3-widiz-wbpea-kbttk-mnzfm-tzrc7-svcj3-kbxyb-zamch-hqe`
- Methods: `get_current_fee_percentiles()`, UTXO management, block validation
- Function: Direct Bitcoin network integration and mempool analysis

**ckBTC Minter Specification:**
- Canister ID: `mqygn-kiaaa-aaaar-qaadq-cai`
- Methods: `get_btc_address()`, `update_balance()`, `retrieve_btc_with_approval()`, `get_known_utxos()`
- Function: BTC ↔ ckBTC conversion, threshold ECDSA address generation
- Configuration: 6+ confirmations, 0.0005 BTC minimum withdrawal, 10-minute processing timeout

**ckBTC Ledger Specification:**
- Canister ID: `mxzaz-hqaaa-aaaar-qaada-cai`
- Methods: `icrc1_balance_of()`, `icrc1_transfer()`, ICRC-2 compliance
- Function: ckBTC token management and transfers
- Standards: ICRC-1/ICRC-2 compliant operations

### Agent System Architecture (PROTOTYPE STATUS)
**⚠️ CRITICAL: All agents are early-stage prototypes, NOT production-ready systems**

**Agent Development Reality Check:**
- Current agents: Proof-of-concept demonstrations with basic functionality
- Test passage: Indicates functional starting points, NOT production readiness
- Architecture gaps: Significant coordination and integration work required
- Multi-canister complexity: Current agents assume simplified single-canister interactions

**BitcoinRPCAgent (Prototype Status):**
```javascript
// CURRENT LIMITATION: Designed for single canister calls
// PRODUCTION REQUIREMENT: Multi-canister coordination across 5 systems
Current: bitcoinRPC.getFeeEstimate()
Needed: {
  bitcoinCanister.get_current_fee_percentiles(),
  ckBTCMinter.get_btc_address({owner: principal}),
  ckBTCMinter.update_balance({owner: principal}),
  ckBTCLedger.icrc1_balance_of({account: principal}),
  dynamicIndexing.getTransactionHistory()
}
```
- **Gap**: No multi-canister state coordination
- **Gap**: Missing threshold ECDSA integration
- **Gap**: Lacks proper UTXO management across canisters

**EVMRPCAgent (Prototype Status):**
```javascript
// CURRENT LIMITATION: Basic RPC calls without consensus validation
// PRODUCTION REQUIREMENT: Multi-provider consensus with EVM RPC canister
Current: evmRPC.getGasPrice()
Needed: {
  evmRPCCanister.eth_feeHistory({providers: [Alchemy, Ankr, BlockPI]}),
  consensusValidation.checkProviderAgreement(),
  failoverLogic.handleInconsistentResults(),
  cycleManagement.optimizeProviderCosts()
}
```
- **Gap**: No multi-provider consensus handling
- **Gap**: Missing EVM RPC canister (7hfb6-caaaa-aaaar-qadga-cai) integration
- **Gap**: Lacks provider failover and cycle optimization

**SVMRPCAgent (Prototype Status):**
```javascript
// CURRENT LIMITATION: Standard RPC calls without fast-block consensus
// PRODUCTION REQUIREMENT: Solana-specific consensus with NNS SOL RPC
Current: solanaRPC.getBalance()
Needed: {
  solRPCCanister.sol_getHealth({consensus: '3-out-of-5'}),
  fastBlockHandling.handle400msBlockTimes(),
  ed25519Validation.verifyThresholdSignatures(),
  ipv6ProviderManagement.handleMainnetLimitations()
}
```
- **Gap**: No fast block time consensus strategy
- **Gap**: Missing NNS-controlled SOL RPC canister integration
- **Gap**: Lacks Ed25519 threshold cryptography coordination

**DEXRoutingAgent (Prototype Status):**
```javascript
// CURRENT LIMITATION: External DEX API calls
// PRODUCTION REQUIREMENT: MyHut canister-to-canister DEX integration
Current: dexAPI.getQuote(tokenA, tokenB)
Needed: {
  myHutCanister.aggregateQuotes({
    kongswap: kongswaMainCanister.getQuote(),
    icpswap: icpswapCalculator.calculateRoute()
  }),
  routeOptimization.evaluateHubRouting(slippage > 2.0),
  sovereignExecution.executeWithinMyHut()
}
```
- **Gap**: No MyHut sovereign canister integration
- **Gap**: Missing cross-DEX quote aggregation within user canisters
- **Gap**: Lacks hub routing optimization logic

**HutFactoryAgent (Prototype Status):**
- **Gap**: User consent mechanisms for canister upgrades not implemented
- **Gap**: 30-minute activation windows and abort procedures missing
- **Gap**: Cryptographic principal verification incomplete

**TransactionMonitorAgent (Prototype Status):**
- **Gap**: Cross-chain transaction correlation not implemented
- **Gap**: Multi-canister state monitoring missing
- **Gap**: Real-time anomaly detection incomplete

**MasterAgent (Prototype Status):**
- **Gap**: No coordination of multi-canister agent workflows
- **Gap**: Missing error handling and rollback mechanisms
- **Gap**: Lacks production monitoring and health checks

### Production Development Requirements
**Multi-Canister Coordination Patterns:**
Each production agent requires sophisticated coordination across multiple specialized canisters, not simple RPC calls to single endpoints.

**State Management Complexity:**
Production systems need distributed state management, consensus validation, and rollback capabilities across canister boundaries.

**Integration Architecture:**
Real production requires deep integration with ICP's Chain Fusion technology, threshold cryptography, and sovereign canister architecture.

### Agent System Development Phases

**Phase 1: Multi-Canister Architecture**
- **BitcoinRPCAgent**: Redesign for 5-canister coordination (Bitcoin Canister → ckBTC Minter → ckBTC Ledger → Index → Archive)
- **EVMRPCAgent**: Integrate with EVM RPC canister multi-provider consensus validation
- **SVMRPCAgent**: Implement NNS SOL RPC canister integration with fast-block consensus
- **DEXRoutingAgent**: Rebuild for MyHut canister-to-canister quote aggregation (KongSwap + ICPSwap)

**Phase 2: Chain Fusion Integration**
- **Threshold Cryptography**: Integrate ECDSA (Bitcoin) and Ed25519 (Solana) signature coordination
- **Consensus Mechanisms**: Implement multi-provider validation for EVM and Solana operations
- **State Coordination**: Develop distributed state management across canister boundaries
- **Error Handling**: Build comprehensive rollback and recovery mechanisms

**Phase 3: Production Hardening**
- **MasterAgent**: Orchestration of multi-canister workflows with health monitoring
- **TransactionMonitorAgent**: Cross-chain correlation and real-time anomaly detection
- **HutFactoryAgent**: User consent mechanisms and cryptographic principal verification
- **Performance Optimization**: Cycle management and canister communication efficiency

### Chain Fusion Integration Patterns
**Bitcoin Chain Fusion Protocol:**
- Native Bitcoin network integration via Bitcoin Canister
- Threshold ECDSA for secure key management
- Multi-canister coordination: Bitcoin Canister → Minter → Ledger
- Real-time UTXO tracking and confirmation monitoring

### Upgrade Mechanisms and Governance
**Bitcoin Canister Governance:**
- ckBTC Minter controlled by NNS Root (r7inp-6aaaa-aaaaa-aaabq-cai)
- User MyHut canisters require user consent for upgrades
- 30-minute activation windows for new Hut deployments
- Cryptographic principal verification for all operations

### Inter-Canister Communication Protocols
**Multi-Canister Coordination Sequence:**
```javascript
// Standard Bitcoin operation pattern
1. Fee estimation: Bitcoin Canister → get_current_fee_percentiles()
2. Address generation: ckBTC Minter → get_btc_address({owner: userPrincipal})
3. Deposit monitoring: ckBTC Minter → update_balance({owner: userPrincipal})
4. Balance queries: ckBTC Ledger → icrc1_balance_of({owner: userPrincipal})

// Standard Ethereum operation pattern  
1. Fee estimation: EVM RPC Canister → eth_feeHistory({blockCount: 3, newestBlock: 'Latest'})
2. Transaction count: EVM RPC Canister → eth_getTransactionCount({address, block: 'Latest'})
3. Transaction broadcast: EVM RPC Canister → eth_sendRawTransaction(signedTx)
4. Confirmation monitoring: EVM RPC Canister → eth_getTransactionReceipt(txHash)

// Standard Solana operation pattern
1. Health check: SOL RPC Canister → sol_getHealth({network: 'Mainnet'})
2. Balance queries: SOL RPC Canister → sol_getBalance({network: 'Mainnet', account: pubkey})
3. Transaction broadcast: SOL RPC Canister → sol_sendTransaction(signedTx)
4. Confirmation monitoring: SOL RPC Canister → sol_getTransaction(signature)

// Standard DEX operation pattern (within MyHut Canister)
1. Quote aggregation: MyHut → KongSwap canister + ICPSwap SwapCalculator
2. Route optimization: MyHut → evaluate direct pair vs hub routing (ICP intermediate)
3. Trade execution: MyHut → optimal DEX canister (KongSwap single vs ICPSwap multi-canister)
4. Confirmation: MyHut → verify trade completion and update sovereign canister balances
```

### State Management and Data Consistency
**Multi-Canister State Coordination:**
**Bitcoin 5-Canister Architecture:**
- Distributed state across Bitcoin Canister → ckBTC Minter → ckBTC Ledger → Index → Archive
- State consistency validation required across all canister boundaries
- UTXO management and recovery procedures for withdrawal operations
- Multi-canister communication patterns with rollback capabilities

**Production Requirements:**
- Develop distributed state management across canister boundaries
- Multi-canister state consistency restoration procedures
- State coordination for complex multi-step operations
- Cross-canister transaction validation and verification

**Operation Lifecycle Management:**
**TransactionMonitorAgent State Tracking:**
- Operation integrity checking with timeout management and rollback procedures
- Operation state maintained across agent restarts for reliability
- Pending → Confirmed → Completed progression monitoring
- Multi-step coordination with comprehensive timeout management

**Cross-Chain Operation State:**
```javascript
// Multi-step operation state management example
testBitcoinMultiCanisterCoordination() {
  // 1. Bitcoin Canister fee estimation
  const fees = await bitcoinCanister.get_current_fee_percentiles();
  
  // 2. ckBTC Minter address generation  
  const address = await ckBTCMinter.get_btc_address({owner: userPrincipal});
  
  // 3. Coordinated balance monitoring
  const balance = await ckBTCLedger.icrc1_balance_of({account: userPrincipal});
  
  // 4. State consistency validation
  validateMultiCanisterState([bitcoinCanister, ckBTCMinter, ckBTCLedger]);
}
```

**Cross-Chain State Consistency:**
**Chain Fusion State Management:**
- Cross-chain state consistency monitoring for mint/burn operations
- Chain reorganization detection and rollback procedures
- Multi-canister state consistency restoration after failures
- State consistency validation under network stress conditions

**Error Recovery and Rollback:**
**Bitcoin Network Recovery:**
- Chain reorganization detection and rollback procedures
- Multi-canister state consistency restoration protocols
- UTXO management and recovery procedures for complex operations
- Transaction monitoring resumption procedures after failures

**Operation Resilience:**
- Step-level retries: Individual step failures don't abort entire operations
- Operation state maintained across agent restarts
- Graceful degradation: Operations continue if non-critical steps fail
- Automatic cleanup: Completed operations removed after appropriate retention periods

**Stable Memory Architecture:**
**KongSwap State Management Pattern:**
- All state related to liquidity pools, swaps, and liquidity management maintained in stable memory
- State persistence across canister upgrades and restarts
- Background monitoring and cleanup processes for state maintenance
- Stable memory utilization ensuring vast data handling without constant snapshots

**Data Consistency Requirements:**
- Byzantine fault tolerance for bridge operations across multiple networks
- Consensus validation for multi-provider RPC operations (EVM and Solana)
- State synchronization across distributed canister architecture
- Rollback and recovery procedure validation for production deployment

## User Transaction Flows
### Complete User Journey Mapping
**Bitcoin Deposit Journey:**
1. Frontend: `startDeposit('BTC')` triggered from asset card
2. Backend: ckBTC Minter generates unique Bitcoin address via `get_btc_address({owner: principal})`
3. User: External wallet (Ledger/Trezor/Electrum/Core) sends BTC to generated address
4. System: Bitcoin Canister detects transaction and validates confirmations (6+ required)
5. System: ckBTC Minter mints equivalent ckBTC via `update_balance({owner: principal})`
6. User: ckBTC available in sovereign MyHut canister via ckBTC Ledger

**Bitcoin Withdrawal Journey:**
1. User: Select 'BTC' in TO dropdown → `setToAsset('BTC')`
2. System: Validate sufficient ckBTC balance via Ledger `icrc1_balance_of()`
3. User: Approve ckBTC burn via `icrc2_approve()` on Ledger
4. System: Execute `retrieve_btc_with_approval()` on Minter
5. System: ckBTC Minter burns tokens and creates Bitcoin transaction via threshold ECDSA
6. User: Receive BTC at specified address after network confirmation

**Ethereum Deposit Journey:**
1. Frontend: `startDeposit('ETH')` triggered from asset card
2. Backend: Ethereum wallet connection via MetaMask/WalletConnect
3. User: External wallet transaction signing with gas fee estimation
4. System: EVM RPC canister monitors transaction via `eth_getTransactionReceipt()`
5. System: Transaction confirmation tracking via `eth_getBlockByNumber()` 
6. User: Assets available in sovereign MyHut canister

**Ethereum Withdrawal Journey:**
1. User: Select 'ETH' in TO dropdown → `setToAsset('ETH')`
2. System: Gas estimation via EVM RPC `eth_feeHistory()` for optimal fees
3. User: Transaction signing via connected Ethereum wallet
4. System: Broadcast transaction via `eth_sendRawTransaction()` through EVM RPC
5. System: Monitor confirmation status via multi-provider consensus
6. User: Receive ETH at specified address after network confirmation

**Solana Deposit Journey:**
1. Frontend: `startDeposit('SOL')` triggered from asset card
2. Backend: Solana wallet connection via Phantom/Solflare/Backpack
3. User: External wallet transaction signing with SPL token approval
4. System: SOL RPC canister monitors transaction via `sol_getTransaction()`
5. System: Fast confirmation tracking via multi-provider consensus
6. User: SPL assets available in sovereign MyHut canister

**Solana Withdrawal Journey:**
1. User: Select 'SOL' in TO dropdown → `setToAsset('SOL')`
2. System: Health check via SOL RPC `sol_getHealth()` for optimal routing
3. User: Transaction signing via connected Solana wallet with Ed25519
4. System: Broadcast transaction via `sol_sendTransaction()` through SOL RPC
5. System: Monitor confirmation status via multi-provider aggregation
6. User: Receive SOL/SPL tokens at specified address after network confirmation

**DEX Trading Journey (Within MyHut Canister):**
1. User: Select FROM and TO assets in MyHut interface → triggers quote aggregation
2. System: MyHut canister queries both KongSwap and ICPSwap for optimal pricing
3. System: Route optimization logic - direct pair vs hub routing (ICP intermediate)
4. User: Review aggregated quotes and slippage estimates within MyHut interface
5. User: Approve transaction within MyHut canister (no external DEX navigation)
6. System: MyHut canister executes trade via direct canister-to-canister calls
7. User: Trade confirmation and updated balances within MyHut sovereign canister

**DEX Liquidity Operations (Within MyHut Canister):**
1. User: Select liquidity pool management within MyHut interface
2. System: MyHut canister queries pool states and LP token positions across both DEXs
3. User: Add/remove liquidity decisions made within MyHut sovereign canister
4. System: Direct canister calls to appropriate DEX (KongSwap single canister vs ICPSwap multi-canister)
5. User: LP token management and fee collection handled within MyHut canister

### Wallet Connection Patterns
**Bitcoin Wallet Integration:**
- Browser wallets: Unisat, Xverse, OKX
- Transaction signing workflow with user confirmation
- Address validation against Minter-generated addresses
- Connection protocols for secure transaction creation

**Ethereum Wallet Integration:**
- Browser wallets: MetaMask, Coinbase Wallet, WalletConnect
- ERC-20 token approval workflows (USDC, USDT)
- EIP-1559 transaction signing with gas priority selection
- Multi-token transaction coordination
- Connection protocols: Web3Provider injection, WalletConnect v2
- Transaction validation: Gas estimation via EVM RPC `eth_feeHistory()`
- Nonce management: Automatic via `eth_getTransactionCount()` queries

**Solana Wallet Integration:**
- Browser wallets: Phantom, Solflare, Backpack, Glow
- SPL token transaction support (USDC, USDT, other SPL tokens)
- Associated Token Account creation and management
- High-speed transaction processing capabilities
- Connection protocols: Solana Wallet Adapter standard
- Transaction validation: Fee estimation via SOL RPC health monitoring
- Ed25519 signature verification for transaction authenticity

**ICP Wallet Integration:**
- Plug wallet and ICP-compatible wallets
- ICRC-1 token standard integration for ckBTC/ckETH/ckUSDC/ckUSDT/ckSOL
- No external RPC canisters needed (assets already on IC)

### Cross-Chain Transaction Sequences
**Bitcoin Chain Fusion Sequence:**
```
External Bitcoin Wallet → Bitcoin Network → Bitcoin Canister → ckBTC Minter → ckBTC Ledger → MyHut Canister
```

### Error Handling and Recovery Procedures
**Bitcoin Error Scenarios:**
- Insufficient confirmations: Wait for additional blocks
- Failed address generation: Retry via Minter canister
- UTXO validation failure: Bitcoin Canister consensus verification
- Network congestion: Priority-based timing recommendations

**Ethereum Error Scenarios:**
- Provider consensus failures: Retry with different provider subset
- "TooFewCycles" errors: Increase cycle allocation for multi-provider calls
- "already known" transaction errors: Normal for broadcast operations (check with `eth_getTransactionCount`)
- Nonce management: Automatic via `eth_getTransactionCount` at Latest block
- Gas estimation failures: Fallback to recent fee history analysis

**EVM RPC Error Handling:**
```javascript
// Multi-provider result handling pattern
switch (result) {
  case (#Consistent(#Ok(data))) {
    // All providers agree - process data
    processSuccessfulResult(data)
  };
  case (#Consistent(#Err(error))) {
    // All providers report same error - handle gracefully
    handleConsistentError(error)
  };
  case (#Inconsistent(results))) {
    // Providers disagree - requires manual intervention
    logInconsistentResults(results);
    retryWithDifferentProviders()
  };
}
```

**Solana Error Scenarios:**
- Fast block times (400ms): Limited support for `getLatestBlockhash` due to consensus issues
- IPv6 requirements: Some Solana Foundation public RPC endpoints not supported on mainnet
- Provider aggregation failures: Retry with different provider subset
- Ed25519 signature validation: Transaction replay prevention and authenticity verification
- SPL token account creation: Associated Token Account setup and validation

**Solana RPC Error Handling:**
```javascript
// Multi-provider consensus handling for Solana
switch (result) {
  case (#Consistent(#Ok(data))) {
    // All Solana providers agree - process data
    processSolanaResult(data)
  };
  case (#Consistent(#Err(error))) {
    // All providers report same error - handle gracefully
    handleSolanaError(error)
  };
  case (#Inconsistent(results))) {
    // Providers disagree due to fast block times - requires retry strategy
    logSolanaInconsistency(results);
    retryWithConsensusStrategy(results)
  };
}
```

**Solana Consensus Strategy:**
- 3-out-of-5 validation: Query 5 providers, succeed if ≥3 agree
- Fast block adaptation: Special handling for rapidly changing responses
- Temporal canonicalization: Response transformation for consensus alignment

### Gas Fee Optimization Strategies
**Network-Specific Optimization:**

**Bitcoin Fee Optimization:**
- **Priority-Based Timing**: High (10-20 min), Medium (30-60 min), Low (1-3 hours), Economy (3+ hours)
- **Mempool Analysis**: Real-time transaction backlog and fee competition monitoring
- **Dynamic Fee Calculation**: Replaces hardcoded `0.0005 BTC` with mempool-based estimation
- **KYT Integration**: Know Your Transaction compliance fees included in total cost
- **Fee Spike Protection**: Warnings and alternative timing suggestions during network congestion

**Ethereum Fee Optimization:**
- **EIP-1559 Dynamic Calculation**: `(baseFee + priorityFee) * gasLimit + processingFee`
- **Network Congestion Analysis**: Automatic priority recommendations during high load
- **Gas Limit Optimization**: Token-specific limits (21k ETH vs 65k ERC-20 transfers)
- **Separate Gas Management**: ERC-20 deposits require separate ckETH balance for gas payment
- **Multi-Provider Consensus**: Gas estimation via EVM RPC canister with fallback providers

**Solana Fee Optimization:**
- **Predictable Low Fees**: ~$0.0001 vs $3+ for Ethereum transactions
- **Fast Confirmation**: 0.4 second average slot time vs 12+ seconds for Ethereum
- **Stable Fee Structure**: More predictable costs than Bitcoin/Ethereum volatility
- **SPL Token Efficiency**: Associated Token Account creation optimized for multi-token operations

**Agent-Level Optimization:**
**Dynamic Fee Replacement Architecture:**
```javascript
// Replace all hardcoded fees with intelligent estimation
BitcoinRPCAgent: 0.0005 BTC → mempool.getCurrentFees()
EVMRPCAgent: 0.003 ETH → eth_feeHistory() + EIP-1559 calculation  
SVMRPCAgent: 0.001 SOL → sol_getHealth() + network analysis
```

**Fallback Architecture for Reliability:**
- **Primary**: RPC Canister integration for accurate network data
- **Secondary**: Public endpoint APIs for redundancy
- **Tertiary**: Cached reasonable defaults for service continuity

**Caching Strategy:**
- **Fee Data Caching**: 30-60 seconds to avoid excessive RPC calls
- **Error Handling**: Graceful degradation to estimated fees when RPC fails
- **Performance**: Async fee loading without blocking UI interactions

**DEX Fee Optimization:**
**Hub Routing Cost Reduction:**
```javascript
// Example optimization scenario
Direct Route: ckBTC → ckUSDC (3.2% slippage)
Hub Route: ckBTC → ICP → ckUSDC (0.8% total slippage)
Savings: 2.4% execution cost reduction via deeper ICP liquidity
```

**Cross-DEX Quote Aggregation:**
- **Real-time Comparison**: KongSwap (0.3% fee) vs ICPSwap (fee tiers vary by pool; 0.3% common default)
- **Route Optimization**: >2.0% slippage triggers automatic hub routing via ICP
- **Multi-hop Fee Calculation**: Total execution cost analysis (DEX fees + platform fees)

**Performance Optimization:**
- **Real-time Analysis**: Route optimization completes within 2-3 seconds
- **API Rate Management**: Respect DEX API rate limits with intelligent caching
- **Timeout Handling**: Reasonable timeouts with fallback mechanisms
- **Monitoring**: Track RPC canister availability and response times for optimization

**User Experience Optimization:**
- **Fee Transparency**: Clear display of all fee components and optimization reasoning
- **Priority Selection**: User-configurable priority levels (urgent/fast/standard/slow/economy)
- **Alternative Timing**: Suggestions for optimal execution timing during fee spikes
- **Cost Comparison**: Side-by-side comparison of direct vs optimized routing options

## Protocol Integration Specifications
### Blockchain Network Integrations
**Bitcoin Network Integration:**
- Network access via Bitcoin Canister (subnet: w4rem-dv5e3...)
- Real-time mempool fee estimation replacing hardcoded `0.0005 BTC`
- UTXO management for withdrawal operations
- Network confirmation tracking and validation

**Ethereum Network Integration:**
- EVM RPC Canister: `7hfb6-caaaa-aaaar-qadga-cai`
- Chain Fusion via ICP HTTPS outcalls to multiple Ethereum RPC providers
- Supported networks: Ethereum mainnet, Sepolia testnet, L2 chains (Arbitrum One, Base, Optimism)
- Dynamic fee estimation via `eth_feeHistory()` replacing hardcoded `0.003 ETH`

**EVM RPC Methods:**
- `eth_feeHistory()`: Gas price estimation for transaction optimization
- `eth_getLogs()`: Event monitoring and transaction validation
- `eth_getBlockByNumber()`: Block confirmation and network status
- `eth_getTransactionCount()`: Nonce management for transaction sequencing
- `eth_getTransactionReceipt()`: Transaction confirmation and status
- `eth_sendRawTransaction()`: Signed transaction broadcast
- `eth_call()`: Smart contract state queries and validation

**EVM RPC Providers:**
- Primary: Alchemy, Ankr, BlockPI (multi-provider consensus)
- Fallback: Cloudflare Web3, Public Node, LlamaNodes
- Rate limiting: Provider-specific with automatic failover
- Consensus validation: Consistent results across 3+ providers

**Solana Network Integration:**
- SOL RPC Canister: NNS-controlled service canister for Solana blockchain interaction
- Chain Fusion via ICP HTTPS outcalls to multiple Solana RPC providers
- Supported networks: Solana mainnet, Devnet, custom provider configurations
- Dynamic fee estimation replacing hardcoded `0.001 SOL`
- Threshold Ed25519 signatures for secure transaction signing

**Solana RPC Methods:**
- `sol_getHealth()`: Network health and provider status validation
- `sol_getBalance()`: SPL token and SOL balance queries
- `sol_getTransaction()`: Transaction confirmation and receipt validation
- `sol_getLatestBlockhash()`: Limited support due to fast block times (400ms)
- `sol_getAccountInfo()`: Account state and ownership verification
- `sol_sendTransaction()`: Signed transaction broadcast to network

**Solana RPC Providers:**
- Primary: Helius, Alchemy, Ankr, dRPC (multi-provider consensus)
- Fallback: PublicNode and custom provider endpoints
- Aggregation strategies: 3-out-of-5 consensus validation
- API keys optional but recommended for authenticated provider tiers
- IPv6 requirement: All providers must support IPv6 HTTPS

### DEX Protocol Connections
**KongSwap Integration:**
- Main Canister: `2ipq2-uqaaa-aaaar-qailq-cai`
- Single canister architecture with stable memory state management
- AMM model using constant product formula (x * y = k)
- Trading fees: 0.3% distributed proportionally to liquidity providers
- Router with pathfinding algorithm: 2-hop maximum, uses ICP as an intermediate
- Cross-chain interoperability via threshold cryptography integration

**ICPSwap Integration:**
- SwapFactory: `ososz-6iaaa-aaaag-ak5ua-cai`
- PositionIndex: `p7awx-raaaa-aaaag-ak5tq-cai` 
- SwapFeeReceiver: `ovpun-tqaaa-aaaag-ak5uq-cai`
- SwapCalculator: `phr2m-oyaaa-aaaag-qjuoq-cai`
- Multi-canister specialized architecture for complex liquidity management
- EXT token standard support (WICP integration)
- Advanced position management and fee collection systems

**MyHut Sovereign Canister DEX Integration:**
- Direct canister-to-canister calls to DEX protocols
- No external redirects or iframe integrations
- Quote aggregation across both KongSwap and ICPSwap for optimal pricing
- ICP as liquidity hub for cross-DEX routing when direct pairs unavailable
- Slippage optimization: Use hub routing when direct pair slippage >2.0%

### External Wallet Compatibility
**Bitcoin Wallet Integration:**
- Browser wallets: Unisat, Xverse, OKX
- Transaction signing and broadcast capabilities
- Address validation against Minter-generated addresses
- Connection protocols for deposit and withdrawal operations

**Ethereum Wallet Integration:**
- Browser wallets: MetaMask, Coinbase Wallet, WalletConnect
- ERC-20 token approval and transfer support
- EIP-1559 transaction signing capabilities
- Multi-token support (ETH, USDC, USDT)

**Solana Wallet Integration:**
- Browser wallets: Phantom, Solflare, Backpack, Glow
- SPL token support for USDC transactions
- Associated Token Account creation
- High-throughput transaction capabilities

**ICP Wallet Integration:**
- Plug wallet and ICP-compatible wallets
- ICRC-1 token standard integration for ckBTC/ckETH/ckUSDC/ckUSDT/ckSOL
- No external RPC canisters needed (assets already on IC)

### RPC Provider Configuration
**Bitcoin RPC Architecture:**
```javascript
// Mainnet Integration Notes:
// Primary: Bitcoin RPC Canister on ICP
// - Canister ID: [Bitcoin Canister subnet]
// - Method: getBitcoinFeeRates()
// - Returns: { high, medium, low, economy } in sat/vB
//
// Fallback 1: Bitcoin Core RPC
// - Method: estimatesmartfee(blocks)
// - Rate limit: 100 requests/hour
//
// Fallback 2: mempool.space API  
// - Endpoint: https://mempool.space/api/v1/fees/recommended
// - Rate limit: 10 requests/minute
```

### API Endpoint Documentation

## Current Implementation
### Demo Environment Configuration
**Hardcoded Values (Demo Required):**
- Bitcoin fees: `0.0005 BTC` in `universal_fee_rules.ts` - `getL1GasAmount()` function
- Ethereum fees: `0.003 ETH` in `universal_fee_rules.ts` - `getL1GasAmount()` function  
- Solana fees: `0.001 SOL` in `universal_fee_rules.ts` - `getL1GasAmount()` function
- Purpose: Predictable demo behavior and testing consistency

**Frontend Integration (Demo):**
- Bitcoin trigger: `startDeposit('BTC')` from asset cards
- Asset selection: `setToAsset('BTC')` in TO dropdown
- Component: Dashboard.tsx FROM dropdown integration
- Authentication: Internet Identity integration bypassed for demo testing

### Feature Completeness Matrix
**Bitcoin Integration Status:**
- ✅ Demo hardcoded fee structure
- ✅ Frontend trigger mapping
- 🚧 BitcoinRPCAgent development prototype; verification pending (tests & demos to confirm))
- 🚧 Multi-canister coordination patterns
- 🚧 External wallet integration
- 🚧 Production dynamic fee estimation

**Ethereum Integration Status:**
- ✅ Demo hardcoded fee structure 
- ✅ Frontend trigger mapping
- 🚧 EVM RPC Agent development (EVM RPC canister integration required)
- 🚧 Multi-provider consensus coordination
- 🚧 External wallet integration (MetaMask, WalletConnect)
- 🚧 Production dynamic fee estimation via `eth_feeHistory()`

**Solana Integration Status:**
- ✅ Demo hardcoded fee structure
- ✅ Frontend trigger mapping  
- 🚧 SOL RPC Agent development (NNS-controlled service canister integration required)
- 🚧 Multi-provider consensus coordination
- 🚧 External wallet integration (Phantom, Solflare, Backpack)
- 🚧 Production dynamic fee estimation via SOL RPC health monitoring

**DEX Integration Status:**
- ✅ Demo routing logic and slippage optimization (FROM/TO asset selection)
- ✅ Frontend trigger mapping for DEX selection (`setSelectedDEX('KongSwap')` / `setSelectedDEX('ICPSwap')`)
- 🚧 DEX Routing Agent development (dual-protocol quote aggregation required)
- 🚧 MyHut canister-to-canister DEX integration
- 🚧 KongSwap router API integration (pathfinding algorithm)
- 🚧 ICPSwap multi-canister coordination (SwapFactory, PositionIndex, etc.)
- 🚧 Cross-DEX liquidity management within MyHut sovereign canisters

**Agent System Status (Honest Assessment):**
- **Prototype Stage**: 7 agents exist as proof-of-concept demonstrations
- **Test Results**: Basic functionality validated, NOT production readiness
- **Architecture Gaps**: All agents require significant multi-canister coordination development
- **Integration Missing**: No agents properly integrate with ICP Chain Fusion architecture
- **Development Needed**: Extensive work required for production deployment

**Individual Agent Readiness:**
- 🟡 **MasterAgent**: Prototype coordination logic, needs multi-canister orchestration
- 🟡 **BitcoinRPCAgent**: Single-canister prototype, needs 5-canister Bitcoin coordination  
- 🟡 **EVMRPCAgent**: Basic RPC prototype, needs EVM RPC canister (7hfb6-caaaa-aaaar-qadga-cai) integration
- 🟡 **SVMRPCAgent**: Standard prototype, needs NNS SOL RPC canister integration
- 🟡 **DEXRoutingAgent**: External API prototype, needs MyHut canister-to-canister integration
- 🟡 **HutFactoryAgent**: Basic factory prototype, needs user consent and upgrade mechanisms
- 🟡 **TransactionMonitorAgent**: Simple monitoring prototype, needs cross-chain correlation

**Production Development Gap:**
Current prototypes demonstrate basic concepts but require complete architectural overhaul for multi-canister, consensus-based, Chain Fusion integration.

### Known Limitations and Technical Debt
**Current Demo Limitations:**
- Hardcoded network fees prevent real-time optimization
- Internet Identity authentication bypassed
- Agent coordination patterns documented but require development
- Multi-canister Bitcoin integration requires development
- External wallet APIs not yet integrated

**Agent System Critical Limitations:**
- **Architecture Gap**: All agents designed for single-canister interactions, production requires multi-canister coordination
- **Chain Fusion Missing**: No integration with ICP's threshold cryptography (ECDSA/Ed25519)
- **Consensus Logic**: Missing multi-provider consensus validation for EVM and Solana operations  
- **State Management**: No distributed state coordination across canister boundaries
- **Error Handling**: Prototype-level error handling, production requires comprehensive rollback mechanisms
- **MyHut Integration**: DEX operations assume external API calls, need sovereign canister integration

**Specific Agent Gaps:**
- **BitcoinRPCAgent**: Assumes single Bitcoin canister, needs 5-canister coordination architecture
- **EVMRPCAgent**: Missing EVM RPC canister integration and multi-provider consensus
- **SVMRPCAgent**: Lacks Solana-specific fast-block consensus and IPv6 provider management
- **DEXRoutingAgent**: External API focused, needs MyHut canister-to-canister quote aggregation
- **MasterAgent**: No multi-canister workflow orchestration capabilities
- **TransactionMonitorAgent**: Basic monitoring, lacks cross-chain correlation
- **HutFactoryAgent**: Missing user consent mechanisms and upgrade procedures

**Development Honesty:**
Current agent system represents early prototyping work, not production-ready Chain Fusion integration. Significant architectural development required.

## Current Status & Gaps (Canonical)
-  **Overall:** End‑to‑end demo works with prototypes; production hardening pending.
- **Agents:** All agents are prototypes unless explicit tests/proofs are linked.
- **Limits:** Replace assumed limits with measured metrics (latency, response sizes, cycle costs).
- **Security:** Document ckBTC custody model and Chain‑Key trust assumptions in one place and link from user journeys and threat model.

## Development Roadmap
### Immediate Priorities
### Implementation Phases
### Bitcoin Integration Phases

**Phase 1: Multi-Canister Coordination**
- Replace demo hardcoded fees with Bitcoin Canister dynamic estimation
- Implement BTCRPC Agent coordination across 5 canisters
- Bitcoin wallet API integration for testing

**Phase 2: Production Security**
- Threshold ECDSA validation
- Multi-canister state consistency
- 6+ confirmation tracking via Minter configuration

### Ethereum Integration Phases

**Phase 1: EVM RPC Integration**
- Replace demo hardcoded fees with EVM RPC dynamic estimation
- Implement EVM RPC Agent coordination with canister `7hfb6-caaaa-aaaar-qadga-cai`
- Multi-provider consensus validation (Alchemy, Ankr, BlockPI)
- Ethereum wallet API integration for testing

**Phase 2: Production EVM Security**
- EIP-1559 transaction validation and optimization
- Multi-provider failover and rate limiting
- Smart contract interaction patterns
- L2 chain integration (Arbitrum, Base, Optimism)

### Solana Integration Phases

**Phase 1: SOL RPC Integration**
- Replace demo hardcoded fees with SOL RPC dynamic estimation
- Implement SOL RPC Agent coordination with NNS-controlled service canister
- Multi-provider consensus validation (Helius, Alchemy, Ankr, dRPC)
- Solana wallet API integration for testing

**Phase 2: Production Solana Security**
- Ed25519 threshold signature validation and optimization
- Multi-provider failover and IPv6 requirement compliance
- SPL token interaction patterns and Associated Token Account management
- Fast block time consensus strategy implementation

### DEX Integration Phases

**Phase 1: Quote Aggregation & Routing**
- Implement DEX Routing Agent with dual-protocol support
- MyHut canister quote aggregation from KongSwap and ICPSwap
- Route optimization logic: direct pairs vs hub routing (ICP)
- Slippage calculation and >2.0% threshold hub routing triggers

**Phase 2: Trading & Liquidity Management**
- Direct canister-to-canister trade execution within MyHut canisters
- KongSwap router pathfinding integration (2-hop maximum)
- ICPSwap multi-canister coordination (SwapFactory, PositionIndex, SwapCalculator)
- LP token management and automated fee collection within MyHut sovereignty


## Testing (Canonical)

### A. Testing Overview
- **Purpose:** Define pass/fail philosophy for POC vs. production readiness.
- **Read this first:** See Provider Configuration and DEX Integrations (Canonical Reference).
- **Agent Testing Framework:**
  - Test execution: `node src/agents/test_all_agents.js`
  - Coverage: 36 individual tests; 6 integration tests
  - Areas: Agent health, frontend integration, multi-step coordination, error handling

### B. Environment & Framework

#### Local Development Setup

**Bitcoin dfx Integration**
- Local Bitcoin subnet simulation for development
- ckBTC Minter/Ledger local deployment patterns
- External wallet testing environment
- Multi-canister coordination testing

**EVM RPC dfx Integration**
```json
// dfx.json configuration for EVM RPC canister
{
  "canisters": {
    "evm_rpc": {
      "type": "pull",
      "id": "7hfb6-caaaa-aaaar-qadga-cai"
    }
  }
}
```

**Solana RPC dfx Integration**
```json
// dfx.json configuration for SOL RPC canister
{
  "canisters": {
    "sol_rpc": {
      "type": "custom",
      "candid": "https://github.com/dfinity/sol-rpc-canister/releases/latest/download/sol_rpc_canister.did",
      "wasm": "https://github.com/dfinity/sol-rpc-canister/releases/latest/download/sol_rpc_canister.wasm.gz",
      "init_arg": "(record {})"
    }
  }
}
```

**EVM Development Commands**
```bash
# Local EVM RPC setup
dfx start --background
dfx deps pull
dfx deps init evm_rpc --argument '(record {})'
dfx deps deploy

# Alternative: Custom Wasm deployment
dfx deploy evm_rpc --argument '(record {})'
```

**Solana Development Commands**
```bash
# Local SOL RPC setup  
dfx start --background
dfx deploy sol_rpc --argument '(record {})'

# Mainnet deployment (requires API key management)
dfx deploy sol_rpc --network ic --argument '(record {})'

# Update API keys for authenticated providers
dfx canister call sol_rpc updateApiKeys '(vec { record { 0 : nat64; opt "YOUR-HELIUS-API-KEY" } })'
```

**File Structure**
- Primary: `src/hodlhut_frontend/assets/universal_fee_rules.ts`
- Secondary: `src/hodlhut_frontend/src/components/Dashboard.tsx`
- Agents: `src/agents/MasterAgent.js` through `src/agents/TransactionMonitorAgent.js`

**Solana RPC Testing Examples**
```bash
# Test network health across providers
dfx canister call sol_rpc sol_getHealth '(variant{Mainnet}, null)' --wallet $(dfx identity get-wallet)

# Test devnet connectivity  
dfx canister call sol_rpc sol_getHealth '(variant{Devnet}, null)' --wallet $(dfx identity get-wallet)

# Test custom provider configuration
dfx canister call sol_rpc sol_getHealth '(variant{Custom=vec{record{network="https://mainnet.helius-rpc.com/"}}}, null)' --wallet $(dfx identity get-wallet)

# Test balance queries
dfx canister call sol_rpc sol_getBalance '(variant{Mainnet}, null, "ACCOUNT_PUBKEY")' --with-cycles=1000000000 --wallet $(dfx identity get-wallet)

# Test transaction status
dfx canister call sol_rpc sol_getTransaction '(variant{Mainnet}, null, "TRANSACTION_SIGNATURE")' --with-cycles=1000000000 --wallet $(dfx identity get-wallet)
```

### C. How to Run (Local)
- Pre-reqs: dfx version, node/cargo versions, identities.
- Bootstrap: deploy sequence (Bitcoin Canister → Minter → Ledger → Index → Archive; EVM/SOL → DEX adapters).
- Single-command entrypoints: `npm run test:local:agents`, `npm run test:local:integration`.
- Artifacts: see “Results storage” paths in each suite below.

### D. How to Run (Mainnet / Boundary-NET)
- Safety: prefer read-only methods; gate state-changing ops.
- Provider keys (env vars), rate limits, cycle/cost notes.
- Entrypoints: `npm run test:mainnet:*`.
- Approvals: note any governance/activation windows required.

### E. Agent Test Suites (Canonical)

#### BitcoinRPCAgent
- Purpose: Fee percentile estimation, mempool snapshot, tx lookup, block/headers fetch; cross-check with ckBTC Minter expectations.
- Dependencies: Bitcoin Canister, ckBTC Minter & Ledger (read), index canister.
- Commands (Local): `npm run test:local:btc`
- Commands (Mainnet/Boundary): `BTC_PROVIDERS=... npm run test:mainnet:btc`
- Assertions:
  - Fee estimate within tolerance vs. ckBTC Minter estimator
  - Block header chain verifies POW/difficulty and height continuity
  - Tx lookup handles reorgs and status transitions correctly
**Expected Output**
- Block header continuity report (height/difficulty, POW verified)
- Mempool fee-bucket histogram (p50/p90/p95 estimates)
- Tx status transitions (unconfirmed → confirmed)
- Fee comparison vs. ckBTC Minter estimator (delta in sats/vB)
**Known Issues/Flakes**
- Short-lived divergence during reorgs (height/headers mismatch)
- Occasional 429/5xx from public RPC providers
- Minor race on “latest” height across providers during peaks
**Artifacts**
- `docs/test-results/<date>/agents/bitcoin_rpc.junit.json`

#### EVMRPCAgent
- Purpose: Multi-provider quorum (n-of-m), payload size/latency metrics, JSON-RPC conformance, error-shape handling (429/5xx).
- Dependencies: EVM RPC canister, provider keys (optional but recommended), quorum config.
- Commands (Local): `npm run test:local:evm`
- Commands (Mainnet/Boundary): `EVM_PROVIDERS=... EVM_QUORUM=n/m npm run test:mainnet:evm`
- Assertions:
  - Quorum satisfied across providers for `eth_blockNumber`, `eth_getBlockByNumber`, `eth_call`
  - Rejects divergent results; retries/backoff on throttling
  - Captures payload size and p95 latency
- Expected Output: Quorum decision logs + per-provider timings
- Known Issues/Flakes: Divergent `latest` block across providers; throttle windows
- Artifacts: `docs/test-results/<date>/agents/evm_rpc.junit.json`

#### SVMRPCAgent
- Purpose: Provider health (`getHealth`), recent block/slot consensus, SPL token read calls; note Ed25519 signing constraints/fallbacks.
- Dependencies: SOL RPC canister, provider keys (if used), t-Ed25519 capability (if applicable).
- Commands (Local): `npm run test:local:svm`
- Commands (Mainnet/Boundary): `SVM_PROVIDERS=... SVM_QUORUM=n/m npm run test:mainnet:svm`
- Assertions:
  - Health returns OK across providers; fast-block consensus within N slots
  - SPL token account reads match expected schema/balances
  - (If signing covered) client-side signing fallback works when t-Ed25519 unavailable
- Expected Output: Provider consensus report + slot offsets
- Known Issues/Flakes: Slot drift; RPC method availability differences
- Artifacts: `docs/test-results/<date>/agents/svm_rpc.junit.json`

#### DEXRoutingAgent
- **Purpose:** ICPSwap & KongSwap quotes, pool discovery, and **route optimization with direct vs ICP-bridge routing** (optional extra hubs off by default). LP management smoke tests.
- **Dependencies:** ICPSwap/KongSwap router canisters; canonical DEX config (pool IDs, fee tiers); **ICP as primary bridge asset**; optional extra hubs (e.g., ckUSDC) **only if enabled by config**.
- **Commands (Local):** `npm run test:local:dex`
- **Commands (Mainnet/Boundary):** `DEX_PROVIDERS=... npm run test:mainnet:dex`

- **Assertions:**
  - Quote parity vs on-chain pool state within slippage tolerance.
  - **Route selection minimizes expected cost** across candidates: **direct** (`A→B`) and **ICP-bridge** (`A→ICP→B`) (plus optional hubs if enabled).
  - If direct slippage > **S bps** and ICP-bridge reduces expected cost by **≥ Δ bps**, **ICP-bridge must be chosen**.
  - LP add/remove emits expected events; fee tier reads match canonical config.

- **Expected Output:** Route graph (legs across both DEXes), chosen path, expected execution price, total expected cost (slippage + fees) per candidate.

- **Known Issues/Flakes:** Stale quotes during rapid pool updates; cross-DEX leg mismatch; transient provider throttling; edge cases when direct pool depth changes mid-evaluation causing route flip.

- **Artifacts:** `docs/test-results/<date>/agents/dex_router.junit.json`

#### HutFactoryAgent
- Purpose: Instantiate MyHut canisters, configure permissions, enforce Activation Window governance, guard checks.
- Dependencies: Governance canister (for Activation Window), MyHut WASM, roles/permissions config.
- Commands (Local): `npm run test:local:hutfactory`
- Commands (Mainnet/Boundary): `GOV_ENDPOINT=... npm run test:mainnet:hutfactory`
- Assertions:
  - `create_hut` → MyHut canister deployed and initialized
  - Permission changes require an open Activation Window; blocked otherwise
  - Invalid role assignments rejected; upgrades gated by governance
- Expected Output: Event log with state transitions and guard decisions
- Known Issues/Flakes: Clock skew around window open/close; governance queue delays
- Artifacts: `docs/test-results/<date>/agents/hutfactory.junit.json`

#### TransactionMonitorAgent
- Purpose: Correlate cross-chain events (Bitcoin/EVM/Solana) and track multi-canister operation lifecycles end-to-end.
- Dependencies: Bitcoin Canister, ckBTC Minter & Ledger, EVM RPC canister, SOL RPC canister, event indexers.
- Commands (Local): `npm run test:local:txmon`
- Commands (Mainnet/Boundary): `TXMON_PROVIDERS=... npm run test:mainnet:txmon`
- Assertions:
  - Detect deposit→mint (ckBTC) correlation within N seconds (Minter ↔ Ledger)
  - Handle chain reorg signals and emit rollback events
  - Maintain Pending→Confirmed→Completed state across restarts
- Expected Output: JSONL with operation_id, phase transitions, correlated txids
- Known Issues/Flakes: Provider rate limits; reorg edge cases
- Artifacts: `docs/test-results/<date>/agents/txmon.junit.json`

#### MasterAgent
- Purpose: Orchestrate multi-canister workflows across all agents with health checks and rollback.
- Dependencies: All RPC agents, DEXRoutingAgent, HutFactoryAgent; governance/activation window hooks.
- Commands (Local): `npm run test:local:master`
- Commands (Mainnet/Boundary): `MASTER_ORCH_CONFIG=... npm run test:mainnet:master`
- Assertions:
  - Fan-out/fan-in across ≥3 agents with success quorum
  - Abort + rollback if any critical step fails (e.g., stale DEX quote)
  - Health monitoring: detect and quarantine a failing agent
- Expected Output: Orchestration DAG report (node states, timings, rollbacks)
- Known Issues/Flakes: Cross-agent timeout tuning; partial failure recovery
- Artifacts: `docs/test-results/<date>/agents/master.junit.json`

### F. Integration Scenarios

#### F.0 Coverage Summary
- **Status**: 36 individual tests + 6 integration tests validate basic agent functionality
- **Reality**: Tests confirm proof-of-concept operation, NOT production readiness
- **Limitation**: Tests run against simplified single-canister scenarios
- **Execution**: `node src/agents/test_all_agents.js` (prototype validation only)

> **Production goal:** The scenarios below elevate from single-canister demos to **multi-canister, cross-agent** validation suitable for pre-prod hardening.

---

#### F.1 Multi-Canister Integration (Deposit → Mint (ckBTC) → Swap (DEX) → Ledger Settle)
**Playbook**
1. **Bitcoin deposit** to test address (watch UTXO on Bitcoin Canister).
2. **Mint ckBTC** via Minter after required confirmations.
3. **Balance check** on ckBTC Ledger (ICRC-1).
4. **DEX swap** ckBTC→ckUSDC (hub) on ICPSwap or KongSwap (pick best route).
5. **Settle & verify** post-swap balances and events (Ledger + DEX receipts).
6. **Correlate** with `TransactionMonitorAgent` (see F.2).

**Assertions**
- Deposit→Mint correlation within **N seconds**; correct confirmation count.
- Swap execution price within configured slippage; pool fee tier matches canonical DEX config.
- Final balances match pre-computed expectations.

**Artifacts**
- `docs/test-results/<date>/integration/deposit-mint-swap.junit.json`
- `docs/test-results/<date>/integration/deposit-mint-swap.summary.md`

**Reference**
- See earlier `testBitcoinMultiCanisterCoordination()` example in the **Cross-chain Operation State** section.

**Runner (example)**
```ts
// scripts/integration/deposit-mint-swap.ts
// Usage: npm run test:int:ckbtc-swap
```

---

#### F.2 Agent Coordination (Orchestration)
- See earlier `testBitcoinMultiCanisterCoordination()` example in the **Cross-chain Operation State** section.
- Wires **BitcoinRPCAgent + ckBTC Minter/Ledger + DEXRoutingAgent + TransactionMonitorAgent** end-to-end.

**Readiness Gate**
- Fail unless all participating agents report **healthy** and the governance **Activation Window** (if required) is **open**.

**Artifacts**
- `docs/test-results/<date>/integration/agent-coordination.junit.json`

---

#### F.3 Multi-Chain Readiness (Chain-Key / Chain Fusion Validation)
**What to validate**
- Threshold signature paths: **ECDSA (Bitcoin)**, **Ed25519 (Solana)** (note fallbacks where threshold isn’t available).
- Cross-chain transaction **correlation & monitoring** across agents.
- **Consensus checks** under load (provider quorum for EVM/SVM).
- **Rollback & recovery** behavior on partial failure.

**Runner (skeleton)**
```ts
// scripts/integration/chainkey-readiness.ts
// Validates signer availability, quorum settings, and rollback handlers
```

**Artifacts**
- `docs/test-results/<date>/integration/chainkey-readiness.junit.json`

---

#### F.4 Route Optimization (Direct vs ICP Bridge)

**Playbook**
1. Build a candidate set for `A → B` across **both DEXes** (ICPSwap, KongSwap):
   - **Direct:** `A → B`
   - **ICP bridge:** `A → ICP → B`
   - *(Optional, only if explicitly enabled later: `A → <other hub> → B`, e.g., ckUSDC)*
2. For each candidate, fetch on-chain pool state & quotes and compute **expected total cost**:
   - price impact (slippage) + LP/router fees (+ any bridge costs) per leg
3. Choose the route with **minimum expected cost** subject to slippage guard.
4. (Optional) Execute a small test amount to validate execution vs. quote.

**Assertions**
- Chosen route has **lowest expected cost** among the candidate set.
- If **direct slippage > S bps** and the **ICP bridge** path is cheaper by **≥ Δ bps**, the router chooses the ICP bridge.
- Quotes align with pool state within tolerance; each leg’s fee tier matches canonical DEX config.

**Examples**
```bash
# Evaluate candidates for ckSOL → ckBTC (typical high-slippage case)
dfx canister call my_hut_canister optimize_trade_route \
  '(record { from_token="ckSOL"; to_token="ckBTC"; amount=5000000 })'

# Execute chosen route with slippage guard (example: ICP-bridge)
dfx canister call my_hut_canister execute_swap \
  '(record { route=vec { "ckSOL","ICP","ckBTC" }; amount=5000000; max_slippage_bps=50 })'

```

**Artifacts**
- `docs/test-results/<date>/integration/route-optimization.json`

---

#### F.5 Failure Injection / Resilience
**Faults to inject**
- Provider **429/5xx** throttling; **quorum degrade** (EVM/SVM).
- **Bitcoin reorg** at depth 1–2; confirm downstream rollback.
- **Stale DEX quotes** vs. rapid pool updates; ensure re-quote or abort.
- **Governance window closed**: attempt a guarded action and expect a block.

**Assertions**
- Backoff/retry and quorum logic behave as designed.
- State machine transitions include **rollback events** and finalize correctly.

**Artifacts**
- `docs/test-results/<date>/integration/failure-injection.junit.json`

---

#### F.6 Governance-Gated Operations (Activation Window)
**Playbook**
1. Submit governance proposal to **open** a 30-minute window for a sensitive action (e.g., parameter change).
2. Attempt action **before** open → expect **blocked**.
3. Execute action **during** window → expect **success**.
4. Attempt action **after** window → expect **expired**.

**Assertions**
- Event log contains `ActivationOpened`, `Executed` **or** `Expired/Aborted` with reason.
- HutFactoryAgent guards reject out-of-window calls.

**Artifacts**
- `docs/test-results/<date>/integration/governance-window.junit.json`

### G. Results & Metrics (Latest)
| Agent/Scenario | Network | Tests | Passed | Failed | p95 Latency | Max Payload | Notes | Commit | dfx/replica |
|---|---|---:|---:|---:|---:|---:|---|---|---|
| BitcoinRPCAgent | ic | 12 | 12 | 0 | 650ms | 420KB | reorg p1 handled | abc123 | dfx 0.XX |
| EVMRPCAgent | ic | 10 | 9 | 1 | 780ms | 900KB | 1 provider throttled | abc123 | dfx 0.XX |
| SVMRPCAgent | ic | 8 | 8 | 0 | 410ms | 350KB | slot drift ≤2 | abc123 | dfx 0.XX |
| DEXRoutingAgent | ic | 6 | 6 | 0 | 520ms | 20KB | ICP hub OK | abc123 | dfx 0.XX |
| F.1 Deposit→Mint→Swap | ic | 1 | 1 | 0 | 2.1s | — | slippage 0.18% | abc123 | dfx 0.XX |

### H. Results Storage (Artifacts)
```text
docs/test-results/
  YYYY-MM-DD/
    commit-<sha>/
      agents/
        bitcoin_rpc.junit.json
        evm_rpc.junit.json
        svm_rpc.junit.json
        dex_router.junit.json
        hutfactory.junit.json
        txmon.junit.json
        master.junit.json
      integration/
        deposit-mint-swap.junit.json
        agent-coordination.junit.json
        chainkey-readiness.junit.json
        route-optimization.json
        failure-injection.junit.json
        governance-window.junit.json
      summary.md
      env.json   # dfx/replica, canister IDs, sanitized providers
```

### I. CI/CD Hooks
- **On PR:** lint + `npm run test:local:agents`
- **Nightly:** `npm run test:mainnet:agents` + key integration scenarios (F.1, F.5)
- **Artifacts:** upload `docs/test-results/YYYY-MM-DD/commit-<sha>/…`
- **Merge gate:** block if any “Failed > 0” or if p95 latency regresses >20% vs. previous nightly


## Operational Procedures
### Deployment Process
**Bitcoin Canister Deployment:**
- Deploy to fiduciary subnet with 31+ nodes
- Configure ckBTC Minter/Ledger coordination
- Verify threshold ECDSA functionality
- Test multi-canister communication patterns

**EVM RPC Canister Deployment:**
```bash
# Production deployment to IC mainnet
dfx deploy evm_rpc --network ic --argument '(record {})'

# Configure API keys for authenticated providers
dfx canister call evm_rpc updateApiKeys \
  '(vec { record { 0 : nat64; opt "YOUR-ALCHEMY-API-KEY" } })'

# Verify provider configuration
dfx canister call evm_rpc getProviders
```

**EVM Provider Management:**
- Monitor provider availability and response times
- Configure backup providers for redundancy
- Update API keys for authenticated access
- Set response size estimates for optimal performance

### Monitoring Requirements
**Bitcoin Network Monitoring:**
- Bitcoin Canister subnet health and availability
- ckBTC Minter queue status and processing times
- UTXO validation and confirmation tracking
- Threshold ECDSA operation success rates

**Solana Network Monitoring:**
- SOL RPC canister health and provider availability tracking
- Multi-provider consensus success/failure rates across Helius, Alchemy, Ankr, dRPC
- Transaction broadcast success and confirmation times on fast network
- Ed25519 signature validation success rates and threshold cryptography operations
- SPL token interaction success rates and Associated Token Account creation

**DEX Protocol Monitoring:**
- Quote aggregation accuracy and response times across KongSwap and ICPSwap
- Route optimization effectiveness: direct pairs vs hub routing success rates
- Slippage tracking and >2.0% hub routing trigger accuracy
- MyHut canister-to-canister DEX call success rates and latency
- LP token management operations and automated fee collection rates

**Multi-Chain Monitoring Dashboards:**
- Real-time fee estimation accuracy across all networks
- Cross-chain transaction flow and completion rates
- Wallet integration success rates and error patterns
- DEX routing optimization and slippage tracking


## Governance and Protocol Evolution

### Activation Window (30‑minute) — State Machine
- **Purpose:** Provide a bounded time window for sensitive actions (deploy, upgrade, parameter change) requiring on‑chain confirmation.
- **Initiator:** Governance canister proposal or authorized maintainer multi‑sig.
-  **States:** `Idle → PendingActivation → ActiveWindow → Executed | Expired | Aborted`.
- **Open:** On approval, emit `ActivationOpened{action_id, opens_at, closes_at}`; set closes_at = opens_at + 30m.
- **Execute:** During `ActiveWindow`, only the approved action_id may be executed once; success transitions to `Executed` and closes the window.
- **Expire:** If `now >= closes_at` without execution, transition to `Expired`; re‑proposal required.
- **Abort:** An explicit `AbortActivation(action_id)` is allowed by governance; transitions to `Aborted` with on‑chain reason.
- **Enforcement:** Checked in HutFactory/MyHut guards (pre‑call) and logged in an auditable event stream.

### Upgrade Procedures and Voting Mechanisms
**Bitcoin Canister Governance:**
- ckBTC Minter controlled by NNS Root: `r7inp-6aaaa-aaaaa-aaabq-cai`
- User MyHut canisters require explicit user consent for upgrades
- Cryptographic principal verification for all governance operations
- 30-minute activation windows for new Hut deployments with abort mechanisms

### Community Governance Framework
### Protocol Parameter Management
**Bitcoin Network Parameters:**
- Confirmation requirements: 6+ confirmations (configurable via `min_confirmations`)
- Queue timeout: 10 minutes maximum (`max_time_in_queue_nanos`)
- Withdrawal minimum: 0.0005 BTC (50,000 Satoshi)
- Priority-based timing: High (10-20 min), Medium (30-60 min), Low (1-3 hours), Economy (3+ hours)


## Operational Security and Compliance
### KYT and AML Integration
**Bitcoin Compliance Framework:**
- KYT (Know Your Transaction) fee integration in Bitcoin fee calculation logic
- Real-time transaction analysis for compliance requirements
- Integration with ckBTC Minter for regulatory validation
- Tainted address validation and prevention mechanisms

### Regulatory Compliance Framework
**Chain Fusion Compliance:**
- All ckBTC activity verifiable on-chain
- Transaction validation against tainted Bitcoin addresses
- Compliance checking integrated into minting process
- Regulatory reporting capabilities via transaction tracking

### Incident Response Procedures
**Bitcoin Network Incident Classification:**
- **SEVERITY 1 - CRITICAL**: Active exploitation of Bitcoin Canister or ckBTC Minter systems
- **SEVERITY 2 - HIGH**: Suspicious patterns in Bitcoin transaction flows
- **SEVERITY 3 - MEDIUM**: Minor anomalies in Bitcoin network integration

**Response Procedures:**
- Automatic circuit breakers for Bitcoin operations
- Emergency agent shutdown capabilities
- Cross-chain operation suspension mechanisms
- Real-time monitoring and anomaly detection

### Business Continuity Planning
**Bitcoin Operation Continuity:**
- Multi-source fee estimation fallback procedures
- Bitcoin Canister availability monitoring
- ckBTC Minter backup coordination mechanisms
- UTXO management and recovery procedures

### Disaster Recovery Protocols
**Bitcoin Network Recovery:**
- Chain reorganization detection and rollback procedures
- Multi-canister state consistency restoration
- External wallet reconnection protocols
- Transaction monitoring resumption procedures

## Reference Documentation
### Network and Canister Registry
**Bitcoin Mainnet Canisters:**
- Bitcoin Subnet ID: `w4rem-dv5e3-widiz-wbpea-kbttk-mnzfm-tzrc7-svcj3-kbxyb-zamch-hqe`
- ckBTC Minter: `mqygn-kiaaa-aaaar-qaadq-cai`
- ckBTC Ledger: `mxzaz-hqaaa-aaaar-qaada-cai`
- ckBTC Index: dynamically deployed
- ckBTC Archive: spawned as needed

**Ethereum Mainnet Canisters:**
- EVM RPC Canister: `7hfb6-caaaa-aaaar-qadga-cai`
- Supported Networks: Ethereum (1), Sepolia (11155111), Arbitrum One, Base, Optimism
- Methods: `eth_feeHistory()`, `eth_getLogs()`, `eth_getBlockByNumber()`, `eth_sendRawTransaction()`
- Integration: ic-alloy Rust crate for seamless workflow

**Solana Mainnet Canisters:**
- SOL RPC Canister: NNS-controlled service canister for Solana blockchain interaction
- Supported Networks: Solana mainnet, Devnet, custom provider configurations  
- Methods: `sol_getHealth()`, `sol_getBalance()`, `sol_getTransaction()`, `sol_sendTransaction()`
- Integration: Direct canister-to-canister calls, no API keys required
- Providers: Helius, Alchemy, Ankr, dRPC, PublicNode (IPv6 required)

**DEX Protocol Canisters:**
- KongSwap Main: `2ipq2-uqaaa-aaaar-qailq-cai` (single canister architecture)
- ICPSwap SwapFactory: `ososz-6iaaa-aaaag-ak5ua-cai`
- ICPSwap PositionIndex: `p7awx-raaaa-aaaag-ak5tq-cai`
- ICPSwap SwapFeeReceiver: `ovpun-tqaaa-aaaag-ak5uq-cai`
- ICPSwap SwapCalculator: `phr2m-oyaaa-aaaag-qjuoq-cai`
- ICPSwap PasscodeManager: `pybqd-4yaaa-aaaag-ak5ta-cai`
- Integration: Direct canister-to-canister calls from MyHut canisters

**Authentication Canisters:**
- Internet Identity: `rdmx6-jaaaa-aaaaa-aaadq-cai`

**Governance Canisters:**
- NNS Root: `r7inp-6aaaa-aaaaa-aaabq-cai` (controls ckBTC Minter)

### Configuration Parameters
**Bitcoin Configuration:**
- Minimum withdrawal: `0.0005 BTC` (50,000 Satoshi)
- Confirmation requirements: 6+ confirmations via `min_confirmations` parameter
- Queue timeout: 10 minutes maximum (`max_time_in_queue_nanos`)
- Address format: P2WPKH (bc1q...) for lowest fees

**Ethereum Configuration:**
- Minimum transaction cycles: `2_000_000_000` for basic RPC calls
- **Response size limits:** _To be measured_ on target subnet & dfx version. Provisionally assume up to ~2 MB via HTTPS outcalls; record empirical limits and cycle costs per method.
- Provider consensus: Minimum 3 providers for consistency validation
- Supported chains: Ethereum (1), Sepolia (11155111), Arbitrum One, Base, Optimism
- Gas optimization: Priority-based via `eth_feeHistory` percentile analysis

**EVM RPC Provider Configuration:**
- Primary providers: Alchemy, Ankr, BlockPI (authenticated access)
- Fallback providers: Cloudflare Web3, PublicNode, LlamaNodes
- Rate limiting: Provider-specific with automatic failover
- Custom provider support: Via `Custom` variant with URL and headers

**EVM RPC Cycle Requirements:**
- `eth_feeHistory`: 2,000,000,000 cycles
- `eth_getLogs`: 2,000,000,000 cycles (may require retries for large responses)
- `eth_getBlockByNumber`: 2,000,000,000 cycles  
- `eth_getTransactionCount`: 1,000,000,000 cycles
- `eth_getTransactionReceipt`: 1,000,000,000 cycles
- `eth_sendRawTransaction`: 2,000,000,000 cycles

**DEX Configuration:**
- KongSwap trading fees: 0.3% distributed to liquidity providers
- ICPSwap trading fees: vary by pool (0.3% common default)
- Hub routing threshold: >2.0% slippage triggers ICP intermediate routing
- Route optimization: 2-hop maximum via KongSwap router
- Quote aggregation timeout: Maximum response time for DEX quote queries
- LP token management: Automated fee collection within MyHut sovereign canisters

**File Locations:**
- Fee rules: `src/hodlhut_frontend/assets/universal_fee_rules.ts`
- Dashboard: `src/hodlhut_frontend/src/components/Dashboard.tsx`
- Agent files: `src/agents/[AgentName].js`
- EVM RPC integration: via dfx deps or custom Wasm deployment
- SOL RPC integration: NNS-controlled service canister, direct calls
- DEX integration: Direct canister-to-canister calls from MyHut canisters
- KongSwap documentation: https://kongswap.io/kb/documentation/kongswap-api-documentation
- ICPSwap documentation: https://github.com/ICPSwap-Labs/docs
- ic-alloy documentation: https://ic-alloy.dev/getting-started.html
- SOL RPC canister repository: https://github.com/dfinity/sol-rpc-canister

### API Reference and Specifications
**Standard Integration Patterns:**
- Frontend trigger: `startDeposit(assetType)` for asset deposits
- Asset selection: `setToAsset(assetType)` for destination selection
- DEX selection: `setSelectedDEX('KongSwap')` or `setSelectedDEX('ICPSwap')`
- Authentication: `handleGetHut()` and `handleMyHuts()` in HomePage.tsx

### Troubleshooting and Debug Procedures
**Bitcoin Network Troubleshooting:**
- Verify Bitcoin Canister subnet connectivity
- Check ckBTC Minter queue status and timeout handling
- Validate threshold ECDSA address generation
- Debug multi-canister coordination failures
- Monitor confirmation delays and network congestion

**DEX Integration Troubleshooting:**
- **Quote Aggregation Failures**: Test individual DEX canister connectivity, verify MyHut canister permissions
- **Route Optimization Issues**: Validate slippage calculations, check ICP hub liquidity availability
- **KongSwap Router Issues**: Verify 2-hop pathfinding limitations, check intermediate token availability
- **ICPSwap Multi-Canister Coordination**: Test individual canister responses (SwapFactory, PositionIndex, SwapCalculator)
- **LP Token Management Failures**: Verify position ownership within MyHut canister, check fee collection permissions

**DEX Protocol Debug Commands:**
```bash
# Test KongSwap canister connectivity
dfx canister call 2ipq2-uqaaa-aaaar-qailq-cai get_pool_info '("ICP", "ckBTC")'

# Test ICPSwap SwapFactory connectivity  
dfx canister call ososz-6iaaa-aaaag-ak5ua-cai getPool '("ICP", "ckUSDC")'

# Verify MyHut DEX quote aggregation
dfx canister call my_hut_canister aggregate_dex_quotes '(record {from_token="ICP"; to_token="ckBTC"; amount=1000000})'

# Test route optimization within MyHut
dfx canister call my_hut_canister optimize_trade_route '(record {from_token="KONG"; to_token="ckETH"; amount=5000000; max_slippage=2.0})'
```

**Multi-Chain Debug Strategy:**
- Isolate per-chain issues before debugging cross-chain coordination
- Verify wallet connections independently for each network
- Test individual agent coordination before full system integration
- Monitor fee estimation accuracy across all supported networks

###Tokenomics (TBD)
###Decentralization and Governance Roadmap (TBD)
**Pre-SNS DAO creation to be determined upon addition of revenue collecting features and cycles estimates for mainnet business model
**Revenue Collecting Planned Elements (yet to be developed)
-Revenue currently set at 0.1% swap fee and is adjustable
-My Garden yield farming to be developed
-Reef Raffle and Tsunami Sweep DAO controlled lottery and ReefAgent to be developed.
-Protocol must be live, tested and audited with clear go-to-market strategy, including white paper and full technical rational prior to the introduction of a DAO controlled tokenomics design. 

## Appendix: Performance & Limits
- **HTTPS outcall payload/response sizes:** _Measure_ on your target subnet; record observed max and typical sizes.
- **Cycle costs per method:** _Measure_ and tabulate (median, p95) for Bitcoin, EVM, SVM RPC calls.
- **Latency:** Record end‑to‑end latencies for critical paths (deposit, swap, mint).
-**Versioning:** Note dfx, replica, and agent versions used for measurements.

###Audit Results and Security Reviews (ongoing)
August 25, 2025 1:35 PM PT
