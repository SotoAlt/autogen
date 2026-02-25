/**
 * Heartbeat / pulse cycle system.
 * Much longer periods than v0.2 — gated by DNA and evolution level.
 * Phases: SENSE → THINK → FEEL → REST
 */

import { getParams } from './intelligence.js';

const PHASES = ['sense', 'think', 'feel', 'rest'];

const FIRST_CYCLE_DELAY = 10; // seconds — immediate feedback on page load

export class Heartbeat {
  constructor(dna) {
    this.dna = dna;
    this.level = 0;
    this.phase = 'rest';
    this.phaseIndex = 3;
    this.elapsed = 0;
    this.phaseDuration = 1.0;
    this.pulse = 0; // 0-1, peaks at phase transitions
    this.bpm = 0;
    this.beatCount = 0;
    this.lastBeatTime = 0;
    this.isFirstCycle = true;
    this._onThink = null;
    this._listeners = [];

    // Countdown tracking
    this.cycleElapsed = 0;
    this.cycleDuration = FIRST_CYCLE_DELAY;

    // Start first cycle quickly
    this.phaseDuration = FIRST_CYCLE_DELAY;
  }

  setLevel(level) {
    this.level = Math.min(level, 3);
  }

  onPhaseChange(fn) {
    this._listeners.push(fn);
  }

  /** Register callback for think phase — main.js uses this to trigger LLM */
  onThinkPhase(fn) {
    this._onThink = fn;
  }

  /** Get the full cycle period in seconds (DNA-adjusted) */
  getCyclePeriod() {
    if (this.isFirstCycle) return FIRST_CYCLE_DELAY;
    const params = getParams(this.level);
    const base = params.basePeriod;
    // DNA heartbeatSpeed: higher = faster = shorter period
    return base / this.dna.heartbeatSpeed;
  }

  /** Seconds remaining until next think phase */
  get countdown() {
    if (this.phase === 'think') return 0;
    // Time left in current phase + time through remaining phases until think
    let remaining = this.phaseDuration - this.elapsed;
    let idx = this.phaseIndex;
    while (true) {
      idx = (idx + 1) % PHASES.length;
      if (PHASES[idx] === 'think') break;
      // Estimate durations of intermediate phases
      remaining += this.phase === 'sense' ? 0.5 : this.getCyclePeriod() * 0.15;
    }
    return Math.max(0, remaining);
  }

  /** Bypass heartbeat wait — immediate think cycle (rate limited externally) */
  triggerReflex() {
    // Jump to sense phase, which will advance to think
    this.elapsed = this.phaseDuration;
    this.phaseIndex = (PHASES.indexOf('think') - 1 + PHASES.length) % PHASES.length;
    this.phase = PHASES[this.phaseIndex];
  }

  update(delta) {
    this.elapsed += delta;
    this.cycleElapsed += delta;

    // Pulse decays toward 0
    this.pulse *= 0.92;

    if (this.elapsed >= this.phaseDuration) {
      this.elapsed = 0;
      this._advance();
    }
  }

  _advance() {
    const nextIndex = (this.phaseIndex + 1) % PHASES.length;
    this.phaseIndex = nextIndex;
    this.phase = PHASES[this.phaseIndex];

    const cyclePeriod = this.getCyclePeriod();

    // Duration per phase
    switch (this.phase) {
      case 'sense':
        this.phaseDuration = 0.5;
        // New cycle starts
        this.cycleElapsed = 0;
        this.cycleDuration = cyclePeriod;
        break;
      case 'think':
        this.phaseDuration = 60; // long — main.js resolves it via callback
        break;
      case 'feel':
        this.phaseDuration = 1.0;
        break;
      case 'rest':
        this.phaseDuration = Math.max(1, cyclePeriod * 0.8);
        if (this.isFirstCycle) {
          this.isFirstCycle = false;
          this.phaseDuration = Math.max(1, this.getCyclePeriod() * 0.8);
        }
        break;
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

    // Fire think callback
    if (this.phase === 'think' && this._onThink) {
      this._onThink();
    }

    for (const fn of this._listeners) fn(this.phase);
  }

  /** Signal that thinking is done — advance past think phase */
  thinkComplete() {
    if (this.phase === 'think') {
      this.elapsed = this.phaseDuration; // force advance
    }
  }

  isThinkPhase() {
    return this.phase === 'think';
  }
}
