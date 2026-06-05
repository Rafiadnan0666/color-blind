<script>
  import { notifications } from '$lib/supabase/db';
  import { session, isAuthLoading } from '$lib/stores/auth';
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';

  let items = $state([]);
  let loading = $state(true);
  let isGuest = $state(true);

  $effect(() => {
    isGuest = !$session;
    if (!$isAuthLoading && $session !== undefined) load();
  });

  async function load() {
    loading = true;
    try {
      items = await notifications.list();
    } catch (e) {
      if (e?.message === 'auth_required') { items = []; }
      else { console.warn('Could not load notifications:', e); items = []; }
    }
    loading = false;
  }

  async function markRead(id) {
    try {
      await notifications.markRead(id);
      items = items.map(i => i.id === id ? { ...i, isread: true } : i);
    } catch (e) {
      console.warn('Could not mark read:', e);
    }
  }

  async function markAllRead() {
    try {
      await notifications.markAllRead();
      items = items.map(i => ({ ...i, isread: true }));
    } catch (e) {
      console.warn('Could not mark all read:', e);
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

  function getTypeIcon(type) {
    const icons = {
      scan_complete: 'fa-camera',
      color_saved: 'fa-palette',
      favorite_reminder: 'fa-heart',
      welcome: 'fa-hand-wave',
      tip: 'fa-lightbulb',
    };
    return icons[type] || 'fa-bell';
  }
</script>

<div class="notif-panel">
  <div class="panel-header">
    <div class="font-brut text-brut-lg uppercase">
      <i class="fas fa-bell mr-2 text-neo-pink"></i> Notifications
    </div>
    <div class="flex gap-1">
      {#if !isGuest && items.some(i => !i.isread)}
        <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={markAllRead}>
          <i class="fas fa-check-double mr-1"></i> Mark All Read
        </button>
      {/if}
      {#if !isGuest}
        <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={load} aria-label="Refresh">
          <i class="fas fa-rotate"></i>
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center gap-3 py-12">
      <div class="brut-spinner w-6 h-6"></div>
      <span class="font-brut text-brut-sm">Loading...</span>
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <div class="text-3xl opacity-30 mb-2"><i class="fas fa-bell"></i></div>
      {#if isGuest}
        <div class="font-brut text-brut-sm uppercase">Sign in for notifications</div>
        <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => goto('/auth/login')}>
          <i class="fas fa-right-to-bracket mr-1"></i> Sign In
        </button>
      {:else}
        <div class="font-brut text-brut-sm uppercase">All clear</div>
        <div class="text-brut-xs text-neo-darkgray">No notifications yet.</div>
      {/if}
    </div>
  {:else}
    <div class="items-list">
      {#each items as item (item.id)}
        <div
          class="notif-item"
          class:unread={!item.isread}
          role="button"
          tabindex="0"
          onclick={() => markRead(item.id)}
          onkeydown={(e) => { if (e.key === 'Enter') markRead(item.id); }}
          transition:fly={{ y: 10, duration: 200 }}
        >
          <div class="notif-icon" class:unread-icon={!item.isread}>
            <i class="fas {getTypeIcon(item.type)}"></i>
          </div>
          <div class="notif-body">
            <div class="font-brut text-brut-xs uppercase">{item.title}</div>
            <div class="text-brut-xs text-neo-darkgray">{item.message}</div>
          </div>
          <div class="notif-time text-brut-xs">{formatDate(item.createdat)}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .notif-panel {
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

  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .notif-item:hover {
    border-color: #0a0a0a;
    background: #ffd70008;
  }
  .notif-item.unread {
    background: #ffd70010;
    border-color: #ffd700;
  }

  .notif-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #0a0a0a;
    background: #fefefe;
    flex-shrink: 0;
    font-size: 0.8rem;
  }
  .notif-icon.unread-icon {
    background: #ffd700;
  }

  .notif-body {
    flex: 1;
    min-width: 0;
  }

  .notif-time {
    white-space: nowrap;
    color: #888;
    flex-shrink: 0;
  }
</style>
