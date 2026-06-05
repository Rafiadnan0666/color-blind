<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { ocrHistory } from '$lib/supabase/db';
  import { session, isAuthLoading } from '$lib/stores/auth';

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
  let processingQueue = $state(false);

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

  $effect(() => {
    if (!$isAuthLoading) loadHistory();
  });

  onMount(() => {
    return () => {
      if (ocrWorker) {
        try { ocrWorker.terminate(); } catch (_) {}
        ocrWorker = null;
      }
    };
  });

  async function getWorker() {
    if (ocrWorker) {
      try { 
        if (ocrWorker.getLanguage() !== selectedLang) {
          await ocrWorker.reinitialize(selectedLang);
        }
      } catch (_) {}
      return ocrWorker;
    }
    try {
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker(selectedLang, undefined, {
        logger: m => {
          if (m.status === 'recognizing text') {
            ocrProgress = Math.min(95, Math.round((m.progress || 0) * 100));
          } else if (m.status === 'loading tesseract core') {
            ocrProgress = 5;
          } else if (m.status === 'initializing tesseract') {
            ocrProgress = 10;
          } else if (m.status === 'loading language traineddata') {
            ocrProgress = 20;
          } else if (m.status === 'initializing api') {
            ocrProgress = 30;
          }
        }
      });
      ocrWorker = worker;
      return worker;
    } catch (e) {
      console.error('[OCR] Worker creation failed:', e);
      errorMsg = 'OCR engine failed to load. Check your internet connection.';
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
    processImageFile(f);
  }

  async function processImageFile(f) {
    if (processingQueue) {
      errorMsg = 'Please wait, processing previous image...';
      setTimeout(() => { if (errorMsg === 'Please wait, processing previous image...') errorMsg = ''; }, 2000);
      return;
    }
    
    if (f.size > 20 * 1024 * 1024) { 
      errorMsg = 'Image too large — max 20MB';
      return; 
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(f.type)) { 
      errorMsg = 'Unsupported file type. Use JPEG, PNG, WebP, or BMP.';
      return; 
    }
    
    processingQueue = true;
    errorMsg = '';
    extractedText = '';
    showResult = false;
    saved = false;
    detectedLanguage = '';
    ocrProgress = 0;
    
    const r = new FileReader();
    r.onload = (ev) => { 
      imageSrc = ev.target?.result;
      processingQueue = false;
    };
    r.onerror = () => {
      errorMsg = 'Failed to read file';
      processingQueue = false;
    };
    r.readAsDataURL(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      processImageFile(f);
    }
  }

  async function runOCR() {
    if (!imageSrc || loading) return;
    
    loading = true;
    errorMsg = '';
    ocrProgress = 0;
    extractedText = '';
    showResult = false;
    
    try {
      const worker = await getWorker();
      
      const { data } = await worker.recognize(imageSrc, {
        tessedit_char_whitelist: null,
        tessedit_pageseg_mode: 6,
      });
      
      extractedText = data.text.trim() || '(No text detected)';
      detectedLanguage = (data.languages && data.languages.length > 0) ? data.languages[0] : selectedLang;
      showResult = true;
      ocrProgress = 100;
      
      if (extractedText && extractedText !== '(No text detected)') {
        try { 
          await ocrHistory.create({ 
            extractedText: extractedText.slice(0, 500), 
            language: detectedLanguage 
          }); 
          saved = true;
          await loadHistory();
        } catch (_) {}
      }
    } catch (e) {
      errorMsg = 'OCR failed: ' + (e?.message || 'Unknown error');
      console.error('[OCR]', e);
    } finally {
      loading = false;
    }
  }

  async function copyText() {
    if (!extractedText || extractedText === '(No text detected)') return;
    try {
      await navigator.clipboard.writeText(extractedText);
      copying = true;
      setTimeout(() => copying = false, 1500);
    } catch (_) {}
  }

  async function removeHistory(id) {
    try { 
      await ocrHistory.delete(id); 
      history = history.filter(i => i.id !== id); 
    } catch (_) {}
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
        processImageFile(f);
        break;
      }
    }
  }
  
  function clearImage() {
    imageSrc = null;
    extractedText = '';
    showResult = false;
    saved = false;
    detectedLanguage = '';
    ocrProgress = 0;
    errorMsg = '';
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
      <select class="brut-input text-brut-xs" bind:value={selectedLang} disabled={loading}>
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
      onclick={() => !loading && document.getElementById('ocr-file-input').click()}
      onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !loading) document.getElementById('ocr-file-input').click(); }}
    >
      {#if imageSrc}
        <div class="preview-container">
          <img src={imageSrc} alt="Uploaded" class="preview-img">
          {#if !loading}
            <button class="clear-btn" onclick={(e) => { e.stopPropagation(); clearImage(); }} aria-label="Clear image">
              <i class="fas fa-times"></i>
            </button>
          {/if}
        </div>
      {:else}
        <div class="text-center">
          <div class="text-4xl opacity-30 mb-2"><i class="fas fa-file-image"></i></div>
          <div class="font-brut text-brut-sm uppercase">Drop an image or click to browse</div>
          <div class="text-brut-xs text-neo-darkgray mt-1">Or paste from clipboard (Ctrl+V)</div>
        </div>
      {/if}
      <input id="ocr-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff" onchange={handleFile} hidden disabled={loading}>
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
      <div class="progress-status text-brut-xs text-neo-darkgray mt-1">
        {#if ocrProgress < 30}
          Loading OCR engine...
        {:else if ocrProgress < 50}
          Processing image...
        {:else}
          Recognizing text...
        {/if}
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
            {#if extractedText && extractedText !== '(No text detected)'}
              <button class="icon-btn" onclick={copyText} aria-label="Copy" disabled={copying}>
                <i class="fas {copying ? 'fa-check' : 'fa-copy'}"></i>
              </button>
            {/if}
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
      <span class="font-brut text-brut-sm uppercase"><i class="fas fa-history mr-2 text-neo-pink"></i> History</span>
      <span class="text-brut-xs text-neo-darkgray">{history.length} items</span>
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
        <div class="text-brut-xs text-neo-darkgray mt-1">Extract text from an image to see it here</div>
      </div>
    {:else}
      <div class="history-list">
        {#each history as item (item.id)}
          <div class="history-item" transition:fly={{ y: 6, duration: 150 }}>
            <div class="history-text">{(item.extractedtext || '').slice(0, 100)}{#if (item.extractedtext || '').length > 100}...{/if}</div>
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
  .upload-zone { border: 4px dashed #0a0a0a; padding: 1.5rem; cursor: pointer; text-align: center; transition: all 0.2s; min-height: 160px; display: flex; align-items: center; justify-content: center; }
  .upload-zone:hover { background: #ffd70008; border-color: #ffd700; }
  .upload-zone.has-image { border-style: solid; padding: 0; }
  .preview-container { position: relative; width: 100%; display: flex; justify-content: center; }
  .preview-img { max-height: 300px; width: auto; max-width: 100%; object-fit: contain; }
  .clear-btn {
    position: absolute; top: 8px; right: 8px;
    width: 32px; height: 32px; border-radius: 50%;
    background: #ff0033; color: white; border: 2px solid #0a0a0a;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .clear-btn:hover { transform: scale(1.1); background: #0a0a0a; }
  .error-msg { background: #ff0033; color: #fff; padding: 0.5rem 0.75rem; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; margin-top: 0.5rem; border: 2px solid #0a0a0a; }
  .progress-track { width: 100%; height: 8px; border: 2px solid #0a0a0a; background: #e0e0e0; overflow: hidden; }
  .progress-fill { height: 100%; background: #ffd700; transition: width 0.3s ease; }
  .progress-status { text-align: center; }
  .result-box { margin-top: 0.75rem; border: 3px solid #0a0a0a; background: #fefefe; box-shadow: 3px 3px 0 #0a0a0a; overflow: hidden; }
  .result-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.6rem; border-bottom: 2px solid #0a0a0a; background: #fafafa; }
  .lang-badge { font-size: 0.5rem; padding: 0.08rem 0.3rem; border: 1px solid #0a0a0a; background: #39ff14; margin-left: 0.4rem; vertical-align: middle; }
  .lang-pill { font-size: 0.5rem; padding: 0.05rem 0.3rem; border: 1px solid #0a0a0a; background: #00e5ff44; }
  .icon-btn { width: 28px; height: 28px; border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .icon-btn:hover:not(:disabled) { background: #ffd700; transform: scale(1.05); }
  .icon-btn:disabled { opacity: 0.5; cursor: default; }
  .saved-badge { font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; padding: 0.15rem 0.5rem; background: #39ff14; border: 2px solid #0a0a0a; text-transform: uppercase; }
  .ocr-text { font-family: 'Space Grotesk', monospace; font-size: 0.75rem; padding: 0.75rem; margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 350px; overflow-y: auto; background: #fefefe; line-height: 1.4; }
  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; color: #888; text-align: center; }
  .history-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 300px; overflow-y: auto; }
  .history-item { padding: 0.6rem 0.5rem; border: 2px solid transparent; transition: all 0.15s; background: #fefefe; }
  .history-item:hover { border-color: #0a0a0a; background: #ffd70008; }
  .history-text { font-size: 0.7rem; line-height: 1.35; margin-bottom: 0.3rem; color: #0a0a0a; }
  .history-meta { display: flex; align-items: center; justify-content: space-between; gap: 0.35rem; }
  .delete-btn { border: none; background: none; cursor: pointer; color: #ff0033; opacity: 0.5; font-size: 0.7rem; padding: 4px; transition: all 0.15s; }
  .delete-btn:hover { opacity: 1; transform: scale(1.1); }
  
  .brut-input {
    padding: 0.4rem 0.6rem; border: 2px solid #0a0a0a; background: #fefefe;
    font: 400 0.7rem 'Space Grotesk', system-ui, sans-serif;
  }
  .brut-input:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .brut-card {
    border: 3px solid #0a0a0a; background: #fefefe; box-shadow: 4px 4px 0 #0a0a0a; padding: 0.75rem;
  }
  
  .brut-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    background: #ffd700; border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a;
    font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase;
    padding: 0.6rem 1.2rem; cursor: pointer; transition: all 0.15s;
  }
  .brut-btn-primary:hover:not(:disabled) { background: #ffea4d; transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #0a0a0a; }
  .brut-btn-primary:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #0a0a0a; }
  .brut-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .brut-spinner { border: 3px solid #e0e0e0; border-top: 3px solid #ffd700; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  
  .font-brut { font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 700; letter-spacing: 0.02em; }
  .text-brut-xs { font-size: 0.65rem; line-height: 1.3; }
  .text-brut-sm { font-size: 0.75rem; line-height: 1.3; }
  .text-brut-lg { font-size: 1rem; line-height: 1.3; }
  .text-neo-darkgray { color: #666; }
  .text-neo-pink { color: #ff0033; }
  .text-neo-green { color: #39ff14; }
  .uppercase { text-transform: uppercase; }
  .text-center { text-align: center; }
</style>