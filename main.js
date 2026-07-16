import { PRESETS, DIRECTOR_PROMPT_TEMPLATE } from './personas.js';
import { UI, PROMPTS } from './i18n.js';

// Application State
let lang = localStorage.getItem('quatuor-lang') === 'fr' ? 'fr' : 'en';
let activePresetId = 'dnd';
let isRunning = false;
let messages = [];
let characters = [];
let topic = '';
let directorPrompt = '';
let speed = 'normal';
let activeModel = 'openai/gpt-5.6-terra';
let apiKeyOverride = '';
let nextTickTimeout = null;

// DOM Elements
const presetSelect = document.getElementById('preset-select');
const speedSelect = document.getElementById('speed-select');
const modelSelect = document.getElementById('model-select');
const playPauseBtn = document.getElementById('play-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const langToggleBtn = document.getElementById('lang-toggle-btn');
const toggleConfigBtn = document.getElementById('toggle-config-btn');
const configSidebar = document.getElementById('config-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const apiKeyInput = document.getElementById('api-key-input');
const topicInput = document.getElementById('topic-input');
const directorPromptInput = document.getElementById('director-prompt-input');
const charactersConfigContainer = document.getElementById('characters-config-container');
const chatMessages = document.getElementById('chat-messages');
const welcomeCard = document.getElementById('welcome-card');
const typingIndicator = document.getElementById('typing-indicator');
const typingAvatar = document.getElementById('typing-avatar');
const typingName = document.getElementById('typing-name');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const statsInfo = document.getElementById('stats-info');
const eventInput = document.getElementById('event-input');
const eventSendBtn = document.getElementById('event-send-btn');

// Translation helper: returns the UI string for the active language.
// Dictionary values may be functions taking arguments (e.g. counts, names).
function t(key, ...args) {
  const value = UI[lang][key];
  return typeof value === 'function' ? value(...args) : value;
}

// Apply the active language to every static piece of UI
function applyTranslations() {
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  // Preset names come from the language-specific preset definitions
  presetSelect.innerHTML = '';
  Object.entries(PRESETS[lang]).forEach(([id, preset]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  });
  presetSelect.value = activePresetId;

  // Play/pause button label depends on simulation state
  playPauseBtn.querySelector('.btn-text').textContent =
    isRunning ? t('pause') : (messages.length > 0 ? t('resume') : t('start'));
}

function switchLanguage() {
  lang = lang === 'en' ? 'fr' : 'en';
  localStorage.setItem('quatuor-lang', lang);
  applyTranslations();
  // Reload the preset so characters and prompts match the new language
  // (this resets the conversation, like a preset change)
  loadPreset(activePresetId);
  statusDot.className = 'status-dot inactive';
  statusText.textContent = t('statusReady');
  updateStats();
}

// Initialize application
function init() {
  // Apply persisted language, then load initial preset
  applyTranslations();
  loadPreset(activePresetId);
  statusText.textContent = t('statusReady');

  langToggleBtn.addEventListener('click', switchLanguage);

  // Setup sidebar visibility toggle
  toggleConfigBtn.addEventListener('click', () => {
    configSidebar.classList.toggle('collapsed');
  });

  closeSidebarBtn.addEventListener('click', () => {
    configSidebar.classList.add('collapsed');
  });

  // Setup listeners for configuration controls
  presetSelect.addEventListener('change', (e) => {
    activePresetId = e.target.value;
    loadPreset(activePresetId);
  });

  speedSelect.addEventListener('change', (e) => {
    speed = e.target.value;
  });

  modelSelect.addEventListener('change', (e) => {
    activeModel = e.target.value;
  });

  apiKeyInput.addEventListener('input', (e) => {
    apiKeyOverride = e.target.value.trim();
  });

  topicInput.addEventListener('input', (e) => {
    topic = e.target.value;
  });

  directorPromptInput.addEventListener('input', (e) => {
    directorPrompt = e.target.value;
  });

  // Action Buttons
  playPauseBtn.addEventListener('click', togglePlayPause);
  resetBtn.addEventListener('click', resetSimulation);

  // Narrator event injection
  eventSendBtn.addEventListener('click', injectNarratorEvent);
  eventInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') injectNarratorEvent();
  });

  // Initial stats update
  updateStats();
}

