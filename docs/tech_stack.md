# Tech Stack

- **App Framework:** Internet Computer (ICP) canisters (Rust + Motoko) with React frontend
- **Languages:** Rust (ic-cdk), Motoko (selected canisters), TypeScript/JavaScript (frontend & agents)
- **Primary Database:** ICP canister state (stable memory + certified data); on-ledger state via ckBTC/ckUSDC ledgers
- **ORM:** N/A — Candid types + `ic-stable-structures`/custom repository pattern for state
- **JavaScript Framework:** React (latest stable)
- **Build Tool:** Vite
- **Import Strategy:** ES Modules
- **Package Manager:** npm
- **Node Version:** 22 LTS
- **CSS Framework:** Tailwind CSS (latest stable)
- **UI Components:** shadcn/ui + Lucide React icons
- **UI Installation:** npm packages (shadcn/ui generator) within app workspace
- **Font Provider:** Google Fonts
- **Font Loading:** Self-hosted (fallback to Google CDN)
- **Icons:** Lucide React components
- **Application Hosting:** ICP mainnet (`--network ic`) — asset canister + service canisters (Bitcoin/EVM/SOL RPC clients, DEX router, governance)
- **Hosting Region:** N/A — globally replicated across ICP subnets (application + Bitcoin + system)
- **Database Hosting:** ICP canisters (state persisted via stable memory and upgrades)
- **Database Backups:** Upgrade-time stable variable migrations + scheduled state snapshot/export canister methods
- **Asset Storage:** ICP Asset Canister (static frontend, images, WASM)
- **CDN:** ICP Boundary Nodes (built‑in CDN); optional Cloudflare for marketing site
- **Asset Access:** Public by default; private/gated assets via authenticated queries (Internet Identity) and certified responses
- **CI/CD Platform:** GitHub Actions
- **CI/CD Trigger:** Push to `main`/`staging` branches (build, test, canister WASM release, `dfx deploy`)
- **Tests:** Unit (agents/canisters) + Integration (F.1 deposit→mint→swap, F.5 failure injection) run before deploy
- **Production Environment:** ICP mainnet (`dfx deploy --network ic`)
- **Staging Environment:** Local replica (`dfx start`) and/or Boundary‑NET profile (read‑only mainnet tests)

