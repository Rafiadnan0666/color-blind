<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  let email = $state('');
  let password = $state('');
  let name = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);

  $effect(() => {
    const e = $page.url.searchParams.get('error');
    if (e) error = e;
  });

  /**
   * @param {Event} e
   */
  async function handleSignUp(e) {
    e.preventDefault();
    error = '';
    success = '';
    loading = true;

    const supabase = getSupabaseBrowserClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });

    if (err) {
      error = err.message;
      loading = false;
      return;
    }

    if (data?.user?.identities?.length === 0) {
      error = 'An account with this email already exists.';
      loading = false;
      return;
    }

    success = 'Check your email for a confirmation link!';
    loading = false;
  }

  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    });
    if (err) error = err.message;
  }
</script>

<div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="brut-card">
      <h1 class="brut-heading text-brut-4xl mb-1">Sign Up</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider mb-8">
        Create your account
      </p>

      {#if error}
        <div class="brut-alert-error mb-6">{error}</div>
      {/if}
      {#if success}
        <div class="brut-alert-success mb-6">{success}</div>
      {/if}

      <form onsubmit={handleSignUp} class="brut-stack">
        <div>
          <label for="name" class="brut-label">Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            class="brut-input"
            placeholder="Your name"
            autocomplete="name"
          />
        </div>

        <div>
          <label for="email" class="brut-label">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="brut-input"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div>
          <label for="password" class="brut-label">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            class="brut-input"
            placeholder="At least 6 characters"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="brut-btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {#if !success}
        <div class="brut-divider">
          <span class="font-brut text-brut-xs uppercase text-neo-darkgray">or</span>
        </div>

        <button onclick={handleGoogleLogin} class="brut-btn-google w-full">
          <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      {/if}

      <p class="mt-6 text-center font-brut text-brut-xs uppercase text-neo-darkgray">
        Already have an account?
        <a href="/auth/login" class="brut-link">Sign in</a>
      </p>
    </div>
  </div>
</div>
