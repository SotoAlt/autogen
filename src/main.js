import * as THREE from 'three/webgpu';
import { createTerrarium } from './terrarium.js';
import { Creature } from './creature.js';
import { ThoughtStream } from './thought-stream.js';
import { Heartbeat } from './heartbeat.js';
import { getParams, buildSystemPrompt, checkLevelUp } from './intelligence.js';
import { generateDNA } from './dna.js';
import { EnergySystem } from './energy.js';
import { ACTION_COSTS, parseAndValidateAction, getActionsForLevel } from './action-schemas.js';
import { createEngine, WEBLLM_MODELS, WLLAMA_MODELS } from './runtime/index.js';
import { createStrategy } from './strategies/index.js';
import {
  createCreatureState, saveCreatureState, loadCreatureState,
  clearCreatureState, startAutoSave, installUnloadSave, formatAge,
} from './persistence.js';
import { EpisodicMemory } from './memory.js';
import { ConversationHistory } from './conversation.js';
// Grammar imports kept for future use when wllama fixes GBNF support
// import { SINGLE_ACTION_GRAMMAR } from './grammars.js';

// State
let inferenceEngine = null;
let creature = null;
let thoughtStream = null;
let heartbeat = null;
let energySystem = null;
let strategy = null;
let dna = null;
let level = 0;
let xp = 0;
let isThinking = false;
let userMessage = null;
let lastReflexTime = 0;
let actionHistory = [];
let clock = null;
let currentRuntime = 'wllama';
let currentStrategyType = 'legacy';
let creatureState = null;
let episodicMemory = null;
let conversationHistory = null;
let stopAutoSave = null;

// Metrics (for test panel)
export const metrics = {
  actionTimestamps: [],
  actionNames: [],
  inferenceTimestamps: [],
  inferenceDurations: [],
  userReactionLatencies: [],
  lastUserMessageTime: 0,
};

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
const runtimeSelect = document.getElementById('runtime-select');
const modelSelect = document.getElementById('model-select');
const strategySelect = document.getElementById('strategy-select');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newCreatureBtn = document.getElementById('new-creature-btn');
const creatureAgeEl = document.getElementById('creature-age');

// FPS tracking
let frameCount = 0;
let lastFpsTime = performance.now();

