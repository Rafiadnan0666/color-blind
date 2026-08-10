<script>
  import AdSlot from '$lib/components/AdSlot.svelte';
</script>

<svelte:head>
  <title>Privacy Policy — ClrBlind</title>
  <meta name="description" content="ClrBlind privacy policy: fully client-side AI, no image uploads, cookie and advertising disclosures." />
</svelte:head>

<div class="bg-neo-white py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="brut-card border-4 border-neo-black bg-yellow-100 mb-10">
      <h1 class="brut-heading text-brut-3xl uppercase">Privacy Policy</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray mt-2">Last updated: {new Date().toLocaleDateString()}</p>
    </div>

    <div class="prose-custom space-y-8">

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">1. Privacy First</h2>
        <p>ClrBlind is a privacy-first application. All AI processing — object detection, color analysis, OCR, scene classification, and text assistance — runs <strong>entirely inside your browser</strong>. Camera frames and uploaded images <strong>never leave your device</strong> and are never transmitted to our servers.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">2. Data We Store</h2>
        <p>When you create an account, we store only metadata required for features:</p>
        <ul class="list-disc pl-6 font-brut text-brut-sm space-y-1">
          <li>Your account credentials (email, name, avatar) via Supabase Auth</li>
          <li>Scan history metadata: object names, colors, confidence scores, timestamps</li>
          <li>Saved colors, saved objects, favorites, OCR text history, and chat history you explicitly create</li>
          <li>User settings and preferences</li>
        </ul>
        <p class="mt-3"><strong>No images or camera frames are stored.</strong></p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">3. Advertising</h2>
        <p>ClrBlind displays advertisements served by Google AdSense. Google, as a third-party vendor, uses cookies to serve ads based on your prior visits to this and other websites.</p>
        <ul class="list-disc pl-6 font-brut text-brut-sm space-y-1">
          <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
          <li>You may opt out of personalized advertising by visiting <a class="brut-link" href="https://www.google.com/settings/ads" target="_blank" rel="noopener">Google Ads Settings</a>.</li>
          <li>You can also visit <a class="brut-link" href="https://www.aboutads.info" target="_blank" rel="noopener">www.aboutads.info</a> to opt out of third-party vendors' use of cookies for personalized advertising.</li>
          <li>More information about Google's advertising policies: <a class="brut-link" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Google Advertising Policies</a>.</li>
        </ul>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">4. Cookies</h2>
        <p>We use functional cookies for authentication/session management (via Supabase) and, if you consent, advertising cookies served by Google AdSense. You can block cookies through your browser settings, though some features may not work without session cookies.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">5. Third-Party Services</h2>
        <p>We use the following third-party services, each with their own privacy policies:</p>
        <ul class="list-disc pl-6 font-brut text-brut-sm space-y-1">
          <li><strong>Supabase</strong> — authentication and database hosting</li>
          <li><strong>Google AdSense</strong> — advertising (see above)</li>
          <li><strong>Resend</strong> — transactional notification emails</li>
          <li><strong>Vercel / Netlify</strong> — hosting and CDN</li>
        </ul>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">6. Your Rights (GDPR / CCPA)</h2>
        <p>Depending on your region, you may have the right to access, correct, export, or delete your personal data. You can delete data you created at any time through the app, or contact us to request full account deletion.</p>
        <p class="mt-3">For users in the EEA, Google's ads use the standard IAB consent framework; you will be presented with consent options for personalized advertising.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">7. Contact</h2>
        <p>Questions about this policy: reach us through the <a class="brut-link" href="/about">About page</a>.</p>
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