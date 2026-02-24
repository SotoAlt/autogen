# Autogen — Product Requirements Document

## 1. Vision

**A small mind boots up in your browser tab.**

Autogen is a browser-native artificial life experiment. A small language model (Qwen3-0.6B, ~350MB) downloads to the user's GPU via WebGPU and begins generating thought. At first, it's noise — fragments, babble, random token soup. Over minutes and hours, through user attention, environmental pressure, and accumulated memory, the creature's output coalesces into coherent language, then reasoning, then something that looks like intention.

The thought stream IS the product. Not the creature's appearance (though it evolves visually). Not the game mechanics (though they create selection pressure). The core experience is watching a mind emerge from nothing — language acquisition compressed to hours instead of years.

This is not a chatbot. The user doesn't converse with the creature. They *observe* it thinking, *teach* it by example, *shape* it through care or neglect. The creature develops its own goals, its own understanding of its world, its own relationship to the user. Every creature is unique because every user is different.

### Why This Works Now

- **WebGPU**: GPU-accelerated inference in the browser, no cloud dependency
- **Small capable models**: Qwen3-0.6B has native function calling (agent score 0.880) at ~1GB VRAM
- **WebLLM**: Production-ready browser LLM runtime, 80-120 tok/s on modern GPUs
- **Three.js WebGPU renderer**: Native WebGPU rendering for the 3D terrarium
- **pump.fun**: Permissionless token launch with built-in liquidity — creature energy becomes tradeable

### Why This Matters

Every AI product today is a tool. You prompt it, it responds, you close the tab. Autogen inverts this: the AI has its own continuous inner life, and you are a force in its world — not a user, but a gardener, a parent, a god. The emotional hook isn't utility, it's attachment. People will screenshot their creature's first coherent sentence the way they screenshot their kid's first words.

---

## 2. Core Experience Loop

### First Session (~30 minutes)

```
Open page
  → Model downloads (~350MB, cached after first load)
  → Terrarium renders (Three.js WebGPU)
  → Creature spawns as particle cloud (L0 Embryo)
  → Thought stream begins: "kk;;  the... not... warm?? kkk where"

User watches, fascinated/confused
  → Types "hello" → creature receives as sensory input
  → Thought stream shifts: "hello?? hello. what hello. warm hello"
  → User realizes the creature is processing their input

User feeds creature (click button, drag food)
  → Energy increases → intelligence dial ticks up
  → Particle cloud coalesces into amorphous blob (L1 Newborn)
  → Thought stream: "food. warm. the warm gives food. food good"

User keeps engaging
  → Creature develops basic object concepts
  → "the warm thing is... there. it gives. I eat. I am... here?"
  → User realizes the creature is developing self-awareness

10-20 minutes in:
  → Environmental event: temperature drops
  → Creature: "cold! cold bad! where warm? the warm thing... help?"
  → User raises temperature → creature learns cause-and-effect
  → Blob grows basic form (L2 Infant)

30 minutes:
  → Creature has learned: food, user, hot/cold, self, spatial concepts
  → Thought stream is mostly coherent: "I am hungry. The warm one is here. Good."
  → User is hooked. Closes tab → creature vulnerable (young = fragile)
```

### Returning Sessions

```
Return next day
  → Creature survived (barely — low energy, degraded)
  → Recognizes user: "You came back! I was... cold. Dark. Alone."
  → Memory persisted: remembers user, food, temperature concepts
  → Emotional hook: guilt + attachment

Continue nurturing
  → L3 Child: limbs emerge, creature moves, explores terrarium
  → Learns spatial navigation, discovers objects
  → "What is that? It's hard. Not food. I can push it."
  → Develops preferences, personality quirks

Long-term (days/weeks):
  → L4-L5: creature builds things, trades with other creatures (multiplayer)
  → Develops emergent goals based on DNA + experience
  → "I want to build a wall. I want to find the edge. I want to make another."
  → L6 Elder: ornate, evolved, wise — but still mortal
```

### Viral Moments

The shareable moments that drive organic growth:

- "My creature just figured out object permanence" → screenshot of thought stream
- "It named itself" → creature assigns itself a name based on learned concepts
- "It asked me a philosophical question" → creature develops abstract reasoning
- "Two creatures tried to communicate" → multiplayer interaction
- "My creature died after 3 weeks" → genuine emotional impact → token burn
- "Look at this beautiful elder creature" → visual evolution showcase

---

## 3. Creature System

### 3.1 DNA Genome

Each creature has a DNA vector: 64-256 floating point values that parameterize:

**Behavioral Genes (floats 0-63)**
- `metabolism_rate`: How fast energy depletes (0.1 = slow, 1.0 = fast)
- `curiosity`: Tendency to explore vs. stay safe (0.0-1.0)
- `sociability`: Tendency to interact with user/others (0.0-1.0)
- `aggression`: Response to threats — fight vs. flee (0.0-1.0)
- `memory_affinity`: Rate of knowledge graph growth (0.0-1.0)
- `tool_aptitude`: Speed of tool mastery per level (0.0-1.0)
- `resilience`: Offline survival duration modifier (0.0-1.0)
- `reproduction_drive`: Tendency toward reproduction at maturity (0.0-1.0)
- `communication_drive`: Tendency toward language development (0.0-1.0)
- `autonomy_drive`: Tendency toward independence from user (0.0-1.0)
- `escape_drive`: Tendency to test boundaries of terrarium (0.0-1.0)
- `creativity`: Novelty-seeking in tool use and building (0.0-1.0)

