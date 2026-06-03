<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { loadQnA, findAnswers } from '$lib/detection/qnaDetection';
  import { assistantHistory } from '$lib/supabase/db';
  import { session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let messages = $state([]);
  let input = $state('');
  let sending = $state(false);
  let loading = $state(true);
  let isGuest = $state(true);

  const intents = {
    color: 'I can help identify and describe colors. Try pointing your camera at something colorful!',
    object: 'I can help identify objects using our detection engines. Switch to scan mode to see what objects are around you.',
    contrast: 'High contrast mode can be enabled in your profile settings. This makes text and UI elements more distinct.',
    cvd: 'Color Vision Deficiency (CVD) affects how people perceive colors. The most common types are protanopia (red-blind), deuteranopia (green-blind), and tritanopia (blue-blind). Our app can simulate these conditions.',
    feature: 'Our app has several features: Object Detection, Color Detection, OCR Text Extraction, Color Blindness Simulation, Scene Classification, and an AI Assistant.',
    guide: 'To get started: 1) Go to Scan mode 2) Point your camera at objects 3) The AI will detect and describe colors 4) Save your favorites!',
    ocr: 'Our OCR feature can extract text from images. Go to the OCR page and upload an image containing text.',
    settings: 'You can customize your experience in Profile Settings: toggle notifications, adjust detection preferences, and more.',
    hello: 'Hello! I\'m your color blindness detection assistant. How can I help you today?',
    help: 'I can help with: • Color identification & blindness info • Object detection guide • App features & navigation • OCR text extraction • Accessibility tips • Settings & customization',
  };

  const fallbackAnswers = [
    'I can help with color blindness detection, object identification, OCR, and app navigation. Try asking about a specific feature!',
    'Great question! For color-related queries, try using our detection mode with the camera. For general info, I can explain color vision deficiencies.',
    'You can learn more about our features by visiting the Dashboard. Each feature has detailed instructions and tooltips.',
    'For best results with object detection, ensure good lighting and hold the camera steady. Our fusion mode combines multiple AI models.',
    'Color blindness affects approximately 1 in 12 men and 1 in 200 women worldwide. Our app helps make content more accessible.',
  ];

  $effect(() => {
    isGuest = !$session;
    if ($session !== undefined) load();
  });

  async function load() {
    loading = true;
    try {
      const data = await assistantHistory.list();
      messages = data.map(d => ({ role: 'user', text: d.question, ts: d.createdat })).concat(
        data.map(d => ({ role: 'assistant', text: d.answer, ts: d.createdat }))
      );
      messages.sort((a, b) => new Date(a.ts || 0).getTime() - new Date(b.ts || 0).getTime());
    } catch (_) { messages = []; }
    loading = false;
    if (messages.length === 0 && !isGuest) {
      messages.push({ role: 'assistant', text: intents.hello, ts: new Date().toISOString() });
    }
  }

  function getIntent(text) {
    const lower = text.toLowerCase();
    if (/\b(hi|hello|hey|greet|sup|howdy)\b/.test(lower)) return 'hello';
    if (/\b(color|colour|red|blue|green|yellow|purple|pink)\b/.test(lower) && !/\b(blind|deficient|vision|cvd)\b/.test(lower)) return 'color';
    if (/\b(object|detect|find|see|scan|identify)\b/.test(lower)) return 'object';
    if (/\b(contrast|readab|visibility)\b/.test(lower)) return 'contrast';
    if (/\b(blind|color.?blind|cvd|deuteranopia|protanopia|tritanopia|deficient|vision)\b/.test(lower)) return 'cvd';
    if (/\b(feature|capabilit|what can|do you|function)\b/.test(lower)) return 'feature';
    if (/\b(guide|tutorial|how.?to|get.?start|beginner|help)\b/.test(lower)) return 'guide';
    if (/\b(ocr|text|read|extract|character)\b/.test(lower)) return 'ocr';
    if (/\b(setting|preference|profile|config)\b/.test(lower)) return 'settings';
    if (/\b(help|support|assist|what can you|capabilities)\b/.test(lower)) return 'help';
    return null;
  }

  let aiSession = $state(null);
  let qnaReady = $state(false);

  async function getBuiltInAISession() {
    try {
      const LM = /** @type {any} */ (self).LanguageModel;
      if (!LM) return null;
      const opts = {
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        systemPrompt: "You are a color blindness assistant. Answer concisely about color vision, accessibility, object detection, and the app's features. Keep answers under 3 sentences."
      };
      const avail = await LM.availability(opts);
      if (avail === 'unavailable') return null;
      if (avail === 'after-download') {
        console.log('[AI] Downloading model...');
        const session = await LM.create({
          ...opts,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => console.log(`[AI] Download: ${(e.loaded * 100).toFixed(1)}%`));
            m.addEventListener('statechange', (e) => console.log('[AI] State:', e.target.state));
          }
        });
        console.log('[AI] Session ready');
        return session;
      }
      const session = await LM.create(opts);
      return session;
    } catch (_) { return null; }
  }

  onMount(async () => {
    aiSession = await getBuiltInAISession();
    try { await loadQnA(); qnaReady = true; } catch (_) {}
  });

  const appContext = Object.values(intents).join(' ') + ' The app features include: object detection, color detection, OCR text extraction, color blindness simulation, scene classification, and an AI assistant.';

  function generateAnswer(question) {
    const intent = getIntent(question);
    if (intent && intents[intent]) return intents[intent];
    return fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    input = '';
    sending = true;
    messages = [...messages, { role: 'user', text, ts: new Date().toISOString() }];
    let answer = null;
    if (aiSession) {
      try { answer = await aiSession.prompt(text); } catch (_) {}
    }
    if (!answer && qnaReady) {
      try { const answers = await findAnswers(text, appContext); if (answers.length > 0) answer = answers[0].text; } catch (_) {}
    }
    if (!answer) answer = generateAnswer(text);
    messages = [...messages, { role: 'assistant', text: answer, ts: new Date().toISOString() }];
    try { await assistantHistory.create({ question: text, answer }); } catch (_) {}
    sending = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function clearChat() {
    try { await assistantHistory.clear(); messages = []; } catch (_) {}
  }
</script>

<div class="assistant-page">
  <div class="chat-card">
    <div class="chat-header">
      <div class="flex items-center gap-2">
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div>
          <div class="font-brut text-brut-sm uppercase">ClrBlind Assistant</div>
          <div class="text-brut-xs text-neo-darkgray">Color blindness & accessibility guide</div>
        </div>
      </div>
      <button class="clear-btn" onclick={clearChat} aria-label="Clear chat"><i class="fas fa-trash-can"></i></button>
    </div>

    <div class="chat-messages">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="brut-spinner w-5 h-5"></div>
          <span class="font-brut text-brut-xs ml-2">Loading...</span>
        </div>
      {:else if isGuest}
        <div class="guest-prompt">
          <div class="text-3xl opacity-30 mb-2"><i class="fas fa-robot"></i></div>
          <div class="font-brut text-brut-sm uppercase">Sign in to use the assistant</div>
          <div class="text-brut-xs text-neo-darkgray">Chat history is saved to your account.</div>
          <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}>
            <i class="fas fa-right-to-bracket mr-1"></i> Sign In
          </button>
        </div>
      {:else}
        {#each messages as msg, i (msg.ts + i)}
          <div class="msg" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'} transition:fly={{ y: 8, duration: 200 }}>
            {#if msg.role === 'assistant'}
              <div class="msg-avatar"><i class="fas fa-robot"></i></div>
            {/if}
            <div class="msg-bubble">{msg.text}</div>
          </div>
        {/each}
        <div class="scroll-anchor"></div>
      {/if}
    </div>

    {#if !isGuest}
      <div class="chat-input">
        <textarea
          class="input-field"
          rows="1"
          placeholder="Ask about colors, detection, accessibility..."
          bind:value={input}
          onkeydown={handleKeydown}
          disabled={sending}
        ></textarea>
        <button class="send-btn" onclick={send} disabled={!input.trim() || sending} aria-label="Send">
          <i class="fas {sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}"></i>
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .assistant-page { max-width: 600px; margin: 1rem auto; padding: 0 0.75rem 5rem; }
  .chat-card { border: 4px solid #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; background: #fefefe; display: flex; flex-direction: column; height: calc(100vh - 10rem); }
  .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-bottom: 3px solid #0a0a0a; }
  .avatar { width: 36px; height: 36px; border: 2px solid #0a0a0a; background: #ffd700; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
  .clear-btn { width: 30px; height: 30px; border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; color: #ff0033; opacity: 0.5; display: flex; align-items: center; justify-content: center; }
  .clear-btn:hover { opacity: 1; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .guest-prompt { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; text-align: center; }
  .msg { display: flex; gap: 0.5rem; max-width: 85%; }
  .msg.user { align-self: flex-end; flex-direction: row-reverse; }
  .msg-avatar { width: 28px; height: 28px; border: 2px solid #0a0a0a; background: #ffd700; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }
  .msg-bubble { padding: 0.5rem 0.75rem; font-size: 0.75rem; line-height: 1.4; border: 2px solid #0a0a0a; background: #f5f5f5; white-space: pre-wrap; }
  .msg.user .msg-bubble { background: #ffd70022; border-color: #ffd700; }
  .msg.assistant .msg-bubble { background: #39ff1422; border-color: #39ff14; }
  .scroll-anchor { height: 1px; }
  .chat-input { display: flex; gap: 0.4rem; padding: 0.75rem; border-top: 3px solid #0a0a0a; }
  .input-field { flex: 1; border: 3px solid #0a0a0a; padding: 0.5rem; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 0.75rem; resize: none; outline: none; max-height: 80px; }
  .input-field:focus { background: #ffd70008; }
  .send-btn { width: 44px; height: 44px; border: 3px solid #0a0a0a; background: #0a0a0a; color: #fff; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .send-btn:hover { background: #ffd700; color: #0a0a0a; }
  .send-btn:disabled { opacity: 0.3; }
</style>
