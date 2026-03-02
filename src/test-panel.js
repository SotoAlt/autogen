/**
 * Developer test panel for exploring creature biology.
 * Activated with ?test=true URL parameter.
 * v0.5.0: Added memory stats and debug controls.
 */

export class TestPanel {
  constructor({ creature, heartbeat, energySystem, dna, memory, conversation, onLevelChange, onForceThink, onFeed, onSave, onClearMemory, getState, metrics }) {
    this.creature = creature;
    this.heartbeat = heartbeat;
    this.energySystem = energySystem;
    this.dna = dna;
    this.memory = memory || null;
    this.conversation = conversation || null;
    this.onLevelChange = onLevelChange;
    this.onForceThink = onForceThink;
    this.onFeed = onFeed;
    this.onSave = onSave || (() => {});
    this.onClearMemory = onClearMemory || (() => {});
    this.getState = getState;
    this.metrics = metrics || { actionTimestamps: [], inferenceTimestamps: [], inferenceDurations: [], userReactionLatencies: [] };

    this.panel = document.createElement('div');
    this.panel.id = 'test-panel';
    this.panel.innerHTML = `
      <div class="tp-header">
        <span>EVOLUTION LAB</span>
        <button id="tp-collapse">_</button>
      </div>
      <div id="tp-body">
        <div class="tp-section">
          <label>Level <span id="tp-level-val">0</span></label>
          <input type="range" id="tp-level" min="0" max="3" step="1" value="0" />
        </div>
        <div class="tp-section">
          <label>Energy <span id="tp-energy-val">50</span></label>
          <input type="range" id="tp-energy" min="0" max="100" step="1" value="50" />
        </div>
        <div class="tp-section">
          <label>Hue <span id="tp-hue-val">0</span></label>
          <input type="range" id="tp-hue" min="0" max="360" step="1" value="0" />
        </div>
        <div class="tp-section tp-buttons">
          <button id="tp-feed">Feed (+15)</button>
          <button id="tp-think">Force Think</button>
        </div>
        <div class="tp-section tp-buttons">
          <button id="tp-reset">Reset</button>
          <button id="tp-snapshot">Snapshot</button>
          <button id="tp-reset-metrics">Reset Metrics</button>
        </div>
        <div class="tp-section">
          <div class="tp-dna-title">METRICS</div>
          <div id="tp-metrics" class="tp-status"></div>
        </div>
        <div class="tp-section">
          <div class="tp-dna-title">MEMORY</div>
          <div id="tp-memory" class="tp-status"></div>
          <div id="tp-memory-entries" class="tp-actions"></div>
          <div class="tp-buttons" style="margin-top:4px">
            <button id="tp-clear-memory">Clear Memory</button>
            <button id="tp-force-save">Force Save</button>
          </div>
        </div>
        <div class="tp-section">
          <div class="tp-dna-title">DNA</div>
          <div id="tp-dna"></div>
        </div>
        <div class="tp-section">
          <div id="tp-status" class="tp-status"></div>
        </div>
        <div class="tp-section">
          <div class="tp-dna-title">Action Log</div>
          <div id="tp-actions" class="tp-actions"></div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);
    this._bind();
    this._renderDNA();
    this._updateStatus();
    this._statusInterval = setInterval(() => this._updateStatus(), 500);
  }

  _bind() {
    const $ = (id) => this.panel.querySelector(id);

    $('#tp-collapse').addEventListener('click', () => {
      const body = $('#tp-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    this._slider('tp-level', (v) => {
      this.onLevelChange(parseInt(v));
    });

    this._slider('tp-energy', (v) => {
      const val = parseInt(v);
      this.energySystem.energy = val;
    });

    this._slider('tp-hue', (v) => {
      this.creature.setHue(parseInt(v) / 360);
    });

    $('#tp-feed').addEventListener('click', () => {
      this.onFeed(15);
    });

    $('#tp-think').addEventListener('click', () => {
      this.onForceThink();
    });

    $('#tp-reset').addEventListener('click', () => {
      this.creature.setHue(Math.random());
      this.energySystem.energy = 50;
      this.onLevelChange(0);
      const levelSlider = $('#tp-level');
      levelSlider.value = 0;
      $('#tp-level-val').textContent = '0';
      $('#tp-energy').value = 50;
      $('#tp-energy-val').textContent = '50';
    });

    $('#tp-snapshot').addEventListener('click', () => {
      const state = this.getState();
      console.log('[test-panel] Snapshot:', JSON.stringify(state, null, 2));
    });

    $('#tp-reset-metrics').addEventListener('click', () => {
      this.metrics.actionTimestamps.length = 0;
      this.metrics.actionNames.length = 0;
      this.metrics.inferenceTimestamps.length = 0;
      this.metrics.inferenceDurations.length = 0;
      this.metrics.userReactionLatencies.length = 0;
    });

    $('#tp-clear-memory').addEventListener('click', () => {
      this.onClearMemory();
    });

    $('#tp-force-save').addEventListener('click', () => {
      this.onSave();
    });
  }

  _slider(id, callback) {
    const input = this.panel.querySelector(`#${id}`);
    const valSpan = this.panel.querySelector(`#${id}-val`);
    input.addEventListener('input', () => {
      valSpan.textContent = input.value;
      callback(input.value);
    });
  }

