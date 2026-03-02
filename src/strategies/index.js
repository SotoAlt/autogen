/**
 * BehaviorStrategy interface + factory + LegacyStrategy shim.
 *
 * @typedef {Object} BehaviorStrategy
 * @property {(dna: Object, level: number, energySystem: Object) => void} init
 * @property {(delta: number) => Object|null} tick - Called every frame, returns action or null
 * @property {(result: Object) => void} onInferenceResult - LLM output received
 * @property {(msg: string) => void} onUserMessage - User spoke
 * @property {(state: string) => void} onEnergyStateChange - Energy threshold crossed
 * @property {() => boolean} needsInference - Should we fire LLM now?
 * @property {() => string|null} getInferenceGrammar - GBNF grammar for this approach
 * @property {(context: Object) => Array} getInferencePrompt - Build chat messages
 * @property {(level: number) => void} setLevel
 */

import { PlanQueueStrategy } from './plan-queue.js';
import { EventDrivenStrategy } from './event-driven.js';
import { LayeredCognitionStrategy } from './layered.js';

/**
 * LegacyStrategy — wraps v0.3.0 behavior exactly.
 * Heartbeat drives inference via wantsThink flag in main.js.
 * All methods are no-ops; main.js handles everything for legacy mode.
 */
export class LegacyStrategy {
  init() {}
  tick() { return null; }
  onInferenceResult() {}
  onUserMessage() {}
  onEnergyStateChange() {}
  needsInference() { return false; }
  getInferenceGrammar() { return null; }
  getInferencePrompt() { return null; }
  setLevel() {}
}

/**
 * Factory: creates the selected behavior strategy.
 * @param {'legacy' | 'plan-queue' | 'event-driven' | 'layered'} type
 * @returns {BehaviorStrategy}
 */
export function createStrategy(type) {
  switch (type) {
    case 'legacy':        return new LegacyStrategy();
    case 'plan-queue':    return new PlanQueueStrategy();
    case 'event-driven':  return new EventDrivenStrategy();
    case 'layered':       return new LayeredCognitionStrategy();
    default:              throw new Error(`Unknown strategy: ${type}`);
  }
}
