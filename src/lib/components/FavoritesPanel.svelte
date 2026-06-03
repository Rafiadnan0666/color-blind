<script>
  import { onMount } from 'svelte';
  import { favorites } from '$lib/supabase/db';
  import { session, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';

  let items = $state([]);
  let loading = $state(true);
  let isGuest = $state(true);

  $effect(() => {
    isGuest = !$session;
    if ($session !== undefined) load();
  });

  async function load() {
    loading = true;
    try {
      items = await favorites.list();
    } catch (e) {
      console.warn('Could not load favorites:', e);
      items = [];
    }
    loading = false;
  }

  async function remove(id) {
    try {
      await favorites.delete(id);
      items = items.filter(i => i.id !== id);
    } catch (e) {
      console.warn('Could not delete:', e);
    }
  }
</script>

<div class="favorites-panel">
  <div class="panel-header">
    <div class="font-brut text-brut-lg uppercase">
      <i class="fas fa-heart mr-2 text-neo-pink"></i> Favorites
    </div>
    <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={load}>
      <i class="fas fa-rotate mr-1"></i> Refresh
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center gap-3 py-12">
      <div class="brut-spinner w-6 h-6"></div>
      <span class="font-brut text-brut-sm">Loading...</span>
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <div class="text-3xl opacity-30 mb-2"><i class="fas fa-heart"></i></div>
      {#if isGuest}
        <div class="font-brut text-brut-sm uppercase">Sign in to save favorites</div>
        <div class="text-brut-xs text-neo-darkgray">Your favorite colors and objects will be saved to your account.</div>
        <button class="brut-btn-primary mt-4 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}>
          <i class="fas fa-right-to-bracket mr-1"></i> Sign In
        </button>
      {:else}
        <div class="font-brut text-brut-sm uppercase">No favorites yet</div>
        <div class="text-brut-xs text-neo-darkgray">Save your favorite detections here!</div>
        <button class="brut-btn-primary mt-4 text-brut-xs px-4 py-2" onclick={() => goto('/detects')}>
          <i class="fas fa-camera mr-1"></i> Start Detecting
        </button>
      {/if}
    </div>
  {:else}
    <div class="items-list">
      {#each items as item (item.id)}
        <div class="fav-item" transition:slide>
          <div class="fav-color" style="background: {item.value || '#888'}"></div>
          <div class="fav-info">
            <div class="font-brut text-brut-sm capitalize">{item.type}</div>
            {#if item.notes}
              <div class="text-brut-xs text-neo-darkgray truncate">{item.notes}</div>
            {/if}
          </div>
          <button class="fav-delete" onclick={() => remove(item.id)} aria-label="Remove">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .favorites-panel {
    padding: 1rem;
  }

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

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .fav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border: 2px solid transparent;
    transition: all 0.15s;
  }
  .fav-item:hover {
    border-color: #0a0a0a;
    background: #ffd70008;
  }

  .fav-color {
    width: 36px;
    height: 36px;
    border: 3px solid #0a0a0a;
    flex-shrink: 0;
  }

  .fav-info {
    flex: 1;
    min-width: 0;
  }

  .fav-delete {
    border: none;
    background: transparent;
    cursor: pointer;
    color: #ff0033;
    opacity: 0.5;
    font-size: 0.85rem;
    padding: 4px;
    transition: opacity 0.15s;
  }
  .fav-delete:hover { opacity: 1; }
</style>
