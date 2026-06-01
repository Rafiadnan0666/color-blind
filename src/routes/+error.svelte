<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let { status, error } = $props();
</script>

<div class="error-page">
  <div class="error-card">
    <div class="text-5xl mb-4 opacity-40">
      <i class="fas fa-triangle-exclamation"></i>
    </div>
    <div class="font-brut text-brut-3xl uppercase">{status || 500}</div>
    <div class="font-brut text-brut-sm text-neo-darkgray mt-2 uppercase">
      {error?.message || 'Something went wrong'}
    </div>
    <div class="flex gap-3 mt-6">
      <button class="brut-btn-primary text-sm px-4 py-2" onclick={() => goto('/detects')}>
        <i class="fas fa-camera mr-1"></i> Go to Scan
      </button>
      <button class="brut-btn text-sm px-4 py-2" onclick={() => goto('/')}>
        <i class="fas fa-house mr-1"></i> Home
      </button>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: #fefefe;
  }

  .error-card {
    text-align: center;
    background: #fefefe;
    border: 4px solid #0a0a0a;
    box-shadow: 8px 8px 0 #0a0a0a;
    padding: 2.5rem;
    max-width: 400px;
    width: 100%;
  }
</style>
