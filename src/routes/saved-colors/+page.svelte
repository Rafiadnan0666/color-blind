<script>
  import { fly } from 'svelte/transition';
  import { savedColors } from '$lib/supabase/db';
  import { session, isAuthLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let items = $state([]);
  let loading = $state(true);
  let isGuest = $state(true);
  let editId = $state(null);
  let editName = $state('');
  let detailItem = $state(null);

  function openDetail(item) {
    detailItem = item;
  }
  function closeDetail() {
    detailItem = null;
  }

  $effect(() => {
    isGuest = !$session;
    if (!$isAuthLoading && $session !== undefined) load();
  });

  async function load() {
    loading = true;
    try { items = await savedColors.list(); } catch (_) { items = []; }
    loading = false;
  }

  async function remove(id) {
    try { await savedColors.delete(id); items = items.filter(i => i.id !== id); } catch (_) {}
  }

  function copyHex(hex) {
    if (!hex) return;
    navigator.clipboard.writeText(hex).catch(() => {});
  }

  function startEdit(item) {
    editId = item.id;
    editName = item.colorname || '';
  }

  function cancelEdit() {
    editId = null;
    editName = '';
  }

  async function saveEdit(item) {
    try {
      await savedColors.update(item.id, { colorName: editName || item.colorname });
      if (editName) { item.colorname = editName; }
      editId = null;
      editName = '';
    } catch (_) {}
  }
</script>

<div class="page-wrap">
  <div class="brut-card">
    <div class="panel-head">
      <span class="font-brut text-brut-lg uppercase"><i class="fas fa-palette mr-2 text-neo-pink"></i> Saved Colors</span>
      <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={load}><i class="fas fa-rotate mr-1"></i> Refresh</button>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12"><div class="brut-spinner w-5 h-5"></div><span class="font-brut text-brut-xs ml-2">Loading...</span></div>
    {:else if items.length === 0}
      <div class="empty-state">
        <div class="text-3xl opacity-30 mb-2"><i class="fas fa-palette"></i></div>
        {#if isGuest}
          <div class="font-brut text-brut-sm uppercase">Sign in to save colors</div>
          <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}><i class="fas fa-right-to-bracket mr-1"></i> Sign In</button>
        {:else}
          <div class="font-brut text-brut-sm uppercase">No saved colors</div>
          <div class="text-brut-xs text-neo-darkgray">Save colors from the scanner!</div>
          <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/detects')}><i class="fas fa-camera mr-1"></i> Start Scanning</button>
        {/if}
      </div>
    {:else}
      <div class="colors-grid">
        {#each items as item (item.id)}
          <div class="color-card" transition:fly={{ y: 8, duration: 150 }}>
            <div class="color-swatch" style="background:{item.hexcode || '#888'}" onclick={() => openDetail(item)} role="button" tabindex="0" aria-label="Open detail" onkeydown={(e) => { if (e.key === 'Enter') openDetail(item); }}></div>
            <div class="color-info">
              {#if editId === item.id}
                <input type="text" class="edit-input" bind:value={editName} placeholder="Color name" onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item); if (e.key === 'Escape') cancelEdit(); }}>
                <div class="flex gap-1 mt-1">
                  <button class="edit-btn" onclick={() => saveEdit(item)} aria-label="Save"><i class="fas fa-check"></i></button>
                  <button class="edit-btn cancel" onclick={cancelEdit} aria-label="Cancel"><i class="fas fa-times"></i></button>
                </div>
              {:else}
                <div class="font-brut text-brut-xs uppercase truncate">{item.colorname || 'Unknown'}</div>
                <div class="text-brut-xs text-neo-darkgray font-mono">{item.hexcode || ''}</div>
                {#if item.rgbvalue}
                  <div class="text-brut-2xs text-neo-darkgray">rgb({item.rgbvalue})</div>
                {/if}
              {/if}
            </div>
            <div class="flex flex-col gap-1">
              <button class="edit-btn" onclick={() => startEdit(item)} aria-label="Edit"><i class="fas fa-pen"></i></button>
              <button class="delete-btn" onclick={() => remove(item.id)} aria-label="Delete"><i class="fas fa-trash-can"></i></button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if detailItem}
  <div class="modal-overlay" onclick={closeDetail} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Color detail">
      <button class="modal-close" onclick={closeDetail}><i class="fas fa-times"></i></button>
      <div class="modal-swatch" style="background:{detailItem.hexcode || '#888'}"></div>
      <div class="modal-body">
        <div class="font-brut text-brut-sm uppercase">{detailItem.colorname || 'Unknown'}</div>
        <div class="modal-row"><span class="font-brut text-brut-xs uppercase">HEX</span><span class="font-mono text-brut-sm">{detailItem.hexcode || '-'}</span></div>
        {#if detailItem.rgbvalue}
          <div class="modal-row"><span class="font-brut text-brut-xs uppercase">RGB</span><span class="font-mono text-brut-sm">rgb({detailItem.rgbvalue})</span></div>
        {/if}
        <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Created</span><span class="text-brut-xs">{new Date(detailItem.createdat).toLocaleDateString()}</span></div>
        <div class="flex gap-2 mt-3">
          <button class="brut-btn-primary text-brut-xs px-4 py-2 flex-1" onclick={() => { navigator.clipboard.writeText(detailItem.hexcode || ''); closeDetail(); }}><i class="fas fa-copy mr-1"></i> Copy HEX</button>
          <button class="brut-btn-danger text-brut-xs px-3 py-2" onclick={() => { remove(detailItem.id); closeDetail(); }}><i class="fas fa-trash-can"></i></button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-wrap { max-width: 600px; margin: 1rem auto; padding: 0 0.75rem 5rem; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; text-align: center; }
  .colors-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .color-card { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 2px solid #0a0a0a; transition: all 0.15s; }
  .color-card:hover { background: #ffd70008; }
  .color-swatch { width: 40px; height: 40px; border: 2px solid #0a0a0a; flex-shrink: 0; cursor: pointer; }
  .color-info { flex: 1; min-width: 0; }
  .delete-btn { border: none; background: none; cursor: pointer; color: #ff0033; opacity: 0.5; font-size: 0.75rem; padding: 4px; }
  .delete-btn:hover { opacity: 1; }
  .edit-btn { border: none; background: none; cursor: pointer; color: #0a0a0a; opacity: 0.4; font-size: 0.7rem; padding: 4px; }
  .edit-btn:hover { opacity: 1; }
  .edit-btn.cancel { color: #ff0033; }
  .edit-input { border: 2px solid #0a0a0a; padding: 2px 6px; font-size: 0.65rem; font-family: 'Space Grotesk',sans-serif; width: 100%; text-transform: uppercase; background: #fff; }
  .text-brut-2xs { font-size: 0.55rem; }
  .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-card { background: #fefefe; border: 3px solid #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; width: 100%; max-width: 360px; position: relative; }
  .modal-close { position: absolute; top: 6px; right: 6px; width: 30px; height: 30px; border: 2px solid #0a0a0a; background: #ff0033; color: #fff; cursor: pointer; font-size: 0.75rem; z-index: 1; display: flex; align-items: center; justify-content: center; }
  .modal-swatch { height: 120px; border-bottom: 3px solid #0a0a0a; }
  .modal-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .modal-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .brut-btn-danger { display: inline-flex; align-items: center; justify-content: center; background: #ff0033; color: #fff; border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a; font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; padding: 0.5rem 0.8rem; cursor: pointer; transition: all 0.15s; }
  .brut-btn-danger:hover { background: #ff3355; transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #0a0a0a; }
</style>