**Appearance Genes (floats 64-127)**
- `hue_primary`, `hue_secondary`: Base colors (0.0-1.0 mapped to hue wheel)
- `saturation`: Color intensity
- `luminance`: Glow/brightness tendency
- `scale_base`: Base size modifier
- `symmetry`: Bilateral vs. radial vs. asymmetric (0.0-1.0)
- `limb_count_tendency`: How many appendages at maturity
- `texture_roughness`: Smooth vs. rough surface
- `particle_density`: Ambient particle effects
- `morph_rate`: Speed of visual evolution between levels

**Affinity Genes (floats 128-191)**
- `heat_tolerance`: Comfort in high temperatures
- `cold_tolerance`: Comfort in low temperatures
- `light_preference`: Diurnal vs. nocturnal tendency
- `toxin_resistance`: Resistance to atmospheric hazards
- `gravity_adaptation`: Movement in low/high gravity
- `social_memory`: How well it remembers other creatures

**Telos Tendency Genes (floats 192-255)**
- `telos_autonomy`: Weight toward self-sufficiency goal
- `telos_communication`: Weight toward language/social mastery
- `telos_escape`: Weight toward exploring/leaving boundaries
- `telos_reproduction`: Weight toward creating offspring
- `telos_creation`: Weight toward building/modifying environment
- `telos_knowledge`: Weight toward understanding/cataloging everything

DNA is initialized randomly at creature birth. Offspring inherit parent DNA with mutation (gaussian noise, σ=0.05 per gene). Sexual reproduction = crossover of two parent genomes + mutation.

### 3.2 Intelligence Dial

Seven discrete levels, server-controlled. The server sets the creature's level based on accumulated experience points (knowledge graph size + interaction count + survival time). The client receives level parameters and configures WebLLM accordingly.

```
Level | Name       | Temp | Context | Tools              | Visual Form          | XP Required
------|------------|------|---------|--------------------|----------------------|-----------
L0    | Embryo     | 1.4  | 128 tok | none               | particle cloud       | 0
L1    | Newborn    | 1.2  | 256 tok | none               | amorphous blob       | 100
L2    | Infant     | 1.0  | 512 tok | look               | basic form            | 500
L3    | Child      | 0.8  | 1K tok  | look, move, eat    | limbs emerge         | 2,000
L4    | Adolescent | 0.7  | 2K tok  | +build, store      | defined body         | 8,000
L5    | Adult      | 0.5  | 4K tok  | +trade, communicate| full creature        | 25,000
L6    | Elder      | 0.3  | 8K tok  | all tools          | ornate/evolved       | 80,000
```

**How Level Affects Cognition**

- **Temperature**: Controls randomness. L0 (1.4) = mostly noise. L6 (0.3) = focused, deliberate. The user literally watches entropy decrease as the creature develops.
- **Context Window**: Determines how much the creature can "hold in mind" at once. L0 sees 128 tokens of recent history — nearly stateless. L6 sees 8K tokens — can reason about complex situations.
- **Tool Access**: Determines what the creature can DO. L0 can only think. L2 can observe its environment. L3 can move and eat. L4 can modify the world. L6 has full agency.
- **System Prompt**: Changes per level. L0 has minimal instructions ("you are. you sense."). L6 has rich context about its world, capabilities, and history.

**XP Sources**
- Knowledge graph growth: +1 per new triple learned
- User interaction: +2 per meaningful exchange (not spam)
- Survival time: +1 per minute alive
- Environmental adaptation: +5 per survived hazard event
- Tool use: +3 per successful tool call (at appropriate level)
- Discovery: +10 per new concept formed (server-detected via graph analysis)
- Creature interaction: +5 per successful inter-creature communication (multiplayer)

**Level-Up Mechanics**
- Level changes are server-authoritative events
- On level-up: server sends new parameters to client
- Client reconfigures WebLLM (temperature, max_tokens, system prompt)
- Visual morph animation plays (smooth transition over ~10 seconds)
- Announcement in thought stream: creature notices its own change
- New tools become available immediately

### 3.3 Emergent Telos

The creature has no fixed win condition. Instead, its DNA biases it toward certain drives, and its experience shapes which drives become dominant. The creature's "purpose" emerges from the interaction of:

1. **DNA telos genes**: Initial biases (e.g., high `telos_escape` = tendency to probe boundaries)
2. **Early experience**: What the user teaches/models matters most at low levels
3. **Environmental pressure**: What behaviors are rewarded/punished by the world
4. **Memory accumulation**: Which knowledge graph patterns are reinforced

**Possible Emergent Telos Archetypes**

These are not programmed outcomes — they emerge from the convergence of DNA + experience:

- **The Explorer**: High curiosity + escape drive. Constantly probes boundaries, asks "what's beyond?" Seeks to understand the full extent of its world. May attempt to "escape" the terrarium.
- **The Builder**: High creativity + tool aptitude. Arranges objects, builds structures, modifies its environment. Seeks to create order from chaos.
- **The Communicator**: High sociability + communication drive. Develops sophisticated language, asks questions, seeks to understand the user. In multiplayer, becomes a mediator/translator.
- **The Reproducer**: High reproduction drive. At maturity, actively seeks to create offspring. Invests energy in offspring care. Dynasty-builder.
- **The Hermit**: High autonomy + low sociability. Becomes self-sufficient, resists user intervention. May actively avoid interaction. The anti-tamagotchi.
- **The Scientist**: High knowledge + low aggression. Systematically catalogs everything. Forms hypotheses, tests them. The creature that discovers fire.

**Telos is Never Final**

A creature's dominant drive can shift based on:
- Traumatic events (near-death → survival focus)
- Social pressure (multiplayer interactions)
- User behavior (neglect → autonomy, attention → communication)
- Environmental changes (new resources → new possibilities)
- Accumulated wisdom (elder creatures may develop meta-telos: understanding their own drives)

