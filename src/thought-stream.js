const MAX_LINES = 50;
const CURIOSITY_WORDS = ['?', 'what', 'why', 'how', 'wonder', 'curious'];
const DISTRESS_WORDS = ['pain', 'hurt', 'dark', 'cold', 'afraid', 'lost', 'alone', 'nothing'];
const JOY_WORDS = ['warm', 'light', 'good', 'happy', 'safe', 'beautiful', 'love'];

export class ThoughtStream {
  constructor() {
    this.container = document.getElementById('thought-stream');
    this.lineCount = 0;
    this.currentLine = null;
    this.tokPerSec = 0;
    this._tokenTimestamps = [];
  }

  newThought() {
    this.currentLine = document.createElement('div');
    this.currentLine.className = 'thought-line';
    this.container.appendChild(this.currentLine);
    this.lineCount++;
    this._trim();
  }

  appendToken(token) {
    if (!this.currentLine) this.newThought();

    const span = document.createElement('span');
    span.textContent = token;
    span.className = 'thought-token';
    this.currentLine.appendChild(span);

    const now = performance.now();
    this._tokenTimestamps.push(now);
    while (this._tokenTimestamps.length > 0 && now - this._tokenTimestamps[0] > 1000) {
      this._tokenTimestamps.shift();
    }
    this.tokPerSec = this._tokenTimestamps.length;

    this.container.scrollTop = this.container.scrollHeight;
  }

  finishThought() {
    if (!this.currentLine) return;
    const text = this.currentLine.textContent.toLowerCase();
    this.currentLine.classList.add(classifyThought(text));
    this.currentLine = null;
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

  getTokPerSec() {
    return this.tokPerSec;
  }

  clear() {
    this.container.innerHTML = '';
    this.lineCount = 0;
    this.currentLine = null;
  }

  _trim() {
    while (this.lineCount > MAX_LINES) {
      this.container.removeChild(this.container.firstChild);
      this.lineCount--;
    }
  }
}

function classifyThought(text) {
  if (CURIOSITY_WORDS.some((w) => text.includes(w))) return 'thought-curiosity';
  if (DISTRESS_WORDS.some((w) => text.includes(w))) return 'thought-distress';
  if (JOY_WORDS.some((w) => text.includes(w))) return 'thought-joy';
  return 'thought-default';
}
