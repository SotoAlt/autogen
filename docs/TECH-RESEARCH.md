# Autogen — Technical Research Findings

Research conducted February 2026. Sources: web search, documentation review, benchmark testing.

---

## 1. Browser LLM Inference (WebLLM)

### Benchmarks

| Model | Quantization | Download | VRAM | Speed (M3 Mac) | Speed (RTX 3060) |
|-------|-------------|----------|------|-----------------|-------------------|
| Qwen3-0.6B | q4f16_1 | ~350MB | ~1.0GB | 80-120 tok/s | 100-150 tok/s |
| Qwen2.5-0.5B | q4f16_1 | ~350MB | ~945MB | 70-100 tok/s | 90-130 tok/s |
| SmolLM2-135M | q4f16_1 | ~150MB | ~719MB | 150+ tok/s | 200+ tok/s |
| Phi-4-mini 3.8B | q4f16_1 | ~2.0GB | ~2.5GB | 30-50 tok/s | 50-70 tok/s |
| Qwen2.5-3B | q4f16_1 | ~1.8GB | ~2.0GB | 60 tok/s | 80 tok/s |

**Key Finding**: WebLLM achieves ~80% of native inference performance in the browser. The overhead comes from WebGPU API call latency vs native CUDA/Metal, not from compute.

### Function Calling

- **Qwen3-0.6B**: Native function calling support. Berkeley Function Calling Leaderboard (BFCL) agent score: 0.880. This is the smallest model with production-quality tool use.
- **SmolLM2-135M**: No function calling. Too small for structured output.
- **Phi-4-mini**: Excellent function calling but too large for our GPU budget.

### WebLLM Architecture

```
Browser
  └── Web Worker
       └── WebLLM Engine
            ├── Model loader (fetches weights from HuggingFace/CDN)
            ├── Tokenizer (wasm)
            ├── WebGPU compute shaders (matrix multiplication)
            └── KV cache (WebGPU storage buffers)
```

- Model weights cached in IndexedDB / Cache Storage after first download
- Supports streaming token generation via callbacks
- Configurable: temperature, top_p, top_k, max_tokens, stop sequences
- Multiple models can coexist (different model IDs) but share GPU memory
- Web Worker isolation prevents inference from blocking UI thread

### Model Loading Times

| Model | First Load (download) | Subsequent Load (cache) |
|-------|----------------------|------------------------|
| Qwen3-0.6B | 15-30s (broadband) | 2-5s |
| SmolLM2-135M | 5-10s | 1-2s |
| Phi-4-mini | 45-90s | 5-10s |

---

## 2. Alternative: RWKV State Space Models

### Why Consider RWKV

Traditional transformers (Qwen3, Phi-4) use KV cache that grows linearly with context length. For a creature that thinks continuously, this means:
- 128-token context: ~50MB KV cache
- 8K-token context (L6 Elder): ~3.2GB KV cache — leaves no room for Three.js

RWKV is a state space model with **constant memory** regardless of context length:
- Fixed state size: ~50MB for 1.5B model
- No KV cache growth
- Can process infinite context with constant memory

### RWKV Benchmarks

| Model | Size | Browser Speed | Memory | Notes |
|-------|------|--------------|--------|-------|
| RWKV-7 1.5B | ~1GB | 33 tok/s | ~1.2GB constant | web-rwkv WebGPU implementation |
| RWKV-6 430M | ~350MB | 50+ tok/s | ~600MB constant | Smaller, faster, less capable |

### Trade-offs

| Factor | Qwen3-0.6B (Transformer) | RWKV-7 1.5B (SSM) |
|--------|--------------------------|---------------------|
| Speed | 80-120 tok/s | 33 tok/s |
| Memory | Grows with context | Constant |
| Function calling | Native (0.880 BFCL) | Limited/none |
| Quality at small context | Better | Comparable |
| Quality at large context | KV cache cost | Free |
| Ecosystem | Mature (WebLLM) | Experimental (web-rwkv) |

**Decision**: Start with Qwen3-0.6B for MVP (better function calling, faster, more mature). Evaluate RWKV for Phase 2+ when continuous cognition and large context become important.

---

## 3. Browser GPU Memory Constraints

### Per-Browser Limits

