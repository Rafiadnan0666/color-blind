<script>
  import AdSlot from '$lib/components/AdSlot.svelte';
</script>

<svelte:head>
  <title>About &amp; Contact — ClrBlind</title>
  <meta name="description" content="About ClrBlind: a privacy-first, AI-powered color vision accessibility app running 100% in your browser." />
</svelte:head>

<div class="bg-neo-white py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="brut-card border-4 border-neo-black bg-green-100 mb-10">
      <h1 class="brut-heading text-brut-3xl uppercase">About ClrBlind</h1>
      <p class="font-brut text-brut-sm text-neo-darkgray mt-2">
        <i class="fas fa-eye text-green-600 mr-1"></i> An AI assistant for a color-dependent world
      </p>
    </div>

    <div class="prose-custom space-y-8">
      <section>
        <h2 class="brut-heading text-brut-xl mb-3">What We Do</h2>
        <p>Around 300 million people worldwide have some form of color vision deficiency (CVD). Everyday tasks — reading traffic lights, identifying currency, checking meat freshness, distinguishing pills — can be genuinely difficult. ClrBlind puts a pocket AI assistant in the browser that detects objects, describes colors, reads text, and speaks results aloud — with the entire AI running on your device.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">Privacy Is the Point</h2>
        <p>All detection models (object detection, color analysis, OCR, scene classification) run 100% client-side. <strong>No image ever leaves your device.</strong> We only store the metadata you explicitly choose to save: object names, colors, confidence scores, and notes.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">Features</h2>
        <ul class="list-disc pl-6 font-brut text-brut-sm space-y-1">
          <li><strong>AI Detection</strong> — 80 everyday objects, plus specialized modes for currency (Indonesian rupiah), medicine pills, traffic lights, accessibility signs, meat freshness, and poisonous mushrooms</li>
          <li><strong>Color Engine</strong> — 183+ named colors, dominant palettes, CVD simulation, WCAG contrast ratios, and color harmonies</li>
          <li><strong>OCR Scanner</strong> — text extraction in 14 languages, copy &amp; search history</li>
          <li><strong>Scene AI</strong> — identifies your environment (garden, orchard, kitchen, supermarket)</li>
          <li><strong>Voice Feedback</strong> — speaks detection results aloud</li>
          <li><strong>AI Assistant</strong> — answers questions about colors, accessibility &amp; features</li>
        </ul>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">Contact</h2>
        <p>Found a bug, have a feature request, or want to say hi? Reach out:</p>
        <ul class="list-disc pl-6 font-brut text-brut-sm space-y-1">
          <li>GitHub: <a class="brut-link" href="https://github.com" target="_blank" rel="noopener">ClrBlind repository</a></li>
          <li>Feedback: use the in-app feedback form on your dashboard</li>
        </ul>
        <p class="mt-3">We read everything and reply when we can.</p>
      </section>

      <section>
        <h2 class="brut-heading text-brut-xl mb-3">Support the Project</h2>
        <p>ClrBlind is free — ads keep the lights on. No paywalls, no image uploads, ever. Thank you for using it, and for making the web a more accessible place.</p>
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