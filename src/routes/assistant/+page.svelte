<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { loadQnA, findAnswers } from '$lib/detection/qnaDetection';
  import { assistantHistory } from '$lib/supabase/db';
  import { session, isAuthLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let messages = $state([]);
  let input = $state('');
  let sending = $state(false);
  let loading = $state(true);
  let isGuest = $state(true);

  let lmSession = $state(null);
  let qnaReady = $state(false);
  let aiReady = $state(false);

  const appContext = 'ClrBlind is an app for color blindness detection and accessibility. Features: object detection (COCO-SSD, MobileNet), color detection (RGB/HSL analysis, color naming, CVD simulation), OCR text extraction (Tesseract.js), scene classification (TFJS model), AI assistant, scan history, saved colors, favorites. Color blindness types: protanopia (red-blind), deuteranopia (green-blind), tritanopia (blue-blind). WCAG contrast ratio minimum: 4.5:1.';

  const WELCOME = 'Hey! I\'m your ClrBlind AI assistant. I use real AI to answer questions about color blindness, object detection, color analysis, accessibility, and app features. Ask me anything!';

  $effect(() => {
    isGuest = !$session;
    if (!$isAuthLoading) load();
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
      messages.push({ role: 'assistant', text: WELCOME, ts: new Date().toISOString() });
    }
  }

  async function initAI() {
    try {
      const LM = /** @type {any} */ (self).LanguageModel;
      if (LM) {
        const opts = { expectedOutputs: [{ type: 'text', languages: ['en'] }] };
        const avail = await LM.availability(opts);
        if (avail !== 'unavailable') {
          try {
            lmSession = await LM.create({ ...opts, systemPrompt: 'You are a color blindness assistant. Answer concisely about color vision, accessibility, and the ClrBlind app.' });
            if (lmSession) { aiReady = true; return; }
          } catch (_) { lmSession = null; }
        }
      }
    } catch (_) {}
    try {
      await loadQnA();
      qnaReady = true;
      aiReady = true;
    } catch (_) { aiReady = false; }
  }

  onMount(async () => {
    await initAI();
  });

  async function getAIAnswer(question) {
    if (lmSession) {
      try { return await lmSession.prompt(question); } catch (_) {}
    }
    if (qnaReady) {
      try {
        const answers = await findAnswers(question, appContext);
        if (answers.length > 0 && answers[0].score > 0.01) return answers[0].text;
      } catch (_) {}
    }
    return 'I\'m processing your question. The AI model is loading. Please try again in a moment.';
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    input = '';
    sending = true;
    messages = [...messages, { role: 'user', text, ts: new Date().toISOString() }];
    const answer = await getAIAnswer(text);
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
