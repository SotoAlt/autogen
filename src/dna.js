/**
 * DNA system — 8 heritable traits that shape creature behavior.
 * Injected into system prompts as personality hints.
 */

const TRAITS = {
  heartbeatSpeed:   { min: 0.3, max: 1.0 },
  metabolismRate:   { min: 0.3, max: 1.0 },
  huePrimary:       { min: 0.0, max: 1.0 },
  hueShiftRange:    { min: 0.05, max: 0.20 },
  movementBias:     { min: 0.0, max: 1.0 },
  expressiveness:   { min: 0.3, max: 1.0 },
  energyEfficiency: { min: 0.3, max: 1.0 },
  curiosity:        { min: 0.0, max: 1.0 },
};

export function generateDNA() {
  const dna = {};
  for (const [key, { min, max }] of Object.entries(TRAITS)) {
    dna[key] = min + Math.random() * (max - min);
  }
  return dna;
}

export function dnaToPromptHints(dna) {
  const hints = [];

  if (dna.movementBias > 0.7) hints.push('you tend to move and explore');
  else if (dna.movementBias < 0.3) hints.push('you prefer stillness and observation');

  if (dna.curiosity > 0.7) hints.push('you are drawn to the observer');
  else if (dna.curiosity < 0.3) hints.push('you are wary of the observer');

  if (dna.expressiveness > 0.7) hints.push('you express yourself intensely');
  else if (dna.expressiveness < 0.4) hints.push('you are subtle and muted');

  if (dna.metabolismRate > 0.7) hints.push('you burn energy quickly');
  else if (dna.metabolismRate < 0.4) hints.push('you conserve energy naturally');

  if (dna.energyEfficiency > 0.7) hints.push('your actions cost little effort');

  return hints.length > 0 ? hints.join('. ') + '.' : '';
}

export function getHeartbeatPeriod(basePeriod, dna) {
  return basePeriod / dna.heartbeatSpeed;
}

export function getActionCost(baseCost, dna) {
  return baseCost * (1.0 - dna.energyEfficiency * 0.5);
}

export function getIntensity(rawIntensity, dna) {
  return Math.min(1.0, rawIntensity * dna.expressiveness);
}
