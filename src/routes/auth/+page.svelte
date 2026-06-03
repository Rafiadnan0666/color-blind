<script>
  import { goto } from '$app/navigation';
</script>

<div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="brut-card text-center">
      <h1 class="brut-heading text-brut-4xl mb-1">Authentication</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider mb-8">
        Get started with ClrBlind
      </p>

      <div class="brut-stack">
        <button
          onclick={() => goto('/auth/login')}
          class="brut-btn-primary text-base py-3 w-full"
        >
          Login
        </button>

        <button
          onclick={() => goto('/auth/register')}
          class="brut-btn text-base py-3 w-full"
        >
          Create Account
        </button>
      </div>

      <div class="mt-6 pt-6 border-t-brut border-neo-black">
        <p class="font-brut text-brut-xs text-neo-darkgray uppercase mb-4">
          Or continue with
        </p>
        <button
          onclick={() => window.location.href = '/auth/oauth/google'}
          class="brut-btn text-sm py-2 w-full"
        >
          Google Sign In
        </button>
      </div>
    </div>
  </div>
</div>