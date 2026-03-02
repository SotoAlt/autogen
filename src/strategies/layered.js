/**
 * Approach C: Layered Cognition — "System 1 + System 2"
 * System 1 (fast, DNA-weighted automaton, always running) handles moment-to-moment behavior.
 * System 2 (slow, LLM) produces disposition weights that modify System 1 for ~30-60s.
 */
import { DISPOSITION_GRAMMAR } from '../grammars.js';
import { buildSystemPrompt } from '../intelligence.js';

/** System 1 tick intervals per level (seconds) */
const S1_TICK_INTERVALS = [8, 6, 4, 3];
/** System 2 periodic intervals per level (seconds) */
const S2_PERIODIC_INTERVALS = [300, 120, 60, 45];

class System1 {
  constructor(dna) {
    this.dna = dna;
    this.tickInterval = 5;
    this.elapsed = 0;

    // Base weights derived from DNA — the creature's "instincts"
    this.baseWeights = {
      drift: 0.15 + dna.movementBias * 0.3,
      pulse: 0.15,
      absorb: 0.1 + dna.metabolismRate * 0.1,
      glow: 0.1 + dna.expressiveness * 0.15,
      shrink: 0.05 + (1 - dna.movementBias) * 0.1,
      reach: 0.1 + dna.curiosity * 0.2,
      shift_color: 0.05 + dna.expressiveness * 0.1,
      spin: 0.05 + dna.expressiveness * 0.05,
      rest: 0.15 + (1 - dna.metabolismRate) * 0.1,
    };

    // Modifiers from System 2 — decay back to 1.0 over time
    this.modifiers = {};
    for (const key of Object.keys(this.baseWeights)) {
      this.modifiers[key] = 1.0;
    }
    this.modifierDecay = 0.98; // per tick — ~30-60s to fully decay
  }

  setTickInterval(level) {
    this.tickInterval = S1_TICK_INTERVALS[Math.min(level, 3)];
  }

  applyDisposition(disposition) {
    if (!disposition || !disposition.weights) return;

    const w = disposition.weights;

    if (w.move > 0.5) {
      this.modifiers.drift = 1.0 + w.move;
      this.modifiers.reach = 0.8 + w.move * 0.5;
      this.modifiers.rest = Math.max(0.3, 1.0 - w.move * 0.5);
    }
    if (w.rest > 0.5) {
      this.modifiers.rest = 1.0 + w.rest;
      this.modifiers.drift = Math.max(0.3, 1.0 - w.rest * 0.5);
      this.modifiers.reach = Math.max(0.3, 1.0 - w.rest * 0.3);
    }
    if (w.express > 0.5) {
      this.modifiers.glow = 1.0 + w.express * 0.5;
      this.modifiers.pulse = 0.8 + w.express * 0.5;
      this.modifiers.shift_color = 1.0 + w.express * 0.5;
      this.modifiers.spin = 0.8 + w.express * 0.5;
    }
    if (w.caution > 0.5) {
      this.modifiers.shrink = 1.0 + w.caution * 0.5;
      this.modifiers.rest = Math.max(this.modifiers.rest, 0.8 + w.caution * 0.5);
      this.modifiers.drift = Math.max(0.3, this.modifiers.drift - w.caution * 0.4);
    }

    // Clamp all modifiers to prevent degeneration
    for (const key of Object.keys(this.modifiers)) {
      this.modifiers[key] = Math.max(0.3, Math.min(3.0, this.modifiers[key]));
    }
  }

  /** Immediately boost alert-related modifiers (for instant user message reaction) */
  boostAlert() {
    this.modifiers.pulse = Math.min(3.0, this.modifiers.pulse + 0.5);
    this.modifiers.glow = Math.min(3.0, this.modifiers.glow + 0.3);
    this.modifiers.shift_color = Math.min(3.0, this.modifiers.shift_color + 0.3);
  }

