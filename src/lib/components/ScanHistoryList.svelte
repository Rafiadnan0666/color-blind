<script>
  import { onMount } from 'svelte';
  import { scanHistory } from '$lib/supabase/db';
  import { session, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';

  let items = $state([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let isGuest = $state(true);
  let totalCount = $state(0);
  let offset = $state(0);
  const PAGE = 20;

  $effect(() => {
    isGuest = !$session;
    if ($session !== undefined) load();
  });

  async function load() {
    loading = true;
    offset = 0;
    try {
      items = await scanHistory.list(PAGE, 0);
      totalCount = await scanHistory.count();
    } catch (e) {
      if (e?.message === 'auth_required') { items = []; totalCount = 0; }
      else { console.warn('Could not load scan history:', e); items = []; }
    }
    loading = false;
  }

  async function loadMore() {
    if (loadingMore) return;
    loadingMore = true;
    const newOffset = items.length;
    try {
      const next = await scanHistory.list(PAGE, newOffset);
      items = [...items, ...next];
      offset = newOffset;
    } catch (e) {
      console.warn('Could not load more:', e);
    }
    loadingMore = false;
  }

  async function remove(id) {
    try {
      await scanHistory.delete(id);
      items = items.filter(i => i.id !== id);
      totalCount = Math.max(0, totalCount - 1);
    } catch (e) {
      console.warn('Could not delete:', e);
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-ID', { day: 'numeric', month: 'short' });
  }

  function getModeIcon(mode) {
    const icons = { fusion: 'fa-compress-alt', coco: 'fa-globe', ssdlens: 'fa-apple-alt', traffic_light: 'fa-traffic-light', currency: 'fa-money-bill-wave', medicine: 'fa-pills', local_products: 'fa-shopping-basket', accessibility: 'fa-universal-access' };
    return icons[mode] || 'fa-cube';
  }
</script>

<div class="history-panel">
  <div class="panel-header">
    <div class="font-brut text-brut-lg uppercase">
      <i class="fas fa-clock-rotate mr-2 text-neo-pink"></i> Scan History
      {#if !isGuest && totalCount > 0}
        <span class="text-neo-darkgray text-brut-xs ml-2">({totalCount})</span>
      {/if}
    </div>
    {#if !isGuest}
      <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={load} aria-label="Refresh">
        <i class="fas fa-rotate mr-1"></i>
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center gap-3 py-12">
      <div class="brut-spinner w-6 h-6"></div>
      <span class="font-brut text-brut-sm">Loading...</span>
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <div class="text-3xl opacity-30 mb-2"><i class="fas fa-camera"></i></div>
      {#if isGuest}
        <div class="font-brut text-brut-sm uppercase">Sign in to save scans</div>
        <div class="text-brut-xs text-neo-darkgray">Your detection history is stored in the cloud.</div>
        <button class="brut-btn-primary mt-4 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}>
          <i class="fas fa-right-to-bracket mr-1"></i> Sign In
        </button>
      {:else}
        <div class="font-brut text-brut-sm uppercase">No scans yet</div>
        <div class="text-brut-xs text-neo-darkgray">Start detecting colors and objects!</div>
        <button class="brut-btn-primary mt-4 text-brut-xs px-4 py-2" onclick={() => goto('/detects')}>
          <i class="fas fa-camera mr-1"></i> Start Scanning
        </button>
      {/if}
    </div>
  {:else}
    <div class="items-list">
      {#each items as item (item.id)}
        <div class="history-item" transition:slide>
          <div class="item-icon">
            <i class="fas {getModeIcon(item.mode)}"></i>
          </div>
          <div class="item-info">
            <div class="item-engine font-brut text-brut-xs uppercase">{item.mode || 'unknown'}</div>
            <div class="item-meta text-brut-xs text-neo-darkgray">
              {item.objectname || 'Unknown object'}
              {#if item.confidence}
                · {(item.confidence * 100).toFixed(0)}%
              {/if}
            </div>
          </div>
          <div class="item-time text-brut-xs">{formatDate(item.createdat)}</div>
          <button class="item-delete" onclick={() => remove(item.id)} aria-label="Delete">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      {/each}
    </div>
    {#if items.length < totalCount}
      <button class="load-more" onclick={loadMore} disabled={loadingMore}>
        {loadingMore ? 'Loading...' : `Load More (${items.length}/${totalCount})`}
      </button>
    {/if}
  {/if}
</div>

<style>
  .history-panel { padding: 1rem; }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #0a0a0a;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .items-list { display: flex; flex-direction: column; gap: 0.35rem; }

  .history-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border: 2px solid transparent;
    transition: all 0.15s;
    cursor: pointer;
  }
  .history-item:hover { border-color: #0a0a0a; background: #ffd70008; }

  .item-icon {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    border: 3px solid #0a0a0a; background: #ffd70022;
    flex-shrink: 0; font-size: 0.85rem;
  }

  .item-info { flex: 1; min-width: 0; }
  .item-engine { text-transform: uppercase; letter-spacing: 0.05em; }

  .item-time {
    white-space: nowrap;
    font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif;
    color: #888;
  }

  .item-delete {
    border: none; background: transparent; cursor: pointer;
    color: #ff0033; opacity: 0.5; font-size: 0.85rem;
    padding: 4px; transition: opacity 0.15s;
  }
  .item-delete:hover { opacity: 1; }

  .load-more {
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.5rem;
    border: 3px solid #0a0a0a;
    background: #fefefe;
    font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
  }
  .load-more:hover { background: #ffd700; }
  .load-more:disabled { opacity: 0.5; cursor: default; }
</style>
