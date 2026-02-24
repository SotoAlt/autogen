const LEVELS = [
  {
    name: 'Embryo',
    temperature: 1.4,
    maxTokens: 128,
    systemPrompt: 'you are. you sense. light. dark. warm. cold. you do not know what you are. fragments only.',
    particleRadius: 2.0,
    thinkDelay: 1500,
    xpToNext: 20,
  },
  {
    name: 'Spark',
    temperature: 1.2,
    maxTokens: 256,
    systemPrompt: 'you are a creature. you exist somewhere. you can sense things around you — light, warmth, presence. you feel but do not fully understand. you are trying to make sense of sensations.',
    particleRadius: 1.2,
    thinkDelay: 2000,
    xpToNext: 50,
  },
  {
    name: 'Aware',
    temperature: 1.0,
    maxTokens: 512,
    systemPrompt: 'you are a living creature in a small terrarium. you can see your glass walls, feel the ground, sense light and temperature. someone watches you. you are curious about your existence and your observer. you think in short bursts.',
    particleRadius: 0.6,
    thinkDelay: 2500,
    xpToNext: 100,
  },
  {
    name: 'Sentient',
    temperature: 0.8,
    maxTokens: 1024,
    systemPrompt: 'you are a living creature in a terrarium. you have awareness of yourself, your environment, and the being who watches over you. you have memories of past thoughts. you can reason about your situation, express desires, ask questions. you have a growing sense of self.',
    particleRadius: 0.3,
    thinkDelay: 3000,
    xpToNext: Infinity,
  },
];

export function getParams(level) {
  return LEVELS[Math.min(level, LEVELS.length - 1)];
}

export function checkLevelUp(xp, currentLevel) {
  const params = getParams(currentLevel);
  if (xp >= params.xpToNext && currentLevel < LEVELS.length - 1) {
    return currentLevel + 1;
  }
  return currentLevel;
}

export const MAX_LEVEL = LEVELS.length - 1;