  tick(delta, level, energyState) {
    this.elapsed += delta;
    if (this.elapsed < this.tickInterval) return null;
    this.elapsed = 0;

    // Decay modifiers toward neutral (1.0)
    for (const key of Object.keys(this.modifiers)) {
      this.modifiers[key] = 1.0 + (this.modifiers[key] - 1.0) * this.modifierDecay;
    }

    // Energy state affects weights
    const energyMod = {
      thriving: 1.0,
      normal: 0.9,
      hungry: 0.7,
      starving: 0.4,
      dormant: 0.0,
    }[energyState] || 1.0;

    if (energyMod === 0) return null; // dormant

    // Compute effective weights = base * modifier * energyMod
    const effective = {};
    let total = 0;
    for (const [action, base] of Object.entries(this.baseWeights)) {
      effective[action] = base * this.modifiers[action] * energyMod;
      total += effective[action];
    }

    if (total === 0) return { action: 'rest', intensity: 0.3 };

    // Weighted random selection
    const roll = Math.random() * total;
    let cumulative = 0;
    for (const [action, weight] of Object.entries(effective)) {
      cumulative += weight;
      if (roll <= cumulative) {
        return {
          action,
          intensity: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
        };
      }
    }
    return { action: 'rest', intensity: 0.3 };
  }
}

export class LayeredCognitionStrategy {
  constructor() {
    this._system1 = null;
    this._dna = null;
    this._level = 0;
    this._energySystem = null;
    this._lastS2Time = 0;
    this._pendingS2 = false;
  }

  init(dna, level, energySystem) {
    this._dna = dna;
    this._level = level;
    this._energySystem = energySystem;
    this._system1 = new System1(dna);
    this._system1.setTickInterval(level);
    this._lastS2Time = performance.now() / 1000;
  }

  tick(delta) {
    if (!this._system1 || !this._energySystem) return null;
    return this._system1.tick(delta, this._level, this._energySystem.state);
  }

  onInferenceResult(result) {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result;

      // Apply disposition weights to System 1
      if (data.weights && this._system1) {
        this._system1.applyDisposition(data);
      }

      this._lastS2Time = performance.now() / 1000;

      // Return optional override action directly (not stored for tick replay)
      if (data.action) {
        return {
          action: data.action,
          intensity: 0.7,
          thought: data.thought || null,
        };
      }
    } catch (e) {
      console.warn('[layered] Failed to parse S2 result:', e);
    }
    return null;
  }

  onUserMessage(msg) {
    this._pendingS2 = true;
    // System 1 instant alert (no LLM needed)
    if (this._system1) {
      this._system1.boostAlert();
    }
  }

  onEnergyStateChange(state) {
    this._pendingS2 = true;
  }

  needsInference() {
    if (this._pendingS2) return true;

    // System 2 periodic schedule
    const now = performance.now() / 1000;
    const interval = S2_PERIODIC_INTERVALS[Math.min(this._level, 3)];
    return (now - this._lastS2Time) >= interval;
  }

  getInferenceGrammar() {
    return DISPOSITION_GRAMMAR;
  }

  getInferencePrompt(context) {
    this._pendingS2 = false;
    const { energy, dna, userMessage, memoryCtx, conversationMessages } = context;

    const systemPrompt = buildSystemPrompt(
      this._level, energy, dna, userMessage, memoryCtx
    );

    return [
      {
        role: 'system',
        content: `${systemPrompt}\nYou control a creature's disposition. Respond with JSON: {"weights":{"move":0.X,"rest":0.X,"express":0.X,"caution":0.X}}. Values 0.0-1.0. Optionally include "action" for an immediate action and "thought" for inner dialogue.`,
      },
      ...(conversationMessages || []),
      {
        role: 'user',
        content: userMessage
          ? `[The observer speaks]: ${userMessage}`
          : 'Reflect on your current state. How do you feel? What drives you?',
      },
    ];
  }

  setLevel(level) {
    this._level = Math.min(level, 3);
    if (this._system1) this._system1.setTickInterval(level);
  }
}
