<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { session, user } from '$lib/stores/auth';

  let { unreadCount = 0 } = $props();

  const tabs = [
    { id: 'scan', path: '/detects', icon: 'fa-camera', label: 'Scan' },
    { id: 'history', path: '/history', icon: 'fa-clock-rotate', label: 'History' },
    { id: 'favorites', path: '/favorites', icon: 'fa-heart', label: 'Favorites' },
    { id: 'notifications', path: '/notifications', icon: 'fa-bell', label: 'Alerts', badge: () => unreadCount },
    { id: 'profile', path: '/profile', icon: 'fa-user', label: 'Profile' },
  ];

  function isActive(path) {
    return $page.url.pathname === path;
  }
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    <button
      class="nav-item"
      class:active={isActive(tab.path)}
      onclick={() => goto(tab.path)}
    >
      <span class="icon-wrap">
        <i class="fas {tab.icon}"></i>
        {#if tab.badge && tab.badge() > 0}
          <span class="badge">{tab.badge() > 9 ? '9+' : tab.badge()}</span>
        {/if}
      </span>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: #fefefe;
    border-top: 4px solid #0a0a0a;
    display: flex;
    align-items: stretch;
    z-index: 250;
    box-shadow: 0 -4px 0 #0a0a0a;
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 4px 0;
    transition: all 0.15s;
    border-top: 3px solid transparent;
    margin-top: -3px;
    position: relative;
    color: #888;
  }

  .nav-item.active {
    color: #0a0a0a;
    border-top-color: #ffd700;
    background: #ffd70010;
  }

  .nav-item:active {
    transform: scale(0.92);
  }

  .icon-wrap {
    position: relative;
    font-size: 1.2rem;
    line-height: 1;
  }

  .label {
    font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -10px;
    background: #ff0033;
    color: #fff;
    font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 2px solid #0a0a0a;
  }
</style>
