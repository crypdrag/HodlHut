# My Garden Architecture - HodlHut September 2025

## Archive Notice
Complete implementation documentation for the My Garden yield farming/staking feature. Contains mobile UX patterns and progressive disclosure strategies.

**Archive Date:** 2025-10-12
**Status:** Complete frontend implementation (backend agents not implemented)
**Relevance:** Mobile UX patterns may apply to hodlprotocol staking UI

---

## System Overview

### 🌱 Concept
"My Garden" is a gamified yield farming interface where user assets become "garden fields" that grow rewards over time. Biodiversity (asset variety) increases yield multipliers.

**Core Mechanics:**
- Stake assets to "plant" them in your garden
- Earn base yield + diversity bonus
- Track performance with expandable asset cards
- Claim rewards and manage positions

---

## 🎨 Mobile UX Design Patterns

### Progressive Disclosure System
**Philosophy:** Show essential info always, details on-demand

**Implementation:**
- **Collapsed State**: Asset icon, amount, APY, total earned
- **Expanded State**: Performance metrics, yield breakdown, activity history
- **Touch Optimization**: Large tap targets (44px+ height)
- **Smooth Animations**: 0.3s expandDown keyframe animations

**Code Pattern:**
```typescript
const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

const toggleExpand = (assetKey: string) => {
  setExpandedAssets(prev => {
    const next = new Set(prev);
    next.has(assetKey) ? next.delete(assetKey) : next.add(assetKey);
    return next;
  });
};
```

### Expandable Asset Cards

**Visual Design:**
- Ring highlighting on expansion: `ring-2 ring-primary-500/50`
- Chevron rotation animation: `rotate-180` on expand
- Smooth height transitions with CSS animations

**Sections:**
1. **Performance Metrics**: Total earned, APY, days staked, multiplier impact
2. **Yield Breakdown**: Base yield vs diversity bonus calculations
3. **Recent Activity**: Transaction history with icons and dates

**CSS Animation:**
```css
@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 2000px;
    transform: translateY(0);
  }
}
```

---

## 💰 Yield Calculation System

### Base Yield Formula
```typescript
const BASE_APY = 0.03; // 3.0% annual yield

const calculateDailyYield = (stakedAmount: number) => {
  return stakedAmount * (BASE_APY / 365);
};
```

### Diversity Multiplier System
```typescript
const DIVERSITY_MULTIPLIERS = [
  1.0,    // 1 asset: no bonus
  1.5,    // 2 assets: +50%
  2.0,    // 3 assets: +100%
  2.25,   // 4 assets: +125%
  2.5,    // 5 assets: +150%
  2.5     // 6+ assets: +150% (capped)
];

const getDiversityMultiplier = (uniqueAssetCount: number): number => {
  return DIVERSITY_MULTIPLIERS[Math.min(uniqueAssetCount - 1, 5)] || 1.0;
};
```

### Total Yield Calculation
```typescript
const calculateTotalYield = (stakedAmounts: Record<string, number>) => {
  // Calculate base yield for all assets
  const baseYield = Object.values(stakedAmounts)
    .reduce((sum, amount) => sum + calculateDailyYield(amount), 0);

  // Apply diversity multiplier
  const uniqueAssets = Object.keys(stakedAmounts).length;
  const multiplier = getDiversityMultiplier(uniqueAssets);

  return baseYield * multiplier;
};
```

---

## 📊 Staking Modal Flow

### Amount Selection Interface

**Features:**
- Available balance display with USD conversion
- Input validation (min/max amounts)
- "MAX" button for full balance
- Real-time APY calculation preview
- Diversity bonus notifications for first-time stakers

**Validation:**
```typescript
const validateStakingAmount = (amount: number, asset: Asset) => {
  if (amount <= 0) return "Amount must be greater than zero";
  if (amount > asset.balance) return "Insufficient balance";
  if (amount < MIN_STAKE_AMOUNT) return `Minimum stake: ${MIN_STAKE_AMOUNT}`;
  return null; // Valid
};
```