  _renderDNA() {
    const container = this.panel.querySelector('#tp-dna');
    const entries = Object.entries(this.dna).map(([key, val]) => {
      const bar = '\u2588'.repeat(Math.round(val * 10));
      const empty = '\u2591'.repeat(10 - Math.round(val * 10));
      return `<div class="tp-dna-row"><span class="tp-dna-key">${key}</span><span class="tp-dna-bar">${bar}${empty}</span><span class="tp-dna-val">${val.toFixed(2)}</span></div>`;
    });
    container.innerHTML = entries.join('');
  }

  _updateStatus() {
    const status = this.panel.querySelector('#tp-status');
    if (!status) return;
    const state = this.getState();
    status.innerHTML = [
      `Phase: ${state.heartbeatPhase}`,
      `BPM: ${state.bpm}`,
      `Pulse: ${state.pulse.toFixed(2)}`,
      `Energy: ${state.energy} (${state.energyState})`,
      `Next: ${state.countdown}s`,
      `Thinking: ${state.isThinking}`,
      `Runtime: ${state.runtime || 'unknown'}`,
      `Strategy: ${state.strategy || 'unknown'}`,
      `Gen: ${state.generation || 1}`,
    ].join('<br>');

    // Update metrics
    const metricsEl = this.panel.querySelector('#tp-metrics');
    if (metricsEl) {
      const now = performance.now();
      const countRecent = (arr) => arr.filter(t => now - t < 60000).length;
      const avg = (arr) => arr.length > 0
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;

      const last20Names = (this.metrics.actionNames || []).slice(-20);
      const uniqueRatio = last20Names.length > 0
        ? (new Set(last20Names).size / last20Names.length).toFixed(2)
        : 'N/A';

      metricsEl.innerHTML = [
        `Actions/min: ${countRecent(this.metrics.actionTimestamps)}`,
        `Inferences/min: ${countRecent(this.metrics.inferenceTimestamps)}`,
        `Unique ratio: ${uniqueRatio}`,
        `Avg inference: ${avg(this.metrics.inferenceDurations)}ms`,
        `Avg user->react: ${avg(this.metrics.userReactionLatencies)}ms`,
      ].join('<br>');
    }

    // Update memory stats
    const memoryEl = this.panel.querySelector('#tp-memory');
    if (memoryEl && this.memory) {
      const shortTerm = this.memory.getShortTerm();
      const longTerm = this.memory.getLongTerm();
      memoryEl.innerHTML = [
        `Short-term: ${shortTerm.length}`,
        `Long-term: ${longTerm.length}`,
        `Total: ${this.memory.size}`,
        `Conversations: ${this.conversation ? this.conversation.length : 0}`,
      ].join('<br>');
    }

    // Update recent memory entries
    const memEntriesEl = this.panel.querySelector('#tp-memory-entries');
    if (memEntriesEl && this.memory) {
      const recent = this.memory.getShortTerm().slice(-5);
      memEntriesEl.innerHTML = '';
      for (const entry of recent) {
        const line = document.createElement('div');
        line.className = 'tp-action-line';
        const age = Math.round((Date.now() - entry.timestamp) / 1000);
        const preview = entry.content.slice(0, 30);
        line.textContent = `[${entry.type}] (${entry.importance.toFixed(1)}) ${preview} — ${age}s ago`;
        memEntriesEl.appendChild(line);
      }
    }

    // Update action log
    const actionsEl = this.panel.querySelector('#tp-actions');
    if (actionsEl && this.creature.currentAction) {
      const a = this.creature.currentAction;
      const line = document.createElement('div');
      line.className = 'tp-action-line';
      line.textContent = `${a.action} (${(a.intensity ?? 0).toFixed(1)})${a.thought ? ' \u2014 ' + a.thought.slice(0, 30) : ''}`;
      actionsEl.appendChild(line);
      while (actionsEl.children.length > 10) actionsEl.removeChild(actionsEl.firstChild);
    }
  }

  destroy() {
    clearInterval(this._statusInterval);
    this.panel.remove();
  }
}
