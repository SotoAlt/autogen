import * as THREE from 'three/webgpu';
import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { createTerrarium } from './terrarium.js';
import { Creature } from './creature.js';
import { ThoughtStream } from './thought-stream.js';
import { Heartbeat } from './heartbeat.js';
import { getParams, buildSystemPrompt, checkLevelUp } from './intelligence.js';
import { generateDNA } from './dna.js';
import { EnergySystem } from './energy.js';
import { ACTION_COSTS, parseAndValidateAction, getActionsForLevel } from './action-schemas.js';

// State
let engine = null;
let currentWorker = null;
let creature = null;
let thoughtStream = null;
let heartbeat = null;
let energySystem = null;
let dna = null;
let level = 0;
let xp = 0;
let isThinking = false;
let userMessage = null;
let lastReflexTime = 0;
let actionHistory = []; // last 5 actions as memory context
let clock = null;

// DOM refs
const loadingOverlay = document.getElementById('loading-overlay');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const loadingStage = document.getElementById('loading-stage');
const loadingDetail = document.getElementById('loading-detail');
const loadingSize = document.getElementById('loading-size');
const statFps = document.getElementById('stat-fps');
const statLevel = document.getElementById('stat-level');
const statXp = document.getElementById('stat-xp');
const statPhase = document.getElementById('stat-phase');
const statEnergy = document.getElementById('stat-energy');
const energyBar = document.getElementById('energy-bar-fill');
const energyValue = document.getElementById('energy-value');
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
  dna = generateDNA();
  energySystem = new EnergySystem();
  creature = new Creature(scene, dna);
  thoughtStream = new ThoughtStream();
  heartbeat = new Heartbeat(dna);

  // Heartbeat markers in thought stream
  heartbeat.onPhaseChange((phase) => {
    if (phase === 'sense') {
      thoughtStream.addMarker('~');
    }
  });

  // Heartbeat-gated thinking
  heartbeat.onThinkPhase(() => {
    doThinkCycle();
  });

  console.log('[autogen] Scene ready, DNA:', JSON.stringify(dna, null, 2));

  // Render loop
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Only tick heartbeat if not dormant
    if (!energySystem.isDormant) {
      heartbeat.update(delta);
    }

    creature.pulse = heartbeat.pulse;
    creature.setDimming(energySystem.visualDimming);
    creature.update(delta);
    controls.update();

    // FPS counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      statFps.textContent = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsTime = now;
    }

    // Update stats
    if (statPhase) statPhase.textContent = heartbeat.phase;
    updateEnergyDisplay();
    renderer.render(scene, camera);
  });

  await loadEngine(modelSelect.value);

  // Init test panel if ?test=true
  if (new URLSearchParams(window.location.search).has('test')) {
    const { TestPanel } = await import('./test-panel.js');
    new TestPanel({
      creature,
      heartbeat,
      energySystem,
      dna,
      onLevelChange: (newLevel) => {
        xp = 0;
        levelUp(newLevel);
        updateStats();
      },
      onForceThink: () => doThinkCycle(),
      onFeed: (amount) => {
        energySystem.feed(amount);
        updateEnergyDisplay();
      },
      getState: () => ({
        level,
        xp,
        energy: Math.round(energySystem.energy),
        energyState: energySystem.state,
        hue: creature.hue,
        dna,
        particleCount: creature.particleCount,
        heartbeatPhase: heartbeat.phase,
        bpm: heartbeat.bpm,
        pulse: heartbeat.pulse,
        isThinking,
        model: modelSelect.value,
        countdown: Math.round(heartbeat.countdown),
      }),
    });
  }
}

