// Thought stream — DOM overlay showing creature's inner monologue

const MAX_LINES = 50;
const CURIOSITY_WORDS = ['?', 'what', 'why', 'how', 'wonder', 'curious'];
const DISTRESS_WORDS = ['pain', 'hurt', 'dark', 'cold', 'afraid', 'lost', 'alone', 'nothing'];
const JOY_WORDS = ['warm', 'light', 'good', 'happy', 'safe', 'beautiful', 'love'];

export class ThoughtStream {
  constructor() {
    this.container = document.getElementById('thought-stream');
    this.lineCount = 0;
    this.currentLine = null;
    this.tokensThisSecond = 0;
    this.lastTokenTime = 0;
    this.tokPerSec = 0;
    this._tokenTimestamps = [];
  }

  // Start a new thought line
  newThought() {
    this.currentLine = document.createElement('div');
    this.currentLine.className = 'thought-line';
    this.container.appendChild(this.currentLine);
    this.lineCount++;

    // Prune old lines
    while (this.lineCount > MAX_LINES) {
      this.container.removeChild(this.container.firstChild);
      this.lineCount--;
    }
  }

  // Append a token to current thought
  appendToken(token) {
    if (!this.currentLine) this.newThought();

    const span = document.createElement('span');
    span.textContent = token;
    span.className = 'thought-token';
    this.currentLine.appendChild(span);

    // Track tokens/sec
    const now = performance.now();
    this._tokenTimestamps.push(now);
    // Keep only last second of timestamps
    while (this._tokenTimestamps.length > 0 && now - this._tokenTimestamps[0] > 1000) {
      this._tokenTimestamps.shift();
    }
    this.tokPerSec = this._tokenTimestamps.length;

    // Auto-scroll
    this.container.scrollTop = this.container.scrollHeight;
  }

  // Finish current thought and colorize
  finishThought() {
    if (!this.currentLine) return;
    const text = this.currentLine.textContent.toLowerCase();
    this.currentLine.classList.add(classifyThought(text));
    this.currentLine = null;
  }

  getTokPerSec() {
    return this.tokPerSec;
  }

  clear() {
    this.container.innerHTML = '';
    this.lineCount = 0;
    this.currentLine = null;
  }
}

function classifyThought(text) {
  if (CURIOSITY_WORDS.some(w => text.includes(w))) return 'thought-curiosity';
  if (DISTRESS_WORDS.some(w => text.includes(w))) return 'thought-distress';
  if (JOY_WORDS.some(w => text.includes(w))) return 'thought-joy';
  return 'thought-default';
}
