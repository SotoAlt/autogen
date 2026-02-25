# Changelog

## v0.3.0 — Biological Agent System (Feb 24, 2026)

### Polish
- **Gibberish reduction**: Stripped JSON format instructions from system prompts — model was echoing "You respond with JSON" as output. Prompts are now persona-only ("You are a cell", "You are a spark of life").
- **Level-appropriate language**: L0 shows NO thought text (always `[action] ███`), L1 max 2 words/10 chars, L2 max 20 chars, L3 full prose. Keyword/random fallbacks also suppress thought below L2.
- **Level-aware few-shot**: Assistant example matches current level's action set. L0-L1 examples have no `thought` field; L2+ include `thought`.
- **Regex extraction strategy**: New Strategy 3 finds `"action":"<word>"` via regex before brace extraction — catches garbled output that wraps JSON in preamble text.
- **Visible visual effects**: TSL `uniform()` nodes for emissiveBoost, dimming, and radiusMultiplier push runtime values to the GPU shader every frame. Previous static TSL nodes ignored runtime changes.
- **Stronger action drama**: pulse radius +0.5 (was +0.3), absorb emissive 1.2 (was 0.6), glow emissive 1.5 (was 1.0), speak emissive 1.5 + pulse 0.7 (was 0.8/0.5), shift_color min range 0.15.
- **Slower effect decay**: emissive 0.985 (was 0.97), hueShift 0.99 (was 0.98), split 0.97 (was 0.96) — effects linger visibly longer.
- **Lower temperatures**: L0 0.6 (was 0.9), L1 0.7 (was 0.9), L2 0.7 (was 0.8). L0 maxTokens 32 (was 48).

### Features
- **DNA system**: 8 heritable traits (heartbeatSpeed, metabolismRate, huePrimary, hueShiftRange, movementBias, expressiveness, energyEfficiency, curiosity) randomized at birth, injected into system prompts as personality hints.
- **Energy / metabolism**: Energy 0-100 (starts 50). User message +15, click +5, presence +1/cycle. Metabolism drains per cycle based on DNA. Dormant at 0 (stops thinking), wakes on user message.
- **Heartbeat-gated thinking**: Much longer periods (L0: 90s, L1: 30s, L2: 15s, L3: 10s) adjusted by DNA heartbeatSpeed. 10s first-cycle exception for immediate feedback. User input triggers reflex think (5s rate limit).
- **JSON schema constrained output**: Every think cycle produces ONE structured JSON action via XGrammar (WebLLM). No streaming, no free text. Falls back to `json_object` + manual validation if schema mode fails.
- **12 visual actions**: drift, pulse, absorb, glow, shrink, reach, shift_color, spin, speak, morph, split, rest — each drives 3D creature animation via lerped targets.
- **Action-oriented system prompts**: L0 "pick one action" → L3 "express yourself", with DNA personality hints and energy context.
- **Evolution through care**: User messages +3 XP, successful actions +1 XP, dormancy -5 XP. L0→L1: 15 XP, L1→L2: 40 XP, L2→L3: 100 XP.
- **Energy bar UI**: Visual energy indicator with color-coded states (green/yellow/orange/red).
- **Dormant state**: Creature dims, stops thinking. User message wakes it at energy 15.
- **Click to feed**: Clicking the creature gives +5 energy.

### Fixes
- **Thought container overlap**: Moved from bottom: 80px to bottom: 150px, max-height 35vh (was 40vh).
- **Level buttons no longer overlap thought stream**: Controls properly stacked below thought container.

### Technical
- New files: `src/dna.js`, `src/energy.js`, `src/action-schemas.js`
- Rewritten: `src/main.js` (heartbeat-gated cycles), `src/heartbeat.js` (DNA periods, reflex), `src/intelligence.js` (action prompts), `src/creature.js` (12 actions), `src/thought-stream.js` (user/action/event display), `src/test-panel.js` (energy/DNA/force-think)
- Removed: `thinkLoop()` polling, `thinkDelay`, token-by-token streaming, tok/s display
- Added: energy bar HTML/CSS, action tags in thought stream, DNA visualization in test panel

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
