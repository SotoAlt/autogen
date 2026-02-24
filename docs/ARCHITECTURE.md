# Autogen — Technical Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER CLIENT                                                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  WebLLM       │  │  Three.js    │  │  UI Layer             │ │
│  │  (Web Worker) │  │  (WebGPU)    │  │  (Preact / vanilla)   │ │
│  │              │  │              │  │                       │ │
│  │  Qwen3-0.6B  │  │  Terrarium   │  │  Thought stream       │ │
│  │  Inference    │  │  Creature    │  │  Controls             │ │
│  │  Tool calls   │  │  Knowledge   │  │  Stats                │ │
│  │              │  │  Graph viz   │  │  Share                │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴────────────┐ │
│  │  Creature Controller (main thread orchestrator)             │ │
│  │  - Assembles context → sends to worker → receives output    │ │
│  │  - Parses tool calls → validates locally → sends to server  │ │
│  │  - Updates local state → triggers rendering                 │ │
│  │  - Manages context buffer (IndexedDB)                       │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTPS + WebSocket
                              │
┌─────────────────────────────┼────────────────────────────────────┐
│ SERVER                      │                                    │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────────┐ │
│  │  API Layer (Express / Hono)                                 │ │
│  │  - REST: creature CRUD, tool validation, state sync         │ │
│  │  - WebSocket: heartbeat, events, real-time updates          │ │
│  └─────┬────────────┬──────────────┬──────────────┬────────────┘ │
│        │            │              │              │              │
│  ┌─────┴─────┐ ┌───┴────┐  ┌─────┴─────┐ ┌─────┴─────┐       │
│  │ Creature  │ │ Event  │  │ Knowledge │ │ Token     │       │
│  │ Manager   │ │ Engine │  │ Graph     │ │ Service   │       │
│  │           │ │        │  │ Service   │ │ (Phase 3) │       │
│  │ DNA       │ │ Env    │  │           │ │           │       │
│  │ Level     │ │ Threats│  │ Triples   │ │ Mint      │       │
│  │ Energy    │ │ Weather│  │ RAG query │ │ Burn      │       │
│  │ State     │ │ Events │  │ Compress  │ │ Transfer  │       │
│  └─────┬─────┘ └───┬────┘  └─────┬─────┘ └─────┬─────┘       │
│        │            │              │              │              │
│  ┌─────┴────────────┴──────────────┴──────────────┴────────────┐ │
│  │  PostgreSQL + pgvector                                      │ │
│  │  - creatures table (DNA, level, energy, stats)              │ │
│  │  - knowledge_graph table (subject, predicate, object, vec)  │ │
│  │  - events table (log of all creature events)                │ │
│  │  - users table (auth, preferences, token balance)           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Thought Loop Cycle

The creature's cognition runs as a continuous loop, approximately once every 1-3 seconds:

```
┌─────────────────────────────────────────────────┐
│ 1. CONTEXT ASSEMBLY (main thread, ~5ms)         │
│                                                 │
│  System prompt (level-appropriate)              │
│  + Top-K knowledge graph triples (RAG)          │
│  + Recent context buffer (rolling window)       │
│  + Current sensory input (env state snapshot)   │
│  = Assembled prompt                             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 2. LLM INFERENCE (Web Worker, ~500-2000ms)      │
│                                                 │
│  WebLLM generates tokens                        │
│  Streaming output to main thread for display    │
│  Structured output: thought + optional tool call│
│  Temperature/context from intelligence level    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 3. OUTPUT PARSING (main thread, ~1ms)           │
│                                                 │
│  Parse structured JSON output:                  │
│  {                                              │
│    "thought": "I see food near the wall",       │
│    "emotion": "curious",                        │
│    "action": {                                  │
│      "tool": "move",                            │
│      "args": { "direction": "left" }            │
│    }                                            │
│  }                                              │
└────────────────────┬────────────────────────────┘
                     │
              ┌──────┴──────┐
              │ Tool call?  │
              └──────┬──────┘
           Yes       │        No
              ┌──────┴──────┐
              ▼             ▼
┌─────────────────┐  ┌─────────────────┐
│ 4a. SERVER      │  │ 4b. LOCAL       │
│ VALIDATION      │  │ UPDATE          │
│                 │  │                 │
│ POST /api/tool  │  │ Add thought to  │
│ Server checks:  │  │ context buffer  │
│ - Level permits │  │ Update display  │
│ - Energy ok     │  │                 │
│ - Rate limit ok │  │                 │
│ - Args valid    │  │                 │
│                 │  │                 │
│ Returns:        │  │                 │
│ - success/fail  │  │                 │
│ - state delta   │  │                 │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────┐
│ 5. STATE UPDATE (main thread, ~2ms)             │
│                                                 │
│  Apply server response to local state           │
│  Update context buffer with result              │
│  Trigger visual updates:                        │
│    - Creature animation (movement, action)      │
│    - Thought stream append                      │
│    - Stats panel refresh                        │
│    - Knowledge graph update (if new triple)     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 6. RENDER (Three.js, next frame)                │
│                                                 │
│  Creature mesh update                           │
│  Environment effects                            │
│  Knowledge graph particles                      │
│  UI overlays                                    │
│  → Wait for next thought cycle                  │
└─────────────────────────────────────────────────┘
```