### Transaction Confirmation

**Display Elements:**
- Staking amount + USD value
- Asset details
- Projected daily yield
- Projected weekly yield
- New total APY with diversity bonus
- Transaction timing estimate

**State Management:**
```typescript
const [stakingState, setStakingState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
const [stakingError, setStakingError] = useState<string | null>(null);

const handleStake = async () => {
  setStakingState('processing');
  try {
    await executeStake(selectedAsset, amount);
    setStakingState('success');
  } catch (error) {
    setStakingError(error.message);
    setStakingState('error');
  }
};
```

---

## 🔓 Unstaking Modal Flow

### Impact Analysis

**Pre-Unstake Information:**
- Current staking position (amount + duration)
- Total earned to date
- Current APY with diversity bonus
- Warning about yield loss on unstaking

**Unstaking Options:**
- **Partial Unstake**: Specify amount to withdraw
- **Full Unstake**: Remove entire position
- **Impact Preview**: Show new APY after unstaking

### Yield Loss Calculation

**Formula:**
```typescript
const calculateUnstakingImpact = (
  currentStakedAmounts: Record<string, number>,
  assetToUnstake: string,
  unstakeAmount: number
) => {
  // Calculate current yield
  const currentYield = calculateTotalYield(currentStakedAmounts);

  // Calculate new amounts after unstaking
  const newStakedAmounts = { ...currentStakedAmounts };
  newStakedAmounts[assetToUnstake] -= unstakeAmount;
  if (newStakedAmounts[assetToUnstake] <= 0) {
    delete newStakedAmounts[assetToUnstake];
  }

  // Calculate new yield
  const newYield = calculateTotalYield(newStakedAmounts);

  // Calculate impact
  const yieldLoss = currentYield - newYield;
  const percentLoss = (yieldLoss / currentYield) * 100;

  return {
    currentYield,
    newYield,
    yieldLoss,
    percentLoss,
    diversityImpact: Object.keys(currentStakedAmounts).length !== Object.keys(newStakedAmounts).length
  };
};
```

---

## 🎯 State Management Architecture

### Portfolio State
```typescript
interface Portfolio {
  [assetKey: string]: {
    balance: number;
    balanceUSD: number;
    price: number;
    change24h: number;
  };
}

const [portfolio, setPortfolio] = useState<Portfolio>({});
```

### Staked Amounts State
```typescript
interface StakedAmounts {
  [assetKey: string]: number;
}

const [stakedAmounts, setStakedAmounts] = useState<StakedAmounts>({});
```

### Modal State Management
```typescript
const [showStakingModal, setShowStakingModal] = useState(false);
const [selectedStakingAsset, setSelectedStakingAsset] = useState<string | null>(null);
const [pendingStakingAmount, setPendingStakingAmount] = useState<number>(0);

const [showUnstakingModal, setShowUnstakingModal] = useState(false);
const [selectedUnstakingAsset, setSelectedUnstakingAsset] = useState<string | null>(null);
```

### State Reset Pattern
```typescript
useEffect(() => {
  if (!showStakingModal) {
    // Reset state when modal closes
    setPendingStakingAmount(0);
    setSelectedStakingAsset(null);
    setStakingError(null);
  }
}, [showStakingModal]);
```

---

## 🎨 Visual Design System

### Garden Theme Colors
```css
/* Success/Growth Colors */
.text-success-400    /* Bright green for gains */
.bg-success-600      /* Darker green for buttons */
.border-success-500  /* Border accents */

/* Garden-Specific */
.text-green-400      /* Plant growth indicators */
.bg-green-600/15     /* Subtle green backgrounds */
```

### Card Design Pattern
```tsx
<div className="bg-surface-2 rounded-lg p-4 border border-surface-2
                hover:border-primary-500/30 transition-colors">
  {/* Card content */}
</div>
```