async function loadEngine(modelId, retryCount = 0) {
  loadingOverlay.classList.remove('hidden');
  loadingStage.textContent = 'connecting';
  loadingDetail.textContent = `model: ${modelId.split('-MLC')[0]}`;
  progressBar.classList.add('indeterminate');
  progressBar.style.width = '';
  progressText.textContent = '';
  if (loadingSize) loadingSize.style.display = '';

  let lastLogTime = 0;

  try {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    currentWorker = worker;

    engine = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (progress) => {
        const pct = Math.round(progress.progress * 100);
        const text = progress.text || '';

        // Switch from indeterminate to determinate once we get real progress
        if (pct > 0) {
          progressBar.classList.remove('indeterminate');
          progressBar.style.width = `${pct}%`;
        }

        // Parse WebLLM progress text into human-readable stages
        if (text.includes('fetch param')) {
          loadingStage.textContent = 'downloading model';
          loadingDetail.textContent = 'fetching parameters from HuggingFace...';
        } else if (text.includes('Loading model')) {
          loadingStage.textContent = 'downloading model';
        } else if (text.includes('loading GPU shader')) {
          loadingStage.textContent = 'compiling shaders';
          loadingDetail.textContent = 'building GPU compute pipelines...';
          if (loadingSize) loadingSize.style.display = 'none';
        } else if (text.includes('Loading GPU')) {
          loadingStage.textContent = 'loading to GPU';
          loadingDetail.textContent = 'transferring weights to VRAM...';
        } else if (text.includes('Finish')) {
          loadingStage.textContent = 'ready';
          loadingDetail.textContent = 'neural substrate online';
        }

        // Show percentage when downloading
        if (pct > 0 && pct < 100) {
          progressText.textContent = `${pct}%`;
        }

        // Log periodically (not every callback)
        const now = Date.now();
        if (now - lastLogTime > 2000) {
          console.log(`[autogen] ${text} (${pct}%)`);
          lastLogTime = now;
        }
      },
    });

    loadingStage.textContent = 'alive';
    loadingDetail.textContent = 'neural substrate online';
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '100%';
    progressText.textContent = '';
    setTimeout(() => loadingOverlay.classList.add('hidden'), 800);
  } catch (err) {
    console.error('WebLLM init failed:', err);

    // Cache corruption — clear and retry once
    if (retryCount === 0 && err.message?.includes('Cache')) {
      loadingStage.textContent = 'cache error';
      loadingDetail.textContent = 'clearing corrupted cache and retrying...';
      try {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
        console.log('[autogen] Cleared Cache Storage, retrying...');
      } catch (e) {
        console.warn('[autogen] Could not clear caches:', e);
      }
      if (currentWorker) { currentWorker.terminate(); currentWorker = null; }
      await sleep(1000);
      return loadEngine(modelId, retryCount + 1);
    }

    loadingStage.textContent = 'error';
    loadingDetail.textContent = err.message;
    progressText.textContent = 'try incognito window or clear site data';
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '0%';
  }
}

