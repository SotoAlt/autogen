import * as THREE from 'three/webgpu';
import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { createTerrarium } from './terrarium.js';
import { Creature } from './creature.js';
import { ThoughtStream } from './thought-stream.js';
import { getParams, checkLevelUp } from './intelligence.js';

// State
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

// FPS tracking
let frameCount = 0;
let lastFpsTime = performance.now();

async function init() {
  const container = document.getElementById('canvas-container');
  const { scene, camera, renderer, controls } = await createTerrarium(container);

  clock = new THREE.Clock();
  creature = new Creature(scene);
  thoughtStream = new ThoughtStream();

  // Render loop (independent of thinking)
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    creature.update(delta);
    controls.update();

    // FPS counter (updated once per second)
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      statFps.textContent = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsTime = now;
    }

    statToks.textContent = `${thoughtStream.getTokPerSec()} tok/s`;
    renderer.render(scene, camera);
  });

  await loadEngine(modelSelect.value);
  thinkLoop();
}

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

async function thinkLoop() {
  while (true) {
    if (!engine || isThinking) {
      await sleep(500);
      continue;
    }

    isThinking = true;
    const params = getParams(level);

    try {
      const messages = buildMessages(params);
      thoughtStream.newThought();

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

      thoughtStream.finishThought();

      // Keep last 10 thoughts as context
      if (fullThought.trim()) {
        thoughtHistory.push(fullThought.trim());
        if (thoughtHistory.length > 10) thoughtHistory.shift();
      }

      xp += 1;
      const newLevel = checkLevelUp(xp, level);
      if (newLevel !== level) {
        levelUp(newLevel);
      }
      updateStats();
      userMessage = null;
    } catch (err) {
      console.error('Thought error:', err);
      thoughtStream.finishThought();
    }

    isThinking = false;
    await sleep(getParams(level).thinkDelay);
  }
}

function buildMessages(params) {
  const messages = [{ role: 'system', content: params.systemPrompt }];

  if (thoughtHistory.length > 0) {
    messages.push({
      role: 'assistant',
      content: thoughtHistory.slice(-5).join('\n'),
    });
  }

  const userContent = userMessage
    ? `[sensory input from the observer]: ${userMessage}`
    : getAmbientPrompt(level);
  messages.push({ role: 'user', content: userContent });

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

function levelUp(newLevel) {
  level = newLevel;
  const params = getParams(level);
  creature.setLevel(level, params);

  thoughtStream.newThought();
  thoughtStream.appendToken(`[EVOLUTION: ${params.name} — level ${level}]`);
  thoughtStream.finishThought();

  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
  });
}

function updateStats() {
  const params = getParams(level);
  statLevel.textContent = `L${level} ${params.name}`;
  statXp.textContent = `XP: ${xp}`;
}

function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  userMessage = msg;
  userInput.value = '';

  thoughtStream.newThought();
  thoughtStream.appendToken(`> ${msg}`);
  thoughtStream.finishThought();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

document.querySelectorAll('.level-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const newLevel = parseInt(btn.dataset.level);
    xp = 0;
    levelUp(newLevel);
    updateStats();
  });
});

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

init().catch((err) => {
  console.error('Init failed:', err);
  progressText.textContent = `fatal: ${err.message}`;
});