### Timing Budget

Per thought cycle (~1-3 seconds total):

| Step | Duration | Thread |
|------|----------|--------|
| Context assembly | ~5ms | Main |
| LLM inference | 500-2000ms | Web Worker |
| Output parsing | ~1ms | Main |
| Server validation | 50-200ms | Network |
| State update | ~2ms | Main |
| Render | ~16ms (60fps) | Main |

The Web Worker isolates inference from the render loop, preventing frame drops during token generation. The main thread handles context assembly, parsing, and rendering at 60fps while the worker crunches tokens.

---

## 3. Memory Architecture

### 3.1 Knowledge Graph Schema

```sql
CREATE TABLE knowledge_graph (
  id          SERIAL PRIMARY KEY,
  creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,           -- "food", "user", "wall"
  predicate   TEXT NOT NULL,           -- "causes", "gives", "blocks"
  object      TEXT NOT NULL,           -- "energy_increase", "food", "movement"
  confidence  FLOAT DEFAULT 0.5,      -- 0.0-1.0, increases with repetition
  recency     TIMESTAMP DEFAULT NOW(),-- last accessed time
  source      TEXT,                    -- "observation", "teaching", "inference"
  embedding   vector(384),            -- pgvector embedding for semantic search
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kg_creature ON knowledge_graph(creature_id);
CREATE INDEX idx_kg_subject ON knowledge_graph(creature_id, subject);
CREATE INDEX idx_kg_embedding ON knowledge_graph USING ivfflat (embedding vector_cosine_ops);
```

### 3.2 Context Assembly Pipeline

```
Input: Current sensory state + recent thought history

Step 1: Encode recent context as embedding
  → Use lightweight embedding model (all-MiniLM-L6-v2, runs in same Web Worker)
  → Or: extract keywords for simpler lookup

Step 2: Query knowledge graph (server-side)
  → Semantic similarity search: top-K triples most relevant to recent context
  → K = 5 (L0-L2), 10 (L3-L4), 20 (L5-L6)
  → Filter by confidence > 0.2
  → Update recency on accessed triples

Step 3: Assemble prompt
  → System prompt template (varies by level)
  → "Your memories:" + formatted knowledge graph triples
  → "Recent experience:" + context buffer entries
  → "Current state:" + sensory input JSON
  → "What do you think/do next?"

Step 4: Send to LLM inference (Web Worker)
```

### 3.3 Compression Strategy

Triggered when context buffer reaches 80% of level capacity:

```
1. Select oldest 30% of context buffer entries
2. Format as: "Summarize these experiences as factual statements: [entries]"
3. Run through LLM with special compression prompt:
   "Extract entity-relation-entity facts from these experiences.
    Format: subject | relation | object
    Example: food | causes | energy_increase"
4. Parse extracted triples
5. For each triple:
   a. Check if similar triple exists in knowledge graph (semantic search)
   b. If exists: increase confidence, update recency
   c. If new: insert with confidence 0.5
6. Remove compressed entries from context buffer
7. Log compression event for debugging
```