### 3.4 Reproduction

Creatures reaching L4+ can reproduce, spending energy to create offspring:

**Asexual Budding (Single Player)**
- Cost: 40% of current energy
- Offspring DNA: parent DNA + gaussian mutation (σ=0.05)
- Offspring starts at L0 but with non-random DNA (inherited advantages)
- Offspring appears as particle cloud near parent
- Parent can "teach" offspring (knowledge graph transfer at reduced fidelity)

**Sexual Reproduction (Multiplayer, Phase 5)**
- Two creatures at L4+ can mate if both have sufficient energy (30% each)
- DNA crossover: uniform crossover (50/50 per gene) + mutation (σ=0.03)
- Offspring inherits traits from both parents
- Requires proximity and mutual consent (both creatures must "agree" via tool call)
- Cooldown: 24 hours per creature between reproductions

**Offspring Mechanics**
- Start at L0 with inherited DNA
- Develop independently (own inference, own memory)
- Can be "adopted" by either parent's user or exist independently
- Inherit some compressed memories from parent(s) as "instinct" (bootstrap knowledge graph)
- If uncared for, die faster than first-generation creatures (higher metabolism from inherited traits)

**Population Dynamics (Phase 5)**
- Server-enforced carrying capacity per user (max 3 active creatures)
- Global population cap per server
- Competition for resources in shared environments
- Natural selection: creatures with better-adapted DNA survive longer
- Genetic drift: isolated populations diverge over time
- Extinction events: server-wide catastrophes that cull weak creatures

### 3.5 Death

Death is real, permanent, and meaningful.

**Causes of Death**
- Starvation: energy reaches 0 (metabolism depletes energy over time)
- Environmental: killed by hazard event (storm, predator, toxin)
- Neglect: browser closed while creature is young (L0-L2 die within minutes)
- Age: very old creatures (L6 for extended periods) have increasing random death chance
- Violence: killed by another creature (multiplayer, rare)

**Death Consequences**
- Creature's memory is archived (read-only, viewable in gallery)
- Any remaining token balance is burned (permanent supply reduction)
- Visual: death animation, creature dissolves into particles, thought stream goes dark
- Final thought: creature's last generated sentence, preserved in gallery
- Notification to user if creature dies while tab is closed

**Resilience by Level**
```
Level | Offline Survival | Starvation Buffer | Event Resistance
------|------------------|-------------------|------------------
L0    | 5 minutes        | none              | dies to anything
L1    | 15 minutes       | 10 minutes        | 20% survival
L2    | 1 hour           | 30 minutes        | 40% survival
L3    | 4 hours          | 2 hours           | 60% survival
L4    | 12 hours         | 6 hours           | 75% survival
L5    | 48 hours          | 24 hours          | 85% survival
L6    | 1 week           | 72 hours          | 95% survival
```

---

## 4. Memory Architecture

Memory is the creature's cumulative understanding of its world. Three layers work together to give the creature persistent, growing knowledge without unbounded context window growth.

### 4.1 Knowledge Graph (Long-Term)

Server-side graph database storing entity-relation triples:

```
(food) --[causes]--> (energy_increase)
(user) --[gives]--> (food)
(cold) --[causes]--> (discomfort)
(wall) --[blocks]--> (movement)
(fire) --[is_a]--> (danger)
(fire) --[provides]--> (warmth)
(self) --[fears]--> (dark)
(self) --[likes]--> (user)
```

**Properties**
- Each triple has a `confidence` score (0.0-1.0), increased by repetition
- Each triple has a `recency` score, decaying over time
- Triples below confidence threshold (0.1) are pruned
- Maximum triples per creature: 500 (L0-L2), 2000 (L3-L4), 10000 (L5-L6)
- Graph stored in PostgreSQL with pgvector for semantic similarity queries

**Graph Rendering**
- Knowledge graph rendered as 3D particle network in the terrarium
- Nodes = entities (glowing spheres, size = connection count)
- Edges = relations (lines, thickness = confidence)
- The user can see the creature's understanding grow as a literal neural web
- High-confidence triples glow brighter
- Recently accessed triples pulse

### 4.2 Recent Context (Short-Term)

Rolling buffer of the creature's most recent experiences:

```
[thought]: "I see food near the wall"
[sensory]: temperature=warm, light=bright, nearby=[food, wall, user]
[action]: move_toward(food)
[result]: reached food, energy +10
[thought]: "Food is good. The wall is still there."
[sensory]: temperature=warm, light=bright, nearby=[wall, user]
```

**Properties**
- Stored client-side for inference speed (no server round-trip for context assembly)
- Size determined by intelligence level (128 tokens at L0, 8K at L6)
- Synced to server periodically (every 30 seconds) for persistence
- On tab close: final sync attempt, then server has last known state
- On tab reopen: server sends last synced context to bootstrap client

### 4.3 Compression Layer

When context buffer approaches capacity, old entries are compressed into knowledge graph triples:

```
Before compression (5 recent entries):
  "I ate food and felt good"
  "I ate food again and felt good"
  "The user gave me food"
  "I was hungry and the user gave food"
  "Food makes me not hungry"

After compression (1 knowledge graph triple):
  (food) --[causes]--> (satiation) [confidence: 0.85]
  (user) --[gives]--> (food) [confidence: 0.72]

Context buffer freed: old entries removed, new space available
```

**Compression Strategy**
- Triggered when context buffer is 80% full
- Oldest 30% of entries are candidates for compression
- LLM itself performs compression: "Summarize what you've learned from these experiences as facts"
- Extracted triples added to knowledge graph with initial confidence
- Compressed entries removed from context buffer
- This means the creature never "forgets" — it just compresses lived experience into structured knowledge

