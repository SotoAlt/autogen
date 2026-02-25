/**
 * Developer test panel for exploring creature biology.
 * Activated with ?test=true URL parameter.
 */

export class TestPanel {
  constructor({ creature, heartbeat, energySystem, dna, onLevelChange, onForceThink, onFeed, getState }) {
    this.creature = creature;
    this.heartbeat = heartbeat;
    this.energySystem = energySystem;
    this.dna = dna;
    this.onLevelChange = onLevelChange;
    this.onForceThink = onForceThink;
    this.onFeed = onFeed;
    this.getState = getState;

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
      const bar = '█'.repeat(Math.round(val * 10));
      const empty = '░'.repeat(10 - Math.round(val * 10));
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
    ].join('<br>');

    // Update action log
    const actionsEl = this.panel.querySelector('#tp-actions');
    if (actionsEl && this.creature.currentAction) {
      const a = this.creature.currentAction;
      const line = document.createElement('div');
      line.className = 'tp-action-line';
      line.textContent = `${a.action} (${(a.intensity ?? 0).toFixed(1)})${a.thought ? ' — ' + a.thought.slice(0, 30) : ''}`;
      actionsEl.appendChild(line);
      // Keep last 10
      while (actionsEl.children.length > 10) actionsEl.removeChild(actionsEl.firstChild);
    }
  }

  destroy() {
    clearInterval(this._statusInterval);
    this.panel.remove();
  }
}
