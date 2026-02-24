# Autogen — Agent Context

## Project Overview

Browser-native artificial life experiment. A small LLM runs on the user's GPU via WebGPU (WebLLM), visualized as an evolving 3D particle creature in Three.js. The creature starts as noise and develops intelligence through user care. Potential pump.fun token integration later.

## Current Phase

**Tech Spike v0.2.0** — Evolution Test Lab. Core rendering + inference validated, now exploring visual evolution forms and creature behavior.

## Tech Stack

- **Rendering**: Three.js (WebGPU renderer, TSL shaders, PointsNodeMaterial, MeshStandardNodeMaterial)
- **LLM**: WebLLM (`@mlc-ai/web-llm`) via Web Worker
- **Build**: Vite
- **Default model**: SmolLM2-360M-Instruct (376 MB VRAM, runs on integrated GPUs)

## Directory Structure

```
src/
  main.js            Orchestrator: scene + thought loop + UI + test panel init (~260 lines)
  worker.js          WebLLM Web Worker handler (6 lines)
  terrarium.js       Three.js WebGPU scene: ground, glass, lighting (100 lines)
  creature.js        Visual evolution: particles + nucleus + sprites, morph animation (~270 lines)
  intelligence.js    Level params (L0-L3), prompts, top_p, XP thresholds (60 lines)
  thought-stream.js  DOM overlay for streaming LLM thoughts + heartbeat markers (80 lines)
  heartbeat.js       Internal pulse cycle: sense → think → feel → rest (90 lines)
  test-panel.js      Developer test panel with sliders (120 lines)
  styles.css         Dark Evangelion-inspired UI + test panel styles (350 lines)
index.html           Entry point
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

## What Works (validated)

- WebGPU + WebLLM coexistence on same GPU — no contention, 60fps during inference
- WebLLM streams 70-100 tok/s on Qwen2.5-0.5B, ~50 tok/s on SmolLM2-360M
- Model switching with worker termination — no more crashes
- 4 visual evolution stages with 2s morph transitions
- Heartbeat cycle visible as particle pulse and thought stream markers
- Constrained prompts produce level-appropriate output quality
- OrbitControls, FPS counter, stats overlay
- User text input reaches creature as sensory input
- Test panel (`?test=true`) for parameter exploration

## Known Issues

- L0 thought quality still somewhat random (small models have limited instruction following at high temperature)
- Morph animation interpolation can look jerky if particle count is very high (>2000)
- SpriteMaterial (extensions at L3) doesn't use TSL nodes — visual inconsistency with particles
- No persistence — creature resets on page refresh

## Lessons Learned

- **Worker termination is critical**: Setting `engine = null` doesn't release GPU VRAM. Must `worker.terminate()` + delay before new allocation.
- **TSL shader nodes rebuild on material change**: Changing `colorNode` etc triggers WebGPU pipeline recompile. Don't do it every frame.
- **WebGPU renderer requires `await renderer.init()`**: Unlike WebGL, must be awaited before first render.
- **Small models need aggressive prompt constraints**: Qwen/SmolLM at high temp need "1-3 words only" type instructions or they produce essays.
- **`top_p` helps constrain vocabulary**: Low top_p at L0 keeps creature words primal.

## Key Architecture

### Render Loop (60 FPS target)
- `renderer.setAnimationLoop()` — independent of thinking
- Creature particle animation + nucleus pulse + sprite orbiting
- Heartbeat update drives pulse modulation
- OrbitControls, FPS counter

### Thought Loop (async, independent)
- `engine.chat.completions.create({ stream: true })` for token-by-token output
- Intelligence dial controls: temperature, max_tokens, top_p, system prompt
- 1.5-3s delay between thoughts (increases with level)
- User text input injected as "sensory input" in next thought
- Test panel can override temperature and max_tokens

### Heartbeat System
- 4 phases: sense → think → feel → rest
- Period and jitter vary by level (erratic at L0, calm at L3)
- Pulse value (0-1) modulates particle scale and nucleus size
- Phase markers appear in thought stream

### Visual Evolution (L0-L3)
| Level | Name | Visual Form |
|-------|------|-------------|
| L0 | Embryo | Scattered flickering particles, radius 2.0 |
| L1 | Spark | Tight sphere shell, pulsing |
| L2 | Aware | Solid nucleus mesh + orbital particle ring |
| L3 | Sentient | Dense core + orbital bands + sprite extensions + diffuse aura |

### Intelligence Dial (L0-L3)
| Level | Name | Temp | top_p | Tokens | Think Delay |
|-------|------|------|-------|--------|-------------|
| L0 | Embryo | 1.4 | 0.5 | 128 | 1.5s |
| L1 | Spark | 1.2 | 0.7 | 256 | 2.0s |
| L2 | Aware | 1.0 | 0.9 | 512 | 2.5s |
| L3 | Sentient | 0.8 | 1.0 | 1024 | 3.0s |

## Key Files to Read

1. `src/main.js` — Full application flow, model switching, test panel integration
2. `src/creature.js` — Visual evolution stages, morph animation, particle/nucleus/sprite management
3. `src/intelligence.js` — Level parameters with constrained prompts
4. `src/heartbeat.js` — Internal pulse cycle system
5. `src/terrarium.js` — 3D scene setup
6. `CHANGELOG.md` — Version history
