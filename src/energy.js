/**
 * Energy / metabolism system.
 * Energy drives creature activity — 0 energy = dormant.
 */

export const ENERGY_STATES = {
  THRIVING: 'thriving',   // 70-100
  NORMAL: 'normal',       // 40-69
  HUNGRY: 'hungry',       // 15-39
  STARVING: 'starving',   // 1-14
  DORMANT: 'dormant',     // 0
};

export class EnergySystem {
  constructor() {
    this.energy = 50;
    this.maxEnergy = 100;
  }

  get state() {
    if (this.energy <= 0) return ENERGY_STATES.DORMANT;
    if (this.energy < 15) return ENERGY_STATES.STARVING;
    if (this.energy < 40) return ENERGY_STATES.HUNGRY;
    if (this.energy < 70) return ENERGY_STATES.NORMAL;
    return ENERGY_STATES.THRIVING;
  }

  get isDormant() {
    return this.energy <= 0;
  }

  /** Visual dimming factor: 1.0 = full brightness, 0.2 = nearly off */
  get visualDimming() {
    if (this.energy >= 70) return 1.0;
    if (this.energy >= 40) return 0.85;
    if (this.energy >= 15) return 0.6;
    if (this.energy > 0) return 0.35;
    return 0.15;
  }

  feed(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  /** Metabolism drain per heartbeat cycle */
  metabolize(dna, level) {
    const baseDrain = 2 * dna.metabolismRate;
    const levelTax = level * 0.5;
    this.energy = Math.max(0, this.energy - baseDrain - levelTax);
  }

  /** Spend energy on an action. Returns false if not enough. */
  spendAction(cost, dna) {
    const adjustedCost = cost * (1.0 - dna.energyEfficiency * 0.5);
    if (this.energy < adjustedCost) return false;
    this.energy = Math.max(0, this.energy - adjustedCost);
    return true;
  }

  /** Wake from dormancy */
  wake() {
    if (this.isDormant) {
      this.energy = 15;
    }
  }

  /** Presence bonus: +1 per cycle while user is on page */
  presenceBonus() {
    this.feed(1);
  }
}
