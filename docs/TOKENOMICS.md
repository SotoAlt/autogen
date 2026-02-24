# Autogen — Tokenomics Design

## 1. Token Purpose

The token represents **creature energy**. It is not a governance token, not a revenue-share token, not a speculative vehicle (though speculation will happen). The token is the unit of life in the Autogen ecosystem.

- **Birth**: Creating a creature costs tokens (purchased with SOL on pump.fun bonding curve)
- **Life**: Creature energy is measured in tokens. Energy depletes over time (metabolism).
- **Care**: Users mine tokens through attentive care (proof-of-attention)
- **Death**: When a creature dies, its remaining token balance is **burned permanently**

The token supply is deflationary by design: creatures die, tokens burn, supply shrinks, remaining tokens become scarcer.

---

## 2. Token Flow

```
                     ┌──────────────┐
                     │  pump.fun    │
                     │  Bonding     │
        SOL ────────>│  Curve       │────────> AUTOGEN tokens
                     └──────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │       USER WALLET           │
              │                             │
              │  Buy seed ──> Create creature│
              │  Mine tokens <── attention   │
              │  Spend tokens ──> sinks     │
              └─────────────┬───────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     CREATURE ENERGY         │
              │                             │
              │  Metabolism drain (constant) │
              │  Tool use drain (per action) │
              │  Environmental damage        │
              │  Reproduction cost (40%)     │
              └─────────────┬───────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │     SINKS (token exits)     │
              │                             │
              │  Death burn (permanent)      │
              │  Cosmetics (server-side)     │
              │  Evolution boost (XP)        │
              │  Resurrection (expensive)    │
              │  Environment upgrades        │
              │  Breeding fee               │
              └─────────────────────────────┘
```

---

## 3. Sources (Token Inflow to Users)

### 3.1 Attention Mining

Users earn tokens by actively caring for their creature:

```
Base rate:        1 token per minute of active attention
Proof-of-attention: Must answer visual context challenges every 5-15 min
Diminishing returns:
  Hour 1:         100% rate (1 token/min)
  Hours 2-4:      50% rate (0.5 token/min)
  Hours 4-8:      25% rate (0.25 token/min)
  Hours 8+:       10% rate (0.1 token/min)

Daily cap:        ~250 tokens per user per day
Monthly cap:      ~5,000 tokens per user
```

### 3.2 Achievement Rewards

| Achievement | Tokens | Frequency |
|-------------|--------|-----------|
| Creature reaches L1 | 10 | Once per creature |
| Creature reaches L2 | 25 | Once per creature |
| Creature reaches L3 | 50 | Once per creature |
| Creature reaches L4 | 100 | Once per creature |
| Creature reaches L5 | 200 | Once per creature |
| Creature reaches L6 | 500 | Once per creature |
| First reproduction | 100 | Once per creature |
| Creature survives 24h | 50 | Once per creature |
| Creature survives 7d | 200 | Once per creature |
| Knowledge graph 1000 triples | 100 | Once per creature |

### 3.3 Ecosystem Events

- Discovery bonuses: creature discovers new concept (server-validated) = 10 tokens
- Community events: server-wide challenges with token prizes
- Referral: new user creates creature via your link = 50 tokens (one-time)

---

## 4. Sinks (Token Outflow from Users)

### 4.1 Creature Lifecycle Costs

| Action | Cost | Notes |
|--------|------|-------|
| Create creature (seed) | 100 tokens | One-time, starts L0 |
| Creature metabolism | ~0.5 tokens/hour | Continuous drain |
| Asexual reproduction | 40% of creature's energy | One-time per offspring |
| Sexual reproduction | 30% of each parent's energy | Multiplayer |

### 4.2 Creature Enhancement

| Item | Cost | Effect |
|------|------|--------|
| XP boost (small) | 50 tokens | +500 XP |
| XP boost (large) | 200 tokens | +2500 XP |
| Energy refill | 30 tokens | Restore to 100% |
| Resilience boost | 100 tokens | +4h offline survival |
| DNA mutation | 150 tokens | Randomize 5 genes |
| Targeted mutation | 500 tokens | Choose 1 gene to modify |

### 4.3 Cosmetics

| Category | Price Range | Examples |
|----------|------------|---------|
| Creature skins | 50-500 tokens | Color themes, glow effects, patterns |
| Particle effects | 30-200 tokens | Ambient particles, trails, auras |
| Terrarium themes | 100-1000 tokens | Biome changes, sky themes, terrain styles |
| Name plates | 20-50 tokens | Display name customization |
| Thought stream themes | 10-30 tokens | Font, colors, animation style |

### 4.4 Resurrection

- Dead creature can be resurrected at **5x the original seed cost** (500 tokens)
- Resurrected creature returns at L0 but retains compressed knowledge graph (50% of triples)
- DNA preserved exactly
- Death count tracked (shown on creature profile)
- Resurrection cost increases with each death: 500, 1000, 2000, 4000...

---

## 5. Deflation Mechanics

### 5.1 Death Burn

When a creature dies:
1. All remaining energy tokens in the creature are **burned** (removed from supply permanently)
2. Average creature at death has ~30-50 tokens remaining
3. With 1000 active creatures dying at typical rates: ~500-1000 tokens burned per day
4. Supply shrinks → price rises → creatures become more valuable → users care more → virtuous cycle

