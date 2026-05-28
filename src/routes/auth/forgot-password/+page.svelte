<script>
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  let email = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);

  /**
   * @param {Event} e
   */
  async function handleResetRequest(e) {
    e.preventDefault();
    error = '';
    success = '';
    loading = true;

    const supabase = getSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`
    });

    if (err) {
      error = err.message;
    } else {
      success = 'Reset link sent! Check your inbox.';
    }
    loading = false;
  }
</script>

<div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="brut-card">
      <h1 class="brut-heading text-brut-4xl mb-1">Reset</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider mb-2">
        Forgot your password?
      </p>
      <p class="font-brut text-brut-xs text-neo-darkgray mb-8">
        Enter your email and we'll send you a reset link.
      </p>

      {#if error}
        <div class="brut-alert-error mb-6">{error}</div>
      {/if}
      {#if success}
        <div class="brut-alert-success mb-6">{success}</div>
      {/if}

      <form onsubmit={handleResetRequest} class="brut-stack">
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

        <button type="submit" class="brut-btn-primary w-full" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p class="mt-6 text-center font-brut text-brut-xs uppercase text-neo-darkgray">
        <a href="/auth/login" class="brut-link">Back to login</a>
      </p>
    </div>
  </div>
</div>
