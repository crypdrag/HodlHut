# IC Mainnet Deployment Guide - September 2025

## Archive Notice
Deployment guide from September 2025 HodlHut development. Contains WSL/Windows-specific deployment lessons and optimizations.

**Archive Date:** 2025-10-12
**Relevance:** May apply to hodlprotocol deployment

---

## 🚀 **DEPLOYMENT OPTIMIZATION GUIDE - 2025-09-25**

### **Recent Deployment Success & Lessons Learned**

**✅ Successfully Deployed Mobile UX Fixes:**
- Frontend Canister: `vf7wt-caaaa-aaaad-ab6da-cai` upgraded
- Backend Canister: `vm45p-uiaaa-aaaad-ab6cq-cai` unchanged
- Live URL: https://vf7wt-caaaa-aaaad-ab6da-cai.icp0.io/

**🛠️ Issues Encountered & Solutions:**

#### **Problem 1: Git Repository Pollution**
- **Issue**: 160MB dfx backup file blocked git pushes
- **Root Cause**: `dfx-0.24.2-backup` accidentally committed during version upgrade
- **Solution**: Used git filter-branch to remove from history, force-pushed clean repo
- **Prevention**: Enhanced .gitignore with `dfx-*-backup` patterns

#### **Problem 2: Node.js PATH Issues in WSL**
- **Issue**: WSL Ubuntu couldn't find Node.js/npm for frontend build
- **Root Cause**: Relying on Windows Node.js via mount paths
- **Solution**: Used Windows Node.js via `/mnt/c/Program Files/nodejs` path
- **Recommendation**: Install Node.js natively in WSL Ubuntu for cleaner setup

#### **Problem 3: Zone.Identifier Files**
- **Issue**: Windows security metadata files in git history caused filter operations to fail
- **Root Cause**: Downloaded SVG files had Zone.Identifier alternate data streams
- **Solution**: Replaced affected SVG files, added to .gitignore
- **Prevention**: `.gitignore` now includes `*:Zone.Identifier` pattern

#### **Problem 4: dfx Version Management**
- **Issue**: EOP requires exactly dfx 0.25.0 for compatibility
- **Solution**: Used dfxvm to ensure correct version
- **Verification**: Always check `dfx --version` before deployment

### **Optimized Deployment Setup (Future Use)**

#### **1. WSL Ubuntu Environment Setup**
```bash
# Install Node.js natively in WSL (eliminates PATH issues)
wsl -d Ubuntu
sudo apt update && sudo apt install -y nodejs npm

# Verify versions
node --version  # Should be LTS
npm --version
```

#### **2. dfx Version Management**
```bash
# Ensure dfx 0.25.0 for EOP compatibility
dfxvm install 0.25.0
dfxvm default 0.25.0
dfx --version  # Must show "dfx 0.25.0"
```

#### **3. Enhanced .gitignore (Already Applied)**
```gitignore
# Prevent dfx backup pollution
dfx-*-backup
**/dfx-*-backup
*.dfx-backup

# Prevent Windows Zone.Identifier issues
*:Zone.Identifier

# Build artifacts
*.log
*.wasm.gz
npm-debug.log*
```

#### **4. Streamlined Deployment Commands**

**Current Working Method:**
```bash
# Single command deployment (tested and working)
wsl -d Ubuntu -e bash -c "export PATH=\"/home/suzan/.local/share/dfx/bin:$PATH\" && export DFX_WARNING=-mainnet_plaintext_identity && cd /mnt/c/Users/suzan/hodlhut && dfx deploy hodlhut_frontend --network ic --mode upgrade"
```

**Recommended Future Setup (Don't commit - contains hardcoded paths):**

**Create `scripts/deploy.sh`:**
```bash
#!/bin/bash
# Update paths when switching from default identity
export PATH="/home/suzan/.local/share/dfx/bin:$PATH"
# TODO: Remove DFX_WARNING when using proper identity
export DFX_WARNING=-mainnet_plaintext_identity

cd /mnt/c/Users/suzan/hodlhut

# Verify dfx 0.25.0 (critical for EOP)
if [[ "$(dfx --version)" != "dfx 0.25.0" ]]; then
    echo "❌ Wrong dfx version! Expected 0.25.0"
    exit 1
fi

# Deploy frontend only
dfx deploy hodlhut_frontend --network ic --mode upgrade
```

**WSL Ubuntu Aliases (Add to ~/.bashrc):**
```bash
# Update paths when switching identities
export PATH="/home/suzan/.local/share/dfx/bin:$PATH"
# TODO: Remove warning flag when using proper identity
export DFX_WARNING=-mainnet_plaintext_identity

# Convenient aliases
alias hodlhut-cd="cd /mnt/c/Users/suzan/hodlhut"
alias hodlhut-deploy="hodlhut-cd && bash scripts/deploy.sh"
alias hodlhut-status="hodlhut-cd && git status"
alias dfx-version="dfx --version"
alias dfx-switch-025="dfxvm default 0.25.0"
```

### **Identity Migration Planning**

**When switching from default identity to proper identity:**
1. Remove `DFX_WARNING=-mainnet_plaintext_identity` from all scripts
2. Update hardcoded paths in scripts and aliases
3. Test deployment with new identity setup
4. Verify cycles wallet association with new identity
5. Update any canister controller settings if needed

### **Quick Deployment Process (Once Setup Complete)**

**Option 1 - Use deployment script:**
```bash
wsl -d Ubuntu -e bash /mnt/c/Users/suzan/hodlhut/scripts/deploy.sh
```

**Option 2 - Use aliases:**
```bash
wsl -d Ubuntu
hodlhut-deploy
```

**Option 3 - Manual (current working method):**
```bash
wsl -d Ubuntu -e bash -c "export PATH=\"/home/suzan/.local/share/dfx/bin:$PATH\" && export DFX_WARNING=-mainnet_plaintext_identity && cd /mnt/c/Users/suzan/hodlhut && dfx deploy hodlhut_frontend --network ic --mode upgrade"
```

### **Why Not Committed to Repository**

These optimization scripts contain:
- Hardcoded user paths (`/home/suzan/.local/share/dfx/bin`)
- Temporary identity workarounds (`DFX_WARNING=-mainnet_plaintext_identity`)
- Environment-specific configurations

Committing these would create technical debt. Instead, they're documented here for manual setup when needed.

### **Success Metrics**

**Before Optimization:**
- 160MB git repository with deployment-blocking files
- Complex multi-step deployment process
- PATH issues requiring manual intervention
- Git history pollution from accidental commits

**After Optimization:**
- Clean git repository with proper .gitignore
- One-command deployment process
- Documented setup for future improvements
- Clear path for identity migration

---

## Key Takeaways for Future Deployments

1. **Always verify dfx version** before deploying to mainnet
2. **Use dfxvm** for version management instead of manual installs
3. **Native WSL Node.js** preferred over Windows mount paths
4. **Git cleanup** is critical - large files block deployments
5. **Identity management** - plan migration from default to proper identity
6. **One-command deployments** save time and reduce errors
