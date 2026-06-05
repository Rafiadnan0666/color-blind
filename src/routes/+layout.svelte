<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { session, user, isAuthLoading, initializeAuthStores } from '$lib/stores/auth';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { notifications, setUserId, userProfile, userSettings } from '$lib/supabase/db';
  import { onMount } from 'svelte';
  import { rawSettings, rawProfile, voiceEnabled, notifEnabled, theme, highContrast, avatarUrl, profileName } from '$lib/stores/settings';

  let { children, data } = $props();

  let navOpen = $state(false);
  let unreadCount = $state(0);
  let avatarError = $state(false);

  $effect(() => {
    if (data) {
      initializeAuthStores(data);
      if (data.user?.id) {
        setUserId(data.user.id);
      }
    }
  });

  $effect(() => {
    if ($user?.id) {
      setUserId($user.id);
      loadUnreadCount();
      userProfile.get().then(p => { rawProfile.set(p); }).catch(() => {});
      userSettings.get().then(s => {
        rawSettings.set(s);
      }).catch(() => {});
    }
  });

  $effect(() => {
    const t = $theme;
    const hc = $highContrast;
    if (typeof document !== 'undefined') {
      const cl = document.documentElement.classList;
      ['theme-light','theme-dark','theme-system','theme-high-contrast','high-contrast'].forEach(c => cl.remove(c));
      if (t === 'dark') cl.add('theme-dark');
      else if (t === 'light') cl.add('theme-light');
      else if (t === 'high-contrast') { cl.add('theme-high-contrast'); cl.add('high-contrast'); }
      else cl.add('theme-system');
      if (hc) cl.add('high-contrast');
    }
  });

  async function loadUnreadCount() {
    try {
      unreadCount = await notifications.getUnreadCount();
    } catch (_) {}
  }

  async function handleSignOut() {
    goto('/auth/logout');
  }

  function isActive(path) {
    return $page.url.pathname === path;
  }
</script>

<div class="min-h-screen flex flex-col">
  <header class="border-b-brut border-neo-black bg-neo-white">
    <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
      <a href="/" class="font-brut text-brut-xl uppercase tracking-tighter hover:opacity-70 transition-opacity">
        ClrBlind
      </a>

      <button
        class="brut-btn lg:hidden text-sm px-3 py-2"
        onclick={() => navOpen = !navOpen}
      >
        {navOpen ? '✕' : '☰'}
      </button>

      <nav class="hidden lg:flex items-center gap-2">
        {#if $isAuthLoading}
          <div class="brut-spinner"></div>
        {:else if $session}
            <a href="/detects" class="brut-nav-link" class:brut-nav-link-active={isActive('/detects')}>
              Scan
            </a>
            <a href="/ocr" class="brut-nav-link" class:brut-nav-link-active={isActive('/ocr')}>
              OCR
            </a>
            <a href="/assistant" class="brut-nav-link" class:brut-nav-link-active={isActive('/assistant')}>
              Assistant
            </a>
            <a href="/dashboard" class="brut-nav-link" class:brut-nav-link-active={isActive('/dashboard')}>
              Dashboard
            </a>
            <span class="w-px h-6 bg-neo-black"></span>
            <div class="flex items-center gap-2 ml-2">
            {#if $avatarUrl && !avatarError}
              <img src={$avatarUrl} alt="" class="nav-avatar" onerror={() => avatarError = true} />
            {:else}
              <div class="brut-avatar w-8 h-8 text-brut-sm">
                {($user?.email ?? '?')[0].toUpperCase()}
              </div>
            {/if}
            <span class="font-brut text-brut-xs uppercase max-w-[120px] truncate">
              {$profileName || $user?.email || ''}
            </span>
            <button onclick={handleSignOut} class="brut-btn text-sm px-3 py-1.5">
              Logout
            </button>
          </div>
        {:else if !$page.url.pathname.startsWith('/auth')}
          <a href="/auth/login" class="brut-btn-primary text-sm px-4 py-2">
            Login
          </a>
        {/if}
      </nav>
    </div>

    {#if navOpen}
      <nav class="lg:hidden border-t-brut border-neo-black bg-neo-white">
        <div class="px-4 py-4 flex flex-col gap-2">
          {#if $isAuthLoading}
            <div class="brut-spinner mx-auto"></div>
          {:else if $session}
            <div class="flex items-center gap-3 mb-2 pb-2 border-b-brut border-neo-black">
              {#if $avatarUrl && !avatarError}
                <img src={$avatarUrl} alt="" class="nav-avatar" onerror={() => avatarError = true} />
              {:else}
                <div class="brut-avatar">
                  {($user?.email ?? '?')[0].toUpperCase()}
                </div>
              {/if}
              <div class="font-brut text-brut-xs uppercase truncate">
                {$profileName || $user?.email || ''}
              </div>
            </div>
            <a href="/detects" class="brut-nav-link" class:brut-nav-link-active={isActive('/detects')}>
              Scan
            </a>
            <a href="/ocr" class="brut-nav-link" class:brut-nav-link-active={isActive('/ocr')}>
              OCR
            </a>
            <a href="/assistant" class="brut-nav-link" class:brut-nav-link-active={isActive('/assistant')}>
              Assistant
            </a>
            <a href="/dashboard" class="brut-nav-link" class:brut-nav-link-active={isActive('/dashboard')}>
              Dashboard
            </a>
            <a href="/history" class="brut-nav-link" class:brut-nav-link-active={isActive('/history')}>
              History
            </a>
            <a href="/favorites" class="brut-nav-link" class:brut-nav-link-active={isActive('/favorites')}>
              Favorites
            </a>
            <a href="/saved-colors" class="brut-nav-link" class:brut-nav-link-active={isActive('/saved-colors')}>
              Saved Colors
            </a>
            <a href="/saved-objects" class="brut-nav-link" class:brut-nav-link-active={isActive('/saved-objects')}>
              Saved Objects
            </a>
            <button onclick={handleSignOut} class="brut-btn-danger text-sm">
              Logout
            </button>
          {:else if !$page.url.pathname.startsWith('/auth')}
            <a href="/auth/login" class="brut-btn-primary text-sm text-center">
              Login
            </a>
          {/if}
        </div>
      </nav>
    {/if}
  </header>

  <main class="flex-1">
    {@render children()}
  </main>

  {#if $page.url.pathname.startsWith('/auth') || $page.url.pathname === '/'}
    <footer class="border-t-brut border-neo-black bg-neo-black text-neo-white py-4">
      <div class="max-w-7xl mx-auto px-4 text-center font-brut text-brut-xs uppercase tracking-wider">
        ClrBlind &copy; {new Date().getFullYear()}
      </div>
    </footer>
  {/if}
</div>

{#if !$page.url.pathname.startsWith('/auth') && $page.url.pathname !== '/'}
  <div class="lg:hidden">
    <BottomNav unreadCount={unreadCount} />
  </div>
{/if}
