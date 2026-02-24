/**
 * Developer test panel for exploring creature evolution stages.
 * Activated with ?test=true URL parameter.
 */

export class TestPanel {
  constructor({ creature, heartbeat, onLevelChange, onModelChange, getState }) {
    this.creature = creature;
    this.heartbeat = heartbeat;
    this.onLevelChange = onLevelChange;
    this.onModelChange = onModelChange;
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
          <label>Temperature <span id="tp-temp-val">1.4</span></label>
          <input type="range" id="tp-temp" min="0.1" max="2.0" step="0.1" value="1.4" />
        </div>
        <div class="tp-section">
          <label>Max Tokens <span id="tp-tokens-val">128</span></label>
          <input type="range" id="tp-tokens" min="32" max="2048" step="32" value="128" />
        </div>
        <div class="tp-section">
          <label>Particles <span id="tp-particles-val">1000</span></label>
          <input type="range" id="tp-particles" min="100" max="3000" step="100" value="1000" />
        </div>
        <div class="tp-section">
          <label>Heartbeat (s) <span id="tp-hb-val">2.0</span></label>
          <input type="range" id="tp-hb" min="0.5" max="5.0" step="0.1" value="2.0" />
        </div>
        <div class="tp-section">
          <label>Hue <span id="tp-hue-val">0</span></label>
          <input type="range" id="tp-hue" min="0" max="360" step="1" value="0" />
        </div>
        <div class="tp-section tp-buttons">
          <button id="tp-reset">Reset Creature</button>
          <button id="tp-snapshot">Snapshot</button>
        </div>
        <div class="tp-section">
          <div id="tp-status" class="tp-status"></div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);
    this._bind();
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

    this._slider('tp-temp', (v) => {
      this.creature.overrides = this.creature.overrides || {};
      this.creature.overrides.temperature = parseFloat(v);
    });

    this._slider('tp-tokens', (v) => {
      this.creature.overrides = this.creature.overrides || {};
      this.creature.overrides.maxTokens = parseInt(v);
    });

    this._slider('tp-particles', (v) => {
      this.creature.setParticleCount(parseInt(v));
    });

    this._slider('tp-hb', (v) => {
      this.heartbeat.overridePeriod = parseFloat(v);
    });

    this._slider('tp-hue', (v) => {
      this.creature.setHue(parseInt(v) / 360);
    });

    $('#tp-reset').addEventListener('click', () => {
      this.creature.setHue(Math.random());
      this.onLevelChange(0);
      const levelSlider = $('#tp-level');
      levelSlider.value = 0;
      $('#tp-level-val').textContent = '0';
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

  _updateStatus() {
    const status = this.panel.querySelector('#tp-status');
    if (!status) return;
    const state = this.getState();
    status.textContent = `Phase: ${state.heartbeatPhase} | BPM: ${state.bpm} | Pulse: ${state.pulse.toFixed(2)}`;
  }

  destroy() {
    clearInterval(this._statusInterval);
    this.panel.remove();
  }
}
