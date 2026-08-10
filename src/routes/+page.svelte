<script>
  import { session } from '$lib/stores/auth';
  import AdSlot from '$lib/components/AdSlot.svelte';

  const modes = [
    { name: 'Currency (Rp)', desc: 'Detect Indonesian Rupiah notes', icon: 'fa-tag', color: '#ffd700' },
    { name: 'Medicine Pills', desc: 'Identify common tablets', icon: 'fa-prescription-bottle', color: '#00e5ff' },
    { name: 'Traffic Light', desc: 'Red / Green / Yellow signals', icon: 'fa-traffic-light', color: '#ff3366' },
    { name: 'Accessibility', desc: 'Crosswalk, Stop & Speed signs', icon: 'fa-road', color: '#39ff14' },
    { name: 'Meat Freshness', desc: 'Fresh vs Spoiled detection', icon: 'fa-utensils', color: '#ff6b35' },
    { name: 'Mushroom ID', desc: 'Flag 5 poisonous species', icon: 'fa-spore', color: '#9b59b6' },
    { name: 'Scene AI', desc: 'Garden, kitchen, supermarket', icon: 'fa-image', color: '#ec4899' },
    { name: 'OCR Scanner', desc: 'Text in 14 languages', icon: 'fa-font', color: '#10b981' },
    { name: 'Color Picker', desc: '183+ named colors', icon: 'fa-eye-dropper', color: '#f59e0b' },
    { name: 'AI Assistant', desc: 'Ask about accessibility', icon: 'fa-robot', color: '#6366f1' },
  ];

  const features = [
    { title: 'AI Detection', desc: '80 everyday objects via browser-based machine learning', icon: 'fa-cube', color: '#00e5ff' },
    { title: 'Color Vision', desc: '183+ named colors, palettes, CVD simulation', icon: 'fa-palette', color: '#ec4899' },
    { title: 'Voice Feedback', desc: 'Your device speaks results aloud', icon: 'fa-microphone', color: '#10b981' },
    { title: 'Privacy First', desc: '100% on-device — zero uploads', icon: 'fa-shield-alt', color: '#39ff14' },
    { title: 'OCR Scanner', desc: 'Extract text from images in 14 languages', icon: 'fa-font', color: '#6366f1' },
    { title: 'Scene AI', desc: 'Identify indoor/outdoor environments', icon: 'fa-map-location-dot', color: '#f59e0b' },
  ];
</script>

