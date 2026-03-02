/**
 * Creature state persistence — localStorage save/load with auto-save.
 * Phase 1: survive page refresh, track age, offline energy decay.
 */

const STORAGE_KEY = 'autogen_creature';
const AUTOSAVE_INTERVAL = 30_000; // 30s

/**
 * @typedef {Object} CreatureState
 * @property {string} id
 * @property {string|null} name
 * @property {Object} dna
 * @property {number} level
 * @property {number} xp
 * @property {number} energy
 * @property {number} createdAt
 * @property {number} lastSavedAt
 * @property {number} totalAge
 * @property {number} generation
 * @property {Object|null} parentDna
 * @property {Object|null} emotionalState
 * @property {Array} actionHistory
 * @property {Array} memoryEntries
 * @property {Array} conversationHistory
 * @property {Array} mutations
 * @property {string} currentRuntime
 * @property {string} currentStrategyType
 */

const REQUIRED_FIELDS = {
  id: 'string',
  dna: 'object',
  level: 'number',
  xp: 'number',
  energy: 'number',
  createdAt: 'number',
  lastSavedAt: 'number',
  totalAge: 'number',
  generation: 'number',
};

function validate(state) {
  if (!state || typeof state !== 'object') return false;
  for (const [key, type] of Object.entries(REQUIRED_FIELDS)) {
    if (typeof state[key] !== type) return false;
  }
  if (!Array.isArray(state.actionHistory)) return false;
  if (!Array.isArray(state.memoryEntries)) return false;
  if (!Array.isArray(state.conversationHistory)) return false;
  return true;
}

/**
 * Create a fresh creature state.
 * @param {Function} generateDNA - DNA generator function
 * @param {Object} [parentDna] - DNA of previous creature (for lineage)
 * @param {number} [generation=1] - Generation number
 * @returns {CreatureState}
 */
export function createCreatureState(generateDNA, parentDna = null, generation = 1) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: null,
    dna: generateDNA(),
    level: 0,
    xp: 0,
    energy: 50,
    createdAt: now,
    lastSavedAt: now,
    totalAge: 0,
    generation,
    parentDna: parentDna ? { ...parentDna } : null,
    emotionalState: null,
    actionHistory: [],
    memoryEntries: [],
    conversationHistory: [],
    mutations: [],
    currentRuntime: 'wllama',
    currentStrategyType: 'legacy',
  };
}

/**
 * Save creature state to localStorage.
 * @param {CreatureState} state
 */
export function saveCreatureState(state) {
  try {
    state.lastSavedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[autogen] Save failed:', e.message);
  }
}

/**
 * Load creature state from localStorage.
 * Applies offline energy decay and age accumulation.
 * @returns {CreatureState|null}
 */
export function loadCreatureState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const state = JSON.parse(raw);
    if (!validate(state)) {
      console.warn('[autogen] Corrupt save data, starting fresh');
      return null;
    }

    const now = Date.now();
    const elapsed = Math.max(0, (now - state.lastSavedAt) / 1000);

    state.totalAge += elapsed;
    state.energy = Math.max(0, state.energy - elapsed * 0.01);

    // Filter incomplete conversation exchanges
    state.conversationHistory = state.conversationHistory.filter(
      (ex) => ex.userMessage && ex.creatureAction
    );

    return state;
  } catch (e) {
    console.warn('[autogen] Load failed:', e.message);
    return null;
  }
}

/**
 * Clear saved creature state.
 */
export function clearCreatureState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[autogen] Clear failed:', e.message);
  }
}

/**
 * Start auto-save interval.
 * @param {Function} getState - Returns current CreatureState
 * @returns {Function} stop function
 */
export function startAutoSave(getState) {
  const id = setInterval(() => {
    const state = getState();
    if (state) saveCreatureState(state);
  }, AUTOSAVE_INTERVAL);

  return () => clearInterval(id);
}

/**
 * Install beforeunload save handler.
 * @param {Function} getState - Returns current CreatureState
 */
export function installUnloadSave(getState) {
  window.addEventListener('beforeunload', () => {
    const state = getState();
    if (state) saveCreatureState(state);
  });
}

/**
 * Format totalAge as human-readable string.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatAge(totalSeconds) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  if (totalSeconds < 3600) return `${Math.round(totalSeconds / 60)}m`;
  if (totalSeconds < 86400) return `${(totalSeconds / 3600).toFixed(1)}h`;
  return `${(totalSeconds / 86400).toFixed(1)}d`;
}