async function init() {
  const container = document.getElementById('canvas-container');
  const { scene, camera, renderer, controls } = await createTerrarium(container);

  clock = new THREE.Clock();

  // Try loading saved creature state
  const loaded = loadCreatureState();
  if (loaded) {
    creatureState = loaded;
    dna = loaded.dna;
    level = loaded.level;
    xp = loaded.xp;
    actionHistory = loaded.actionHistory || [];
    currentRuntime = loaded.currentRuntime || 'wllama';
    currentStrategyType = loaded.currentStrategyType || 'legacy';
    episodicMemory = new EpisodicMemory(loaded.memoryEntries);
    conversationHistory = new ConversationHistory(loaded.conversationHistory);
    const dormancySecs = (Date.now() - loaded.lastSavedAt) / 1000;
    episodicMemory.addMemory('dormancy', `Awakened after ${formatAge(dormancySecs)} dormancy`);
    console.log(`[autogen] Creature awakens. Age: ${formatAge(loaded.totalAge)}. Generation: ${loaded.generation}`);
  } else {
    dna = generateDNA();
    creatureState = createCreatureState(() => dna);
    episodicMemory = new EpisodicMemory();
    conversationHistory = new ConversationHistory();
    console.log('[autogen] New creature born. Generation: 1');
  }

  energySystem = new EnergySystem();
  if (loaded) energySystem.energy = loaded.energy;
  creature = new Creature(scene, dna);
  thoughtStream = new ThoughtStream();
  heartbeat = new Heartbeat(dna);
  strategy = createStrategy(currentStrategyType);
  strategy.init(dna, level, energySystem);

  // Apply restored level visuals
  if (level > 0) {
    const params = getParams(level);
    creature.setLevel(level, params);
    heartbeat.setLevel(level);
    strategy.setLevel(level);
    document.querySelectorAll('.level-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
  }

  // Restore runtime/strategy selects
  if (runtimeSelect) runtimeSelect.value = currentRuntime;
  if (strategySelect) strategySelect.value = currentStrategyType;

  // Start auto-save + unload save
  stopAutoSave = startAutoSave(getStateForSave);
  installUnloadSave(getStateForSave);

  // Heartbeat markers in thought stream
  heartbeat.onPhaseChange((phase) => {
    if (phase === 'sense') {
      thoughtStream.addMarker('~');
    }
  });

  // Populate model dropdown for current runtime
  populateModels(currentRuntime);

  console.log('[autogen] Scene ready, DNA:', JSON.stringify(dna, null, 2));
  // Debug: expose engine for console testing
  window.__debugEngine = () => inferenceEngine;

  // Render loop
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    // Only tick heartbeat if not dormant
    if (!energySystem.isDormant) {
      heartbeat.update(delta);
    }

    // Strategy tick — produces sub-tick actions between inference calls
    if (!energySystem.isDormant && strategy && currentStrategyType !== 'legacy') {
      const action = strategy.tick(delta);
      if (action) {
        executeAction(action);
      }

      // Strategy-driven inference
      if (strategy.needsInference() && !isThinking) {
        runInference();
      }
    }

    // Legacy: heartbeat-driven inference
    if (currentStrategyType === 'legacy') {
      if (heartbeat.consumeThink() && !isThinking) {
        doThinkCycle();
      }
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
    if (frameCount === 0) updateAgeDisplay(); // once per second
    renderer.render(scene, camera);
  });

  await loadEngine(currentRuntime, modelSelect.value);

  // Init test panel if ?test=true
  if (new URLSearchParams(window.location.search).has('test')) {
    const { TestPanel } = await import('./test-panel.js');
    new TestPanel({
      creature,
      heartbeat,
      energySystem,
      dna,
      memory: episodicMemory,
      conversation: conversationHistory,
      onLevelChange: (newLevel) => {
        xp = 0;
        levelUp(newLevel);
        updateStats();
      },
      onForceThink: () => currentStrategyType === 'legacy' ? doThinkCycle() : runInference(),
      onFeed: (amount) => {
        energySystem.feed(amount);
        updateEnergyDisplay();
      },
      onSave: () => saveCurrentState(),
      onClearMemory: () => {
        episodicMemory = new EpisodicMemory();
        conversationHistory = new ConversationHistory();
        saveCurrentState();
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
        runtime: currentRuntime,
        strategy: currentStrategyType,
        model: modelSelect.value,
        countdown: Math.round(heartbeat.countdown),
        generation: creatureState?.generation || 1,
        totalAge: creatureState?.totalAge || 0,
      }),
      metrics,
    });
  }
}

