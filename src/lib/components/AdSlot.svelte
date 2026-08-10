<script>
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { browser } from '$app/environment';
  import { adsense, adsEnabled } from '$lib/config';

  let { unit = 'leaderboard', label = true } = $props();
  let show = $state(false);

  function loadScript() {
    if (window._clrblindAdsLoaded) return;
    window._clrblindAdsLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.client}`;
    document.head.appendChild(s);
  }

  onMount(async () => {
    if (!adsEnabled() || !adsense.units[unit]) return;
    loadScript();
    show = true;
    // Wait until the <ins> element is rendered, then ask AdSense to fill it
    await tick();
    if (window.adsbygoogle) {
      window.adsbygoogle.push({});
    }
  });
</script>

{#if show}
  <div class="ad-slot">
    <ins
      class="adsbygoogle"
      style="display:block; min-height: 90px;"
      data-ad-client={adsense.client}
      data-ad-slot={adsense.units[unit]}
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
    {#if label}
      <p class="ad-label">Sponsored</p>
    {/if}
  </div>
{/if}

<style>
  .ad-slot {
    width: 100%;
    max-width: 970px;
    margin: 0 auto;
    padding: 0.5rem 0;
    text-align: center;
  }
  .ad-slot :global(ins.adsbygoogle) {
    margin: 0 auto;
  }
  .ad-label {
    margin: 0.25rem 0 0;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    font-size: 0.6rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-text-secondary, #888888);
  }
</style>