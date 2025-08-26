# Infra Tech Stack — HodlHut (ICP BTCFi)

> **Scope:** Infra-only view suitable for ops/reliability. Current status: **prototype** in GitHub; no production mainnet writes.

## Source Control & Branching
- **VCS:** Git, GitHub (mono-repo)
- **Default branches:** `main` (release), `staging` (pre-release), feature branches `feat/*`
- **Protection rules:** required reviews (2), status checks (lint + unit), linear history, branch deletion on merge
- **Commit semantics:** Conventional Commits; semantic version tags for WASM artifacts (`vX.Y.Z`)

## Environments
- **Local:** `dfx start` replica; developer identities via `dfx identity`
- **Boundary-NET (read-only):** Mainnet endpoints used for *non-mutating* validation
- **Mainnet (target):** `ic` network for production once gates pass

## Build & Artifacts
- **Frontend build:** Vite → static assets (served by ICP Asset Canister)
- **Canister build:** Rust (`cargo build --release`) & Motoko (`mops`/`vessel`) → WASM binaries
- **Artifacts:** `dist/` (frontend), `target/wasm32-unknown-unknown/release/*.wasm` (Rust), `build/*.wasm` (Motoko)
- **Signing/Integrity:** SHA256 checksum for each WASM; provenance via GitHub Actions build info

## CI/CD
- **Platform:** GitHub Actions
- **Workflows:**
  - `lint-and-test.yml`: PR → lint, unit tests, type-check
  - `build-artifacts.yml`: push to `staging`/`main` → build & upload WASM + front-end
  - `deploy-staging.yml`: manual dispatch → `dfx deploy` to local/Boundary profiles (dry-run)
  - `deploy-mainnet.yml`: *disabled until go-live* (requires approvals + window)
- **Runners:** GitHub-hosted Ubuntu LTS
- **Release channels:** GitHub Releases w/ attached WASM + checksums

## Secrets & Configuration
- **Secrets store:** GitHub Actions Encrypted Secrets + Environment Secrets
- **Config files:** `dfx.json`, `canister_ids.json`, `.env.example` (no secrets), `vite.config.ts`
- **Provider keys:** ckBTC/Bitcoin/EVM/SOL RPC keys stored as **environment** secrets; masked in logs
- **Rotation:** on merge to `main` or key compromise; documented in Runbook

## Access Control & Auth
- **Repo:** least-privilege GitHub Teams; CODEOWNERS for canister directories
- **Deploy:** OIDC from GitHub Actions; canister controllers limited to deployer principal(s)
- **User auth:** Internet Identity (II) in-app; not part of infra pipeline

## Hosting / Execution
- **Platform:** Internet Computer Protocol (ICP)
- **Canister types:**
  - **Asset canister:** static front-end
  - **Service canisters:** Bitcoin/EVM/SOL RPC clients, DEX router, governance/HutFactory, monitoring
- **Subnet targets:** app subnet(s); Bitcoin subnet for L2 interactions (read)
- **Deployment:** `dfx deploy --network ic` (gated); staging via local replica scripts

## Storage & Backups
- **State:** Canister stable memory + certified variables
- **Backups (proto):** on-demand export via candid methods → snapshot JSON in `docs/state-snapshots/`
- **Ledgers:** ckBTC/ckUSDC ledgers serve as source-of-truth for balances (not backed up by app)

## Networking & Domains
- **Access:** ICP boundary nodes (built-in CDN)
- **Custom domain (future):** Route via ICP HTTP Gateway or Cloudflare in front of marketing site
- **CORS:** locked to app origin(s)

## Observability & Ops
- **Logs:** `dfx canister log <id>` locally; structured logs in JSON
- **Metrics (proto):** ad-hoc counters exposed via candid (todo: Prometheus bridge)
- **Health checks:** heartbeat endpoints (query) per canister; CI smoke test post-deploy
- **Cycle management:** alerts when cycles < threshold; refill runbook

## Security
- **Supply chain:** Dependabot (npm/cargo), `cargo audit`, `npm audit` in CI
- **Static analysis:** `clippy -D warnings`, TypeScript strict mode; optional CodeQL (enable when ready)
- **Secrets hygiene:** no plaintext keys in repo; CI redaction; review filters on logs
- **Governance gates:** Activation Window enforcement for sensitive ops

## Disaster Recovery
- **Strategy:** re-deploy from Git + WASM artifacts; restore stable-state from latest snapshot
- **RPO/RTO (target):** RPO ≤ 24h (snapshot cadence); RTO ≤ 2h (automated redeploy)

## Cost & Quotas
- **Cycles:** track per-canister burn; budget alerts
- **CI minutes:** GitHub Actions usage caps; artifact retention 90d

## Roadmap to Production (Infra)
1. Enable CodeQL + OIDC deploy with environment protection gates
2. Add Prometheus/Grafana bridge (metrics canister → sidecar)
3. Nightly Boundary-NET read-only tests (F.1, F.5) with trend reports
4. Implement snapshot/restore automation (`make snapshot|restore`)
5. Turn on mainnet deploy with multi-approver + activation window schedule

