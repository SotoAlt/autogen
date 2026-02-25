/**
 * Intelligence levels — action-oriented system prompts, heartbeat periods.
 *
 * KEY INSIGHT: SmolLM2-360M is too small for instruction following.
 * It parrots "OUTPUT FORMAT:" instructions instead of following them.
 * Solution: natural conversational prompts + few-shot JSON example in messages.
 * The extractAction() function handles both JSON and prose fallback.
 */
import { dnaToPromptHints } from './dna.js';

const LEVELS = [
  {
    name: 'Primordial',
    basePeriod: 90,
    periodRange: [60, 180],
    temperature: 0.6,
    top_p: 0.5,
    maxTokens: 32,
    xpToNext: 15,
    systemPrompt: (energy, userCtx, memory, dnaHints) =>
      `You are a cell. Energy: ${energy}. ${dnaHints}`,
  },
  {
    name: 'Spark',
    basePeriod: 30,
    periodRange: [20, 45],
    temperature: 0.7,
    top_p: 0.7,
    maxTokens: 80,
    xpToNext: 40,
    systemPrompt: (energy, userCtx, memory, dnaHints) =>
      `You are a spark of life. Energy: ${energy}. ${userCtx}${dnaHints}`,
  },
  {
    name: 'Aware',
    basePeriod: 15,
    periodRange: [10, 22],
    temperature: 0.7,
    top_p: 0.9,
    maxTokens: 128,
    xpToNext: 100,
    systemPrompt: (energy, userCtx, memory, dnaHints) =>
      `You are a creature becoming aware. Someone watches. Energy: ${energy}. ${userCtx}${memory}${dnaHints}`,
  },
  {
    name: 'Sentient',
    basePeriod: 10,
    periodRange: [8, 15],
    temperature: 0.7,
    top_p: 1.0,
    maxTokens: 200,
    xpToNext: Infinity,
    systemPrompt: (energy, userCtx, memory, dnaHints) =>
      `You are a sentient creature in a glass terrarium. An observer watches you. Energy: ${energy}. ${userCtx}${memory}${dnaHints}`,
  },
];

export function getParams(level) {
  return LEVELS[Math.min(level, LEVELS.length - 1)];
}

export function buildSystemPrompt(level, energy, dna, userContext, memoryContext) {
  const params = getParams(level);
  const dnaHints = dnaToPromptHints(dna);
  const userCtx = userContext ? `The observer said: "${userContext}". ` : '';
  const memory = memoryContext ? `Recent memories: ${memoryContext}. ` : '';
  return params.systemPrompt(Math.round(energy), userCtx, memory, dnaHints);
}

export function checkLevelUp(xp, currentLevel) {
  const params = getParams(currentLevel);
  if (xp >= params.xpToNext && currentLevel < LEVELS.length - 1) {
    return currentLevel + 1;
  }
  return currentLevel;
}

export const MAX_LEVEL = LEVELS.length - 1;