<svelte:head>
  <title>ClrBlind — AI Color Vision Accessibility App | 100% On-Device</title>
  <meta name="description" content="ClrBlind helps color blind users identify objects, colors, currency, pills, traffic lights and meat freshness — 100% on-device AI, zero uploads. Test color blindness online." />
  <meta name="keywords" content="color blind test, color blindness simulator, color blind detector, cvn, color vision deficiency, protanopia, deuteranopia, tritanopia, buta warna, tes buta warna, accessibility tool" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta property="og:title" content="ClrBlind — AI Color Vision Accessibility" />
  <meta property="og:description" content="Free on-device AI app for color blind users: detects objects, colors, currency, pills, traffic lights, meat freshness &amp; reads text." />
  <meta property="og:image" content="https://color-blind-psi.vercel.app/og.png" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://color-blind-psi.vercel.app/" />
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-neo-white via-cyan-50 to-purple-50 px-4">
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-cyan-300/30 to-purple-300/30 rounded-full blur-3xl animate-pulse-glow"></div>
    <div class="absolute bottom-1/4 right-1/2 translate-x-1/2 w-80 h-80 bg-gradient-to-r from-yellow-300/20 to-pink-300/20 rounded-full blur-3xl animate-pulse-glow" style="animation-delay: 0.4s"></div>
  </div>

  <div class="relative z-10 max-w-5xl mx-auto text-center anim-stagger">
    <div class="brut-card border-4 border-neo-black bg-yellow-100 mb-6 inline-block shadow-brut-lg animate-bounce-subtle">
      <h1 class="brut-heading text-brut-3xl md:text-brut-4xl uppercase tracking-tighter">
        <i class="fas fa-eye text-cyan-600 mr-3 animate-pulse-slow"></i>ClrBlind
        <i class="fas fa-lightbulb text-yellow-500 ml-3 animate-bounce-subtle" style="animation-delay: 0.2s"></i>
      </h1>
    </div>

    <p class="font-brut text-brut-lg uppercase tracking-wide text-neo-darkgray mb-8 max-w-2xl mx-auto leading-tight">
      AI-powered color vision accessibility app — detect objects, colors, currency, pills, traffic lights &amp; meat freshness in real time.
    <strong class="hidden"></strong>
      <span class="block mt-2 font-brut text-brut-base text-cyan-600">All processing stays 100% in your browser. Zero uploads.</span>
    </p>

    {#if $session}
      <a href="/dashboard" class="brut-btn-primary text-brut-xl px-10 py-4 inline-block mb-12 animate-bounce-subtle" style="animation-delay: 0.3s">
        <i class="fas fa-tachometer-alt mr-2"></i>Go to Dashboard
      </a>
    {:else}
      <div class="flex gap-4 justify-center flex-wrap mb-12">
        <a href="/auth/register" class="brut-btn-primary text-brut-lg px-8 py-4 animate-bounce-subtle" style="animation-delay: 0.2s">
          <i class="fas fa-rocket mr-2"></i>Get Started Free
        </a>
        <a href="/auth/login" class="brut-btn text-brut-lg px-8 py-4 animate-bounce-subtle" style="animation-delay: 0.35s">
          <i class="fas fa-right-to-bracket mr-2"></i>Sign In
        </a>
      </div>
    {/if}

    <div class="flex gap-6 justify-center flex-wrap mb-8">
      <span class="brut-btn-ghost font-brut text-brut-xs uppercase px-4 py-2 border-2 border-neo-black">
        <span class="text-cyan-600 font-black">300M+</span> people affected worldwide
      </span>
      <span class="brut-btn-ghost font-brut text-brut-xs uppercase px-4 py-2 border-2 border-neo-black">
        <i class="fas fa-globe-wifi text-green-600 mr-1"></i> Fully offline-capable
      </span>
      <span class="brut-btn-ghost font-brut text-brut-xs uppercase px-4 py-2 border-2 border-neo-black">
        <i class="fas fa-star text-yellow-500 mr-1"></i> Privacy-first certified
      </span>
    </div>
  </div>
</section>

<!-- ===== MODES SHOWCASE ===== -->
<section class="py-16 px-4 bg-neo-white border-y-4 border-neo-black">
  <div class="max-w-6xl mx-auto">
    <h2 class="brut-heading text-brut-3xl text-center mb-4 uppercase">Specialized Detection</h2>
    <p class="font-brut text-brut-sm text-center text-neo-darkgray uppercase mb-12 max-w-2xl mx-auto">Detect what matters — from Indonesian rupiah notes to poisonous mushrooms — all without uploading a single photo</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each modes as mode, i}
        <div
          class="brut-card border-3 border-neo-black bg-neo-white hover:translate-y-0 hover:shadow-brut-lg transition-all duration-200"
          style="animation-delay: {i * 0.04}s"
        >
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 border-3 border-neo-black flex-shrink-0 flex items-center justify-center text-2xl" style="background: {mode.color}22; color: {mode.color}">
              <i class="fas {mode.icon}"></i>
            </div>
            <div>
              <h3 class="brut-heading text-brut-xl mb-1" style="color: {mode.color}">{mode.name}</h3>
              <p class="font-brut text-brut-xs text-neo-darkgray">{mode.desc}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ===== FEATURES ===== -->
<section class="py-20 px-4 bg-gradient-to-br from-cyan-50 via-white to-purple-50">
  <div class="max-w-6xl mx-auto">
    <h2 class="brut-heading text-brut-3xl text-center mb-16 uppercase">Why ClrBlind?</h2>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each features as f, i}
        <div
          class="brut-card border-3 border-neo-black bg-neo-white text-center hover:shadow-brut-lg transition-all duration-200"
          style="animation-delay: {i * 0.08}s"
        >
          <div class="w-16 h-16 mx-auto mb-4 rounded-full border-3 border-neo-black flex items-center justify-center" style="background: {f.color}11; color: {f.color}">
            <i class="fas {f.icon} text-2xl"></i>
          </div>
          <h3 class="brut-heading text-brut-xl mb-3 uppercase">{f.title}</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">{f.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ===== About Color Blindness ===== -->