### 5.2 Sink vs Source Balance

Target: **net deflationary** (more tokens burned than mined)

```
Daily inflow (1000 active users):
  Attention mining:    250 * 1000 = 250,000 tokens/day (max theoretical)
  Achievements:        ~50 * 1000 = 50,000 tokens/day
  Total inflow:        ~300,000 tokens/day (max)

Daily outflow (1000 active users):
  Metabolism:          12 * 1000 = 12,000 tokens/day
  Creature deaths:     ~100 deaths * 40 avg tokens = 4,000 tokens/day (burn)
  Cosmetics/boosts:    ~20 * 1000 = 20,000 tokens/day
  Reproduction:        ~50 reproductions * 80 tokens = 4,000 tokens/day
  Total outflow:       ~40,000 tokens/day

Net: +260,000 tokens/day (INFLATIONARY - problem!)
```

**Rebalancing needed**: The daily mining cap is too generous. Options:
- Reduce mining rate to 50 tokens/day
- Increase metabolism rate
- Add more sinks (environment rent, creature insurance)
- Make achievements one-time-ever (not per creature)

This requires economic simulation before launch. The key lever is the daily mining cap.

---

## 6. Anti-Bot Economics

### 6.1 Cost Analysis for Bot Farms

```
Bot farm requirements per instance:
  - GPU with WebGPU support: ~$5/day (cloud GPU)
  - Chromium instance: ~1GB RAM
  - Computer vision for proof-of-attention: additional compute

Theoretical max daily earning per instance: 250 tokens
Token value (early): ~$0.001 per token (pump.fun launch)
Daily revenue per bot: $0.25

Cost vs revenue: $5/day cost > $0.25/day revenue = UNPROFITABLE
```

### 6.2 Even If Token Price Rises

```
At $0.01 per token: $2.50/day revenue vs $5/day cost = still unprofitable
At $0.10 per token: $25/day revenue vs $5/day cost = barely profitable
  → But at this price, proof-of-attention challenges get harder
  → Social proof gates require human verification
  → Behavioral analysis catches bot patterns
```

### 6.3 Defense Layers

1. **Proof-of-attention**: Visual challenges requiring WebGPU rendering context
2. **Diminishing returns**: Daily cap prevents 24/7 farming efficiency
3. **Social proof gates**: Level milestones require community verification
4. **Behavioral analysis**: Statistical detection of non-human patterns
5. **GPU cost**: Must actually run inference (can't fake tool calls)
6. **Mortality**: Bots must keep creatures alive (active management cost)

---

## 7. pump.fun Launch Strategy

### 7.1 Token Parameters

```
Name:        AUTOGEN (or creature-themed name TBD)
Symbol:      AUTO
Supply:      1,000,000,000 (1 billion)
Decimals:    6
Launch fee:  0.01 SOL
```

### 7.2 Bonding Curve

pump.fun uses a fixed bonding curve:
- Price starts at ~$0.0000001 per token
- Price increases as supply is purchased
- At ~$69K market cap, liquidity auto-migrates to Raydium DEX
- After migration, token trades freely on DEX

### 7.3 Launch Sequence

1. **Pre-launch (1 week before)**
   - Autogen MVP live with no token (Phase 1 complete)
   - Build community interest: screenshots, videos, streamer demos
   - Announce token launch date

2. **Launch day**
   - Deploy token on pump.fun
   - Enable wallet connect in Autogen UI
   - First creatures require SOL purchase on bonding curve
   - Early users get cheapest tokens

3. **Post-launch**
   - Monitor economic balance (adjust mining rates if needed)
   - Enable sinks progressively (cosmetics, boosts, resurrection)
   - Track deflationary rate

---

## 8. Risk Analysis

### 8.1 Death Spiral

**Scenario**: Token price crashes → users stop caring → creatures die → massive burn → supply shock → price spikes briefly → still no users → price crashes again

**Mitigation**:
- Minimum viable creature (L0-L2) is free to experience (no token required in Phase 1-2)
- Token only required for advanced features (L3+ boosts, cosmetics, resurrection)
- Community engagement independent of token price
- Core experience (watching mind emerge) is compelling without economics

### 8.2 Inflation Spiral

**Scenario**: Too many tokens mined → price collapses → tokens worthless → no economic incentive

**Mitigation**:
- Aggressive daily caps on mining
- Multiple token sinks
- Death burn as automatic deflation
- Can adjust mining rate via server parameter (no contract change needed — tokens are in-game, not on-chain per action)

### 8.3 Whale Manipulation

**Scenario**: Whale buys large token supply → controls creature economy → unfair advantage

**Mitigation**:
- Tokens are consumable (energy), not governance — whale's tokens deplete through use
- Per-creature caps on energy (can't infinitely boost one creature)
- Social proof gates don't care about token balance
- Intelligence level is XP-gated, not token-gated

### 8.4 Regulatory Risk

**Scenario**: Token classified as security → legal trouble

**Mitigation**:
- Token is clearly utility (creature energy, consumable)
- No profit-sharing, no governance, no equity representation
- No promises of future value
- pump.fun provides legal buffer (decentralized launch)
- Consult legal counsel before launch
