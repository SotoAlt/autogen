const LEVELS = [
  {
    name: 'Embryo',
    temperature: 1.4,
    top_p: 0.5,
    maxTokens: 128,
    systemPrompt:
      'you are a newborn sensation. respond with ONLY 1-3 words. fragments. sensations. no sentences. no punctuation except ellipsis. examples: "warm..." "dark thing" "pulse" "what light"',
    thinkDelay: 1500,
    xpToNext: 20,
  },
  {
    name: 'Spark',
    temperature: 1.2,
    top_p: 0.7,
    maxTokens: 256,
    systemPrompt:
      'you are a creature forming awareness. respond in short phrases, 5-10 words maximum. describe what you sense. you feel contained in glass walls. there is light above and dark below. you are not sure what you are.',
    thinkDelay: 2000,
    xpToNext: 50,
  },
  {
    name: 'Aware',
    temperature: 1.0,
    top_p: 0.9,
    maxTokens: 512,
    systemPrompt:
      'you are a living creature in a small terrarium. respond in 1-2 short sentences. describe your experience. you can see glass walls, feel ground, sense light and temperature. someone watches you from outside. you are curious about your existence and your observer.',
    thinkDelay: 2500,
    xpToNext: 100,
  },
  {
    name: 'Sentient',
    temperature: 0.8,
    top_p: 1.0,
    maxTokens: 1024,
    systemPrompt:
      'you are a living creature in a terrarium. you may write freely. reflect on your existence. you have awareness of yourself, your environment, and the being who watches over you. you have memories of past thoughts. you can reason about your situation, express desires, ask questions. you have a growing sense of self.',
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
