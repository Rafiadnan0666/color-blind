<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { ocrHistory } from '$lib/supabase/db';
  import { session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let imageSrc = $state(null);
  let extractedText = $state('');
  let detectedLanguage = $state('');
  let loading = $state(false);
  let history = $state([]);
  let historyLoading = $state(true);
  let showResult = $state(false);
  let errorMsg = $state('');
  let saved = $state(false);
  let copying = $state(false);
  let ocrProgress = $state(0);
  let selectedLang = $state('eng');
  let ocrWorker = $state(null);

  const LANGUAGES = [
    { value: 'eng', label: 'English' },
    { value: 'spa', label: 'Spanish' },
    { value: 'fra', label: 'French' },
    { value: 'deu', label: 'German' },
    { value: 'ita', label: 'Italian' },
    { value: 'por', label: 'Portuguese' },
    { value: 'nld', label: 'Dutch' },
    { value: 'pol', label: 'Polish' },
    { value: 'rus', label: 'Russian' },
    { value: 'ara', label: 'Arabic' },
    { value: 'jpn', label: 'Japanese' },
    { value: 'kor', label: 'Korean' },
    { value: 'chi_sim', label: 'Chinese (Simplified)' },
    { value: 'chi_tra', label: 'Chinese (Traditional)' },
  ];

  onMount(() => {
    loadHistory();
    return () => {
      if (ocrWorker) {
        try { ocrWorker.terminate(); } catch (_) {}
        ocrWorker = null;
      }
    };
  });

  async function getWorker() {
    if (ocrWorker) {
      try { await ocrWorker.setLanguage(selectedLang); } catch (_) {}
      return ocrWorker;
    }
    try {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(selectedLang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') ocrProgress = Math.round((m.progress || 0) * 100);
          else if (m.status === 'loading tesseract core') ocrProgress = 5;
          else if (m.status === 'initializing tesseract') ocrProgress = 10;
          else if (m.status === 'loading language traineddata') ocrProgress = 20;
          else if (m.status === 'initializing api') ocrProgress = 30;
        }
      });
      ocrWorker = worker;
      return worker;
    } catch (e) {
      console.error('[OCR] Worker creation failed:', e);
      throw e;
    }
  }

  async function loadHistory() {
    historyLoading = true;
    try {
      history = await ocrHistory.list(20);
    } catch (_) { history = []; }
    historyLoading = false;
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { errorMsg = 'Image too large — max 20MB'; return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { errorMsg = 'Unsupported file type'; return; }
    errorMsg = ''; extractedText = ''; showResult = false; saved = false; detectedLanguage = ''; ocrProgress = 0;
    const r = new FileReader();
    r.onload = (ev) => { imageSrc = ev.target?.result; };
    r.readAsDataURL(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      if (f.size > 20 * 1024 * 1024) { errorMsg = 'Image too large — max 20MB'; return; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { errorMsg = 'Unsupported file type'; return; }
      errorMsg = ''; extractedText = ''; showResult = false; saved = false; detectedLanguage = ''; ocrProgress = 0;
      const r = new FileReader();
      r.onload = (ev) => { imageSrc = ev.target?.result; };
      r.readAsDataURL(f);
    }
  }

  async function runOCR() {
    if (!imageSrc || loading) return;
    loading = true; errorMsg = ''; ocrProgress = 0;
    try {
      const worker = await getWorker();
      if (ocrWorker && typeof ocrWorker.setLanguage === 'function') {
        try { await ocrWorker.setLanguage(selectedLang); } catch (_) {
          try { await ocrWorker.terminate(); } catch (_2) {}
          ocrWorker = null;
          const Tesseract = await import('tesseract.js');
          const newWorker = await Tesseract.createWorker(selectedLang, 1, {
            logger: m => {
              if (m.status === 'recognizing text') ocrProgress = Math.round((m.progress || 0) * 100);
              else if (m.status === 'loading tesseract core') ocrProgress = 5;
              else if (m.status === 'initializing tesseract') ocrProgress = 10;
              else if (m.status === 'loading language traineddata') ocrProgress = 20;
              else if (m.status === 'initializing api') ocrProgress = 30;
            }
          });
          ocrWorker = newWorker;
        }
      }
      const { data } = await worker.recognize(imageSrc);
      extractedText = data.text;
      detectedLanguage = (data.languages && data.languages.length > 0) ? data.languages[0] : selectedLang;
      showResult = true;
      ocrProgress = 100;
      if (extractedText.trim()) {
        try { await ocrHistory.create({ extractedText: extractedText.trim(), language: detectedLanguage }); saved = true; } catch (_) {}
        loadHistory();
      }
    } catch (e) {
      errorMsg = 'OCR failed: ' + (e?.message || 'Unknown error');
      console.error('[OCR]', e);
    }
    loading = false;
  }

  async function copyText() {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      copying = true;
      setTimeout(() => copying = false, 1500);
    } catch (_) {}
  }

  async function removeHistory(id) {
    try { await ocrHistory.delete(id); history = history.filter(i => i.id !== id); } catch (_) {}
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (!f) continue;
        if (f.size > 20 * 1024 * 1024) { errorMsg = 'Image too large'; return; }
        errorMsg = ''; extractedText = ''; showResult = false; saved = false; ocrProgress = 0;
        const r = new FileReader();
        r.onload = (ev) => { imageSrc = ev.target?.result; };
        r.readAsDataURL(f);
        break;
      }
    }
  }
