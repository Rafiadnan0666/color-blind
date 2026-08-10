<script>
  import AdSlot from '$lib/components/AdSlot.svelte';
</script>

<svelte:head>
  <title>Terms of Service — ClrBlind</title>
  <meta name="description" content="ClrBlind terms of service: free accessibility tool, no medical warranty, acceptable use." />
</svelte:head>

<div class="bg-neo-white py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="brut-card border-4 border-neo-black bg-cyan-100 mb-10">
      <h1 class="brut-heading text-brut-3xl uppercase">Terms of Service</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray mt-2">Last updated: {new Date().toLocaleDateString()}</p>
    </div>

    <div class="prose-custom space-y-8">
      <section>
        <h2 class="brut-heading text-brut-xl mb-3">1. Acceptance of Terms</h2>
        <p>By accessing or using ClrBlind ("the Service"), you agree to these Terms. If you do not agree, do not use the Service.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">2. The Service</h2>
        <p>ClrBlind is a free, browser-based accessibility tool that uses on-device artificial intelligence to help people with color vision deficiencies. Detection runs locally in your browser; we store only metadata you choose to save.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">3. No Medical or Professional Advice</h2>
        <p><strong>Important:</strong> ClrBlind is a general-purpose assistive tool, not a medical device. AI detection results (including meat freshness, mushroom identification, medicine identification, and currency checks) are estimates and may be wrong. Always verify critical decisions with other sources. The Service is provided for informational and assistive purposes only and does not constitute medical, financial, or legal advice.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">4. Acceptable Use</h2>
        <p>You agree not to: misuse the Service; attempt to reverse engineer or extract machine learning models beyond normal usage; upload illegal content for analysis; use the Service to commit fraud (including currency counterfeiting detection avoidance); or interfere with the Service's operation.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">5. Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You may delete your account at any time.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">6. Advertising</h2>
        <p>The Service displays advertisements to support free access. Advertisements are served by third parties such as Google AdSense and are subject to their policies.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">7. Disclaimer of Warranties</h2>
        <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including accuracy, reliability, or fitness for a particular purpose.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">8. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, ClrBlind shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the Service.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">9. Changes</h2>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">10. Contact</h2>
        <p>Questions about these Terms: reach us through the <a class="brut-link" href="/about">About page</a>.</p>
      </section>
    </div>
  </div>
</div>

<AdSlot unit="leaderboard" />

<style>
  .prose-custom p {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--color-text-primary);
  }
  .prose-custom li {
    font-size: 0.95rem;
    line-height: 1.6;
  }
</style>