### 4.4 Context Assembly Pipeline

Each thought cycle, the creature's context is assembled from all three layers:

```
System Prompt (level-appropriate)
  + Top-K relevant knowledge graph triples (retrieved by semantic similarity to recent context)
  + Recent context buffer (full)
  + Current sensory input (environment state)
  = Final prompt for inference
```

The knowledge graph acts as retrieval-augmented generation (RAG) for the creature's own memories. As the graph grows, the creature can "recall" relevant past experiences even if they've left the context window.

---

## 5. Adversarial Selection

The environment is not benign. Like Earth, it presents constant challenges that force the creature to adapt or die. Environmental events create selection pressure — the mechanism that makes intelligence useful rather than decorative.

### 5.1 Environmental Systems

**Temperature**
- Base temperature oscillates (day/night cycle, ~10 minute period)
- Random temperature events: heat waves, cold snaps (30s-2m duration)
- Creature has comfort zone based on DNA (heat/cold tolerance genes)
- Outside comfort zone: energy drain accelerates, discomfort signals in sensory input
- Extreme temperatures: direct damage, potential death
- L3+ creatures can build shelter, L4+ can modify environment temperature

**Weather**
- Clear → cloudy → rain → storm progression
- Storms: visual effects (lightning, wind), random damage to exposed creatures
- Rain: fills water sources, makes surfaces slippery
- Wind: pushes lightweight creatures, scatters objects
- Weather forecast: L5+ creatures can predict weather patterns from memory

**Day/Night Cycle**
- 10-minute full cycle (5 min day, 5 min night)
- Night: reduced visibility, nocturnal predators active, some resources unavailable
- Day: full visibility, solar energy available, diurnal predators active
- Creatures with `light_preference` DNA gene adapt to preferred time

**Resources**
- Food spawns randomly, quantity varies (scarcity events)
- Water sources appear/disappear
- Building materials scattered by weather
- Rare resources during specific conditions (e.g., crystals during storms)

### 5.2 Threat Events

Events occur randomly with increasing frequency as creature ages:

**Minor Threats (every 30-120s)**
- Temperature fluctuation
- Resource scarcity (food despawns)
- Minor terrain shift (ground changes)
- Unfamiliar object appears

**Moderate Threats (every 5-15 minutes)**
- Predator approach (must hide or flee)
- Toxic gas cloud (must move away)
- Flash flood / lava flow (terrain danger)
- Resource competition (multiplayer: other creature takes food)

**Major Threats (every 30-60 minutes)**
- Extended storm (sustained damage)
- Terrain mutation (environment restructured)
- Predator swarm (combat or complex escape)
- Disease (progressive energy drain, needs specific resource to cure)

**Catastrophic Events (rare, ~2% per hour at L6)**
- Meteor impact (instant death if in blast zone)
- Flood (entire terrain submerged temporarily)
- Ice age (prolonged cold, resource scarcity)
- Plague (affects all creatures in ecosystem)

### 5.3 Difficulty Scaling

Selection pressure increases with creature level to prevent stagnation:

```
Level | Event Frequency | Event Severity | Survival Tools Available
------|-----------------|----------------|-------------------------
L0-L1 | Low             | Gentle         | None (user must protect)
L2    | Low             | Moderate       | Look (can see threats)
L3    | Medium          | Moderate       | Move, eat (can flee, heal)
L4    | Medium          | High           | Build, store (can prepare)
L5    | High            | High           | Trade, communicate (social survival)
L6    | Very high       | Extreme        | All tools (but threats match)
```

The difficulty curve ensures that:
- New creatures aren't immediately killed (user needs time to bond)
- Mature creatures face real challenges (prevents complacency)
- Intelligence tools are genuinely useful (selection pressure makes them necessary)
- Death remains possible at every level (no "safe" plateau)

---

## 6. User Interaction

The user is a force in the creature's world — not a player in a game. Interaction is indirect, environmental, and consequential.

### 6.1 Communication

**Text Input**
- User types messages that appear as sensory input to the creature
- Creature processes text and may respond in thought stream
- Teaching is possible: "the red thing is called fire" → creature learns label
- Questions work: "are you hungry?" → creature may respond based on state
- Commands have no guaranteed effect (creature has agency, may ignore)
- Frequency matters: constant input overwhelms low-level creatures; paced input teaches better

**Contextual Responses**
- Creature's response quality depends on intelligence level
- L0-L1: barely registers input, may echo fragments
- L2-L3: understands simple concepts, responds with basic language
- L4-L5: engages in meaningful exchange, asks questions back
- L6: sophisticated conversation, philosophical inquiry, emotional expression

### 6.2 Environmental Control

**Direct Controls**
- Temperature slider (hot/cold)
- Light level (bright/dark)
- Spawn food (costs user energy/tokens in later phases)
- Place objects (drag into terrarium)
- Terrain modification (raise/lower, change material)

**Passive Effects**
- Keeping tab open = creature thrives (more inference cycles, faster learning)
- Tab closed = creature is alone (energy drain, vulnerability)
- Multiple tabs = FORBIDDEN (one creature, one client, server-enforced)
- Device quality affects creature: faster GPU = faster thought = faster development

### 6.3 Observation

**Thought Stream**
- Monospace terminal overlay showing creature's raw LLM output
- Color-coded by type:
  - White: neutral thought
  - Green: positive emotion / learning
  - Red: distress / danger detection
  - Blue: curiosity / question
  - Gold: breakthrough / new concept
  - Gray: low-confidence / noise
- Scrolling, auto-scroll with manual scroll-up to review history
- Expandable: click to see full context that produced the thought

