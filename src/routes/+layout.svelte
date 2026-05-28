<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { session, user, isAuthLoading } from '$lib/stores/auth';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';
  import { onMount } from 'svelte';

  let { children, data } = $props();

  let navOpen = $state(false);

  /** @type {(() => void) | undefined} */
  let unsub;
  onMount(() => {
    if ($page.url.pathname.startsWith('/auth') && $page.url.pathname !== '/auth/callback' && $page.url.pathname !== '/auth/confirm') {
      unsub = session.subscribe(s => {
        if (s) goto('/', { replaceState: true });
      });
    }
    return () => { if (unsub) unsub(); };
  });

  async function handleSignOut() {
    goto('/auth/logout');
  }

  /**
   * @param {string} path
   */
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
          <a href="/" class="brut-nav-link" class:brut-nav-link-active={isActive('/')}>
            Detect
          </a>
          <span class="w-px h-6 bg-neo-black"></span>
          <div class="flex items-center gap-2 ml-2">
            <div class="brut-avatar w-8 h-8 text-brut-sm">
              {($user?.email ?? '?')[0].toUpperCase()}
            </div>
            <span class="font-brut text-brut-xs uppercase max-w-[120px] truncate">
              {$user?.email ?? ''}
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
              <div class="brut-avatar">
                {($user?.email ?? '?')[0].toUpperCase()}
              </div>
              <div class="font-brut text-brut-xs uppercase truncate">
                {$user?.email ?? ''}
              </div>
            </div>
            <a href="/" class="brut-nav-link" class:brut-nav-link-active={isActive('/')}>
              Detect
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

  <footer class="border-t-brut border-neo-black bg-neo-black text-neo-white py-4">
    <div class="max-w-7xl mx-auto px-4 text-center font-brut text-brut-xs uppercase tracking-wider">
      ClrBlind &copy; {new Date().getFullYear()}
    </div>
  </footer>
</div>