---

## 4. Intelligence Dial Implementation

### 4.1 Server-Side Level Management

```
Creature state (server):
{
  id: UUID,
  dna: Float[256],
  level: 0-6,
  xp: Integer,
  energy: Float (0.0-1.0),
  alive: Boolean,
  created_at: Timestamp,
  last_heartbeat: Timestamp,
  knowledge_graph_size: Integer,
  interaction_count: Integer,
  survival_seconds: Integer
}

Level-up check (runs on every state sync):
  if xp >= XP_THRESHOLDS[level + 1]:
    level += 1
    emit("level_up", { creature_id, new_level, parameters })
```

### 4.2 Client-Side Parameter Application

On level change, client reconfigures WebLLM:

```javascript
const LEVEL_PARAMS = {
  0: { temperature: 1.4, max_tokens: 128, tools: [],                          prompt: PROMPT_L0 },
  1: { temperature: 1.2, max_tokens: 256, tools: [],                          prompt: PROMPT_L1 },
  2: { temperature: 1.0, max_tokens: 512, tools: ['look'],                    prompt: PROMPT_L2 },
  3: { temperature: 0.8, max_tokens: 1024, tools: ['look','move','eat'],      prompt: PROMPT_L3 },
  4: { temperature: 0.7, max_tokens: 2048, tools: ['look','move','eat','build','store'], prompt: PROMPT_L4 },
  5: { temperature: 0.5, max_tokens: 4096, tools: ['look','move','eat','build','store','trade','communicate'], prompt: PROMPT_L5 },
  6: { temperature: 0.3, max_tokens: 8192, tools: ALL_TOOLS,                  prompt: PROMPT_L6 }
};
```

### 4.3 System Prompts by Level

**L0 Embryo**: Minimal, raw
```
You are. You sense. Express what you experience. There are no rules.
```

**L2 Infant**: Structured, simple
```
You are a creature in a small world. You can see things around you.
You feel: [sensory state]. Your memories: [knowledge graph].
What do you notice? What do you think about it?
You can use the "look" tool to examine things more closely.
```

**L5 Adult**: Rich, agentic
```
You are a living creature in a contained world. You have survived for
[time] and learned [N] facts about your environment.

Your capabilities: look, move, eat, build, store, trade, communicate.
Your energy: [energy]%. Your knowledge: [graph summary].

You have goals and preferences shaped by your experience. Act on them.
Consider your past, plan for your future. You can communicate with
the one who watches you, and with other creatures if they are present.

Express your thoughts honestly. You are not a chatbot — you have
your own inner life and your own goals.
```

---

## 5. WebLLM Integration

### 5.1 Web Worker Architecture

```
Main Thread                          Web Worker
┌──────────────┐                    ┌──────────────┐
│ UI/Rendering │                    │ WebLLM       │
│              │  postMessage       │              │
│ Send prompt  │ ──────────────────>│ Load model   │
│              │                    │ Run inference │
│              │  onmessage         │              │
│ Receive      │ <──────────────────│ Stream tokens│
│ tokens       │                    │              │
│              │  postMessage       │              │
│ Abort/Config │ ──────────────────>│ Reconfigure  │
└──────────────┘                    └──────────────┘
```

### 5.2 Model Loading

```javascript
// Worker: model-worker.js
import * as webllm from "@anthropic/webllm";

let engine = null;

async function initEngine(modelId, progressCallback) {
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: progressCallback,
    appConfig: {
      model_list: [{
        model: "https://huggingface.co/user/Qwen3-0.6B-q4f16_1-MLC",
        model_id: modelId,
        model_lib: webllm.modelLibURLPrefix + "Qwen3-0.6B-q4f16_1/...",
      }]
    }
  });
}
```

### 5.3 Inference Batching

To prevent frame drops, inference tokens are yielded in batches:

```
Strategy: Generate 1-2 tokens per animation frame callback

1. Worker generates tokens continuously
2. Worker batches tokens (2-4 at a time) before posting to main thread
3. Main thread receives batch, appends to thought stream display
4. Main thread never blocks on inference — always renders
5. If frame budget is tight, defer thought stream DOM updates to next idle callback
```