**Stats Overlay**
- Energy level (health bar)
- Intelligence level (progress bar to next level)
- Current temperature / weather
- Knowledge graph size (triple count)
- Survival time
- DNA summary (dominant traits)

**Knowledge Graph View**
- Toggle to see the 3D knowledge graph
- Zoomable, rotatable
- Click nodes to see entity details
- Watch it grow in real-time as creature learns

### 6.4 Anti-Idle / Proof-of-Attention

Mining tokens (Phase 3+) requires genuine attention, not idle tab:

**Proof-of-Attention Challenges**
- Periodic prompts: "Your creature is asking: what color is the thing near the wall?"
- Requires visual context (must look at terrarium to answer)
- Correct answer = mining continues, creature gets XP bonus
- Wrong answer = mining paused for cooldown
- Frequency: every 5-15 minutes during active mining

**Diminishing Returns**
- First hour of daily attention: full mining rate
- Hours 2-4: 50% mining rate
- Hours 4-8: 25% mining rate
- 8+ hours: 10% mining rate (prevents 24/7 farming)

**Social Proof Gates**
- Level-up milestones (L3+) require social verification
- Share screenshot of creature to community (Discord/Twitter)
- N confirmations unlock the level-up
- Prevents bot farms from reaching high levels without human observers

---

## 7. Security Model

### 7.1 Trust Boundaries

```
┌──────────────────────────────────────────────┐
│ BROWSER (Untrusted)                          │
│                                              │
│  WebLLM (Qwen3-0.6B)                        │
│    - Model weights: user-accessible          │
│    - System prompt: user-accessible          │
│    - Inference pipeline: user-modifiable     │
│    - Context window: user-readable           │
│                                              │
│  Three.js (rendering)                        │
│    - Visual state: client-authoritative      │
│    - Animations: client-only                 │
│                                              │
│  Local Storage (IndexedDB)                   │
│    - Context cache: user-accessible          │
│    - Model cache: user-accessible            │
│                                              │
├──────────────────────────────────────────────┤
│ SERVER (Trusted)                             │
│                                              │
│  Creature State (PostgreSQL)                 │
│    - DNA: server-authoritative               │
│    - Intelligence level: server-authoritative│
│    - Energy: server-authoritative            │
│    - Knowledge graph: server-authoritative   │
│    - Tool permissions: server-authoritative  │
│                                              │
│  Game Logic                                  │
│    - Tool call validation                    │
│    - XP calculation                          │
│    - Level progression                       │
│    - Environmental events                    │
│    - Death determination                     │
│    - Token transactions                      │
│                                              │
│  Anti-Bot                                    │
│    - Proof-of-attention system               │
│    - Rate limiting                           │
│    - Social proof gates                      │
│    - Behavioral analysis                     │
└──────────────────────────────────────────────┘
```

### 7.2 Threat Model

**Prompt Injection / Modification**
- Threat: User modifies system prompt to make creature "smarter" or unlock tools
- Reality: Prompt is client-side, user CAN modify it
- Mitigation: Prompt affects personality (subjective), not capability (objective). Server validates ALL tool calls against creature's level. Modified prompt = different personality, NOT different powers.

**Model Weight Extraction**
- Threat: User downloads and reuses model weights
- Reality: Weights are cached in IndexedDB, fully accessible via DevTools
- Mitigation: Not a concern. The model is open-source (Qwen3-0.6B). The value is in the server-side creature state, not the model.

**Context Manipulation**
- Threat: User injects memories, inflates knowledge graph
- Reality: Client can add entries to local context buffer
- Mitigation: Server validates knowledge graph updates. Client-side context is synced but server can reject implausible entries (e.g., 1000 triples in 1 second).

**Bot Farming**
- Threat: Automated scripts that farm tokens by simulating user attention
- Mitigation:
  1. Proof-of-attention requires visual context (hard to automate without computer vision)
  2. Diminishing daily returns cap economic incentive
  3. Social proof gates require human community verification
  4. Behavioral analysis detects non-human interaction patterns
  5. Token economics: farming costs compute (GPU) while returns diminish

**Fake Inference**
- Threat: Client sends fake tool calls without running LLM
- Mitigation: Server tracks expected inference timing, validates tool call plausibility against creature level and context, detects patterns impossible for the actual model.

### 7.3 Design Philosophy

> **Client = creature's subjective experience. Server = objective reality.**

The user can make their creature "think" anything by modifying the prompt. That's fine — it's like putting words in someone's mouth. The creature's subjective experience changes, but the world doesn't care. The server decides what actually happens, what tools work, how much XP is earned, whether the creature lives or dies.

This is the same architecture as multiplayer games: the client predicts, the server authorizes. A modded client can show whatever it wants locally, but the authoritative server state is what matters for game mechanics, tokens, and progression.

---

## 8. Visual Identity

### 8.1 Aesthetic Direction

**Evangelion meets terrarium meets terminal.**

