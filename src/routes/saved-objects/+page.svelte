<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { savedObjects } from '$lib/supabase/db';
  import { session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let items = $state([]);
  let loading = $state(true);
  let isGuest = $state(true);

  $effect(() => {
    isGuest = !$session;
    if ($session !== undefined) load();
  });

  async function load() {
    loading = true;
    try { items = await savedObjects.list(); } catch (_) { items = []; }
    loading = false;
  }

  async function remove(id) {
    try { await savedObjects.delete(id); items = items.filter(i => i.id !== id); } catch (_) {}
  }
</script>

<div class="page-wrap">
  <div class="brut-card">
    <div class="panel-head">
      <span class="font-brut text-brut-lg uppercase"><i class="fas fa-cube mr-2 text-neo-pink"></i> Saved Objects</span>
      <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={load}><i class="fas fa-rotate mr-1"></i> Refresh</button>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12"><div class="brut-spinner w-5 h-5"></div><span class="font-brut text-brut-xs ml-2">Loading...</span></div>
    {:else if items.length === 0}
      <div class="empty-state">
        <div class="text-3xl opacity-30 mb-2"><i class="fas fa-cube"></i></div>
        {#if isGuest}
          <div class="font-brut text-brut-sm uppercase">Sign in to save objects</div>
          <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}><i class="fas fa-right-to-bracket mr-1"></i> Sign In</button>
        {:else}
          <div class="font-brut text-brut-sm uppercase">No saved objects</div>
          <div class="text-brut-xs text-neo-darkgray">Save detected objects from the scanner!</div>
          <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/detects')}><i class="fas fa-camera mr-1"></i> Start Scanning</button>
        {/if}
      </div>
    {:else}
      <div class="objects-list">
        {#each items as item (item.id)}
          <div class="object-item" transition:fly={{ y: 6, duration: 150 }}>
            <div class="obj-icon"><i class="fas fa-cube"></i></div>
            <div class="obj-info">
              <div class="font-brut text-brut-sm capitalize">{item.objectname}</div>
              {#if item.notes}
                <div class="text-brut-xs text-neo-darkgray">{item.notes}</div>
              {/if}
            </div>
            <div class="obj-meta">
              <span class="text-brut-2xs text-neo-darkgray">{new Date(item.createdat).toLocaleDateString()}</span>
              <button class="delete-btn" onclick={() => remove(item.id)} aria-label="Delete"><i class="fas fa-trash-can"></i></button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .page-wrap { max-width: 600px; margin: 1rem auto; padding: 0 0.75rem 5rem; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; text-align: center; }
  .objects-list { display: flex; flex-direction: column; gap: 0.25rem; }
  .object-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; border: 2px solid transparent; transition: all 0.15s; }
  .object-item:hover { border-color: #0a0a0a; background: #ffd70008; }
  .obj-icon { width: 36px; height: 36px; border: 3px solid #0a0a0a; background: #ffd70022; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .obj-info { flex: 1; min-width: 0; }
  .obj-meta { display: flex; align-items: center; gap: 0.5rem; }
  .delete-btn { border: none; background: none; cursor: pointer; color: #ff0033; opacity: 0.5; font-size: 0.75rem; padding: 4px; }
  .delete-btn:hover { opacity: 1; }
  .text-brut-2xs { font-size: 0.55rem; }
</style>
