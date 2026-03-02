/**
 * Approach B: Event-Driven FSM — "Event-Driven Life"
 * DNA-weighted FSM for idle behavior. LLM fires only on events.
 * Mood from LLM shifts FSM weights temporarily.
 */
import { SINGLE_ACTION_GRAMMAR } from '../grammars.js';
import { buildSystemPrompt } from '../intelligence.js';

/** FSM tick intervals per level (seconds) */
const TICK_INTERVALS = [8, 6, 4, 3];
/** Idle timeout before periodic inference (seconds) */
const IDLE_TIMEOUT = 120;

class BehaviorFSM {
  constructor(dna) {
    this.dna = dna;
    this.state = 'idle';
    this.tickInterval = 5;
    this.elapsed = 0;
    this._moodExpiry = 0;
    this._moodModifiers = null;

    // DNA directly controls transition weights — structural, not prompt-based
    this._baseTransitions = {
      idle: {
        exploring: 0.2 * dna.movementBias + 0.1 * dna.curiosity,
        resting: 0.3 * (1 - dna.movementBias),
        alert: 0.15 * dna.curiosity,
        idle: 0.35,
      },
      exploring: {
        idle: 0.3,
        alert: 0.2 * dna.curiosity,
        exploring: 0.5 * dna.movementBias,
        resting: 0.0,
      },
      resting: {
        idle: 0.4,
        exploring: 0.2 * dna.movementBias,
        resting: 0.4 * (1 - dna.movementBias),
        alert: 0.0,
      },
      alert: {
        idle: 0.3,
        exploring: 0.3 * dna.curiosity,
        resting: 0.1,
        alert: 0.3,
      },
    };

    // Each state maps to a pool of possible actions with intensity ranges
    this._stateActions = {
      idle: [
        { action: 'pulse', intensity: [0.2, 0.5] },
        { action: 'glow', intensity: [0.1, 0.4] },
      ],
      exploring: [
        { action: 'drift', intensity: [0.4, 0.8] },
        { action: 'reach', intensity: [0.3, 0.7] },
      ],
      resting: [
        { action: 'rest', intensity: [0.3, 0.5] },
        { action: 'shrink', intensity: [0.2, 0.4] },
      ],
      alert: [
        { action: 'pulse', intensity: [0.5, 0.9] },
        { action: 'shift_color', intensity: [0.4, 0.7] },
        { action: 'glow', intensity: [0.5, 0.8] },
      ],
    };
  }

  setTickInterval(level) {
    this.tickInterval = TICK_INTERVALS[Math.min(level, 3)];
  }

  tick(delta) {
    this.elapsed += delta;
    if (this.elapsed < this.tickInterval) return null;
    this.elapsed = 0;

    // Expire mood modifiers
    if (this._moodModifiers && performance.now() > this._moodExpiry) {
      this._moodModifiers = null;
    }

    // Get transitions — apply mood modifiers if active
    const transitions = this._getEffectiveTransitions();

    // Weighted random state transition
    const weights = transitions[this.state] || transitions.idle;
    const roll = Math.random();
    let cumulative = 0;
    for (const [nextState, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        this.state = nextState;
        break;
      }
    }

    // Pick random action from current state's pool
    const pool = this._stateActions[this.state] || this._stateActions.idle;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const intensity = template.intensity[0] + Math.random() * (template.intensity[1] - template.intensity[0]);

    return {
      action: template.action,
      intensity: Math.round(intensity * 100) / 100,
    };
  }

  applyMood(mood, durationMs = 60000) {
    this._moodExpiry = performance.now() + durationMs;

    // Mood shifts FSM transitions
    const moodStr = (mood || '').toLowerCase();
    this._moodModifiers = {};

    if (moodStr.includes('curious') || moodStr.includes('explor')) {
      this._moodModifiers = { exploring: 1.5, idle: 0.5, resting: 0.5 };
    } else if (moodStr.includes('calm') || moodStr.includes('peace') || moodStr.includes('rest')) {
      this._moodModifiers = { resting: 1.5, idle: 1.2, exploring: 0.3 };
    } else if (moodStr.includes('alert') || moodStr.includes('excit') || moodStr.includes('fear')) {
      this._moodModifiers = { alert: 2.0, exploring: 0.5, resting: 0.3 };
    } else if (moodStr.includes('happy') || moodStr.includes('joy') || moodStr.includes('warm')) {
      this._moodModifiers = { exploring: 1.3, idle: 1.0, alert: 0.5 };
    }
  }

  forceAlert() {
    this.state = 'alert';
    this.elapsed = this.tickInterval; // trigger immediate tick
  }

  _getEffectiveTransitions() {
    if (!this._moodModifiers) return this._baseTransitions;

    const modified = {};
    for (const [state, transitions] of Object.entries(this._baseTransitions)) {
      modified[state] = {};
      let total = 0;
      for (const [target, weight] of Object.entries(transitions)) {
        const mod = this._moodModifiers[target] ?? 1.0;
        modified[state][target] = weight * mod;
        total += modified[state][target];
      }
      // Normalize
      if (total > 0) {
        for (const target of Object.keys(modified[state])) {
          modified[state][target] /= total;
        }
      }
    }
    return modified;
  }
}

export class EventDrivenStrategy {
  constructor() {
    this._fsm = null;
    this._dna = null;
    this._level = 0;
    this._energySystem = null;
    this._pendingInference = false;
    this._lastInferenceTime = 0;
  }

  init(dna, level, energySystem) {
    this._dna = dna;
    this._level = level;
    this._energySystem = energySystem;
    this._fsm = new BehaviorFSM(dna);
    this._fsm.setTickInterval(level);
    this._lastInferenceTime = performance.now() / 1000;
  }

  tick(delta) {
    if (!this._fsm) return null;
    return this._fsm.tick(delta);
  }

  onInferenceResult(result) {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result;

      // Apply mood to FSM if present
      if (data.mood && this._fsm) {
        this._fsm.applyMood(data.mood);
      }

      this._lastInferenceTime = performance.now() / 1000;

      // Return the action from inference as an immediate override
      if (data.action) {
        return data;
      }
    } catch (e) {
      console.warn('[event-driven] Failed to parse result:', e);
    }
    return null;
  }

  onUserMessage(msg) {
    this._pendingInference = true;
    if (this._fsm) this._fsm.forceAlert();
  }

  onEnergyStateChange(state) {
    this._pendingInference = true;
  }

  needsInference() {
    if (this._pendingInference) return true;

    // Periodic fallback — 120s idle timeout
    const now = performance.now() / 1000;
    return (now - this._lastInferenceTime) >= IDLE_TIMEOUT;
  }

  getInferenceGrammar() {
    return SINGLE_ACTION_GRAMMAR;
  }

  getInferencePrompt(context) {
    this._pendingInference = false;
    const { energy, dna, userMessage, memoryCtx, conversationMessages } = context;

    const systemPrompt = buildSystemPrompt(
      this._level, energy, dna, userMessage, memoryCtx
    );

    return [
      {
        role: 'system',
        content: `${systemPrompt}\nRespond with ONE action as JSON: {"action":"...", "intensity":0.X}. Optionally include "mood" and "thought".`,
      },
      ...(conversationMessages || []),
      {
        role: 'user',
        content: userMessage
          ? `[The observer speaks]: ${userMessage}`
          : 'Something changed. How do you react?',
      },
    ];
  }

  setLevel(level) {
    this._level = Math.min(level, 3);
    if (this._fsm) this._fsm.setTickInterval(level);
  }
}
