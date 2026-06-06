<script>
  import { fly } from 'svelte/transition';
  import { savedObjects } from '$lib/supabase/db';
  import { session, isAuthLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let items = $state([]);
  let loading = $state(true);
  let isGuest = $state(true);
  let editId = $state(null);
  let editName = $state('');
  let editNotes = $state('');
  let detailItem = $state(null);

  function openDetail(item) { detailItem = item; }
  function closeDetail() { detailItem = null; }

  $effect(() => {
    isGuest = !$session;
    if (!$isAuthLoading && $session !== undefined) load();
  });

  async function load() {
    loading = true;
    try { items = await savedObjects.list(); } catch (_) { items = []; }
    loading = false;
  }

  async function remove(id) {
    try { await savedObjects.delete(id); items = items.filter(i => i.id !== id); } catch (_) {}
  }

  function startEdit(item) {
    editId = item.id;
    editName = item.objectname || '';
    editNotes = item.notes || '';
  }

  function cancelEdit() {
    editId = null;
    editName = '';
    editNotes = '';
  }

  function extractColorFromNotes(notes) {
    if (!notes) return null;
    const m = notes.match(/#[0-9a-fA-F]{6}/);
    return m ? m[0] : null;
  }

  function extractNameFromNotes(notes) {
    if (!notes) return null;
    const m = notes.match(/Color:\s*([^#]+)/);
    return m ? m[1].trim() : null;
  }

  async function saveEdit(item) {
    try {
      await savedObjects.update(item.id, { objectName: editName || item.objectname, notes: editNotes });
      if (editName) item.objectname = editName;
      item.notes = editNotes;
      editId = null;
      editName = '';
      editNotes = '';
    } catch (_) {}
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
          {@const colorHex = extractColorFromNotes(item.notes)}
          <div class="object-item" transition:fly={{ y: 6, duration: 150 }} onclick={() => openDetail(item)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') openDetail(item); }}>
            {#if colorHex}
              <div class="obj-swatch" style="background:{colorHex}"></div>
            {:else}
              <div class="obj-icon"><i class="fas fa-cube"></i></div>
            {/if}
            <div class="obj-info">
              {#if editId === item.id}
                <input type="text" class="edit-input" bind:value={editName} placeholder="Object name" onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item); if (e.key === 'Escape') cancelEdit(); }}>
                <textarea class="edit-textarea" bind:value={editNotes} placeholder="Notes" rows="2"></textarea>
                <div class="flex gap-1 mt-1">
                  <button class="edit-btn" onclick={() => saveEdit(item)} aria-label="Save"><i class="fas fa-check"></i></button>
                  <button class="edit-btn cancel" onclick={cancelEdit} aria-label="Cancel"><i class="fas fa-times"></i></button>
                </div>
              {:else}
                <div class="font-brut text-brut-sm capitalize">{item.objectname}</div>
                {#if item.notes}
                  <div class="text-brut-xs text-neo-darkgray">{item.notes}</div>
                {/if}
              {/if}
            </div>
            <div class="obj-meta">
              <span class="text-brut-2xs text-neo-darkgray">{new Date(item.createdat).toLocaleDateString()}</span>
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
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Object detail">
      <button class="modal-close" onclick={closeDetail}><i class="fas fa-times"></i></button>
      <div class="modal-body">
        <div class="flex items-center gap-2 mb-2">
          <div class="obj-icon-lg"><i class="fas fa-cube"></i></div>
          <div class="font-brut text-brut-sm uppercase flex-1">{detailItem.objectname}</div>
        </div>
        {#if detailItem.notes}
          <div class="modal-notes">{detailItem.notes}</div>
        {/if}
        {#if extractColorFromNotes(detailItem.notes)}
          {@const c = extractColorFromNotes(detailItem.notes)}
          <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Color</span>
            <div class="flex items-center gap-1.5">
              <span class="color-swatch-detail" style="background:{c}"></span>
              <span class="font-mono text-brut-sm">{c}</span>
            </div>
          </div>
        {/if}
        <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Mode</span><span class="text-brut-xs">{detailItem.mode || '—'}</span></div>
        {#if detailItem.confidence !== null && detailItem.confidence !== undefined}
          <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Confidence</span><span class="text-brut-xs">{(detailItem.confidence * 100).toFixed(0)}%</span></div>
        {/if}
        {#if detailItem.color}
          <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Color</span><span class="text-brut-xs">{detailItem.color}</span></div>
        {/if}
        <div class="modal-row"><span class="font-brut text-brut-xs uppercase">Created</span><span class="text-brut-xs">{new Date(detailItem.createdat).toLocaleDateString()}</span></div>
        <div class="flex gap-2 mt-3">
          <button class="brut-btn-primary text-brut-xs px-4 py-2 flex-1" onclick={closeDetail}><i class="fas fa-check mr-1"></i> OK</button>
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
  .objects-list { display: flex; flex-direction: column; gap: 0.25rem; }
  .object-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; border: 2px solid transparent; transition: all 0.15s; }
  .object-item:hover { border-color: #0a0a0a; background: #ffd70008; }
  .obj-icon { width: 36px; height: 36px; border: 3px solid #0a0a0a; background: #ffd70022; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .obj-swatch { width: 36px; height: 36px; border: 3px solid #0a0a0a; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
  .color-swatch-detail { width: 20px; height: 20px; border: 2px solid #0a0a0a; flex-shrink: 0; }
  .obj-info { flex: 1; min-width: 0; }
  .obj-meta { display: flex; align-items: center; gap: 0.5rem; }
  .delete-btn { border: none; background: none; cursor: pointer; color: #ff0033; opacity: 0.5; font-size: 0.75rem; padding: 4px; }
  .delete-btn:hover { opacity: 1; }
  .edit-btn { border: none; background: none; cursor: pointer; color: #0a0a0a; opacity: 0.4; font-size: 0.7rem; padding: 4px; }
  .edit-btn:hover { opacity: 1; }
  .edit-btn.cancel { color: #ff0033; }
  .edit-input { border: 2px solid #0a0a0a; padding: 2px 6px; font-size: 0.65rem; font-family: 'Space Grotesk',sans-serif; width: 100%; background: #fff; }
  .edit-textarea { border: 2px solid #0a0a0a; padding: 2px 6px; font-size: 0.6rem; font-family: 'Space Grotesk',sans-serif; width: 100%; resize: vertical; background: #fff; }
  .text-brut-2xs { font-size: 0.55rem; }
  .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-card { background: #fefefe; border: 3px solid #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; width: 100%; max-width: 360px; position: relative; }
  .modal-close { position: absolute; top: 6px; right: 6px; width: 30px; height: 30px; border: 2px solid #0a0a0a; background: #ff0033; color: #fff; cursor: pointer; font-size: 0.75rem; z-index: 1; display: flex; align-items: center; justify-content: center; }
  .modal-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .modal-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .modal-notes { padding: 0.4rem; border: 2px solid #0a0a0a; background: #f5f5f5; font-size: 0.7rem; line-height: 1.4; }
  .obj-icon-lg { width: 44px; height: 44px; border: 3px solid #0a0a0a; background: #ffd70022; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 1rem; }
  .brut-btn-danger { display: inline-flex; align-items: center; justify-content: center; background: #ff0033; color: #fff; border: 3px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a; font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; padding: 0.5rem 0.8rem; cursor: pointer; transition: all 0.15s; }
  .brut-btn-danger:hover { background: #ff3355; transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #0a0a0a; }
</style>