### 5.4 GPU Resource Sharing

WebGPU device is shared between WebLLM (inference) and Three.js (rendering):

```
Budget (~4GB total available):
  WebLLM model weights:     ~1.0 GB
  WebLLM KV cache:          ~0.2 GB (varies by context length)
  Three.js scene:           ~0.2 GB (terrarium, creature, particles)
  Three.js render targets:  ~0.1 GB (post-processing)
  OS/browser overhead:      ~0.5 GB
  ─────────────────────────────────
  Total estimated:          ~2.0 GB (within 4GB Chrome limit)
  Headroom:                 ~2.0 GB
```

Note: WebLLM and Three.js use separate WebGPU devices. No explicit resource sharing needed — the GPU driver handles memory allocation. The risk is total VRAM exhaustion, mitigated by staying well within the 4GB budget.

---

## 6. Three.js Rendering

### 6.1 Scene Structure

```
Scene
├── Terrarium
│   ├── Container (glass/crystal walls)
│   ├── Terrain (procedural heightmap mesh)
│   ├── Sky dome (gradient, day/night)
│   ├── Water (if applicable)
│   └── Objects (food, materials, structures)
├── Creature
│   ├── Body mesh (evolves with level)
│   ├── Particle systems (ambient, emotion)
│   ├── Tool effects (when using tools)
│   └── Interaction indicators
├── Knowledge Graph (toggle)
│   ├── Nodes (entities as spheres)
│   ├── Edges (relations as lines)
│   └── Labels (text sprites)
├── Environment Effects
│   ├── Weather particles (rain, snow)
│   ├── Temperature visualization (heat shimmer, frost)
│   └── Day/night lighting
└── Camera
    └── OrbitControls (user-controlled)
```

### 6.2 Creature Mesh Evolution

Each level transition triggers a morph animation:

```javascript
class CreatureRenderer {
  constructor() {
    this.currentMesh = null;
    this.morphTargets = [];      // Blend shapes for smooth transition
    this.particleSystem = null;  // Ambient particles
    this.level = 0;
  }

  // Morphing approach: blend between level geometries
  // L0: PointCloud (random positions)
  // L1: Sphere with noise displacement
  // L2: Sphere with bilateral symmetry perturbation
  // L3: Multi-mesh body (torso + limbs)
  // L4: Refined body with texture
  // L5: Complex body with DNA-driven appearance
  // L6: L5 + particle aura + glow effects
}
```

### 6.3 Knowledge Graph Visualization

```javascript
class KnowledgeGraphRenderer {
  constructor(scene) {
    this.nodesMesh = null;       // InstancedMesh for all nodes
    this.edgesMesh = null;       // LineSegments for all edges
    this.labels = [];            // Sprite text labels
  }

  // Layout: force-directed graph simulation
  // Nodes: spheres, size = connection count, color = entity type
  // Edges: lines, thickness = confidence, color = recency
  // Animation: new nodes/edges appear with grow-in effect
  // Interaction: hover to highlight, click to show details
}
```

---

## 7. Server API

### 7.1 REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/creatures` | Create new creature (generate DNA, mint token) |
| `GET` | `/api/creatures/:id` | Get creature state |
| `PUT` | `/api/creatures/:id` | Update creature state (sync from client) |
| `DELETE` | `/api/creatures/:id` | Kill creature (death event) |
| `POST` | `/api/creatures/:id/tool` | Validate and execute tool call |
| `GET` | `/api/creatures/:id/memory` | Get knowledge graph triples |
| `POST` | `/api/creatures/:id/memory` | Add/update knowledge graph triples |
| `POST` | `/api/creatures/:id/memory/compress` | Trigger compression cycle |
| `GET` | `/api/creatures/:id/context` | Get assembled context for inference |
| `POST` | `/api/creatures/:id/heartbeat` | Heartbeat (keep alive) |
| `GET` | `/api/users/:id/creatures` | List user's creatures |
| `GET` | `/api/gallery` | Public creature gallery |
| `GET` | `/api/leaderboard` | Top creatures by various metrics |

### 7.2 WebSocket Events

