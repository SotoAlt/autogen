# Autogen — Open Questions

Unresolved design decisions that need research, prototyping, or user testing before implementation.

---

## Visual Direction

- **Aesthetic references**: Need 2-3 concrete reference images for Evangelion/Y2K/lab aesthetic. Current description is vibes-only. Should we create a Figma mood board before coding?
- **Creature form factor**: Single evolving mesh (morph targets between levels)? Multi-part body (torso + attached limbs)? Particle swarm that coalesces? Each has different implementation complexity and visual impact.
- **Lab interface**: Full-screen terrarium with overlay panels? Split-screen (terrarium left, thought stream right)? Tabbed views? Mobile layout? The layout affects the emotional relationship — terrarium dominance = pet, split = experiment.
- **Knowledge graph visualization**: Always visible as ambient decoration? Toggle-on overlay? Separate view/tab? How to prevent visual clutter at 1000+ triples?

---

## Creature Cognition

- **Glyph language vs English**: Should creatures think in English from L0 (just garbled), or develop a unique symbol language first (like the Ayni Protocol's glyph system) before acquiring English? Glyph-first is more "authentic" but harder to implement and less shareable (users can't read it).
- **Thought cycle frequency**: Every 1-3 seconds (current plan) means ~2000 thoughts per hour. Is this too frequent? Does it devalue individual thoughts? Would every 5-10 seconds create more "weight" per thought?
- **Awareness of self as LLM**: Should the creature know it's an AI? Know it's running in a browser? Or maintain the fiction of being a "creature"? Metacognition emerges naturally at high levels — should we encourage or suppress it?
- **Multiple concurrent models**: Could we run SmolLM2-135M for background "subconscious" processing (fast, low quality) and Qwen3-0.6B for "conscious" thoughts (slower, higher quality)? Two models = 2x GPU cost.

---

## Platform & Compatibility

- **Mobile**: Explicitly not supported (GPU too small) or degraded experience (text-only thought stream, no 3D)? ~50% of web traffic is mobile — is excluding half the audience acceptable?
- **Safari**: WebGPU support is partial/experimental. Do we gate on Chrome/Edge only? Progressive enhancement for Safari?
- **Low-end hardware**: What's the absolute minimum GPU? Intel Iris Xe? Apple M1? GTX 1060? Each threshold changes the addressable market.
- **Offline mode**: If server is down, should the creature still think locally (but can't save state)? Or show "your creature is sleeping" and wait for reconnection?

---

## Reproduction & Population

- **Reproduction energy cost**: 40% (current plan) may be too high (creature nearly dies) or too low (too easy to mass-reproduce). Needs playtesting.
- **Offspring starting level**: L0 with inherited DNA (current plan). Should offspring start at L1 to skip the noise phase? Or is the noise phase important for bonding?
- **Multi-creature management**: How does the user switch between their 3 creatures? Tabs? Gallery? Map? How much context can a user maintain across creatures?
- **Ecosystem carrying capacity**: Max creatures per server? Unlimited with pagination? Resource-limited (server compute is finite)?
- **Creature-creature communication**: How do two LLMs "talk" to each other? Shared thought stream? Translated signals? Direct text exchange? The LLMs have different contexts and may not understand each other.

---

## Economics

- **Token necessity**: Is the token essential to the core experience, or does it only add for Phase 3+? Could the project succeed as a free experiment without tokens? Adding tokens risks alienating users who don't want crypto.
- **Free tier**: Should there always be a free experience (no wallet required)? Limited to L0-L3? Time-limited? Feature-limited?
- **Mining rate calibration**: Current estimates show inflationary pressure. Need economic simulation before launch. Possibly defer token until user base is established.
- **Death economics**: "Your creature died and 47 tokens were burned" — is this a positive (deflationary) or negative (punishing) user experience? Does it discourage new users?

---

## Streaming & Social

- **Streaming integration**: OBS overlay (floating panel with thought stream)? Dedicated stream page (viewer-optimized layout)? Both?
- **Creature spectating**: Can anyone watch any creature, or only the owner? Public by default with opt-out? What about creature privacy (thought streams are intimate)?
- **Social proof verification**: Discord/Twitter OAuth for level gates — what if user doesn't use these platforms? Alternative verification methods?

---

## Naming

- **"Autogen"**: Is this the user-facing brand? It's also a popular Microsoft AI framework name. Could cause confusion. Alternatives:
  - Teleodynamic (original codename, too technical)
  - Something creature/life themed?
  - Something Y2K/lab themed?
  - Does the name even matter before MVP?

---

## Technical Unknowns

- **WebLLM + Three.js coexistence**: Theoretical analysis says it works, but needs real-world testing. What happens when both compete for GPU under sustained load?
- **Knowledge graph at scale**: pgvector performance with 10K+ triples per creature, 1000 creatures? May need separate vector DB (Qdrant, Milvus).
- **Context compression quality**: How good is Qwen3-0.6B at extracting entity-relation triples from narrative text? May need fine-tuned extraction model.
- **Creature personality stability**: Will the creature maintain consistent personality across sessions, or will it "reset" to generic behavior each time? Memory architecture needs testing.
- **WebGPU availability in 2026**: What percentage of target users actually have WebGPU-capable browsers and GPUs? Need telemetry on first page load to assess market.
