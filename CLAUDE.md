# Autogen — Agent Context

## Project Overview

Browser-native artificial life experiment. A small LLM runs on the user's GPU via WebGPU (WebLLM), visualized as an evolving 3D particle creature in Three.js. The creature starts as noise and develops intelligence through user care. Potential pump.fun token integration later.

## Current Phase

**Tech Spike v0.1.0** — MVP validating WebLLM + Three.js WebGPU coexistence.

## Tech Stack

- **Rendering**: Three.js (WebGPU renderer, TSL shaders, PointsNodeMaterial)
- **LLM**: WebLLM (`@mlc-ai/web-llm`) via Web Worker
- **Build**: Vite
- **Default model**: SmolLM2-360M-Instruct (376 MB VRAM, runs on integrated GPUs)

## Directory Structure

```
src/
  main.js            Orchestrator: scene + thought loop + UI (180 lines)
  worker.js          WebLLM Web Worker handler (6 lines)
  terrarium.js       Three.js WebGPU scene: ground, glass, lighting (100 lines)
  creature.js        Particle cloud mesh + morph by level (120 lines)
  intelligence.js    Level params (L0-L3), XP thresholds (50 lines)
  thought-stream.js  DOM overlay for streaming LLM thoughts (70 lines)
  styles.css         Dark Evangelion-inspired UI (220 lines)
index.html           Entry point
vite.config.js       Vite config (minimal)
```

## Development Commands

```bash
npm install          # Install deps (three, @mlc-ai/web-llm, vite)
npm run dev          # Vite dev server (port 5173, auto-open)
npm run build        # Production build
npm run preview      # Preview production build
```

## Key Architecture

### Render Loop (60 FPS target)
- `requestAnimationFrame` via `renderer.setAnimationLoop()`
- Creature particle animation (JS CPU-side position updates)
- OrbitControls, FPS counter

### Thought Loop (async, independent)
- Runs in parallel with render loop
- `engine.chat.completions.create({ stream: true })` for token-by-token output
- Intelligence dial controls: temperature, max_tokens, system prompt
- 1.5-3s delay between thoughts (increases with level)
- User text input injected as "sensory input" in next thought

### Intelligence Dial (L0-L3)
| Level | Name | Temp | Tokens | Particle Radius | Think Delay |
|-------|------|------|--------|-----------------|-------------|
| L0 | Embryo | 1.4 | 128 | 2.0 | 1.5s |
| L1 | Spark | 1.2 | 256 | 1.2 | 2.0s |
| L2 | Aware | 1.0 | 512 | 0.6 | 2.5s |
| L3 | Sentient | 0.8 | 1024 | 0.3 | 3.0s |

### WebLLM Worker
- Runs LLM inference in Web Worker (keeps UI responsive)
- Model cached in browser IndexedDB after first download
- Supports model switching via dropdown

## Key Files to Read

1. `src/main.js` — Full application flow
2. `src/creature.js` — Particle system + level morphing
3. `src/intelligence.js` — Level parameters
4. `src/terrarium.js` — 3D scene setup