// Load preset data into state and inputs
function loadPreset(presetId) {
  // Stop simulation if active
  if (isRunning) {
    pauseSimulation();
  }

  const preset = PRESETS[lang][presetId];
  if (!preset) return;

  // Set topic
  topic = preset.defaultTopic;
  topicInput.value = topic;

  // Clone characters to allow edits without affecting original preset object
  characters = JSON.parse(JSON.stringify(preset.characters));

  // Build Director prompt
  const characterListStr = characters.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
  directorPrompt = DIRECTOR_PROMPT_TEMPLATE[lang].replace('{character_list}', characterListStr);
  directorPromptInput.value = directorPrompt;

  // Render character editor cards
  renderCharacterConfig();
  
  // Reset message array & clear chat DOM
  messages = [];
  clearChatDom();
}

// Render dynamic configuration forms for each character
function renderCharacterConfig() {
  charactersConfigContainer.innerHTML = '';

  characters.forEach((char, index) => {
    const charCard = document.createElement('div');
    charCard.className = 'char-config-item';
    charCard.style.setProperty('--char-color', char.color);

    charCard.innerHTML = `
      <div class="char-config-row">
        <span class="char-config-emoji">${char.emoji}</span>
        <input type="text" class="char-config-name" value="${char.name}" data-index="${index}" placeholder="${t('namePlaceholder')}">
        <input type="color" class="char-config-color-picker" value="${rgbToHex(char.color) || '#6366f1'}" data-index="${index}" title="${t('colorPickerTitle')}">
      </div>
      <textarea class="custom-textarea char-config-prompt" data-index="${index}" rows="3" placeholder="${t('charPromptPlaceholder')}">${char.systemPrompt}</textarea>
    `;

    charactersConfigContainer.appendChild(charCard);
  });

  // Setup listeners for inline edits
  document.querySelectorAll('.char-config-name').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      characters[idx].name = e.target.value;
      updateDirectorPromptList();
    });
  });

  document.querySelectorAll('.char-config-color-picker').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      characters[idx].color = e.target.value;
      // Re-apply style properties on element
      const card = e.target.closest('.char-config-item');
      card.style.setProperty('--char-color', e.target.value);
    });
  });

  document.querySelectorAll('.char-config-prompt').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      characters[idx].systemPrompt = e.target.value;
    });
  });
}

// Helper to update the Director list template automatically when character names change
function updateDirectorPromptList() {
  const characterListStr = characters.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');
  // Only update if prompt hasn't been heavily customized (or update it directly)
  directorPrompt = DIRECTOR_PROMPT_TEMPLATE[lang].replace('{character_list}', characterListStr);
  directorPromptInput.value = directorPrompt;
}

// Helper to convert CSS HSL colors (used in preset configs) to hex values for <input type="color">
function rgbToHex(colorStr) {
  if (colorStr.startsWith('#')) return colorStr;
  
  // Quick HSL parsing fallback
  const match = colorStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return '#6366f1';
}

// Clear Chat Screen
function clearChatDom() {
  chatMessages.innerHTML = '';
  // Re-append welcome card
  chatMessages.appendChild(welcomeCard);
  welcomeCard.classList.remove('hidden');
}

// Inject a narrator stage event into the shared transcript.
// The Director and characters see it on the next tick; the user stays a
// spectator — they perturb the scene, they never speak as a character.
function injectNarratorEvent() {
  const text = eventInput.value.trim();
  if (!text) return;
  eventInput.value = '';

  welcomeCard.classList.add('hidden');

  const message = {
    speakerId: 'narrator',
    name: t('narratorName'),
    emoji: '⚡',
    color: 'hsl(45, 90%, 55%)',
    text,
    timestamp: new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    mode: 'event'
  };

  messages.push(message);
  appendMessageToDom(message);
  updateStats();
}

// Toggle play or pause status
function togglePlayPause() {
  if (isRunning) {
    pauseSimulation();
  } else {
    startSimulation();
  }
}

function startSimulation() {
  isRunning = true;
  playPauseBtn.classList.add('btn-danger');
  playPauseBtn.classList.remove('btn-primary');
  playPauseBtn.querySelector('.play-icon').classList.add('hidden');
  playPauseBtn.querySelector('.pause-icon').classList.remove('hidden');
  playPauseBtn.querySelector('.btn-text').textContent = t('pause');

  statusDot.className = 'status-dot active';
  statusText.textContent = t('statusRunning');

  // Hide welcome card
  welcomeCard.classList.add('hidden');

  // Trigger first loop tick
  tick();
}

