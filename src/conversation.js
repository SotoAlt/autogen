/**
 * Conversation history — tracks user/creature exchanges for LLM context.
 * Builds multi-turn message arrays for strategy prompts.
 */

const MAX_EXCHANGES = 5;

/**
 * @typedef {Object} Exchange
 * @property {string} userMessage
 * @property {string|null} creatureResponse - action thought text
 * @property {string} creatureAction - action name
 * @property {number} timestamp
 */

export class ConversationHistory {
  /**
   * @param {Exchange[]} [initial]
   */
  constructor(initial) {
    /** @type {Exchange[]} */
    this._exchanges = initial ? [...initial] : [];
    /** @type {string|null} pending user message awaiting response */
    this._pending = null;
  }

  /**
   * Record an incoming user message.
   * @param {string} message
   */
  recordUserMessage(message) {
    this._pending = message;
  }

  /**
   * Record the creature's response to the pending user message.
   * @param {string|null} thought
   * @param {string} action
   */
  recordResponse(thought, action) {
    if (!this._pending) return;
    this._exchanges.push({
      userMessage: this._pending,
      creatureResponse: thought || null,
      creatureAction: action,
      timestamp: Date.now(),
    });
    if (this._exchanges.length > MAX_EXCHANGES) {
      this._exchanges.shift();
    }
    this._pending = null;
  }

  /**
   * Build conversation messages for LLM context.
   * @param {number} level - Intelligence level 0-3
   * @returns {Array<{role: string, content: string}>}
   */
  buildConversationMessages(level) {
    if (level <= 1) return [];

    const count = level >= 3 ? MAX_EXCHANGES : 3;
    const exchanges = this._exchanges.slice(-count);
    const messages = [];

    for (const ex of exchanges) {
      messages.push({
        role: 'user',
        content: `[The observer said]: ${ex.userMessage}`,
      });

      const response = { action: ex.creatureAction };
      if (ex.creatureResponse) response.thought = ex.creatureResponse;
      messages.push({
        role: 'assistant',
        content: JSON.stringify(response),
      });
    }

    return messages;
  }

  /** Serialize for persistence */
  toJSON() {
    return this._exchanges.slice();
  }

  get length() {
    return this._exchanges.length;
  }
}