async function doThinkCycle() {
  if (!engine || isThinking) return;
  if (energySystem.isDormant) return;

  isThinking = true;
  thoughtStream.showThinking();

  const params = getParams(level);
  const temp = creature.overrides?.temperature ?? params.temperature;
  const maxTokens = creature.overrides?.maxTokens ?? params.maxTokens;
  const topP = params.top_p ?? 1.0;

  // Build memory context from recent actions
  const memoryCtx = actionHistory.length > 0
    ? actionHistory.slice(-5).map(a => `${a.action}${a.thought ? ': ' + a.thought : ''}`).join('; ')
    : '';

  const systemPrompt = buildSystemPrompt(level, energySystem.energy, dna, userMessage, memoryCtx);

  try {
    // Small models follow few-shot examples better than instructions.
    // System prompt sets personality, assistant message gives JSON example,
    // user message is the actual stimulus.
    // Level-aware few-shot: L0-L1 have no thought field, L2+ include thought.
    const exampleActions = getActionsForLevel(level);
    const exampleAction = exampleActions[Math.floor(Math.random() * exampleActions.length)];
    const fewShot = level >= 2
      ? `{"action":"${exampleAction}","intensity":0.6,"thought":"warm"}`
      : `{"action":"${exampleAction}","intensity":0.6}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'something stirs.' },
      { role: 'assistant', content: fewShot },
      { role: 'user', content: userMessage
        ? `[The observer speaks]: ${userMessage}`
        : getAmbientPrompt(level, energySystem),
      },
    ];

    // No response_format — XGrammar WASM crashes on SmolLM2.
    // JSON enforced via system prompt. extractAction handles prose fallback.

    // Timeout: if inference takes >30s, abort
    const inferencePromise = engine.chat.completions.create({
      messages,
      temperature: temp,
      max_tokens: maxTokens,
      top_p: topP,
      stream: false,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('inference timeout (30s)')), 30000)
    );

    const response = await Promise.race([inferencePromise, timeoutPromise]);

    const content = response.choices[0]?.message?.content || '{}';
    console.log('[autogen] Raw LLM output:', content);

    const actionData = extractAction(content, level);

    // Filter thought by level — suppress language at low levels
    if (level === 0) {
      delete actionData.thought;
    } else if (level === 1 && actionData.thought) {
      actionData.thought = actionData.thought.split(/\s+/).slice(0, 2).join(' ').slice(0, 10);
      if (!actionData.thought) delete actionData.thought;
    } else if (level === 2 && actionData.thought) {
      actionData.thought = actionData.thought.slice(0, 20);
    } else if (actionData.thought) {
      actionData.thought = actionData.thought.slice(0, 200);
    }

    // Execute the action
    const cost = ACTION_COSTS[actionData.action] ?? 1;
    energySystem.spendAction(cost, dna);
    creature.executeAction(actionData);

    // Display in thought stream
    if (actionData.thought) {
      thoughtStream.addThought(actionData.thought, actionData.action);
    } else {
      thoughtStream.addAction(actionData.action, actionData.intensity);
    }

    // Track history
    actionHistory.push(actionData);
    if (actionHistory.length > 10) actionHistory.shift();

    // Rest action restores energy
    if (actionData.action === 'rest') {
      energySystem.feed(1);
    }

    // Metabolism drain per cycle
    energySystem.metabolize(dna, level);
    energySystem.presenceBonus();

    // XP
    xp += 1;
    if (userMessage) xp += 3;
    const newLevel = checkLevelUp(xp, level);
    if (newLevel !== level) {
      levelUp(newLevel);
    }
    updateStats();
    userMessage = null;

    // Starvation penalty
    if (energySystem.isDormant) {
      xp = Math.max(0, xp - 5);
      thoughtStream.addEvent('[dormant — energy depleted]');
      updateStats();
    }

  } catch (err) {
    console.error('Think error:', err);
    thoughtStream.addEvent(`[${err.message || 'error'}]`);
  } finally {
    // Always clean up — no stuck "..." indicator
    thoughtStream.hideThinking();
    isThinking = false;
    heartbeat.thinkComplete();
  }
}

/**
 * Extract a valid action from LLM output.
 * Small models often wrap JSON in markdown, add preamble text, or produce partial JSON.
 * This tries multiple extraction strategies before falling back to random action.
 */
function extractAction(content, lvl) {
  // Strategy 1: direct parse
  try {
    const obj = JSON.parse(content.trim());
    if (obj.action) return parseAndValidateAction(JSON.stringify(obj), lvl);
  } catch {}

  // Strategy 2: extract JSON from markdown code block
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try {
      const obj = JSON.parse(codeBlock[1].trim());
      if (obj.action) return parseAndValidateAction(JSON.stringify(obj), lvl);
    } catch {}
  }

  // Strategy 3: regex field extraction — find "action":"<word>" even in garbled output
  const actionFieldMatch = content.match(/"action"\s*:\s*"(\w+)"/);
  if (actionFieldMatch) {
    const intensityMatch = content.match(/"intensity"\s*:\s*([\d.]+)/);
    const thoughtMatch = content.match(/"thought"\s*:\s*"([^"]*)"/);
    const extracted = {
      action: actionFieldMatch[1],
      intensity: intensityMatch ? parseFloat(intensityMatch[1]) : 0.5,
    };
    if (thoughtMatch) extracted.thought = thoughtMatch[1];
    return parseAndValidateAction(JSON.stringify(extracted), lvl);
  }

  // Strategy 4: find first { ... } in the text
  const braceMatch = content.match(/\{[^}]*\}/);
  if (braceMatch) {
    return parseAndValidateAction(braceMatch[0], lvl);
  }

  // Strategy 5: keyword detection — scan for action words and synonyms in prose
  const text = content.toLowerCase().replace(/[^a-z_\s]/g, '');
  const keywordMap = {
    drift: ['drift', 'move', 'float', 'wander', 'explore', 'travel', 'swim'],
    pulse: ['pulse', 'throb', 'beat', 'pump', 'flash', 'burst'],
    absorb: ['absorb', 'feed', 'eat', 'consume', 'drink', 'energy', 'hunger'],
    glow: ['glow', 'light', 'bright', 'shine', 'warm', 'radiat'],
    shrink: ['shrink', 'small', 'contract', 'fear', 'cold', 'hide', 'retreat'],
    reach: ['reach', 'extend', 'stretch', 'toward', 'touch', 'approach'],
    shift_color: ['color', 'hue', 'shift', 'change', 'emotion'],
    spin: ['spin', 'rotat', 'excit', 'twirl', 'whirl'],
    speak: ['speak', 'say', 'tell', 'voice', 'word', 'talk'],
    morph: ['morph', 'transform', 'reshape', 'evolv'],
    split: ['split', 'divid', 'separate', 'clone'],
    rest: ['rest', 'sleep', 'still', 'calm', 'quiet', 'peace'],
  };
  for (const [action, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      const result = { action, intensity: 0.5 + Math.random() * 0.4 };
      // Only capture prose as thought for level >= 2
      if (lvl >= 2) {
        result.thought = content.replace(/^["']|["']$/g, '').trim().slice(0, 80);
      }
      return result;
    }
  }

  // Fallback: random action for this level — still counts as life
  console.warn('[autogen] Could not extract action, using random. Raw:', content);
  const fallback = parseAndValidateAction('{}', lvl);
  // Only capture raw output as thought for level >= 2
  if (lvl >= 2 && content.trim().length > 0) {
    fallback.thought = content.trim().slice(0, 60);
  }
  return fallback;
}

function getAmbientPrompt(level, energy) {
  if (energy.state === 'starving') {
    return 'you are fading. energy very low. what do you do?';
  }
  if (energy.state === 'hungry') {
    return 'you feel hungry. energy is low. choose carefully.';
  }

  const prompts = [
    // L0 — raw
    ['something stirs.', 'warmth...', 'darkness.', 'a pulse.'],
    // L1 — forming
    ['you sense something.', 'light changes.', 'you feel contained.'],
    // L2 — curious
    ['something watches you.', 'you exist. act on it.', 'the glass is close.'],
    // L3 — reflective
    ['what do you want?', 'who watches?', 'reflect on your state.', 'what have you learned?'],
  ];
  const pool = prompts[Math.min(level, prompts.length - 1)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function levelUp(newLevel) {
  level = newLevel;
  const params = getParams(level);
  creature.setLevel(level, params);
  heartbeat.setLevel(level);

  thoughtStream.addEvent(`[EVOLUTION: ${params.name} — level ${level}]`);

  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
  });
}

function updateStats() {
  const params = getParams(level);
  statLevel.textContent = `L${level} ${params.name}`;
  statXp.textContent = `XP: ${xp}`;
}

function updateEnergyDisplay() {
  const e = Math.round(energySystem.energy);
  if (energyBar) {
    energyBar.style.width = `${e}%`;
    // Color based on state
    if (e >= 70) energyBar.style.background = '#00ff88';
    else if (e >= 40) energyBar.style.background = '#88cc44';
    else if (e >= 15) energyBar.style.background = '#ffaa22';
    else energyBar.style.background = '#ff4444';
  }
  if (energyValue) energyValue.textContent = e;
  if (statEnergy) statEnergy.textContent = `E:${e}`;
}

function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  userMessage = msg;
  userInput.value = '';

  // Display in stream
  thoughtStream.addUserMessage(msg);

  // Feed energy
  energySystem.feed(15);

  // Wake from dormancy
  if (energySystem.isDormant) {
    energySystem.wake();
    thoughtStream.addEvent('[awakened by observer]');
  }

  // XP for interaction
  xp += 3;
  const newLevel = checkLevelUp(xp, level);
  if (newLevel !== level) {
    levelUp(newLevel);
  }
  updateStats();
  updateEnergyDisplay();

  // Trigger reflex think (rate limited to 1 per 5s)
  const now = performance.now();
  if (now - lastReflexTime > 5000 && !isThinking) {
    lastReflexTime = now;
    heartbeat.triggerReflex();
  }
}

// Click on creature = +5 energy
document.getElementById('canvas-container').addEventListener('click', () => {
  energySystem.feed(5);
  updateEnergyDisplay();
});

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
    while (isThinking) await sleep(100);
    engine = null;
  }
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
  }
  thoughtStream.clear();
  actionHistory = [];
  await sleep(500);
  await loadEngine(modelSelect.value);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

init().catch((err) => {
  console.error('Init failed:', err);
  progressText.textContent = `fatal: ${err.message}`;
});