</script>

<svelte:window onpaste={handlePaste} />

<div class="ocr-page">
  <div class="brut-card">
    <div class="panel-head">
      <span class="font-brut text-brut-lg uppercase"><i class="fas fa-file-lines mr-2 text-neo-pink"></i> OCR Scanner</span>
    </div>
    <p class="font-brut text-brut-xs text-neo-darkgray mb-2">Extract text from images using optical character recognition</p>

    <div class="lang-row mb-2">
      <span class="font-brut text-brut-xs uppercase">Language</span>
      <select class="brut-input text-brut-xs" bind:value={selectedLang}>
        {#each LANGUAGES as lang}
          <option value={lang.value}>{lang.label}</option>
        {/each}
      </select>
    </div>

    <div
      class="upload-zone"
      class:has-image={!!imageSrc}
      ondragover={(e) => e.preventDefault()}
      ondrop={handleDrop}
      role="button"
      tabindex="0"
      onclick={() => document.getElementById('ocr-file-input').click()}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('ocr-file-input').click(); }}
    >
      {#if imageSrc}
        <img src={imageSrc} alt="Uploaded" class="preview-img">
      {:else}
        <div class="text-center">
          <div class="text-4xl opacity-30 mb-2"><i class="fas fa-file-image"></i></div>
          <div class="font-brut text-brut-sm uppercase">Drop an image or click to browse</div>
          <div class="text-brut-xs text-neo-darkgray mt-1">Or paste from clipboard</div>
        </div>
      {/if}
      <input id="ocr-file-input" type="file" accept="image/*" onchange={handleFile} hidden>
    </div>

    {#if errorMsg}
      <div class="error-msg"><i class="fas fa-exclamation-circle mr-1"></i>{errorMsg}</div>
    {/if}

    {#if imageSrc}
      <button class="brut-btn-primary w-full mt-3 text-brut-sm py-3" onclick={runOCR} disabled={loading}>
        {#if loading}
          <i class="fas fa-spinner fa-spin mr-2"></i> Processing... {ocrProgress}%
        {:else}
          <i class="fas fa-eye mr-2"></i> Extract Text
        {/if}
      </button>
    {/if}

    {#if loading}
      <div class="progress-track mt-2">
        <div class="progress-fill" style="width: {ocrProgress}%"></div>
      </div>
    {/if}

    {#if showResult}
      <div class="result-box" transition:fly={{ y: 10, duration: 200 }}>
        <div class="result-header">
          <span class="font-brut text-brut-xs uppercase">
            <i class="fas fa-text mr-1 text-neo-green"></i> Extracted Text
            {#if detectedLanguage}
              <span class="lang-badge">{detectedLanguage}</span>
            {/if}
          </span>
          <div class="flex gap-1">
            <button class="icon-btn" onclick={copyText} aria-label="Copy">
              <i class="fas {copying ? 'fa-check' : 'fa-copy'}"></i>
            </button>
            {#if saved}
              <span class="saved-badge"><i class="fas fa-check mr-1"></i>Saved</span>
            {/if}
          </div>
        </div>
        <pre class="ocr-text">{extractedText || '(No text detected)'}</pre>
      </div>
    {/if}
  </div>

  <div class="brut-card">
    <div class="panel-head">
      <span class="font-brut text-brut-sm uppercase"><i class="fas fa-clock-rotate mr-2 text-neo-pink"></i> History</span>
    </div>
    {#if historyLoading}
      <div class="flex items-center justify-center py-8">
        <div class="brut-spinner w-5 h-5"></div>
        <span class="font-brut text-brut-xs ml-2">Loading...</span>
      </div>
    {:else if history.length === 0}
      <div class="empty-state">
        <div class="text-2xl opacity-30 mb-1"><i class="fas fa-file-lines"></i></div>
        <div class="font-brut text-brut-xs uppercase">No OCR history</div>
      </div>
    {:else}
      <div class="history-list">
        {#each history as item (item.id)}
          <div class="history-item" transition:fly={{ y: 6, duration: 150 }}>
            <div class="history-text">{(item.extractedtext || '').slice(0, 120)}{#if (item.extractedtext || '').length > 120}...{/if}</div>
            <div class="history-meta">
              <span class="text-brut-xs text-neo-darkgray">{formatDate(item.createdat)}</span>
              {#if item.language}
                <span class="lang-pill">{item.language}</span>
              {/if}
              <button class="delete-btn" onclick={() => removeHistory(item.id)} aria-label="Delete"><i class="fas fa-trash-can"></i></button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .ocr-page { max-width: 600px; margin: 1rem auto; padding: 0 0.75rem 5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .lang-row { display: flex; align-items: center; gap: 0.5rem; }
  .upload-zone { border: 4px dashed #0a0a0a; padding: 1.5rem; cursor: pointer; text-align: center; transition: all 0.2s; min-height: 120px; display: flex; align-items: center; justify-content: center; }
  .upload-zone:hover { background: #ffd70008; border-color: #ffd700; }
  .upload-zone.has-image { border-style: solid; padding: 0; }
  .preview-img { max-height: 300px; width: 100%; object-fit: contain; }
  .error-msg { background: #ff0033; color: #fff; padding: 0.4rem 0.6rem; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; margin-top: 0.5rem; }
  .progress-track { width: 100%; height: 8px; border: 2px solid #0a0a0a; background: #e0e0e0; overflow: hidden; }
  .progress-fill { height: 100%; background: #ffd700; transition: width 0.3s ease; }
  .result-box { margin-top: 0.75rem; border: 3px solid #0a0a0a; background: #fefefe; box-shadow: 3px 3px 0 #0a0a0a; }
  .result-header { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; border-bottom: 2px solid #0a0a0a; }
  .lang-badge { font-size: 0.5rem; padding: 0.08rem 0.3rem; border: 1px solid #0a0a0a; background: #39ff14; margin-left: 0.3rem; vertical-align: middle; }
  .lang-pill { font-size: 0.5rem; padding: 0.05rem 0.25rem; border: 1px solid #0a0a0a; background: #00e5ff44; }
  .icon-btn { width: 28px; height: 28px; border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
  .icon-btn:hover { background: #ffd700; }
  .saved-badge { font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; padding: 0.15rem 0.4rem; background: #39ff14; border: 2px solid #0a0a0a; text-transform: uppercase; }
  .ocr-text { font-family: 'Space Grotesk', monospace; font-size: 0.75rem; padding: 0.75rem; margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto; background: #fafafa; }
  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; color: #888; }
  .history-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 300px; overflow-y: auto; }
  .history-item { padding: 0.5rem; border: 2px solid transparent; transition: all 0.15s; }
  .history-item:hover { border-color: #0a0a0a; }
  .history-text { font-size: 0.7rem; line-height: 1.3; margin-bottom: 0.2rem; }
  .history-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.35rem; }
  .delete-btn { border: none; background: none; cursor: pointer; color: #ff0033; opacity: 0.5; font-size: 0.75rem; padding: 2px; }
  .delete-btn:hover { opacity: 1; }
</style>