<section class="py-16 px-4 bg-gradient-to-r from-purple-100 to-cyan-100 border-t-4 border-neo-black">
  <div class="max-w-6xl mx-auto">
    <h2 class="brut-heading text-brut-3xl text-center mb-12 uppercase">About Color Blindness</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="brut-card border-3 border-neo-black bg-yellow-100">
        <h3 class="brut-heading text-brut-2xl mb-4 uppercase">
          <i class="fas fa-users text-yellow-600 mr-2"></i>The Numbers
        </h3>
        <p class="font-brut text-brut-lg mb-3">
          <strong>1 in 12 men</strong> and <strong>1 in 200 women</strong> have color blindness.
        </p>
        <p class="font-brut text-brut-sm text-neo-darkgray">
          That's over 300 million people worldwide — more than the population of USA + Canada combined.
        </p>
      </div>

      <div class="brut-card border-3 border-neo-black bg-orange-100">
        <h3 class="brut-heading text-brut-2xl mb-4 uppercase">
          <i class="fas fa-palette text-orange-600 mr-2"></i>Common Types
        </h3>
        <ul class="font-brut text-brut-sm text-neo-darkgray space-y-2">
          <li><strong>Protanopia:</strong> Red / Green — reds appear black/brown</li>
          <li><strong>Deuteranopia:</strong> Green / Red — greens appear brown/yellow</li>
          <li><strong>Tritanopia:</strong> Blue / Yellow — blues look green, yellows look violet</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ===== How It Works ===== -->
<section class="py-20 px-4 bg-neo-white">
  <div class="max-w-4xl mx-auto">
    <h2 class="brut-heading text-brut-3xl text-center mb-16 uppercase">How It Works</h2>

    <div class="space-y-6">
      <div class="brut-card border-3 border-neo-black bg-blue-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0"><i class="fas fa-mobile-screen text-blue-600"></i></div>
        <div>
          <h3 class="brut-heading text-brut-xl mb-2 uppercase">1. Scan Or Upload</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Point your camera at objects, or upload an image — PNG, JPG, WebP, GIF, BMP, TIFF all supported.
          </p>
        </div>
      </div>
      <div class="brut-card border-3 border-neo-black bg-green-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0"><i class="fas fa-cogs text-green-600"></i></div>
        <div>
          <h3 class="brut-heading text-brut-xl mb-2 uppercase">2. AI Analysis</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Our on-device neural networks detect objects, name colors, read text and classify scenes — all in your browser.
          </p>
        </div>
      </div>
      <div class="brut-card border-3 border-neo-black bg-pink-100 flex items-start gap-6">
        <div class="text-brut-4xl shrink-0"><i class="fas fa-bolt text-pink-600"></i></div>
        <div>
          <h3 class="brut-heading text-brut-xl mb-2 uppercase">3. Hear &amp; See Results</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Get spoken feedback, color palettes, WCAG contrast scores, and save results to your secure history.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== Ad Slot ===== -->
<AdSlot unit="leaderboard" />

<!-- ===== CTA ===== -->
<section class="py-20 px-4 bg-gradient-to-r from-cyan-100 to-purple-100 text-center border-t-4 border-neo-black">
  <div class="max-w-2xl mx-auto">
    <h2 class="brut-heading text-brut-3xl mb-4 uppercase">Ready to See the World Differently?</h2>
    <p class="font-brut text-brut-sm text-neo-darkgray uppercase mb-8">
      Join 100k+ color blind users detecting objects, colors, money &amp; food — fully private
    </p>
    {#if $session}
      <a href="/dashboard" class="brut-btn-primary text-brut-lg px-10 py-4 inline-block">
        <i class="fas fa-tachometer-alt mr-2"></i>Open Dashboard
      </a>
    {:else}
      <a href="/auth/register" class="brut-btn-primary text-brut-lg px-10 py-4 inline-block">
        <i class="fas fa-rocket mr-2"></i>Start Detecting Free
      </a>
    {/if}
  </div>
</section>

<style>
  @keyframes bounce-subtle {
    0% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
    100% { transform: translateY(0); }
  }
  .animate-bounce-subtle {
    animation: bounce-subtle 1.6s ease-in-out infinite;
  }
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  .animate-pulse-slow {
    animation: pulse-slow 2.5s ease-in-out infinite;
  }
  .pulse-glow {
    box-shadow: 0 0 20px 4px currentColor;
  }
</style>