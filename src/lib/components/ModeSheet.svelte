<script>
  import { fly, scale } from 'svelte/transition';

  let { show = false, current = 'fusion', onSelect, onClose } = $props();

  const modes = [
    { id: 'fusion', icon: 'fa-compress-alt', label: 'Fusion', desc: 'All engines combined' },
    { id: 'coco', icon: 'fa-globe', label: 'COCO', desc: 'General object detection' },
    { id: 'ssdlens', icon: 'fa-apple-alt', label: 'Objects', desc: 'General object detection' },
    { id: 'medicine', icon: 'fa-pills', label: 'Medicine', desc: 'Pill type detection' },
  ];

  function getEngineColor(modeId) {
    const colors = {
      fusion: '#ff3366',
      coco: '#00e5ff',
      ssdlens: '#39ff14',
      medicine: '#ff6b35',
    };
    return colors[modeId] || '#ffd700';
  }
</script>

{#if show}
  <div
    class="backdrop"
    role="presentation"
    onclick={onClose}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div
      class="sheet"
      role="dialog"
      tabindex="-1"
      transition:fly={{ y: 300, duration: 250, easing: (t) => 1 - Math.pow(1 - t, 3) }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div class="handle"></div>
      <div class="header">
        <span class="font-brut text-brut-lg uppercase">Select Engine</span>
        <button class="close-btn" onclick={onClose} aria-label="Close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modes-grid">
        {#each modes as mode}
          <button
            class="mode-btn"
            class:active={current === mode.id}
            style="--mode-color: {getEngineColor(mode.id)}"
            onclick={() => { onSelect(mode.id); onClose(); }}
          >
            <div class="mode-icon" style="background: {getEngineColor(mode.id)}22; border-color: {getEngineColor(mode.id)}">
              <i class="fas {mode.icon}" style="color: {getEngineColor(mode.id)}"></i>
            </div>
            <div class="mode-label">{mode.label}</div>
            <div class="mode-desc">{mode.desc}</div>
            {#if current === mode.id}
              <div class="check" style="background: {getEngineColor(mode.id)}">
                <i class="fas fa-check"></i>
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.5);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .sheet {
    width: 100%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    background: #fefefe;
    border: 4px solid #0a0a0a;
    border-bottom: none;
    border-radius: 16px 16px 0 0;
    padding: 0.75rem;
    box-shadow: 0 -8px 0 #0a0a0a;
  }

  .handle {
    width: 40px;
    height: 5px;
    background: #ccc;
    border-radius: 3px;
    margin: 0 auto 0.75rem;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #0a0a0a;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid #0a0a0a;
    background: #fefefe;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.15s;
  }
  .close-btn:hover {
    background: #ff0033;
    color: #fff;
  }

  .modes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    border: 3px solid #0a0a0a;
    background: #fefefe;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    box-shadow: 3px 3px 0 #0a0a0a;
  }
  .mode-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 #0a0a0a;
  }
  .mode-btn:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #0a0a0a;
  }
  .mode-btn.active {
    box-shadow: 4px 4px 0 var(--mode-color);
  }

  .mode-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid;
    font-size: 1.2rem;
    transition: transform 0.2s;
  }
  .mode-btn:hover .mode-icon {
    transform: scale(1.1) rotate(-5deg);
  }

  .mode-label {
    font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mode-desc {
    font-size: 0.6rem;
    color: #888;
    text-align: center;
    line-height: 1.2;
  }

  .check {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #0a0a0a;
    font-size: 0.65rem;
    color: #0a0a0a;
  }
</style>
