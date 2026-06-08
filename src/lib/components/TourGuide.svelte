<script>
  import { scale } from 'svelte/transition';
  import { tick } from 'svelte';

  let { show = false, onClose = () => {} } = $props();

  let step = $state(1);
  let highlightEl = $state(null);
  let highlightRect = $state(null);
  let backdropDone = $state(false);
  const totalSteps = 3;

  const steps = [
    {
      title: 'Welcome to ClrBlind!',
      icon: 'fa-hand-wave',
      color: '#ffd700',
      desc: 'Your AI-powered color blindness detection companion. This tour will walk you through the key features!',
      selector: null,
      placement: 'center',
    },
    {
      title: 'Object Detection',
      icon: 'fa-globe',
      color: '#00e5ff',
      desc: 'COCO-SSD model detects 90 classes of common objects. Point your camera or upload an image to start.',
      selector: null,
      placement: 'center',
    },
    {
      title: 'You\'re Ready!',
      icon: 'fa-rocket',
      color: '#39ff14',
      desc: 'Upload an image or use your camera. Save results, check colors, and explore all features. Let\'s go!',
      selector: null,
      placement: 'center',
    },
  ];

  function getStep() { return steps[step - 1]; }

  $effect(() => {
    if (show) {
      backdropDone = false;
      step = 1;
      requestAnimationFrame(() => backdropDone = true);
    }
  });

  $effect(() => {
    if (!show) return;
    tick().then(() => locateHighlight());
  });

  function locateHighlight() {
    const s = getStep();
    if (!s.selector) { highlightEl = null; highlightRect = null; return; }
    try {
      const el = document.querySelector(s.selector);
      if (el) {
        highlightEl = el;
        highlightRect = el.getBoundingClientRect();
      } else {
        highlightEl = null; highlightRect = null;
      }
    } catch (_) { highlightEl = null; highlightRect = null; }
  }

  function next() {
    if (step < totalSteps) { step++; } else { finish(); }
  }

  function prev() {
    if (step > 1) step--;
  }

  function finish() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clrblind_tour_completed', 'true');
    }
    onClose();
  }

  function skip() { finish(); }
</script>

{#if show}
  <div class="tour-overlay" role="presentation" class:ready={backdropDone} onclick={skip} onkeydown={(e) => { if (e.key === 'Escape') skip(); }}>
    {#if highlightRect && backdropDone}
      <div class="tour-highlight" style="left: {highlightRect.left - 6}px; top: {highlightRect.top - 6}px; width: {highlightRect.width + 12}px; height: {highlightRect.height + 12}px;"></div>
    {/if}

    <div class="tour-card" role="dialog" tabindex="-1" class:show={backdropDone} transition:scale={{ start: 0.85, duration: 250 }} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') skip(); }}>
      <div class="tour-step-indicator">
        <span class="tour-step-text">Step {step} of {totalSteps}</span>
        <div class="tour-dots">
          {#each Array(totalSteps) as _, i}
            <span class="tour-dot" class:active={i + 1 === step} class:done={i + 1 < step} style="--dot-color: {steps[i].color};"></span>
          {/each}
        </div>
      </div>

      <div class="tour-body">
        <div class="tour-icon" style="background: {getStep().color}22; border-color: {getStep().color};">
          <i class="fas {getStep().icon}" style="color: {getStep().color}"></i>
        </div>
        <h3 class="tour-title" style="color: {getStep().color};">
          <span class="tour-title-badge" style="background: {getStep().color};"></span>
          {getStep().title}
        </h3>
        <p class="tour-desc">{getStep().desc}</p>
      </div>

      <div class="tour-actions">
        <button class="tour-skip" onclick={skip}>{step < totalSteps ? 'Skip Tour' : ''}</button>
        <div class="tour-nav">
          {#if step > 1}
            <button class="tour-btn" onclick={prev}><i class="fas fa-chevron-left"></i></button>
          {/if}
          <button class="tour-next" style="background: {getStep().color};" onclick={next}>
            {step < totalSteps ? 'Next' : 'Start'}
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(10,10,10,0); transition: background 0.3s; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .tour-overlay.ready { background: rgba(10,10,10,0.65); }

  .tour-highlight { position: fixed; z-index: 1000; border: 3px solid #ffd700; border-radius: 2px; box-shadow: 0 0 0 9999px rgba(10,10,10,0.65), 0 0 20px rgba(255,215,0,0.4); pointer-events: none; animation: pulseHighlight 1.5s ease-in-out infinite; }
  @keyframes pulseHighlight { 0%,100% { box-shadow: 0 0 0 9999px rgba(10,10,10,0.65), 0 0 20px rgba(255,215,0,0.4); } 50% { box-shadow: 0 0 0 9999px rgba(10,10,10,0.65), 0 0 30px rgba(255,215,0,0.6); } }

  .tour-card { width: 100%; max-width: 380px; background: #fefefe; border: 4px solid #0a0a0a; box-shadow: 10px 10px 0 #0a0a0a; padding: 1.5rem; position: relative; z-index: 1001; opacity: 0; transform: scale(0.9); }
  .tour-card.show { opacity: 1; transform: scale(1); }

  .tour-step-indicator { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .tour-step-text { font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
  .tour-dots { display: flex; gap: 0.35rem; }
  .tour-dot { width: 10px; height: 10px; border: 2px solid #0a0a0a; background: #e0e0e0; transition: all 0.25s; }
  .tour-dot.active { background: var(--dot-color, #ffd700); box-shadow: 2px 2px 0 #0a0a0a; transform: scale(1.25); }
  .tour-dot.done { background: var(--dot-color, #39ff14); opacity: 0.6; }

  .tour-body { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 1.25rem; }
  .tour-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border: 3px solid; font-size: 1.5rem; margin-bottom: 0.75rem; transition: all 0.3s; }
  .tour-title { font: 700 1.15rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
  .tour-title-badge { display: inline-block; width: 8px; height: 8px; transform: rotate(45deg); flex-shrink: 0; }
  .tour-desc { font: 500 0.8rem/1.5 'Space Grotesk', system-ui, sans-serif; color: #555; max-width: 300px; }

  .tour-actions { display: flex; align-items: center; justify-content: space-between; border-top: 3px solid #0a0a0a; padding-top: 0.75rem; }
  .tour-nav { display: flex; align-items: center; gap: 0.4rem; }
  .tour-skip { border: none; background: none; font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #999; cursor: pointer; padding: 0.3rem 0.5rem; transition: all 0.15s; }
  .tour-skip:hover { color: #0a0a0a; }
  .tour-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 3px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; transition: all 0.15s; box-shadow: 2px 2px 0 #0a0a0a; }
  .tour-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .tour-next { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border: 3px solid #0a0a0a; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #0a0a0a; cursor: pointer; transition: all 0.15s; box-shadow: 3px 3px 0 #0a0a0a; }
  .tour-next:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #0a0a0a; }
</style>
