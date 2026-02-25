const MAX_LINES = 50;

export class ThoughtStream {
  constructor() {
    this.container = document.getElementById('thought-stream');
    this.lineCount = 0;
    this.currentLine = null;
  }

  /** Display a user message in the stream */
  addUserMessage(text) {
    const line = this._createLine();
    line.classList.add('thought-user');
    line.textContent = `> ${text}`;
  }

  /** Display a creature thought + action tag */
  addThought(thought, action) {
    if (!thought && !action) return;
    const line = this._createLine();

    if (action) {
      const tag = document.createElement('span');
      tag.className = 'action-tag';
      tag.textContent = `[${action}]`;
      line.appendChild(tag);
    }

    if (thought) {
      const text = document.createElement('span');
      text.className = 'thought-text';
      text.textContent = ` ${thought}`;
      line.appendChild(text);

      // Classify for color
      line.classList.add(classifyThought(thought.toLowerCase()));
    } else {
      line.classList.add('thought-default');
    }
  }

  /** Display an action indicator (no thought text) */
  addAction(type, intensity) {
    const line = this._createLine();
    line.classList.add('thought-action');
    const bar = '█'.repeat(Math.round(intensity * 5));
    line.textContent = `[${type}] ${bar}`;
  }

  /** Display a system event (evolution, wake, etc.) */
  addEvent(text) {
    const line = this._createLine();
    line.classList.add('thought-event');
    line.textContent = text;
  }

  /** Thinking indicator */
  showThinking() {
    this._thinkingLine = this._createLine();
    this._thinkingLine.classList.add('thought-thinking');
    this._thinkingLine.textContent = '...';
  }

  hideThinking() {
    if (this._thinkingLine) {
      this._thinkingLine.remove();
      this._thinkingLine = null;
      this.lineCount--;
    }
  }

  /** Add a subtle heartbeat marker between thought cycles */
  addMarker(symbol) {
    const marker = document.createElement('div');
    marker.className = 'thought-marker';
    marker.textContent = symbol;
    this.container.appendChild(marker);
    this.lineCount++;
    this._trim();
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    this.container.innerHTML = '';
    this.lineCount = 0;
    this.currentLine = null;
  }

  _createLine() {
    const line = document.createElement('div');
    line.className = 'thought-line';
    this.container.appendChild(line);
    this.lineCount++;
    this._trim();
    this.container.scrollTop = this.container.scrollHeight;
    return line;
  }

  _trim() {
    while (this.lineCount > MAX_LINES) {
      this.container.removeChild(this.container.firstChild);
      this.lineCount--;
    }
  }
}

const CURIOSITY_WORDS = ['?', 'what', 'why', 'how', 'wonder', 'curious'];
const DISTRESS_WORDS = ['pain', 'hurt', 'dark', 'cold', 'afraid', 'lost', 'alone', 'nothing'];
const JOY_WORDS = ['warm', 'light', 'good', 'happy', 'safe', 'beautiful', 'love'];

function classifyThought(text) {
  if (CURIOSITY_WORDS.some((w) => text.includes(w))) return 'thought-curiosity';
  if (DISTRESS_WORDS.some((w) => text.includes(w))) return 'thought-distress';
  if (JOY_WORDS.some((w) => text.includes(w))) return 'thought-joy';
  return 'thought-default';
}
