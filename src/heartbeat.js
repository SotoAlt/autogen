/**
 * Heartbeat / pulse cycle system.
 * Gives the creature internal rhythms: SENSE → THINK → FEEL → REST
 */

const PHASES = ['sense', 'think', 'feel', 'rest'];

// Per-level heartbeat configs
const HEARTBEAT_LEVELS = [
  { period: 2.0, jitter: 1.5, skipChance: 0.3 },   // L0: erratic, often skips phases
  { period: 2.5, jitter: 0.5, skipChance: 0.1 },   // L1: steadier
  { period: 2.5, jitter: 0.2, skipChance: 0.0 },   // L2: consistent, longer think
  { period: 3.0, jitter: 0.1, skipChance: 0.0 },   // L3: calm, contemplative
];

export class Heartbeat {
  constructor() {
    this.level = 0;
    this.phase = 'rest';
    this.phaseIndex = 3;
    this.elapsed = 0;
    this.phaseDuration = 1.0;
    this.pulse = 0; // 0-1, peaks at phase transitions
    this.bpm = 0;
    this.beatCount = 0;
    this.lastBeatTime = 0;
    this._listeners = [];
  }

  setLevel(level) {
    this.level = Math.min(level, HEARTBEAT_LEVELS.length - 1);
  }

  onPhaseChange(fn) {
    this._listeners.push(fn);
  }

  getPeriod() {
    const cfg = HEARTBEAT_LEVELS[this.level];
    return cfg.period + (Math.random() - 0.5) * 2 * cfg.jitter;
  }

  update(delta) {
    this.elapsed += delta;

    // Pulse decays toward 0
    this.pulse *= 0.92;

    if (this.elapsed >= this.phaseDuration) {
      this.elapsed = 0;
      this._advance();
    }
  }

  _advance() {
    const cfg = HEARTBEAT_LEVELS[this.level];

    // L0 can skip phases randomly
    let nextIndex = (this.phaseIndex + 1) % PHASES.length;
    if (cfg.skipChance > 0 && Math.random() < cfg.skipChance) {
      nextIndex = (nextIndex + 1) % PHASES.length;
    }

    this.phaseIndex = nextIndex;
    this.phase = PHASES[this.phaseIndex];

    // Duration per phase
    const period = this.getPeriod();
    switch (this.phase) {
      case 'sense': this.phaseDuration = 0.3; break;
      case 'think': this.phaseDuration = period * 0.5; break;
      case 'feel':  this.phaseDuration = 0.3; break;
      case 'rest':  this.phaseDuration = period * 0.3; break;
    }

    // Beat pulse on sense phase (start of cycle)
    if (this.phase === 'sense') {
      this.pulse = 1.0;
      this.beatCount++;
      const now = performance.now();
      if (this.lastBeatTime > 0) {
        this.bpm = Math.round(60000 / (now - this.lastBeatTime));
      }
      this.lastBeatTime = now;
    }

    for (const fn of this._listeners) fn(this.phase);
  }

  /** Is the creature in "thinking" mode? Used by main.js to gate LLM calls */
  isThinkPhase() {
    return this.phase === 'think';
  }
}