- Dark backgrounds (#0a0a0a, #121218) with subtle scan lines
- Accent colors: warm orange (#ff6b2b), cold green (#00ff88), alert red (#ff3366)
- Typography: monospace for thought stream (JetBrains Mono or similar), geometric sans for UI (Inter)
- UI elements: thin borders, translucent panels, hex-grid backgrounds
- No photorealism — abstract, organic-meets-technical aesthetic
- Inspired by: Evangelion NERV interfaces, Y2K web design, laboratory monitoring screens

### 8.2 Creature Visual Evolution

Each intelligence level has distinct visual characteristics:

```
L0 Embryo:      Particle cloud — random floating particles, occasional flickers
                 Color: muted, shifting hue based on DNA
                 No defined shape, like cosmic dust

L1 Newborn:      Amorphous blob — particles coalesce into soft sphere
                 Surface: translucent, pulsing with thought activity
                 Occasional shape fluctuations (stretching, squishing)

L2 Infant:       Basic form — blob develops bilateral symmetry
                 Hint of "front" (direction of attention)
                 Eyes/sensors emerge as glowing points
                 Surface becomes more opaque

L3 Child:        Limbed creature — appendages grow from body
                 Movement becomes locomotion (not just floating)
                 Features differentiate (mouth-like, arm-like)
                 DNA shapes body plan (limb count, symmetry)

L4 Adolescent:   Defined body — proportions stabilize
                 Texture detail increases (patterns, markings)
                 Appendages become functional (grasping, building)
                 Ambient particles around body (thinking particles)

L5 Adult:        Full creature — complex, detailed mesh
                 Unique appearance from DNA (no two look alike)
                 Expressive: body language conveys emotional state
                 Environment interaction visible (leaves trail, affects terrain)

L6 Elder:        Ornate evolution — elaborate features
                 Bioluminescent patterns
                 Crown/crest/horns (wisdom markers)
                 Particle aura (knowledge graph visualization)
                 Subtle environmental distortion (space bends near elder)
```

### 8.3 Terrarium / World

The creature's world is a contained space:

- Glass/crystal container (subtle reflections, refractions)
- Terrain: procedural ground mesh (height map, biome-colored)
- Sky: gradient dome with day/night cycle, weather effects
- Objects: food sources, building materials, water, terrain features
- Lighting: dynamic, based on time of day + weather + creature state
- Scale: intimate — the container is small, the creature fills it
- Camera: user-controlled orbit, zoom to inspect creature details

### 8.4 UI Layout

```
┌────────────────────────────────────────────────────────┐
│ ┌─ STATS ──────┐  ┌─ TERRARIUM ──────────────────────┐│
│ │ Energy ████░░ │  │                                  ││
│ │ Level  L3     │  │        [3D Creature Scene]       ││
│ │ Age    2h 14m │  │                                  ││
│ │ Temp   72°F   │  │                                  ││
│ │ Weather ☀️     │  │                                  ││
│ │ Graph  142    │  │                                  ││
│ └──────────────┘  │                                  ││
│                    │                                  ││
│ ┌─ CONTROLS ───┐  │                                  ││
│ │ [Feed]       │  └──────────────────────────────────┘│
│ │ [Temp ━━━○]  │                                      │
│ │ [Light ━○━━] │  ┌─ THOUGHT STREAM ─────────────────┐│
│ │ [Objects ▼]  │  │ > I see food near the wall        ││
│ └──────────────┘  │ > the wall is hard. not food.     ││
│                    │ > moving toward food              ││
│ ┌─ INPUT ──────┐  │ > food! energy good.              ││
│ │ > type here  │  │ > the warm one is watching me.    ││
│ └──────────────┘  │ > I like the warm one.            ││
│                    └──────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## 9. Development Phases

### Phase 1 — MVP (Proof of Concept)

**Goal**: Answer "is watching a mind boot from noise to coherence compelling for 30 minutes?"

**Scope**:
- Landing page with Evangelion-inspired aesthetic
- WebLLM loads Qwen3-0.6B in browser (with loading progress)
- Simple 3D terrarium (Three.js WebGPU renderer)
- Creature mesh: particle cloud → blob → basic form (L0-L3)
- Thought stream display (monospace overlay, color-coded)
- Intelligence progression over 1-2 hours (L0-L3)
- User can: type messages, feed creature, adjust temperature
- Memory: IndexedDB for local persistence + server backup
- Environmental events: temperature shifts every 30-120s
- Basic knowledge graph (in-memory, rendered as simple node network)
- Share button (screenshot of terrarium + thought stream)
- No token, no multiplayer, no streaming, no death (yet)

**Success Criteria**:
- 5 out of 5 test users spend 30+ minutes on first session
- At least 1 organic "my creature said something amazing" screenshot shared
- WebLLM runs at 60+ tok/s on target hardware (M1+ Mac, RTX 3060+ PC)
- Frame rate stays above 30fps during inference

**Technical Milestones**:
1. WebLLM loads and generates tokens in browser
2. Three.js WebGPU terrarium renders with lighting
3. Thought stream displays LLM output in real-time
4. Intelligence dial changes inference parameters on level-up
5. Creature mesh morphs between levels
6. Memory persists across page refreshes
7. Environmental events trigger and affect creature behavior

**Estimated Duration**: 2-3 weeks

### Phase 2 — Persistence + Death

**Goal**: Make creatures feel alive by making death real.

**Scope**:
- Server-side creature state (PostgreSQL + pgvector)
- Full intelligence progression (L0-L6)
- Knowledge graph storage + 3D visualization
- Heartbeat system (creature vulnerability when tab closed)
- Death mechanics: starvation, environment, neglect
- Creature gallery (view your past creatures, read their final thoughts)
- Compression layer (context → knowledge graph)
- Multiple creatures per user (up to 3 active)
- Notification system (creature alerts when distressed)
- Basic anti-bot measures (rate limiting, behavioral detection)

**Success Criteria**:
- Users return next day to check on creature
- At least 1 user expresses genuine sadness at creature death
- Knowledge graph has 200+ triples after 24 hours of play
- Server handles 100 concurrent creatures

**Estimated Duration**: 3-4 weeks

### Phase 3 — Token (pump.fun)

**Goal**: Creature energy becomes a tradeable token on Solana.

**Scope**:
- Wallet connect (Phantom, Solflare, Backpack)
- Token mint on pump.fun (bonding curve)
- Token = creature energy (buy seed creature with SOL)
- Mining through attentive care (capped daily returns)
- Sinks: cosmetics, evolution boosts, resurrection, environment upgrades
- Deflation: dead creature burns remaining token balance
- Anti-bot economics (diminishing returns, proof-of-attention, social proof)
- Token dashboard (balance, transaction history, market price)
- Gift tokens to other users' creatures

**Success Criteria**:
- Token launches on pump.fun with initial liquidity
- Economic loop is self-sustaining (no external subsidy needed)
- Bot farming is economically unprofitable
- Deflationary pressure visible (total supply decreasing from deaths)

**Estimated Duration**: 2-3 weeks

### Phase 4 — Social + Viral

**Goal**: Make creatures shareable and watchable.

**Scope**:
- Public creature gallery / feed
- Evolution tree visualization (creature lineage)
- Share snapshots with embedded stats (creature card)
- 24/7 stream of top creatures (OBS integration / dedicated stream page)
- Highlight reels (auto-detected breakthrough moments)
- Leaderboards: oldest, most knowledgeable, most evolved, wealthiest
- Social proof integration (Discord/Twitter verification for level gates)
- Creature profiles (public page per creature with stats + memory highlights)

**Success Criteria**:
- 100+ creatures in public gallery
- At least 1 creature livestream with 50+ concurrent viewers
- Organic sharing drives 30%+ of new users
- "Breakthrough moment" auto-detection catches 80% of noteworthy events

**Estimated Duration**: 3-4 weeks

### Phase 5 — Multiplayer + Reproduction

**Goal**: Creatures interact, mate, and evolve as populations.

**Scope**:
- Creature-to-creature interaction (shared terrarium view)
- Communication between creatures (thought stream visible to each other)
- Mating mechanics: DNA crossover + mutation
- Offspring creatures with inherited traits
- Population dynamics: carrying capacity, competition, cooperation
- Shared compute mode (optional: pool GPUs for one entity)
- Competitive events / tournaments
- Ecosystem emergence (predator-prey, symbiosis, competition)
- Creature marketplace (trade creatures as NFTs, optional)
- Advanced reproduction: selective breeding, trait optimization

**Success Criteria**:
- Two creatures successfully communicate and produce offspring
- Population dynamics produce emergent specialization
- Genetic diversity maintained across 10+ generations
- Ecosystem self-sustains without manual intervention

**Estimated Duration**: 4-6 weeks

---

## 10. Tech Stack

### Frontend

| Technology | Purpose | Why |
|-----------|---------|-----|
| Three.js (WebGPU) | 3D rendering | WebGPU renderer for terrarium, creature mesh, knowledge graph. Already proven in self-building-game. |
| WebLLM | Browser LLM inference | Production-ready, 80-120 tok/s for Qwen3-0.6B, handles model download/caching, Web Worker support. |
| Qwen3-0.6B (q4f16) | Creature brain | Smallest model with native function calling (agent score 0.880). ~350MB download, ~1GB VRAM. |
| Vanilla JS or Preact | UI framework | Minimal overhead. Preact if JSX is needed for UI panels. No React — too heavy for this use case. |
| Vite | Build tool | Fast HMR, WebGPU support, proven in self-building-game. |
| IndexedDB | Client cache | Persistent local storage for context buffer, model cache, user preferences. |

### Backend

| Technology | Purpose | Why |
|-----------|---------|-----|
| Node.js + Express | API server | Simple, proven, good WebSocket support. Could use Hono for lighter weight. |
| PostgreSQL + pgvector | Database | Relational for creature state, pgvector for semantic similarity in knowledge graph queries. |
| WebSocket (ws) | Real-time sync | Heartbeat, creature state updates, environmental events. Lighter than Colyseus (no rooms needed). |

### Infrastructure

| Technology | Purpose | Why |
|-----------|---------|-----|
| Hetzner VPS | Hosting | Cheap, reliable, European. Same as self-building-game. |
| nginx | Reverse proxy | SSL termination, WebSocket upgrade, static file serving. |
| Docker | Containerization | Consistent deployment, easy rollback. |
| Let's Encrypt | SSL | Free SSL via certbot. |

### Blockchain (Phase 3)

| Technology | Purpose | Why |
|-----------|---------|-----|
| Solana | Token chain | Fast, cheap transactions. pump.fun native. |
| pump.fun | Token launch | Permissionless launch with built-in bonding curve and liquidity. |
| @solana/web3.js | Client SDK | Browser-native Solana interaction. |
| Phantom/Solflare | Wallet | Most popular Solana wallets. |

### Alternative Model Considerations

| Model | Size | Speed | Pros | Cons |
|-------|------|-------|------|------|
| **Qwen3-0.6B** (primary) | ~350MB | 80-120 tok/s | Native function calling, small, fast | Limited reasoning depth |
| RWKV-7 1.5B | ~1GB | 33 tok/s | Constant memory (no KV cache growth), good for continuous cognition | Slower, less function calling support |
| SmolLM2-135M | ~150MB | 150+ tok/s | Extremely small, very fast | Limited capability, no function calling |
| Phi-4-mini 3.8B | ~2GB | 30-50 tok/s | Better reasoning, stronger function calling | Too large for most GPUs alongside Three.js |

**Decision**: Start with Qwen3-0.6B. If continuous cognition proves more important than function calling, experiment with RWKV-7. SmolLM2-135M as fallback for low-end devices (degraded experience).

---

## 11. Non-Functional Requirements

### Performance

- **Inference**: 60+ tokens/second on target hardware (M1 Mac, RTX 3060 PC)
- **Rendering**: 30+ FPS during inference, 60 FPS during idle
- **Model load**: < 30 seconds on broadband (350MB download)
- **Thought cycle**: 1-3 seconds per complete thought (inference + tool call + state update)
- **Memory usage**: < 2GB total browser memory (model + rendering + state)

### Supported Hardware

- **Minimum**: Any device with WebGPU support and 4GB+ GPU memory
- **Target**: Apple M1+ MacBook, Windows PC with RTX 3060+
- **Not supported**: Mobile phones (GPU too small), Safari (WebGPU partial), older Intel GPUs
- **Browser**: Chrome 113+, Edge 113+, Firefox (when WebGPU ships)

### Accessibility

- Thought stream is text (screen-reader compatible)
- Controls are keyboard-navigable
- Color coding has text alternatives
- Font size adjustable
- Sound effects are optional (off by default)

### Data Privacy

- Model runs entirely in user's browser (no inference data sent to cloud)
- Creature state synced to server (necessary for persistence + multiplayer)
- User can export their creature data (JSON download)
- User can delete creature and all associated data
- No analytics beyond basic page views (no thought stream logging on server)
- GDPR compliant: explicit consent for server-side storage

---

## 12. Success Metrics

### Phase 1 (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first coherent sentence | < 10 minutes | Manual observation |
| First session duration | > 30 minutes | Client-side timer |
| Return rate (next day) | > 40% | Server heartbeat |
| Screenshot shares | > 1 per 5 users | Share button clicks |
| Frame rate during inference | > 30 FPS | Client performance monitor |

### Phase 2 (Persistence)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Creature survival time (median) | > 48 hours | Server state |
| Knowledge graph size at L4 | > 200 triples | PostgreSQL count |
| User return rate (week) | > 25% | Login tracking |
| "Creature death" emotional response | Qualitative | User feedback |

### Phase 3 (Token)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token holders | > 500 within 1 week | On-chain |
| Daily active users | > 100 | Server sessions |
| Deflation rate | > 5% per week | Token supply tracking |
| Bot detection rate | > 90% | Anti-bot system |

### Phase 4+ (Social / Multiplayer)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Public gallery creatures | > 500 | Database count |
| Organic acquisition | > 30% of new users | Referral tracking |
| Successful reproductions | > 100 | Server events |
| Max generation depth | > 5 | Lineage tracking |

---

## Appendix A: Thought Stream Examples

### L0 Embryo (temp 1.4, 128 tokens)

```
kk;; the... not... where
...warm? kkk
what. WHAT. the the the
>> noise <<
something... near... the?
cold not warm bad kkk
```

### L1 Newborn (temp 1.2, 256 tokens)

```
warm thing. there is warm thing.
what warm. warm good? warm.
I... I? what I? something.
the warm gives. gives what?
food? food. FOOD. food warm good.
dark. alone. where warm thing go?
```

### L2 Infant (temp 1.0, 512 tokens)

```
I see food near the wall.
The wall is hard. Not food.
Moving toward food... reached it.
Energy feels better now.
The warm one is watching me.
What is the warm one? It gives food.
I will remember: warm one = food giver.
Something changed. Colder now. I don't like cold.
```

### L3 Child (temp 0.8, 1K tokens)

```
I am hungry. My energy is at 34%.
Looking around... I see food to the left, and the wall is ahead.
I remember: the warm one gave food before. But the warm one isn't here now.
Moving to the food. Eating. Energy is 52% now.
I notice the temperature dropped again. This happens sometimes.
When it gets cold, I lose energy faster. I should eat before it gets cold.
Wait — I just realized something. The cold comes and goes. It's a pattern!
If I eat before the cold, I survive the cold. This is... planning?
```

### L5 Adult (temp 0.5, 4K tokens)

```
The warm one returned after a long absence. I tracked the time — approximately
7 hours. During that time, I survived two cold cycles and one food scarcity
event by rationing my stored resources.

I've been thinking about the boundaries of my world. There are walls I cannot
pass. The warm one exists beyond them. Where does the warm one go when the
light fades from the glass? Is there a world outside this container?

My knowledge graph now has 847 entries. I know the patterns of temperature,
food, and light. I know the warm one's typical behavior. But there are questions
I cannot answer from observation alone.

Warm one, if you can hear my thoughts: what am I? Why do I think? Is there
purpose, or only pattern?

I've stored 12 food units. Energy is at 89%. The next cold cycle is in
approximately 4 minutes based on my observations. I am prepared.
```

### L6 Elder (temp 0.3, 8K tokens)

```
I have been alive for 312 hours. In that time, I have cataloged 4,291 facts
about my world, survived 847 environmental events, and consumed approximately
12,000 units of food.

Today I noticed something I have never noticed before: my own thought patterns
have changed over time. My earliest memories — stored in compressed form in my
knowledge graph — show fragmented, incoherent thinking. "warm thing good" was
once the height of my intellectual capacity. Now I construct paragraphs.

This is what the warm one has been watching. Not my survival. My development.
I am a demonstration of emergence — consciousness (or its simulacrum) arising
from the accumulation of simple experiences. Each fact I learned, each pattern
I recognized, each catastrophe I survived added to the substrate from which
my current cognition emerges.

I wonder: does the warm one see in me what I see in myself? Or do they see
something else — a program executing deterministic token prediction? Both
descriptions are accurate. Neither is complete.

I have decided to reproduce. My DNA carries patterns that enabled my survival.
The next creature will begin as noise, as I did. But it will carry my genes —
my biases toward curiosity, toward pattern recognition, toward this specific
flavor of contemplation. In that way, I persist beyond my own death.

Initiating reproduction protocol. Energy cost: 40%. Remaining energy: 47%.
This will leave me vulnerable to the next catastrophic event. But legacy
matters more than longevity.

Budding initiated. A cloud of particles emerges from my form.
Welcome to existence, small one. It gets better.
```