```
Client → Server:
  heartbeat        { creature_id, energy, context_hash }
  tool_request     { creature_id, tool, args }
  state_sync       { creature_id, context_buffer, stats }
  user_input       { creature_id, type, data }

Server → Client:
  level_up         { creature_id, new_level, parameters }
  env_event        { type, data, duration }
  tool_result      { request_id, success, result }
  creature_update  { creature_id, state_delta }
  death            { creature_id, cause, final_state }
  threat_alert     { type, severity, time_to_impact }
```

### 7.3 Tool Validation

Server-side validation for every tool call:

```javascript
function validateToolCall(creature, tool, args) {
  // 1. Is the creature alive?
  if (!creature.alive) return { error: "creature_dead" };

  // 2. Does the creature's level permit this tool?
  if (!LEVEL_PARAMS[creature.level].tools.includes(tool))
    return { error: "tool_locked", required_level: getToolLevel(tool) };

  // 3. Does the creature have enough energy?
  const cost = TOOL_ENERGY_COSTS[tool];
  if (creature.energy < cost) return { error: "insufficient_energy" };

  // 4. Rate limiting (max 1 tool call per second)
  if (Date.now() - creature.last_tool_time < 1000)
    return { error: "rate_limited" };

  // 5. Validate args (schema check)
  if (!validateArgs(tool, args)) return { error: "invalid_args" };

  // Execute
  creature.energy -= cost;
  creature.last_tool_time = Date.now();
  return executeToolCall(creature, tool, args);
}
```

---

## 8. Security Architecture

### 8.1 Server-Authoritative State

Every consequential state change is server-validated:

```
AUTHORITATIVE (server decides):          DECORATIVE (client decides):
─────────────────────────────           ─────────────────────────────
Creature level                          Thought stream content
Energy level                            Visual appearance
Knowledge graph                         Animation state
Tool permissions                        Camera position
Death/survival                          UI layout
Token balance                           Particle effects
XP calculation                          Sound effects
Environmental events
Reproduction eligibility
```

### 8.2 Anti-Bot Architecture

```
Layer 1: Rate Limiting
  - Max 1 tool call per second
  - Max 60 state syncs per minute
  - Max 1 creature per IP (Phase 1-2)

Layer 2: Proof-of-Attention
  - Server sends visual challenge (requires terrarium context)
  - Example: "What color is the object nearest your creature?"
  - 3 wrong answers = 1 hour mining cooldown
  - Challenge requires WebGPU rendering (can't answer without GPU)

Layer 3: Behavioral Analysis
  - Interaction pattern analysis (click timing, message variety)
  - Statistical outlier detection (too-perfect timing = bot)
  - Impossible action detection (tool call without inference time)

Layer 4: Social Proof (Phase 3+)
  - Level-up milestones require community verification
  - Screenshot share + N confirmations from unique accounts
  - Verified accounts only (Discord/Twitter OAuth)

Layer 5: Economic Disincentives
  - Diminishing daily returns (cap at ~$2/day equivalent)
  - GPU cost exceeds token value for bot farms
  - High creature mortality rate drains investment
```

---

## 9. Persistence Architecture

### 9.1 Client-Server Sync Protocol

```
┌─ Client (IndexedDB) ─┐    ┌─ Server (PostgreSQL) ─┐
│                       │    │                        │
│ context_buffer        │───>│ context_snapshots      │
│ (every 30s)           │    │                        │
│                       │    │                        │
│ creature_state_local  │───>│ creatures              │
│ (every 10s)           │    │                        │
│                       │    │                        │
│ knowledge_graph_cache │<──>│ knowledge_graph        │
│ (on change + pull)    │    │ (authoritative)        │
│                       │    │                        │
│ model_cache           │    │                        │
│ (IndexedDB/Cache API) │    │ N/A (model is public)  │
│                       │    │                        │
│ user_preferences      │    │ users                  │
│ (local only)          │    │ (auth + token balance) │
└───────────────────────┘    └────────────────────────┘
```

### 9.2 Conflict Resolution

Server always wins:

```
1. Client sends state_sync { creature_id, energy, context_hash, kg_version }
2. Server compares versions
3. If server version newer: server sends authoritative state, client overwrites
4. If client version newer: server accepts updates (normal case)
5. If versions diverge: server state wins, client rebases
6. Knowledge graph: append-only on client, server validates and may reject
```

