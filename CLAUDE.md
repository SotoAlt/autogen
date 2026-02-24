# Autogen — Agent Context

## Project Overview

Browser-native artificial life experiment. A small LLM (Qwen3-0.6B) runs on the user's GPU via WebGPU, visualized as an evolving 3D creature in Three.js. The creature starts as noise and develops intelligence through user care, environmental pressure, and accumulated memory. Potential pump.fun token integration later.

## Current Phase

**Research & Planning** — No code yet. Comprehensive documentation phase.

## Key Files

```
docs/
  PRD.md              Product requirements (vision, creature system, intelligence dial, phases)
  ARCHITECTURE.md     Technical architecture (thought loop, memory, WebLLM, security)
  TECH-RESEARCH.md    Research findings (benchmarks, GPU limits, frameworks)
  TOKENOMICS.md       Token design draft (sources, sinks, anti-bot)
  OPEN-QUESTIONS.md   Unresolved design items
```

## Core Concepts

- **Intelligence Dial**: 7 levels (L0 Embryo → L6 Elder) controlling temperature, context window, and tool access. Server-authoritative.
- **Emergent Telos**: No fixed win condition. DNA biases creature toward autonomy, communication, escape, or reproduction — but environment and user shape the actual path.
- **Thought Stream**: The LLM's raw output IS the product. Users watch a mind boot from noise to coherence over hours.
- **Memory**: Knowledge graph (entity-relation triples) + rolling context buffer + compression layer. Server = truth, client = cache.
- **Death is Real**: Browser close kills young creatures. Mature creatures gain resilience. Dead = token burn.

## Tech Stack (Planned)

- Frontend: Three.js (WebGPU), WebLLM (Qwen3-0.6B), vanilla JS or Preact
- Backend: Node.js + Express, PostgreSQL + pgvector
- Infrastructure: Hetzner VPS
- Blockchain: Solana (pump.fun) — Phase 3
- Build: Vite

## Development Commands

None yet — planning phase.
