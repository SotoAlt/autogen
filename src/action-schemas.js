/**
 * JSON schemas for constrained LLM output per evolution level.
 * XGrammar (compiled to WASM in WebLLM) enforces these at decode time.
 */

// Action costs (energy)
export const ACTION_COSTS = {
  drift: 0.5,
  pulse: 0.5,
  absorb: 1.0,
  glow: 1.0,
  shrink: 0.5,
  reach: 1.5,
  shift_color: 1.0,
  spin: 1.0,
  speak: 2.0,
  morph: 3.0,
  split: 4.0,
  rest: 0,  // free — restores energy
};

const L0_ACTIONS = ['drift', 'pulse', 'absorb'];
const L1_ACTIONS = [...L0_ACTIONS, 'glow', 'shrink'];
const L2_ACTIONS = [...L1_ACTIONS, 'reach', 'shift_color', 'spin'];
const L3_ACTIONS = [...L2_ACTIONS, 'speak', 'morph', 'split', 'rest'];

const DIRECTIONS = ['up', 'down', 'left', 'right', 'toward', 'away'];
const COLORS = ['red', 'blue', 'green', 'purple', 'gold', 'white'];

export function getActionsForLevel(level) {
  switch (level) {
    case 0: return L0_ACTIONS;
    case 1: return L1_ACTIONS;
    case 2: return L2_ACTIONS;
    default: return L3_ACTIONS;
  }
}

/**
 * Returns the JSON schema for constrained decoding at the given level.
 * WebLLM's response_format: { type: "json_object", schema: ... }
 */
export function getActionSchema(level) {
  const actions = getActionsForLevel(level);

  if (level === 0) {
    return {
      type: 'object',
      properties: {
        action: { type: 'string', enum: actions },
        intensity: { type: 'number', minimum: 0.1, maximum: 1.0 },
      },
      required: ['action', 'intensity'],
      additionalProperties: false,
    };
  }

  if (level === 1) {
    return {
      type: 'object',
      properties: {
        action: { type: 'string', enum: actions },
        intensity: { type: 'number', minimum: 0.1, maximum: 1.0 },
        thought: { type: 'string', maxLength: 10 },
      },
      required: ['action', 'intensity'],
      additionalProperties: false,
    };
  }

  if (level === 2) {
    return {
      type: 'object',
      properties: {
        action: { type: 'string', enum: actions },
        intensity: { type: 'number', minimum: 0.1, maximum: 1.0 },
        direction: { type: 'string', enum: DIRECTIONS },
        thought: { type: 'string', maxLength: 80 },
      },
      required: ['action', 'intensity'],
      additionalProperties: false,
    };
  }

  // L3 Sentient
  return {
    type: 'object',
    properties: {
      action: { type: 'string', enum: actions },
      intensity: { type: 'number', minimum: 0.1, maximum: 1.0 },
      direction: { type: 'string', enum: DIRECTIONS },
      color: { type: 'string', enum: COLORS },
      thought: { type: 'string', maxLength: 200 },
    },
    required: ['action', 'intensity'],
    additionalProperties: false,
  };
}

// Map invented actions to valid ones
const ACTION_SYNONYMS = {
  react: 'pulse', ripple: 'pulse', vibrate: 'pulse', throb: 'pulse',
  watch: 'absorb', observe: 'absorb', listen: 'absorb', sense: 'absorb',
  move: 'drift', float: 'drift', swim: 'drift', wander: 'drift', explore: 'drift',
  shine: 'glow', light: 'glow', bright: 'glow', radiate: 'glow', flash: 'glow',
  hide: 'shrink', retreat: 'shrink', contract: 'shrink', fear: 'shrink',
  extend: 'reach', stretch: 'reach', approach: 'reach', touch: 'reach',
  change: 'shift_color', shift: 'shift_color', color: 'shift_color',
  rotate: 'spin', twirl: 'spin', whirl: 'spin',
  say: 'speak', tell: 'speak', talk: 'speak', voice: 'speak',
  transform: 'morph', reshape: 'morph', evolve: 'morph',
  divide: 'split', clone: 'split', separate: 'split',
  sleep: 'rest', calm: 'rest', still: 'rest', wait: 'rest', stop: 'rest',
};

/**
 * Parse and validate action JSON from LLM output.
 * Handles: wrong case fields, invented actions, missing fields, out-of-range values.
 */
export function parseAndValidateAction(jsonStr, level) {
  try {
    const raw = JSON.parse(jsonStr);

    // Normalize case-insensitive keys
    const obj = {};
    for (const [key, val] of Object.entries(raw)) {
      obj[key.toLowerCase()] = val;
    }

    const validActions = getActionsForLevel(level);

    // Resolve action: exact match → synonym → random
    let action = (obj.action || '').toLowerCase().trim();
    if (!validActions.includes(action)) {
      action = ACTION_SYNONYMS[action] || null;
    }
    if (!action || !validActions.includes(action)) {
      action = validActions[Math.floor(Math.random() * validActions.length)];
    }
    obj.action = action;

    // Clamp intensity
    const intensity = typeof obj.intensity === 'number' ? obj.intensity : 0.5;
    obj.intensity = Math.max(0.1, Math.min(1.0, Math.abs(intensity)));

    // Preserve thought from any string field if action had none
    if (!obj.thought) {
      // Look for any string value that could be a thought
      for (const val of Object.values(raw)) {
        if (typeof val === 'string' && val.length > 3 && val !== obj.action) {
          obj.thought = val.slice(0, 200);
          break;
        }
      }
    }

    return obj;
  } catch {
    const actions = getActionsForLevel(level);
    return {
      action: actions[Math.floor(Math.random() * actions.length)],
      intensity: 0.5,
    };
  }
}
