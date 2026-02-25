# Autogen — Agent Context

## Project Overview

Browser-native artificial life experiment. A small LLM runs on the user's GPU via WebGPU (WebLLM), visualized as an evolving 3D particle creature in Three.js. The creature starts as a primordial cell and develops intelligence through user care and feeding. Potential pump.fun token integration later.

## Current Phase

**v0.3.0** — Biological Agent System. Creature has DNA, energy/metabolism, heartbeat-gated thinking, 12 visual actions, and JSON schema constrained output.

## Tech Stack

- **Rendering**: Three.js (WebGPU renderer, TSL shaders, PointsNodeMaterial, MeshStandardNodeMaterial)
- **LLM**: WebLLM (`@mlc-ai/web-llm`) via Web Worker — JSON schema constrained decoding (XGrammar)
- **Build**: Vite
- **Default model**: SmolLM2-360M-Instruct (376 MB VRAM, runs on integrated GPUs)

## Directory Structure

```
src/
  main.js            Orchestrator: heartbeat-gated think cycle, energy, DNA, actions (~280 lines)
  worker.js          WebLLM Web Worker handler (6 lines)
  terrarium.js       Three.js WebGPU scene: ground, glass, lighting (100 lines)
  creature.js        Visual creature + 12 action animations, DNA color, energy dimming (~350 lines)
  intelligence.js    Level params (L0-L3), action-oriented prompts, heartbeat periods (~70 lines)
  heartbeat.js       Pulse cycle: sense → think → feel → rest, DNA-adjusted periods (~130 lines)
  dna.js             8 heritable traits, prompt hints, trait accessors (~50 lines)
  energy.js          Energy system: feed, metabolize, spend, dormancy (~70 lines)
  action-schemas.js  JSON schemas per level, action costs, validation (~110 lines)
  thought-stream.js  DOM overlay: user messages, creature thoughts, action tags (~100 lines)
  test-panel.js      Developer panel: energy, DNA display, force-think, action log (~140 lines)
  styles.css         Dark UI + energy bar + action tags + test panel (~400 lines)
index.html           Entry point with energy bar
vite.config.js       Vite config (minimal)
CHANGELOG.md         Version history
docs/PRD.md          Product requirements (from planning phase)
```

## Development Commands

```bash
npm install          # Install deps (three, @mlc-ai/web-llm, vite)
npm run dev          # Vite dev server (port 5177, auto-open)
npm run build        # Production build
npm run preview      # Preview production build
```

## Architecture

### Heartbeat-Gated Thinking
```
Heartbeat (sense → think → feel → rest)
    │
    ├── SENSE: gather context (energy, user input, recent actions)
    ├── THINK: LLM inference → JSON Schema constrained output
    │          { "action": "drift", "intensity": 0.7, "thought": "warm..." }
    ├── FEEL: execute action on creature + display thought
    └── REST: metabolism (energy drain), idle animation
```

Every think cycle produces ONE structured JSON action via XGrammar constrained decoding. No streaming, no free text.

### Heartbeat Periods (DNA-adjusted)
| Level | Name | Base Period | Actions |
|-------|------|-------------|---------|
| L0 | Primordial | 90s | drift, pulse, absorb |
| L1 | Spark | 30s | +glow, shrink |
| L2 | Aware | 15s | +reach, shift_color, spin |
| L3 | Sentient | 10s | +speak, morph, split, rest |

First cycle: 10s regardless of level. User input triggers immediate reflex (5s rate limit).

### Energy / Metabolism
- Range: 0-100, starts at 50
- Gain: user message +15, click +5, presence +1/cycle
- Drain: metabolism (DNA rate), action cost, level tax
- States: thriving (70+), normal (40-69), hungry (15-39), starving (1-14), dormant (0)
- Dormant creature stops thinking; user message wakes it at energy 15

### DNA (8 traits, random at birth)
| Trait | Effect |
|-------|--------|
| heartbeatSpeed | Heartbeat period multiplier |
| metabolismRate | Energy drain per cycle |
| huePrimary | Birth color |
| hueShiftRange | Color change range |
| movementBias | Movement vs stillness tendency |
| expressiveness | Action intensity multiplier |
| energyEfficiency | Reduces action energy cost |
| curiosity | Responsiveness to observer |

### Evolution (XP-based, user-care driven)
- User message: +3 XP
- Successful action: +1 XP
- Dormancy: -5 XP
- L0→L1: 15 XP, L1→L2: 40 XP, L2→L3: 100 XP

### 12 Visual Actions
| Action | Visual Effect |
|--------|-------------|
| drift | Move group in direction |
| pulse | Scale pulse |
| absorb | Contract particles + glow |
| glow | Emissive boost 2s |
| shrink | Contract radius |
| reach | Extend toward direction |
| shift_color | Hue shift within DNA range |
| spin | Rotation speed boost |
| speak | Thought display + glow flash |
| morph | Randomize particle positions |
| split | Split cloud in two, recombine |
| rest | Slow, dim, +1 energy |

### JSON Schema Constrained Output
Uses WebLLM's `response_format: { type: "json_object", schema: ... }` with XGrammar. Falls back to `json_object` without schema + manual validation if schema mode fails.

## Key Files to Read

1. `src/main.js` — Orchestration, heartbeat-gated thinking, energy/DNA integration
2. `src/creature.js` — Visual evolution + 12 action execution methods
3. `src/action-schemas.js` — JSON schemas per level, validation
4. `src/energy.js` — Energy system, metabolism, dormancy
5. `src/dna.js` — DNA traits, prompt hints
6. `src/intelligence.js` — Level params, action-oriented prompts
7. `src/heartbeat.js` — DNA-adjusted pulse cycle, reflex triggering
8. `CHANGELOG.md` — Version history

## Known Issues

- `response_format` with `schema` may need WebLLM ≥0.2.78 — auto-falls back to `json_object` without schema
- L0 at 90s base period is long — mitigated by 10s first-cycle exception
- 0.5B model action quality varies — acceptable as biological randomness at L0-L1
- No persistence — creature resets on page refresh