function pauseSimulation() {
  isRunning = false;
  if (nextTickTimeout) {
    clearTimeout(nextTickTimeout);
    nextTickTimeout = null;
  }
  
  playPauseBtn.classList.remove('btn-danger');
  playPauseBtn.classList.add('btn-primary');
  playPauseBtn.querySelector('.play-icon').classList.remove('hidden');
  playPauseBtn.querySelector('.pause-icon').classList.add('hidden');
  playPauseBtn.querySelector('.btn-text').textContent = t('resume');

  statusDot.className = 'status-dot inactive';
  statusText.textContent = t('statusPaused');
  
  hideTypingIndicator();
}

function resetSimulation() {
  pauseSimulation();
  messages = [];
  clearChatDom();
  updateStats();
  statusDot.className = 'status-dot inactive';
  statusText.textContent = t('statusReset');
  playPauseBtn.querySelector('.btn-text').textContent = t('start');
}

// Core Tick Cycle
async function tick() {
  if (!isRunning) return;

  try {
    statusText.textContent = t('statusDirector');
    
    // 1. Query the Director to choose the next speaker
    const directorDecision = await getDirectorDecision();
    const nextSpeakerId = directorDecision.next_speaker;
    const mode = directorDecision.mode || 'continue';
    const reason = directorDecision.reason || 'Ordre logique de discussion.';
    
    console.log(`[Régisseur] Décision: ${nextSpeakerId} (${mode}). Raison: ${reason}`);

    // Find character config
    const speaker = characters.find(c => c.id === nextSpeakerId) || characters[0];
    
    // 2. Show typing animation
    showTypingIndicator(speaker);
    statusText.textContent = t('statusThinking', speaker.name);
    
    // Wait standard visual typing buffer (different based on speed selection)
    const typingTime = getTypingDuration();
    await delay(typingTime);

    if (!isRunning) return; // Exit if paused during typing delay

    // 3. Request Replica from Character
    const replica = await getCharacterReplica(speaker, mode);

    if (!isRunning) return; // Exit if paused during API call delay

    // 4. Push message to state and DOM
    const message = {
      speakerId: speaker.id,
      name: speaker.name,
      emoji: speaker.emoji,
      color: speaker.color,
      text: replica,
      timestamp: new Date().toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      mode: mode
    };

    messages.push(message);
    appendMessageToDom(message);
    updateStats();

    // 5. Hide typing, wait delay, and trigger next tick
    hideTypingIndicator();
    statusText.textContent = t('statusWaiting');

    const loopDelay = getLoopDelay();
    nextTickTimeout = setTimeout(tick, loopDelay);

  } catch (error) {
    console.error('Simulation loop error:', error);
    statusDot.className = 'status-dot error';
    statusText.textContent = `${t('errorPrefix')}: ${error.message}`;
    pauseSimulation();
  }
}