### Icon System
```tsx
import {
  TrendingUp,      // APY increase
  DollarSign,      // Earnings
  Clock,           // Time staked
  Plus,            // Add stake
  ChevronDown      // Expand/collapse
} from 'lucide-react';
```

---

## 📱 Mobile-First Responsive Design

### Breakpoint Strategy
```css
/* Mobile First (default) */
.grid { grid-template-columns: 1fr; }

/* Tablet: 768px+ */
@media (min-width: 768px) {
  .grid { grid-template-columns: 1fr 1fr; }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Touch Target Optimization
```css
/* Minimum 44px touch targets */
.btn-stake {
  min-height: 44px;
  padding: 0.75rem 1.5rem;
}

/* Enhanced for touch devices */
@media (pointer: coarse) {
  .btn-stake {
    min-height: 48px;
    padding: 1rem 2rem;
  }
}
```

### Thumb Zone Positioning
- **Primary actions** (Stake, Claim): Bottom 2/3 of screen
- **Secondary actions** (Expand, Details): Can be anywhere
- **Sticky action zones**: Fixed bottom bars on mobile

---

## 🧪 Component Extraction

### Extracted Components
1. **StakingModal.tsx** - Complete staking flow
2. **UnstakingModal.tsx** - Complete unstaking flow
3. **MyGardenSection.tsx** - Main garden display

### Props Interface Pattern
```typescript
interface StakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAsset: string | null;
  portfolio: Portfolio;
  stakedAmounts: StakedAmounts;
  onStake: (asset: string, amount: number) => Promise<void>;
}
```

---

## 🔮 Planned Features (Not Implemented)

### ReefRaffle - Daily NFT Lottery
- Daily raffle ticket NFT sales
- VRF Agent for transparent random selection
- Automatic entry system

### Tsunami Sweep - Weekly Mega Lottery
- Aggregate all weekly daily tickets
- Larger prize pool
- Higher stakes draws

### Backend Agents
- **MyGarden Agent**: Yield calculation and reward distribution
- **ReefRaffleAgent**: Lottery mechanics and VRF integration
- **Revenue Router**: Prize/cycles/DAO treasury distribution

---

## 📁 File Structure

```
src/hodlhut_frontend/src/
├── components/
│   ├── Dashboard.tsx            # Main container
│   ├── MyGardenSection.tsx      # Garden display
│   ├── StakingModal.tsx         # Staking flow
│   └── UnstakingModal.tsx       # Unstaking flow
└── styles/
    └── tailwind.css             # Garden-specific animations
```

---

## 🎯 Key Learnings

### What Worked Well
1. **Progressive disclosure** reduced mobile cognitive load
2. **Expandable cards** provided detail without clutter
3. **Diversity multiplier** gamification encouraged portfolio diversity
4. **Visual feedback** (chevron rotation, ring highlighting) improved UX
5. **State reset patterns** prevented cross-asset contamination

### Mobile UX Wins
1. **Touch-optimized targets** (44px+) worked perfectly
2. **Smooth animations** enhanced perceived performance
3. **Sticky action zones** kept CTAs accessible
4. **Grid layouts** adapted well across breakpoints

### Reusable Patterns for hodlprotocol
1. **Expandable detail sections** - applies to Bitcoin staking positions
2. **Impact analysis modals** - useful for unstaking Bitcoin
3. **Performance metrics display** - relevant for BTC staking yields
4. **Progressive disclosure** - critical for mobile Bitcoin staking UI
5. **State management patterns** - applicable to any staking system

---

## Summary

My Garden demonstrates sophisticated mobile-first yield farming UX with:
- **Progressive disclosure** for mobile cognitive load management
- **Gamification** through diversity multipliers
- **Comprehensive modals** for staking/unstaking flows
- **Expandable cards** for on-demand detail display
- **Touch-optimized** interfaces throughout

Many patterns directly applicable to hodlprotocol Bitcoin staking UI.
