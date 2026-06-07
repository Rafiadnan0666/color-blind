<script>
  import { scale } from 'svelte/transition';

  let { show = false, onClose } = $props();

  let step = $state(1);
  const totalSteps = 5;

  const steps = [
    {
      title: 'Welcome to ClrBlind!',
      icon: 'fa-hand-wave',
      desc: 'This quick tour shows you the key features. Let\'s get started!',
    },
    {
      title: 'Switch Detection Modes',
      icon: 'fa-grid-2',
      desc: 'Tap the mode button to switch between COCO, Currency, Drug, Traffic Light, Meat Freshness, and Mushroom Detection.',
    },
    {
      title: 'Meat Freshness Detection',
      icon: 'fa-drumstick-bite',
      desc: 'Use Meat mode to check if your meat is Fresh, Half-Fresh, or Spoiled. AI voice announces safety warnings.',
    },
    {
      title: 'Mushroom Detection',
      icon: 'fa-leaf',
      desc: 'Use Mushroom mode to identify poisonous mushrooms like Death Cap and Destroying Angels. AI voice provides alerts.',
    },
    {
      title: 'You\'re Ready!',
      icon: 'fa-rocket',
      desc: 'Upload an image or use your camera. Save results, check colors, and explore all features!',
    },
  ];

  function next() {
    if (step < totalSteps) step++;
    else finish();
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
  <div class="tour-backdrop" role="presentation" onclick={skip} onkeydown={(e) => { if (e.key === 'Escape') skip(); }}>
    <div class="tour-card" role="dialog" tabindex="-1" transition:scale={{ start: 0.9, duration: 200 }} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') skip(); }}>
      <div class="tour-dots">
        {#each Array(totalSteps) as _, i}
          <span class="tour-dot" class:active={i + 1 === step} class:done={i + 1 < step}></span>
        {/each}
      </div>
      <div class="tour-body">
        <div class="tour-icon" style="background: {step === 3 ? '#ff6b3522' : step === 4 ? '#8B451322' : '#ffd70022'}; border-color: {step === 3 ? '#ff6b35' : step === 4 ? '#8B4513' : '#ffd700'}">
          <i class="fas {steps[step - 1].icon}" style="color: {step === 3 ? '#ff6b35' : step === 4 ? '#8B4513' : '#ffd700'}"></i>
        </div>
        <h3 class="tour-title">{steps[step - 1].title}</h3>
        <p class="tour-desc">{steps[step - 1].desc}</p>
      </div>
      <div class="tour-actions">
        <button class="tour-skip" onclick={skip}>{step < totalSteps ? 'Skip' : ''}</button>
        <div class="tour-nav">
          {#if step > 1}
            <button class="tour-btn" onclick={prev}><i class="fas fa-chevron-left"></i></button>
          {/if}
          <button class="tour-next" onclick={next}>
            {step < totalSteps ? 'Next' : 'Start'}
            <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-backdrop { position: fixed; inset: 0; background: rgba(10,10,10,0.6); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .tour-card { width: 100%; max-width: 380px; background: #fefefe; border: 4px solid #0a0a0a; box-shadow: 8px 8px 0 #0a0a0a; padding: 1.5rem; }
  .tour-dots { display: flex; justify-content: center; gap: 0.4rem; margin-bottom: 1rem; }
  .tour-dot { width: 10px; height: 10px; border: 2px solid #0a0a0a; background: #e0e0e0; transition: all 0.2s; }
  .tour-dot.active { background: #ffd700; box-shadow: 2px 2px 0 #0a0a0a; transform: scale(1.2); }
  .tour-dot.done { background: #39ff14; }
  .tour-body { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 1.25rem; }
  .tour-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 3px solid; font-size: 1.4rem; margin-bottom: 0.75rem; }
  .tour-title { font: 700 1.1rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.4rem; }
  .tour-desc { font: 500 0.8rem/1.4 'Space Grotesk', system-ui, sans-serif; color: #666; }
  .tour-actions { display: flex; align-items: center; justify-content: space-between; border-top: 3px solid #0a0a0a; padding-top: 0.75rem; }
  .tour-nav { display: flex; align-items: center; gap: 0.35rem; }
  .tour-skip { border: none; background: none; font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #888; cursor: pointer; padding: 0.3rem 0.5rem; transition: all 0.15s; min-width: 50px; }
  .tour-skip:hover { color: #0a0a0a; }
  .tour-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 3px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; transition: all 0.15s; box-shadow: 2px 2px 0 #0a0a0a; }
  .tour-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .tour-next { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border: 3px solid #0a0a0a; background: #ffd700; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; transition: all 0.15s; box-shadow: 3px 3px 0 #0a0a0a; }
  .tour-next:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 #0a0a0a; }
</style>
