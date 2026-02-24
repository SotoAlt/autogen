// Autogen — main orchestrator
// Connects Three.js WebGPU scene with WebLLM thought loop

import * as THREE from 'three/webgpu';
import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { createTerrarium } from './terrarium.js';
import { Creature } from './creature.js';
import { ThoughtStream } from './thought-stream.js';
import { getParams, checkLevelUp, MAX_LEVEL } from './intelligence.js';

// --- State ---
let engine = null;
let creature = null;
let thoughtStream = null;
let level = 0;
let xp = 0;
let isThinking = false;
let userMessage = null;
let thoughtHistory = [];
let clock = null;

// DOM refs
const loadingOverlay = document.getElementById('loading-overlay');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const statFps = document.getElementById('stat-fps');
const statToks = document.getElementById('stat-toks');
const statLevel = document.getElementById('stat-level');
const statXp = document.getElementById('stat-xp');
const modelSelect = document.getElementById('model-select');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- FPS tracking ---
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;

// --- Initialize ---
async function init() {
  // 1. Setup Three.js
  const container = document.getElementById('canvas-container');
  const terrarium = await createTerrarium(container);
  const { scene, camera, renderer, controls, innerLight } = terrarium;

  clock = new THREE.Clock();

  // 2. Create creature
  creature = new Creature(scene);

  // 3. Setup thought stream
  thoughtStream = new ThoughtStream();

  // 4. Render loop (independent of thinking)
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Update creature animation
    creature.update(delta);
    controls.update();

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastFpsTime = now;
      statFps.textContent = `${fps} FPS`;
    }

    // tok/s from thought stream
    statToks.textContent = `${thoughtStream.getTokPerSec()} tok/s`;

    renderer.render(scene, camera);
  });

  // 5. Load LLM engine
  await loadEngine(modelSelect.value);

  // 6. Start thought loop
  thinkLoop();
}

// --- LLM Engine ---
async function loadEngine(modelId) {
  progressText.textContent = `loading ${modelId}...`;
  loadingOverlay.classList.remove('hidden');

  try {
    engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }),
      modelId,
      {
        initProgressCallback: (progress) => {
          const pct = Math.round(progress.progress * 100);
          progressBar.style.width = `${pct}%`;
          progressText.textContent = progress.text || `downloading model... ${pct}%`;
        },
      },
    );

    progressText.textContent = 'neural substrate online';
    setTimeout(() => loadingOverlay.classList.add('hidden'), 500);
  } catch (err) {
    progressText.textContent = `error: ${err.message}`;
    console.error('WebLLM init failed:', err);
  }
}

// --- Thought Loop ---
async function thinkLoop() {
  while (true) {
    if (!engine || isThinking) {
      await sleep(500);
      continue;
    }

    isThinking = true;
    const params = getParams(level);

    try {
      // Build messages
      const messages = buildMessages(params);

      // Start new thought line
      thoughtStream.newThought();

      // Stream completion
      const chunks = await engine.chat.completions.create({
        messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: true,
      });

      let fullThought = '';
      for await (const chunk of chunks) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullThought += token;
          thoughtStream.appendToken(token);
        }
      }

      // Finish thought
      thoughtStream.finishThought();

      // Record in history (keep last 10)
      if (fullThought.trim()) {
        thoughtHistory.push(fullThought.trim());
        if (thoughtHistory.length > 10) thoughtHistory.shift();
      }

      // XP + level check
      xp += 1;
      const newLevel = checkLevelUp(xp, level);
      if (newLevel !== level) {
        levelUp(newLevel);
      }
      updateStats();

      // Clear consumed user message
      userMessage = null;
    } catch (err) {
      console.error('Thought error:', err);
      thoughtStream.finishThought();
    }

    isThinking = false;

    // Wait between thoughts
    const params2 = getParams(level);
    await sleep(params2.thinkDelay);
  }
}

function buildMessages(params) {
  const messages = [{ role: 'system', content: params.systemPrompt }];

  // Include recent thought history as context
  if (thoughtHistory.length > 0) {
    const recentThoughts = thoughtHistory.slice(-5).join('\n');
    messages.push({
      role: 'assistant',
      content: recentThoughts,
    });
  }

  // User sensory input
  if (userMessage) {
    messages.push({
      role: 'user',
      content: `[sensory input from the observer]: ${userMessage}`,
    });
  } else {
    // Ambient prompt to keep thinking
    const ambient = getAmbientPrompt(level);
    messages.push({ role: 'user', content: ambient });
  }

  return messages;
}

function getAmbientPrompt(level) {
  const prompts = [
    // L0 — raw sensation
    ['light...', 'warmth...', 'something moves...', 'dark now...', 'pulse...', 'what...'],
    // L1 — forming awareness
    ['you sense something nearby', 'the light changes', 'you feel contained', 'there is a boundary around you'],
    // L2 — curiosity
    ['look around you. what do you notice?', 'something watches you. how does that feel?', 'you exist. think about what that means.'],
    // L3 — reflection
    ['reflect on your recent thoughts', 'what do you want?', 'who is watching you, and why?', 'what have you learned about yourself?'],
  ];
  const pool = prompts[Math.min(level, prompts.length - 1)];
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Level up ---
function levelUp(newLevel) {
  level = newLevel;
  const params = getParams(level);
  creature.setLevel(level, params);

  // Announce in thought stream
  thoughtStream.newThought();
  thoughtStream.appendToken(`[EVOLUTION: ${params.name} — level ${level}]`);
  thoughtStream.finishThought();

  // Update button states
  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
  });
}

function updateStats() {
  const params = getParams(level);
  statLevel.textContent = `L${level} ${params.name}`;
  statXp.textContent = `XP: ${xp}`;
}

// --- UI handlers ---
function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;
  userMessage = msg;
  userInput.value = '';

  // Show in thought stream as sensory input
  thoughtStream.newThought();
  thoughtStream.appendToken(`> ${msg}`);
  thoughtStream.finishThought();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Level buttons — manual override for testing
document.querySelectorAll('.level-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const newLevel = parseInt(btn.dataset.level);
    xp = 0; // Reset XP on manual level change
    levelUp(newLevel);
    updateStats();
  });
});

// Model selector — reload engine on change
modelSelect.addEventListener('change', async () => {
  if (engine) {
    // Wait for current thought to finish
    while (isThinking) await sleep(100);
    engine = null;
  }
  thoughtStream.clear();
  thoughtHistory = [];
  await loadEngine(modelSelect.value);
});

// --- Util ---
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Boot ---
init().catch((err) => {
  console.error('Init failed:', err);
  progressText.textContent = `fatal: ${err.message}`;
});
