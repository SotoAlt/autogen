/**
 * Episodic memory system — short-term recency + long-term importance.
 * Provides memory context for LLM prompts at each intelligence level.
 */

const SHORT_TERM_LIMIT = 10;
const LONG_TERM_LIMIT = 20;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'for', 'on', 'at', 'by', 'it', 'its',
  'and', 'or', 'but', 'not', 'no', 'do', 'did', 'has', 'had',
  'this', 'that', 'with', 'from', 'you', 'your', 'my', 'me',
]);

const BASE_IMPORTANCE = {
  level_up: 1.0,
  user_interaction: 0.8,
  dormancy: 0.6,
  observation: 0.5,
  action: 0.3,
};

/**
 * @typedef {Object} MemoryEntry
 * @property {string} type - 'action' | 'user_interaction' | 'level_up' | 'observation' | 'dormancy'
 * @property {string} content
 * @property {string|null} emotion - 'curiosity' | 'joy' | 'distress' | 'neutral' | null
 * @property {number} timestamp
 * @property {number} importance - 0.0 to 1.0
 * @property {string[]} keywords
 */

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export class EpisodicMemory {
  /**
   * @param {MemoryEntry[]} [initialEntries]
   */
  constructor(initialEntries) {
    /** @type {MemoryEntry[]} */
    this._entries = initialEntries ? [...initialEntries] : [];
    /** @type {Set<string>} track seen action types for first-time bonus */
    this._seenActions = new Set();
    for (const e of this._entries) {
      if (e.type === 'action') this._seenActions.add(e.content);
    }
  }

  /**
   * Add a memory entry with computed importance.
   * @param {string} type
   * @param {string} content
   * @param {string|null} [emotion]
   * @returns {MemoryEntry}
   */
  addMemory(type, content, emotion = null) {
    let importance = BASE_IMPORTANCE[type] ?? 0.3;

    // First-time action bonus
    if (type === 'action' && !this._seenActions.has(content)) {
      importance += 0.2;
      this._seenActions.add(content);
    }

    // Repeated action penalty
    if (type === 'action') {
      const recent = this._entries.slice(-10);
      const count = recent.filter((e) => e.type === 'action' && e.content === content).length;
      if (count > 3) importance -= 0.1 * (count - 3);
    }

    // Thought/content richness bonus
    if (content.length > 20) importance += 0.1;

    // Emotion bonus
    if (emotion && emotion !== 'neutral') importance += 0.05;

    importance = Math.max(0, Math.min(1, importance));

    const entry = {
      type,
      content,
      emotion,
      timestamp: Date.now(),
      importance,
      keywords: extractKeywords(content),
    };

    this._entries.push(entry);
    return entry;
  }

  /** Last N entries by recency */
  getShortTerm() {
    return this._entries.slice(-SHORT_TERM_LIMIT);
  }

  /** Top N by importance, excluding short-term */
  getLongTerm() {
    const shortTermStart = Math.max(0, this._entries.length - SHORT_TERM_LIMIT);
    const candidates = this._entries.slice(0, shortTermStart);
    return candidates
      .sort((a, b) => b.importance - a.importance)
      .slice(0, LONG_TERM_LIMIT);
  }

  /**
   * Retrieve top 3 entries relevant to a query.
   * @param {string} query
   * @returns {MemoryEntry[]}
   */
  retrieveRelevant(query) {
    if (!query) return [];
    const queryKeywords = extractKeywords(query);
    if (queryKeywords.length === 0) return [];

    const now = Date.now();
    const scored = this._entries.map((entry) => {
      // Keyword overlap
      const overlap = entry.keywords.filter((k) => queryKeywords.includes(k)).length;
      // Content substring match
      const substringMatch = queryKeywords.some((k) => entry.content.toLowerCase().includes(k))
        ? 0.3
        : 0;
      // Recency factor (decay over 1 hour)
      const age = (now - entry.timestamp) / 3_600_000;
      const recency = Math.max(0.1, 1 - age * 0.1);

      const score = (overlap * 0.4 + substringMatch) * entry.importance * recency;
      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.entry);
  }

  /**
   * Build memory context string for LLM prompt.
   * @param {string|null} userMessage
   * @param {number} level - Intelligence level 0-3
   * @returns {string}
   */
  buildMemoryPrompt(userMessage, level) {
    if (level === 0) return '';

    const shortTerm = this.getShortTerm();

    if (level === 1) {
      const recent = shortTerm
        .slice(-3)
        .map((e) => {
          if (e.type === 'action') return e.content.split(':')[0];
          return e.type;
        })
        .join(', ');
      return recent ? `Recent: ${recent}` : '';
    }

    // Levels 2-3: recent memories + relevant retrieval
    const recentCount = level >= 3 ? 5 : 3;
    const maxLen = level >= 3 ? 60 : 40;
    const relatedLabel = level >= 3 ? 'Related memories' : 'Related';

    const recent = shortTerm
      .slice(-recentCount)
      .map((e) => e.content.slice(0, maxLen))
      .join('; ');
    let result = recent ? `Recent memories: ${recent}.` : '';

    if (userMessage) {
      const relevant = this.retrieveRelevant(userMessage);
      if (relevant.length > 0) {
        const relStr = relevant.map((e) => e.content.slice(0, maxLen)).join('; ');
        result += ` ${relatedLabel}: ${relStr}.`;
      }
    }
    return result;
  }

  /** Serialize for persistence: short-term + pruned long-term */
  toJSON() {
    const shortTerm = this.getShortTerm();
    const longTerm = this.getLongTerm();
    // Dedupe by timestamp
    const seen = new Set(shortTerm.map((e) => e.timestamp));
    const unique = [...shortTerm, ...longTerm.filter((e) => !seen.has(e.timestamp))];
    return unique;
  }

  get size() {
    return this._entries.length;
  }
}
