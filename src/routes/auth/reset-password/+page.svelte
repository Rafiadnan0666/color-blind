<script>
  import { goto } from '$app/navigation';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);
  let isRecoverySession = $state(false);

  const supabase = getSupabaseBrowserClient();

  async function checkRecovery() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.aud === 'authenticated') {
      isRecoverySession = true;
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      isRecoverySession = true;
    }
  }

  checkRecovery();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      isRecoverySession = true;
      error = '';
    }
  });

  /**
   * @param {Event} e
   */
  async function handleUpdatePassword(e) {
    e.preventDefault();
    error = '';
    success = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    loading = true;

    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      error = err.message;
      loading = false;
      return;
    }

    success = 'Password updated successfully!';
    loading = false;

    setTimeout(() => goto('/auth/login'), 2000);
  }
</script>

<div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="brut-card">
      <h1 class="brut-heading text-brut-4xl mb-1">New Pass</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider mb-8">
        Choose a new password
      </p>

      {#if error}
        <div class="brut-alert-error mb-6">{error}</div>
      {/if}
      {#if success}
        <div class="brut-alert-success mb-6">{success}</div>
      {/if}

      {#if !isRecoverySession}
        <p class="font-brut text-brut-sm text-neo-darkgray mb-6">
          Checking recovery session...
        </p>
      {:else}
      <form onsubmit={handleUpdatePassword} class="brut-stack">
        <div>
          <label for="password" class="brut-label">New Password</label>
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

        <div>
          <label for="confirm" class="brut-label">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            bind:value={confirmPassword}
            class="brut-input"
            placeholder="Confirm your password"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="brut-btn-primary w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
      {/if}
    </div>
  </div>
</div>