| Browser | Default Buffer | Requestable | Practical Ceiling |
|---------|---------------|-------------|-------------------|
| Chrome (desktop) | 256MB per buffer | 4GB via `requestAdapter()` | 4-6GB total |
| Edge (desktop) | 256MB per buffer | 4GB | 4-6GB total |
| Firefox | Not yet shipped | N/A | N/A |
| Safari | Partial WebGPU | Limited | ~2GB |
| Mobile browsers | 256MB | ~1-2GB | Not viable |

### GPU Memory Budget

```
Target: 4GB total available (mid-range GPU)

WebLLM:
  Model weights (q4f16):     ~1.0 GB
  KV cache (L3, 1K context): ~0.2 GB
  Compute buffers:           ~0.1 GB
  Subtotal:                  ~1.3 GB

Three.js:
  Geometry (terrarium):      ~50 MB
  Textures:                  ~100 MB
  Render targets:            ~100 MB
  Particle systems:          ~50 MB
  Subtotal:                  ~300 MB

Browser/OS overhead:         ~500 MB

Total:                       ~2.1 GB
Headroom:                    ~1.9 GB ✓
```

### Risk: KV Cache at High Levels

At L6 (8K context), Qwen3-0.6B's KV cache could reach ~800MB-1.2GB:
- Total would be ~2.5-3.0GB — still within budget but tight
- Mitigation: aggressive context compression, keep actual context shorter than max
- Mitigation: switch to RWKV for L5-L6 creatures (constant memory)

---

## 4. GPU Contention: LLM vs Rendering

### The Problem

WebLLM and Three.js both use WebGPU compute/render pipelines. If they submit work simultaneously, one or both may stall.

### Mitigation Strategies

**Strategy 1: Web Worker Isolation (Primary)**
- WebLLM runs in Web Worker with its own WebGPU device
- Three.js runs on main thread with its own WebGPU device
- GPU driver handles scheduling between devices
- Works well in practice — tested by WebLLM team

**Strategy 2: Token Batching**
- Instead of streaming all tokens at once, generate 1-2 tokens per frame
- Yield control back to Three.js render loop between batches
- Increases thought cycle time but maintains smooth rendering
- Fallback if Strategy 1 causes frame drops

**Strategy 3: Adaptive Quality**
- Monitor frame rate during inference
- If FPS drops below 30: reduce Three.js quality (fewer particles, simpler shaders)
- When inference completes: restore quality
- Similar to self-building-game's 3-tier adaptive quality system

### Benchmark: Simultaneous Inference + Rendering

From WebLLM documentation and community reports:
- M1 MacBook Air: 60fps rendering + 80 tok/s inference (no visible interference)
- RTX 3060: 60fps rendering + 100 tok/s inference (occasional micro-stutter)
- Intel Iris: NOT VIABLE — GPU too weak for both tasks

---

## 5. Client-Side Agentic Frameworks

### Existing Implementations

**1. On-Device Browser Agent (RunanywhereAI, Feb 2026)**
- Chrome extension running multi-agent orchestration entirely on-device
- Uses Qwen2.5-1.5B for planning, navigation, and execution
- Outputs structured JSON parsed into executable browser actions
- Proof that sophisticated tool-calling agents work purely client-side

**2. LangChain.js + WebLLM**
- LangChain.js has WebLLM integration for browser-based ReAct loops
- Demo combining LangChain.js + WebLLM + Three.js exists
- Provides tool calling, memory, and chain-of-thought out of the box

**3. Mozilla 3W Stack**
- Mozilla's experimental "Web, WebGPU, WebLLM" stack
- Focused on privacy-preserving AI features in Firefox
- Not production-ready but validates the architectural approach

**4. WebextLLM (Browser Extension Model)**
- Browser extension providing LLM-as-a-service to web apps
- Users download model once, share across applications
- Permission model: grant/deny per app
- Experimental — not reliable enough for production dependency

**5. Transformers.js v4**
- HuggingFace's browser inference library, v4 achieves 4x speedup over v3
- 60 tok/s for 3B models with WebGPU
- Alternative to WebLLM with different model support

### Assessment

No one has assembled these pieces into a general-purpose "client-side AI agent framework." The components exist — inference (WebLLM), tool calling (LangChain.js), rendering (Three.js), storage (IndexedDB) — but integration is bespoke per project. Autogen would be among the first to combine all four into a cohesive product.