function populateModels(runtime) {
  const models = runtime === 'webllm' ? WEBLLM_MODELS : WLLAMA_MODELS;
  modelSelect.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.size})`;
    modelSelect.appendChild(opt);
  }
}

async function loadEngine(runtime, modelId) {
  loadingOverlay.classList.remove('hidden');
  loadingStage.textContent = 'connecting';
  loadingDetail.textContent = `runtime: ${runtime} | model: ${modelId.split('/').pop()?.split('-MLC')[0] || modelId}`;
  progressBar.classList.add('indeterminate');
  progressBar.style.width = '';
  progressText.textContent = '';
  if (loadingSize) {
    const models = runtime === 'webllm' ? WEBLLM_MODELS : WLLAMA_MODELS;
    const model = models.find(m => m.id === modelId);
    loadingSize.textContent = model ? `${model.size} download on first visit` : '';
    loadingSize.style.display = '';
  }

  try {
    inferenceEngine = createEngine(runtime);

    await inferenceEngine.init(modelId, (progress) => {
      const { pct, stage, detail, hideSize } = progress;

      if (pct > 0) {
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = `${pct}%`;
      }

      if (stage) loadingStage.textContent = stage;
      if (detail) loadingDetail.textContent = detail;
      if (hideSize && loadingSize) loadingSize.style.display = 'none';

      if (pct > 0 && pct < 100) {
        progressText.textContent = `${pct}%`;
      }
    });

    loadingStage.textContent = 'alive';
    loadingDetail.textContent = `${runtime} inference online`;
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '100%';
    progressText.textContent = '';
    setTimeout(() => loadingOverlay.classList.add('hidden'), 800);
  } catch (err) {
    console.error(`${runtime} init failed:`, err);

    // Cache corruption — clear and retry once for WebLLM
    if (runtime === 'webllm' && err.message?.includes('Cache')) {
      loadingStage.textContent = 'cache error';
      loadingDetail.textContent = 'clearing corrupted cache and retrying...';
      try {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
      } catch (e) {
        console.warn('[autogen] Could not clear caches:', e);
      }
      await sleep(1000);
      return loadEngine(runtime, modelId);
    }

    loadingStage.textContent = 'error';
    loadingDetail.textContent = err.message;
    progressText.textContent = 'try incognito window or clear site data';
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '0%';
  }
}

/** Push to a capped array — removes oldest entry when full */
function pushCapped(arr, value, max) {
  arr.push(value);
  if (arr.length > max) arr.shift();
}

/** Execute an action on the creature — shared by all paths */
function executeAction(actionData) {
  if (!actionData || !actionData.action) return;

  const cost = ACTION_COSTS[actionData.action] ?? 1;
  energySystem.spendAction(cost, dna);
  creature.executeAction(actionData);

  // Display in thought stream
  if (actionData.thought) {
    thoughtStream.addThought(actionData.thought, actionData.action);
  } else {
    thoughtStream.addAction(actionData.action, actionData.intensity);
  }

  // Track history + metrics
  pushCapped(actionHistory, actionData, 10);
  pushCapped(metrics.actionTimestamps, performance.now(), 100);
  pushCapped(metrics.actionNames, actionData.action, 100);

  // User->reaction latency
  if (metrics.lastUserMessageTime > 0) {
    pushCapped(metrics.userReactionLatencies, performance.now() - metrics.lastUserMessageTime, 20);
    metrics.lastUserMessageTime = 0;
  }

  // Rest action restores energy
  if (actionData.action === 'rest') {
    energySystem.feed(1);
  }
}

/** Build shared inference parameters from creature state */
function getInferenceParams() {
  const params = getParams(level);
  return {
    temperature: creature.overrides?.temperature ?? params.temperature,
    maxTokens: creature.overrides?.maxTokens ?? params.maxTokens,
    topP: params.top_p ?? 1.0,
  };
}

/** Build memory context string from episodic memory */
function getMemoryContext(msg = null) {
  if (!episodicMemory) return '';
  return episodicMemory.buildMemoryPrompt(msg, level);
}

/** Record inference metrics and handle post-inference bookkeeping */
function recordInferenceMetrics(inferenceStart) {
  const duration = performance.now() - inferenceStart;
  pushCapped(metrics.inferenceTimestamps, performance.now(), 50);
  pushCapped(metrics.inferenceDurations, duration, 50);
}

/** Shared post-inference bookkeeping: metabolism, XP, level-up, dormancy, memory */
function postInferenceBookkeeping(actionData) {
  energySystem.metabolize(dna, level);
  energySystem.presenceBonus();
  xp += userMessage ? 4 : 1;
  const newLevel = checkLevelUp(xp, level);
  if (newLevel !== level) {
    levelUp(newLevel);
  }
  updateStats();

  if (actionData) {
    const content = actionData.thought
      ? `${actionData.action}: ${actionData.thought}`
      : actionData.action;
    episodicMemory.addMemory('action', content, classifyEmotion(actionData.thought));
  }

  if (userMessage && actionData) {
    conversationHistory.recordResponse(actionData.thought || null, actionData.action);
  }

  userMessage = null;

  if (energySystem.isDormant) {
    xp = Math.max(0, xp - 5);
    thoughtStream.addEvent('[dormant — energy depleted]');
    episodicMemory.addMemory('dormancy', 'Fell dormant from energy depletion');
    saveCurrentState();
    updateStats();
  }
}

/**
 * Wraps an inference function with shared guards, thinking state, and cleanup.
 * @param {(inferenceStart: number) => Promise<void>} fn - The inference logic
 * @param {string} label - Error label for logging
 */
async function withThinkingState(fn, label) {
  if (!inferenceEngine?.isReady() || isThinking) return;
  if (energySystem.isDormant) return;

  isThinking = true;
  thoughtStream.showThinking();
  const inferenceStart = performance.now();

  try {
    await fn(inferenceStart);
  } catch (err) {
    console.error(`${label} error:`, err);
    thoughtStream.addEvent(`[${err.message || 'error'}]`);
  } finally {
    thoughtStream.hideThinking();
    isThinking = false;
    heartbeat.thinkComplete();
  }
}

/**
 * Strategy-driven inference — used by plan-queue, event-driven, layered.
 * Gets grammar + prompt from strategy, runs engine, feeds result back.
 */
function runInference() {
  return withThinkingState(async (inferenceStart) => {
    const context = {
      energy: energySystem.energy,
      dna,
      userMessage,
      memoryCtx: getMemoryContext(userMessage),
      level,
      energyState: energySystem.state,
      conversationMessages: conversationHistory.buildConversationMessages(level),
    };

    // Grammar disabled — wllama GBNF broken, WebLLM XGrammar crashes.
    // Strategies still define grammars for future use when library is fixed.
    const messages = strategy.getInferencePrompt(context);

    const raw = await inferenceEngine.complete(messages, null, getInferenceParams());
    console.log('[autogen] Raw LLM output:', raw);
    recordInferenceMetrics(inferenceStart);

    // Feed result to strategy — may return an immediate override action
    const overrideAction = strategy.onInferenceResult(raw);
    const actionData = overrideAction?.action ? overrideAction : null;
    if (actionData) {
      filterThought(actionData);
      executeAction(actionData);
    }

    postInferenceBookkeeping(actionData);
  }, 'Inference');
}

/**
 * Legacy think cycle — v0.3.0 behavior, used when strategy is 'legacy'.
 * Heartbeat-gated, single action per cycle, extractAction fallback chain.
 */
function doThinkCycle() {
  return withThinkingState(async (inferenceStart) => {
    const memoryCtx = getMemoryContext(userMessage);
    const systemPrompt = buildSystemPrompt(level, energySystem.energy, dna, userMessage, memoryCtx);

    const exampleActions = getActionsForLevel(level);
    const exampleAction = exampleActions[Math.floor(Math.random() * exampleActions.length)];
    const fewShot = level >= 2
      ? `{"action":"${exampleAction}","intensity":0.6,"thought":"warm"}`
      : `{"action":"${exampleAction}","intensity":0.6}`;

    const convMessages = conversationHistory.buildConversationMessages(level);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'something stirs.' },
      { role: 'assistant', content: fewShot },
      ...convMessages,
      { role: 'user', content: userMessage
        ? `[The observer speaks]: ${userMessage}`
        : getAmbientPrompt(level, energySystem),
      },
    ];

    // No grammar — wllama GBNF is broken, WebLLM XGrammar crashes on small models.
    // Both runtimes rely on extractAction fallback chain for robust JSON parsing.
    const content = await inferenceEngine.complete(messages, null, getInferenceParams());
    console.log('[autogen] Raw LLM output:', content);
    recordInferenceMetrics(inferenceStart);

    const actionData = extractAction(content, level);

    filterThought(actionData);
    executeAction(actionData);
    postInferenceBookkeeping(actionData);
  }, 'Think');
}

/** Filter thought text by level — suppress language at low levels */
function filterThought(actionData) {
  if (!actionData) return;

  if (level === 0) {
    delete actionData.thought;
    return;
  }

  if (!actionData.thought) return;

  if (level === 1) {
    actionData.thought = actionData.thought.split(/\s+/).slice(0, 2).join(' ').slice(0, 10);
    if (!actionData.thought) delete actionData.thought;
  } else if (level === 2) {
    actionData.thought = actionData.thought.slice(0, 20);
  } else {
    actionData.thought = actionData.thought.slice(0, 200);
  }
}

/**
 * Extract a valid action from LLM output (WebLLM fallback chain).
 * Small models often wrap JSON in markdown, add preamble text, or produce partial JSON.
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

  // Strategy 3: regex field extraction
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

  // Strategy 5: keyword detection
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
      if (lvl >= 2) {
        result.thought = content.replace(/^["']|["']$/g, '').trim().slice(0, 80);
      }
      return result;
    }
  }

  // Fallback: random action
  console.warn('[autogen] Could not extract action, using random. Raw:', content);
  const fallback = parseAndValidateAction('{}', lvl);
  if (lvl >= 2 && content.trim().length > 0) {
    fallback.thought = content.trim().slice(0, 60);
  }
  return fallback;
}

function getAmbientPrompt(lvl, energy) {
  if (energy.state === 'starving') {
    return 'you are fading. energy very low. what do you do?';
  }
  if (energy.state === 'hungry') {
    return 'you feel hungry. energy is low. choose carefully.';
  }

  const prompts = [
    ['something stirs.', 'warmth...', 'darkness.', 'a pulse.'],
    ['you sense something.', 'light changes.', 'you feel contained.'],
    ['something watches you.', 'you exist. act on it.', 'the glass is close.'],
    ['what do you want?', 'who watches?', 'reflect on your state.', 'what have you learned?'],
  ];
  const pool = prompts[Math.min(lvl, prompts.length - 1)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function levelUp(newLevel) {
  level = newLevel;
  const params = getParams(level);
  creature.setLevel(level, params);
  heartbeat.setLevel(level);
  strategy.setLevel(level);

  thoughtStream.addEvent(`[EVOLUTION: ${params.name} — level ${level}]`);
  episodicMemory.addMemory('level_up', `Evolved to ${params.name} (level ${level})`, 'joy');
  saveCurrentState();

  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
  });
}

function updateStats() {
  const params = getParams(level);
  statLevel.textContent = `L${level} ${params.name}`;
  statXp.textContent = `XP: ${xp}`;
}

/** Energy threshold -> color mapping */
const ENERGY_COLORS = [
  [70, '#00ff88'],
  [40, '#88cc44'],
  [15, '#ffaa22'],
  [0, '#ff4444'],
];

function updateEnergyDisplay() {
  const e = Math.round(energySystem.energy);
  if (energyBar) {
    energyBar.style.width = `${e}%`;
    energyBar.style.background = ENERGY_COLORS.find(([threshold]) => e >= threshold)[1];
  }
  if (energyValue) energyValue.textContent = e;
  if (statEnergy) statEnergy.textContent = `E:${e}`;
}

function sendMessage() {
  const msg = userInput.value.trim();
  if (!msg) return;

  userMessage = msg;
  userInput.value = '';
  thoughtStream.addUserMessage(msg);
  energySystem.feed(15);
  metrics.lastUserMessageTime = performance.now();

  conversationHistory.recordUserMessage(msg);
  episodicMemory.addMemory('user_interaction', `Observer said: ${msg}`);

  if (energySystem.isDormant) {
    energySystem.wake();
    thoughtStream.addEvent('[awakened by observer]');
  }

  xp += 3;
  const newLevel = checkLevelUp(xp, level);
  if (newLevel !== level) {
    levelUp(newLevel);
  }
  updateStats();
  updateEnergyDisplay();

  if (currentStrategyType !== 'legacy') {
    strategy.onUserMessage(msg);
  }

  // Legacy: trigger reflex think (rate limited to 1 per 5s)
  if (currentStrategyType === 'legacy') {
    const now = performance.now();
    if (now - lastReflexTime > 5000 && !isThinking) {
      lastReflexTime = now;
      heartbeat.triggerReflex();
    }
  }
}

/** Build current state for persistence */
function getStateForSave() {
  if (!creatureState) return null;
  creatureState.dna = dna;
  creatureState.level = level;
  creatureState.xp = xp;
  creatureState.energy = energySystem ? energySystem.energy : 50;
  creatureState.actionHistory = actionHistory.slice(-10);
  creatureState.memoryEntries = episodicMemory.toJSON();
  creatureState.conversationHistory = conversationHistory.toJSON();
  creatureState.currentRuntime = currentRuntime;
  creatureState.currentStrategyType = currentStrategyType;
  return creatureState;
}

/** Save current state immediately */
function saveCurrentState() {
  const state = getStateForSave();
  if (state) saveCreatureState(state);
}

/** Classify thought text into emotion for memory tagging */
function classifyEmotion(thought) {
  if (!thought) return null;
  const text = thought.toLowerCase();
  const curiosityWords = ['?', 'what', 'why', 'how', 'wonder', 'curious'];
  const distressWords = ['pain', 'hurt', 'dark', 'cold', 'afraid', 'lost', 'alone'];
  const joyWords = ['warm', 'light', 'good', 'happy', 'safe', 'beautiful', 'love'];
  if (curiosityWords.some((w) => text.includes(w))) return 'curiosity';
  if (distressWords.some((w) => text.includes(w))) return 'distress';
  if (joyWords.some((w) => text.includes(w))) return 'joy';
  return 'neutral';
}

/** Update creature age display */
function updateAgeDisplay() {
  if (!creatureAgeEl || !creatureState) return;
  const sessionElapsed = (Date.now() - creatureState.lastSavedAt) / 1000;
  const totalAge = creatureState.totalAge + sessionElapsed;
  creatureAgeEl.textContent = `Gen ${creatureState.generation} | Age: ${formatAge(Math.max(0, totalAge))}`;
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

// New Creature button
if (newCreatureBtn) {
  newCreatureBtn.addEventListener('click', () => {
    if (isThinking) return; // don't interrupt thinking
    const oldDna = dna ? { ...dna } : null;
    const oldGen = creatureState?.generation || 1;

    // Save farewell memory
    saveCurrentState();

    // Create fresh state
    dna = generateDNA();
    creatureState = createCreatureState(() => dna, oldDna, oldGen + 1);
    level = 0;
    xp = 0;
    actionHistory = [];
    episodicMemory = new EpisodicMemory();
    conversationHistory = new ConversationHistory();

    // Reset visuals
    energySystem.energy = 50;
    creature.setHue(dna.baseHue || Math.random());
    creature.setLevel(0, getParams(0));
    heartbeat.setLevel(0);
    strategy = createStrategy(currentStrategyType);
    strategy.init(dna, level, energySystem);
    thoughtStream.clear();
    thoughtStream.addEvent(`[NEW CREATURE — Generation ${creatureState.generation}]`);
    updateStats();
    updateEnergyDisplay();
    updateAgeDisplay();

    document.querySelectorAll('.level-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === 0);
    });

    saveCurrentState();
    console.log(`[autogen] New creature born. Generation: ${creatureState.generation}`);
  });
}

/** Shut down current engine, clear state, and prepare for reload */
async function teardownEngine() {
  saveCurrentState();
  if (inferenceEngine) {
    while (isThinking) await sleep(100);
    await inferenceEngine.destroy();
    inferenceEngine = null;
  }
  thoughtStream.clear();
  actionHistory = [];
  await sleep(300);
}

// Runtime switch
runtimeSelect.addEventListener('change', async () => {
  const newRuntime = runtimeSelect.value;
  if (newRuntime === currentRuntime) return;
  await teardownEngine();
  currentRuntime = newRuntime;
  populateModels(newRuntime);
  await loadEngine(newRuntime, modelSelect.value);
});

// Model switch
modelSelect.addEventListener('change', async () => {
  await teardownEngine();
  await loadEngine(currentRuntime, modelSelect.value);
});

// Strategy switch
strategySelect.addEventListener('change', () => {
  const newType = strategySelect.value;
  if (newType === currentStrategyType) return;
  currentStrategyType = newType;
  strategy = createStrategy(newType);
  strategy.init(dna, level, energySystem);
  thoughtStream.addEvent(`[strategy: ${newType}]`);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

init().catch((err) => {
  console.error('Init failed:', err);
  progressText.textContent = `fatal: ${err.message}`;
});