// Query Director API
async function getDirectorDecision() {
  // Format current transcript for the Director context
  let transcript = '';
  if (messages.length === 0) {
    transcript = PROMPTS[lang].emptyTranscript;
  } else {
    // Pass last 15 messages to keep payload size controlled but context rich
    const recentMessages = messages.slice(-15);
    transcript = recentMessages.map(m => {
      if (m.mode === 'event') {
        return `${PROMPTS[lang].eventTag}: ${m.text}`;
      }
      const modeIndicator = m.mode === 'interrupt' ? PROMPTS[lang].interruptTag : '';
      return `${m.name} (ID: ${m.speakerId})${modeIndicator}: ${m.text}`;
    }).join('\n');
  }

  const prompt = PROMPTS[lang].directorUserPrompt({ topic, transcript });

  try {
    const response = await callChatApi(
      [{ role: 'user', content: prompt }],
      directorPrompt,
      activeModel
    );

    const content = response.choices[0].message.content.trim();
    const parsed = parseJsonRobust(content);
    
    // Ensure speaker selection is valid
    if (parsed && parsed.next_speaker && characters.some(c => c.id === parsed.next_speaker)) {
      // Avoid letting the same speaker talk twice in a row if possible (Director correction)
      if (messages.length > 0 && messages[messages.length - 1].speakerId === parsed.next_speaker) {
        // Find alternative speaker
        const alternate = characters.find(c => c.id !== parsed.next_speaker);
        parsed.next_speaker = alternate ? alternate.id : parsed.next_speaker;
        parsed.mode = 'continue';
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to get director decision, using fallback round-robin speaker", err);
  }

  // Robust Fallback: Round Robin
  return getFallbackSpeakerDecision();
}

// Fallback Round-Robin
function getFallbackSpeakerDecision() {
  let nextIdx = 0;
  // Narrator events don't count as turns: rotate from the last character who spoke
  const lastCharMessage = [...messages].reverse().find(m => m.mode !== 'event');
  if (lastCharMessage) {
    const lastIdx = characters.findIndex(c => c.id === lastCharMessage.speakerId);
    nextIdx = (lastIdx + 1) % characters.length;
  }
  return {
    next_speaker: characters[nextIdx].id,
    mode: 'continue',
    reason: PROMPTS[lang].fallbackReason
  };
}

// Query Character API
async function getCharacterReplica(speaker, mode) {
  let systemPrompt = speaker.systemPrompt;
  
  // Format history as formatted context
  const historyText = messages.map(m =>
    m.mode === 'event'
      ? `${PROMPTS[lang].eventTag}: ${m.text}`
      : `[${m.name}]: ${m.text}`
  ).join('\n');
  
  let instructions = PROMPTS[lang].characterInstructions({ topic, historyText, speaker });

  if (mode === 'interrupt' && messages.length > 0) {
    const prevSpeaker = messages[messages.length - 1].name;
    instructions += PROMPTS[lang].interruptInstruction(prevSpeaker);
  } else {
    instructions += PROMPTS[lang].continueInstruction;
  }

  try {
    const response = await callChatApi(
      [{ role: 'user', content: instructions }],
      systemPrompt,
      activeModel
    );

    let text = response.choices[0].message.content.trim();
    
    // Clean potential markdown quotes or character prefixes that LLMs frequently output
    text = cleanCharacterResponse(text, speaker.name);
    return text;
  } catch (err) {
    console.error("Character fetch failed", err);
    return PROMPTS[lang].apiErrorReplica(speaker.emoji);
  }
}

// General function to talk with OpenRouter proxy
async function callChatApi(messagesPayload, systemPrompt, model) {
  const payload = {
    messages: messagesPayload,
    systemPrompt: systemPrompt,
    model: model
  };

  // Attach key override if input has content
  if (apiKeyOverride) {
    payload.apiKey = apiKeyOverride;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Helpers
function parseJsonRobust(text) {
  const cleanText = text.trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // Try to extract object from markdown blocks
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        throw new Error("Could not parse extracted JSON block");
      }
    }
    throw e;
  }
}

function cleanCharacterResponse(text, name) {
  let clean = text.trim();
  // Strip starting name prefix, e.g. "Elara : " or "Elara:" or "Elara - "
  const prefixRegex = new RegExp(`^(${name}|${name.split(' ')[0]})\\s*[:\\-–—]\\s*`, 'i');
  clean = clean.replace(prefixRegex, '');
  
  // Strip outer quotes if the LLM wrapped the whole speech in quote marks
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith('«') && clean.endsWith('»'))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function showTypingIndicator(speaker) {
  typingAvatar.textContent = speaker.emoji;
  typingName.textContent = speaker.name;
  typingIndicator.style.setProperty('--char-color', speaker.color);
  typingIndicator.classList.remove('hidden');
  
  // Auto-scroll chat view to ensure indicator is visible
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  typingIndicator.classList.add('hidden');
}

function appendMessageToDom(msg) {
  const msgWrapper = document.createElement('div');
  msgWrapper.className = `message-wrapper self`;
  if (msg.mode === 'interrupt') {
    msgWrapper.classList.add('interruption');
    msgWrapper.dataset.badge = t('interruptBadge');
  }
  if (msg.mode === 'event') {
    msgWrapper.classList.add('narrator-event');
  }

  msgWrapper.style.setProperty('--char-color', msg.color);

  msgWrapper.innerHTML = `
    <div class="message-meta">
      <span class="message-avatar">${msg.emoji}</span>
      <span class="message-name">${msg.name}</span>
      <span class="message-time">${msg.timestamp}</span>
    </div>
    <div class="message-bubble">
      ${escapeHtml(msg.text)}
    </div>
  `;

  chatMessages.appendChild(msgWrapper);
  
  // Smoothly scroll to the bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updateStats() {
  statsInfo.textContent = t('stats', messages.length);
}

function getLoopDelay() {
  switch (speed) {
    case 'fast': return 1500;
    case 'slow': return 5000;
    case 'normal':
    default:
      return 3000;
  }
}

function getTypingDuration() {
  switch (speed) {
    case 'fast': return 600;
    case 'slow': return 1500;
    case 'normal':
    default:
      return 1000;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Run init on load
window.addEventListener('DOMContentLoaded', init);
