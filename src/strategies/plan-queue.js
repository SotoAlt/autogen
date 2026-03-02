/**
 * Approach A: Plan Queue — "Biological Clock"
 * Inference produces 3-5 action plan. ActionQueue plays one per sub-tick.
 * User message discards queue + re-infers.
 */
import { PLAN_GRAMMAR } from '../grammars.js';
import { getActionsForLevel } from '../action-schemas.js';
import { buildSystemPrompt } from '../intelligence.js';

/** Sub-tick intervals per level (seconds between queued actions) */
const SUB_TICK_INTERVALS = [45, 15, 7.5, 4];
/** Minimum inference intervals per level (seconds) */
const MIN_INFERENCE_INTERVALS = [180, 60, 30, 20];

class ActionQueue {
  constructor() {
    this.queue = [];
    this.mood = null;
    this.subTickInterval = 10;
    this.elapsed = 0;
  }

  load(plan, level) {
    this.queue = [...(plan.plan || [])];
    this.mood = plan.mood || null;
    this.subTickInterval = SUB_TICK_INTERVALS[Math.min(level, 3)];
    this.elapsed = 0;
  }

  tick(delta) {
    if (this.queue.length === 0) return null;
    this.elapsed += delta;
    if (this.elapsed >= this.subTickInterval) {
      this.elapsed = 0;
      return this.queue.shift();
    }
    return null;
  }

  clear() {
    this.queue = [];
    this.mood = null;
    this.elapsed = 0;
  }

  get isEmpty() {
    return this.queue.length === 0;
  }
}

export class PlanQueueStrategy {
  constructor() {
    this._queue = new ActionQueue();
    this._dna = null;
    this._level = 0;
    this._energySystem = null;
    this._lastInferenceTime = 0;
    this._pendingReflex = false;
    this._lastReflexTime = 0;
  }

  init(dna, level, energySystem) {
    this._dna = dna;
    this._level = level;
    this._energySystem = energySystem;
    this._lastInferenceTime = performance.now() / 1000;
  }

  tick(delta) {
    return this._queue.tick(delta);
  }

  onInferenceResult(result) {
    try {
      const plan = typeof result === 'string' ? JSON.parse(result) : result;
      if (plan && plan.plan && Array.isArray(plan.plan)) {
        this._queue.load(plan, this._level);
      }
    } catch (e) {
      console.warn('[plan-queue] Failed to parse plan:', e);
    }
    this._lastInferenceTime = performance.now() / 1000;
  }

  onUserMessage(msg) {
    const now = performance.now() / 1000;
    if (now - this._lastReflexTime > 5) {
      this._queue.clear();
      this._pendingReflex = true;
      this._lastReflexTime = now;
    }
  }

  onEnergyStateChange(state) {
    // Energy changes don't interrupt plan queue
  }

  needsInference() {
    if (this._pendingReflex) return true;

    const now = performance.now() / 1000;
    const minInterval = MIN_INFERENCE_INTERVALS[Math.min(this._level, 3)];
    const elapsed = now - this._lastInferenceTime;

    return this._queue.isEmpty && elapsed >= minInterval;
  }

  getInferenceGrammar() {
    return PLAN_GRAMMAR;
  }

  getInferencePrompt(context) {
    this._pendingReflex = false;
    const { energy, dna, userMessage, memoryCtx, conversationMessages } = context;

    const systemPrompt = buildSystemPrompt(
      this._level, energy, dna, userMessage, memoryCtx
    );

    const actions = getActionsForLevel(this._level);
    const actionsStr = actions.join(', ');

    return [
      {
        role: 'system',
        content: `${systemPrompt}\nYou must respond with a JSON plan of 3-5 actions. Available actions: ${actionsStr}. Each action has "action" and "intensity" (0.1-1.0). Optionally include "direction" and "mood".`,
      },
      ...(conversationMessages || []),
      {
        role: 'user',
        content: userMessage
          ? `[The observer speaks]: ${userMessage}`
          : 'What do you do next? Plan your next several actions.',
      },
    ];
  }

  setLevel(level) {
    this._level = Math.min(level, 3);
  }
}
