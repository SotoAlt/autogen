# Changelog

## v0.2.0 — Evolution Test Lab (Feb 24, 2026)

### Features
- **Heartbeat cycle system**: Creatures now have internal rhythms (sense → think → feel → rest) visible as pulse markers in the thought stream. Erratic at L0, calm and steady at L3.
- **Visual evolution stages**: 4 distinct creature forms per level:
  - L0 Embryo: scattered flickering particles
  - L1 Spark: coalescing sphere shell with pulsing glow
  - L2 Aware: solid nucleus mesh + orbiting particle ring
  - L3 Sentient: multi-part body (core + sprite extensions + particle aura + orbital bands)
- **Morph transitions**: 2-second smooth animation when changing levels — particles reorganize from old form to new with ease-out cubic interpolation.
- **Test control panel** (`?test=true`): Developer tool with sliders for level, temperature, max tokens, particle count, heartbeat rate, and creature hue. Snapshot button logs state to console.
- **Improved thought quality**: Constrained prompts per level (L0: 1-3 word fragments, L1: short phrases, L2: 1-2 sentences, L3: free reflection). Added `top_p` parameter per level for vocabulary control.

### Fixes
- **Model switching no longer crashes page**: Old Web Worker terminated and GPU memory released before loading new model. 500ms delay for cleanup.
- **Scene brightness**: Terrarium lighting overhaul from v0.1.0 fixes preserved.

### Technical
- New files: `src/heartbeat.js`, `src/test-panel.js`
- Thought stream supports heartbeat markers between cycles
- Creature tracks morph progress, target positions, pulse from heartbeat
- Stats overlay shows heartbeat phase

## v0.1.0 — Tech Spike (Feb 24, 2026)

### Features
- WebLLM + Three.js WebGPU integration — both share GPU without contention
- Streaming thought display with emotional classification (curiosity/distress/joy)
- 4 intelligence levels (L0 Embryo → L3 Sentient)
- Model selector: SmolLM2-360M, SmolLM2-135M, Qwen2.5-0.5B
- Terrarium scene: glass walls, ground, ambient lighting
- OrbitControls for camera
- User text input as "sensory input" to creature
- XP-based level progression

### Technical
- WebGPU renderer with TSL shader nodes (PointsNodeMaterial)
- Web Worker for LLM inference (keeps render loop at 60fps)
- Vite build system
- ~600 lines total