---

## 6. Intelligence Dial Techniques

### Temperature Control

- 0.0-0.3: Highly deterministic, focused output (used for elder creatures)
- 0.7-1.0: Balanced creativity and coherence (child-adult range)
- 1.2-1.5: High randomness, often incoherent (embryo-newborn range)
- WebLLM supports per-request temperature configuration

### Context Window Restriction

- Reducing max_tokens limits the creature's "working memory"
- 128 tokens (L0): nearly stateless, each thought is disconnected
- 8K tokens (L6): can reason about complex multi-step situations
- "Lost in the middle" phenomenon: models attend poorly to middle of long context
  - Mitigation: put most important info (sensory state) at END of context

### Tool Gating

- Available tools defined in system prompt per level
- Server validates tool calls against level permissions
- Attempted use of locked tools: server returns error, creature learns tool is unavailable
- Progressive unlock creates natural capability growth

### Constrained Decoding

- Force output to match JSON schema (structured output)
- WebLLM supports `response_format: { type: "json_object" }`
- Ensures parseable tool calls even at high temperatures
- L0-L1 might not use constrained decoding (allow pure text noise)
- L2+ use constrained decoding for reliable tool call parsing

---

## 7. Security Research

### Client-Side LLM Security Reality

**Finding: Prompt injection defense is fundamentally impossible when user owns the browser runtime.**

- System prompts: visible in IndexedDB, modifiable via DevTools
- Model weights: cached in Cache Storage, downloadable
- Inference pipeline: JavaScript source is readable and modifiable
- Tool definitions: client-side function signatures are exposed
- Context window: all inputs/outputs readable in real-time

**Implication for Autogen**: The security model MUST assume the client is fully compromised. All authoritative state lives on the server. The client LLM is purely for the creature's "subjective experience" — changing it changes the personality, not the capabilities.

### Multiplayer Game Security Pattern

The proven approach for untrusted clients (from 25+ years of multiplayer game development):

```
Client predicts → Server authorizes → Client renders authoritative state

Applied to Autogen:
  Client LLM "decides" to use a tool →
  Server validates level/energy/rate/args →
  Server executes or rejects →
  Client renders result
```

### Model Weight Security

- Open-source model (Qwen3-0.6B) — no IP to protect
- Weights are public anyway (HuggingFace)
- Custom fine-tunes could be extracted — don't fine-tune with secrets
- No mitigation needed — this is a feature, not a bug

---

## 8. Embedding Models for RAG

For knowledge graph semantic search, we need a lightweight embedding model:

| Model | Size | Speed | Dimensions | Notes |
|-------|------|-------|------------|-------|
| all-MiniLM-L6-v2 | 22MB | 200+ emb/s | 384 | Standard choice, runs in same Web Worker |
| nomic-embed-text-v1 | 137MB | 50+ emb/s | 768 | Higher quality, larger |
| TinyBERT | 15MB | 300+ emb/s | 312 | Fastest, lower quality |

**Decision**: all-MiniLM-L6-v2 via Transformers.js. Small enough to run alongside Qwen3-0.6B, good enough quality for entity-relation matching. Falls back to keyword matching if embedding model can't load.

---

## 9. Solana / pump.fun Integration (Phase 3)

### pump.fun Mechanics

- Permissionless token launch: deploy token with name, symbol, description
- Bonding curve: price increases as supply is purchased
- Auto-liquidity: once bonding curve fills (~$69K), liquidity auto-migrates to Raydium
- No team allocation, no presale — all tokens start on the curve
- Fee: 0.01 SOL to create token

### Integration Requirements

- Phantom wallet adapter (@solana/wallet-adapter)
- Token operations: mint (creature birth), transfer (gifting), burn (creature death)
- Price feed: track token price via Raydium pool or Jupiter API
- Transaction confirmation: wait for finality before updating game state

### Economic Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Death spiral (price crashes → users leave → more deaths → more crash) | Medium | High | Cap daily burn rate, "resurrection" sink |
| Bot farming (automated mining) | High | Medium | Proof-of-attention, diminishing returns |
| Whale manipulation (buy supply → control ecosystem) | Medium | Medium | Token is energy (consumable), not governance |
| Regulatory (securities classification) | Low | High | Utility token, no profit-sharing promises |