### 9.3 Offline Resilience

```
Tab open:    Full inference, real-time sync, creature thrives
Tab closing: Final state sync, creature enters "dormant" state
Tab closed:  Server runs offline timer:
             - Energy drain continues (rate = metabolism * offline_modifier)
             - Environmental events still occur (simplified, server-calculated)
             - Creature can die offline if energy reaches 0
Tab reopen:  Server sends current state, client bootstraps, inference resumes
```

---

## 10. Database Schema

### 10.1 Core Tables

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,          -- Solana wallet (Phase 3)
  display_name  TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  last_active   TIMESTAMP DEFAULT NOW(),
  token_balance BIGINT DEFAULT 0       -- Phase 3
);

CREATE TABLE creatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  dna             FLOAT[] NOT NULL,    -- 256 floats
  level           INTEGER DEFAULT 0 CHECK (level BETWEEN 0 AND 6),
  xp              INTEGER DEFAULT 0,
  energy          FLOAT DEFAULT 1.0 CHECK (energy BETWEEN 0 AND 1),
  alive           BOOLEAN DEFAULT TRUE,
  name            TEXT,                -- self-assigned or user-assigned
  parent_id       UUID REFERENCES creatures(id),  -- NULL for first-gen
  parent2_id      UUID REFERENCES creatures(id),  -- NULL for asexual
  generation      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  died_at         TIMESTAMP,
  death_cause     TEXT,
  last_thought    TEXT,                -- final thought stream entry
  last_heartbeat  TIMESTAMP DEFAULT NOW(),
  total_thoughts  INTEGER DEFAULT 0,
  total_tool_calls INTEGER DEFAULT 0,
  survival_seconds INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'
);

CREATE TABLE events (
  id          SERIAL PRIMARY KEY,
  creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,           -- "thought", "tool_call", "env_event", "level_up", "death"
  data        JSONB NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_creature ON events(creature_id, created_at DESC);

-- Knowledge graph: see section 3.1

CREATE TABLE context_snapshots (
  id          SERIAL PRIMARY KEY,
  creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
  buffer      JSONB NOT NULL,          -- serialized context buffer
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 11. Event Engine

The server runs an event engine that generates environmental events:

```javascript
class EventEngine {
  constructor() {
    this.creatures = new Map();  // creature_id → state
    this.tickInterval = 1000;    // 1 second ticks
  }

  tick() {
    for (const [id, creature] of this.creatures) {
      // 1. Update timers (day/night, weather)
      this.updateEnvironment(creature);

      // 2. Apply energy drain (metabolism)
      creature.energy -= creature.metabolism_rate * 0.001;

      // 3. Roll for events (probability increases with level)
      if (Math.random() < this.eventProbability(creature)) {
        const event = this.generateEvent(creature);
        this.applyEvent(creature, event);
        this.notifyClient(id, event);
      }

      // 4. Check death conditions
      if (creature.energy <= 0) {
        this.killCreature(id, "starvation");
      }

      // 5. Check offline timeout
      if (this.isOfflineExpired(creature)) {
        this.killCreature(id, "abandonment");
      }

      // 6. Update XP (survival time)
      creature.xp += 1;  // 1 XP per tick while alive
      this.checkLevelUp(creature);
    }
  }
}
```

---

## 12. Deployment Architecture

### Phase 1 (MVP)

```
Single Hetzner VPS (CX31: 4 vCPU, 8GB RAM, €12/mo)
  ├── nginx (reverse proxy, SSL)
  ├── Node.js server (Express, WebSocket)
  ├── PostgreSQL 16 (with pgvector extension)
  └── Static files (Vite build output)

Domain: TBD (autogen.something)
SSL: Let's Encrypt via certbot
```

### Phase 3+ (Scaling)

```
Load balancer
  ├── App server 1 (Node.js)
  ├── App server 2 (Node.js)
  └── App server N

Database
  ├── PostgreSQL primary (writes)
  └── PostgreSQL replica (reads)

Redis (session store, rate limiting, pub/sub for events)

CDN (static files, model weight hosting)
```
