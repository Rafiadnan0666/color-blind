<script>
  import { session } from '$lib/stores/auth';
  import AdSlot from '$lib/components/AdSlot.svelte';
  import { onMount, onDestroy } from 'svelte';

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

  const ticker = ['OBJECTS', 'COLORS', 'CURRENCY', 'PILLS', 'TRAFFIC LIGHTS', 'MEAT', 'MUSHROOMS', 'OCR', 'SCENES', 'PALETTES'];

  const steps = [
    { n: '01', icon: 'fa-mobile-screen', color: '#00e5ff', title: 'Scan Or Upload', desc: 'Point your camera at objects, or upload an image — PNG, JPG, WebP, GIF, BMP, TIFF all supported.' },
    { n: '02', icon: 'fa-cogs', color: '#39ff14', title: 'AI Analysis', desc: 'On-device neural networks detect objects, name colors, read text and classify scenes — all in your browser.' },
    { n: '03', icon: 'fa-bolt', color: '#ffd700', title: 'Hear & See Results', desc: 'Get spoken feedback, color palettes, WCAG contrast scores, and save results to your secure history.' },
  ];

  const cvd = [
    { name: 'Protanopia', detail: 'Red / Green — reds appear black/brown', color: '#ff0033' },
    { name: 'Deuteranopia', detail: 'Green / Red — greens appear brown/yellow', color: '#39ff14' },
    { name: 'Tritanopia', detail: 'Blue / Yellow — blues look green, yellows look violet', color: '#3366ff' },
  ];

  const stats = [
    { value: 300, suffix: 'M+', label: 'people affected worldwide' },
    { value: 100, suffix: '%', label: 'on-device processing' },
    { value: 0, suffix: '', label: 'photos ever uploaded' },
    { value: 14, suffix: '', label: 'OCR languages' },
  ];

  let pageEl;
  let ctx;
  let gsap;
  let ScrollTrigger;

  onMount(async () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    ({ gsap } = await import('gsap'));
    ({ ScrollTrigger } = await import('gsap/ScrollTrigger'));
    gsap.registerPlugin(ScrollTrigger);

    ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-blob', { scale: 0.5, opacity: 0, duration: 1.4, stagger: 0.25, ease: 'power2.out' })
        .from('.hero-word', { y: 90, opacity: 0, rotation: 8, stagger: 0.09, duration: 0.9 }, '-=0.9')
        .from('.hero-fade', { y: 32, opacity: 0, stagger: 0.1, duration: 0.75 }, '-=0.5')
        .from('.hero-cta', { y: 30, opacity: 0, stagger: 0.12, duration: 0.7 }, '-=0.5')
        .from('.hero-chip', { scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.4')
        .from('.hero-wheel', { scale: 0, rotation: -150, opacity: 0, duration: 1.2, ease: 'back.out(1.5)' }, '-=0.6');

      gsap.to('.hero-blob-a', { yPercent: 30, ease: 'none', scrollTrigger: { scrub: 1 } });
      gsap.to('.hero-blob-b', { yPercent: -25, ease: 'none', scrollTrigger: { scrub: 1 } });

      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 60, opacity: 0, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        });
      });

      gsap.utils.toArray('[data-count]').forEach((el) => {
        const end = parseInt(el.dataset.count, 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: end, duration: 1.6, ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(obj.val); },
          scrollTrigger: { trigger: el, start: 'top 92%' }
        });
      });
    }, pageEl);

    requestAnimationFrame(() => ScrollTrigger.refresh());
  });

  onDestroy(() => {
    ctx?.revert();
    ScrollTrigger?.getAll()?.forEach((t) => t.kill());
  });
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

<div bind:this={pageEl} class="overflow-x-hidden">

  <!-- ===== HERO ===== -->
  <section class="relative min-h-svh flex flex-col items-center justify-center overflow-hidden px-4 py-24 hero-bg">
    <div class="hero-ghost" aria-hidden="true">COLOR</div>

    <div class="hero-blob hero-blob-a" aria-hidden="true"></div>
    <div class="hero-blob hero-blob-b" aria-hidden="true"></div>

    <div class="hero-wheel hidden lg:block" aria-hidden="true"></div>

    <div class="relative z-10 max-w-5xl mx-auto text-center">
      <div class="hero-fade inline-block font-brut text-brut-xs uppercase tracking-widest px-4 py-2 mb-8 border-3 border-neo-black bg-card shadow-brut-sm">
        <i class="fas fa-eye text-cyan-500 mr-2"></i>100% On-Device AI — Zero Uploads
      </div>

      <h1 class="brut-heading text-brut-4xl md:text-[4.5rem] uppercase tracking-tighter leading-[0.95]">
        <span class="hero-word inline-block">SEE</span>{' '}
        <span class="hero-word inline-block">THE</span>{' '}
        <span class="hero-word inline-block">WORLD</span>
        <span class="hero-word block mt-3"><span class="inline-block bg-neo-yellow text-neo-black px-4 py-1 -rotate-1 shadow-brut-lg">IN FULL COLOR</span></span>
      </h1>

      <p class="hero-fade font-brut text-brut-lg uppercase tracking-wide text-soft mt-8 max-w-2xl mx-auto leading-tight">
        AI-powered color vision accessibility app — detect objects, colors, currency, pills, traffic lights &amp; meat freshness in real time.
        <span class="hero-fade block mt-3 text-brut-base text-cyan-500">All processing stays 100% in your browser. Zero uploads.</span>
      </p>

      <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
        {#if $session}
          <a href="/dashboard" class="hero-cta brut-btn-primary text-brut-xl px-10 py-4">
            <i class="fas fa-tachometer-alt mr-2"></i>Go to Dashboard
          </a>
        {:else}
          <a href="/auth/register" class="hero-cta brut-btn-primary text-brut-xl px-10 py-4">
            <i class="fas fa-rocket mr-2"></i>Get Started Free
          </a>
          <a href="/auth/login" class="hero-cta text-brut-xl px-10 py-4 border-3 border-neo-black bg-card shadow-brut hover:shadow-brut-lg hover:translate-y-[-3px] transition-all inline-flex items-center justify-center font-brut uppercase tracking-wide">
            <i class="fas fa-right-to-bracket mr-2"></i>Sign In
          </a>
        {/if}
      </div>

      <div class="flex gap-4 sm:gap-6 justify-center flex-wrap mt-10">
        {#each stats as s}
          <span class="hero-chip border-3 border-neo-black bg-card shadow-brut-sm px-4 py-2 font-brut text-brut-xs uppercase text-left min-w-[110px]">
            <span class="block text-brut-xl leading-none">
              <span class="stat-num" data-count={s.value}>0</span>{s.suffix}
            </span>
            <span class="block text-soft mt-1">{s.label}</span>
          </span>
        {/each}
      </div>

      <div class="hero-fade mt-12 text-soft">
        <i class="fas fa-chevron-down hero-bounce"></i>
      </div>
    </div>
  </section>

  <!-- ===== TICKER ===== -->
  <div class="ticker border-y-4 border-neo-black bg-neo-black text-neo-white py-3 overflow-hidden" aria-hidden="true">
    <div class="flex w-max marquee">
      {#each Array(2) as _, r}
        <div class="flex gap-8 pr-8">
          {#each ticker as item}
            <span class="font-brut text-brut-sm uppercase tracking-widest whitespace-nowrap">
              {item} <i class="fas fa-star text-neo-yellow ml-2"></i>
            </span>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <!-- ===== MODES SHOWCASE ===== -->
  <section class="py-20 px-4 bg-primary border-b-4 border-neo-black">
    <div class="max-w-6xl mx-auto">
      <div data-reveal class="max-w-2xl mx-auto text-center mb-14">
        <span class="font-brut text-brut-xs uppercase tracking-widest text-cyan-500">/ 01</span>
        <h2 class="brut-heading text-brut-3xl mt-2 uppercase">Specialized Detection</h2>
        <p class="font-brut text-brut-sm text-soft uppercase mt-4">Detect what matters — from Indonesian rupiah notes to poisonous mushrooms — all without uploading a single photo</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each modes as mode, i}
          <div data-reveal class="mode-card brutal-3 border-4 border-neo-black bg-card p-6 shadow-brut"
            style="animation-delay: {i * 0.03}s">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 border-4 border-neo-black flex-shrink-0 flex items-center justify-center text-2xl mode-icon" style="background: {mode.color}22; color: {mode.color}">
                <i class="fas {mode.icon}"></i>
              </div>
              <div>
                <h3 class="brut-heading text-brut-lg mb-1" style="color: {mode.color}">{mode.name}</h3>
                <p class="font-brut text-brut-xs text-soft">{mode.desc}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== FEATURES ===== -->
  <section class="py-20 px-4 bg-soft border-b-4 border-neo-black">
    <div class="max-w-6xl mx-auto">
      <div data-reveal class="max-w-2xl mx-auto text-center mb-14">
        <span class="font-brut text-brut-xs uppercase tracking-widest text-pink-500">/ 02</span>
        <h2 class="brut-heading text-brut-3xl mt-2 uppercase">Why ClrBlind?</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each features as f, i}
          <div data-reveal class="brutal-4 border-4 border-neo-black bg-card p-7 text-center shadow-brut hover:shadow-brut-lg hover:-translate-y-1.5 transition-all duration-200"
            style="animation-delay: {i * 0.05}s">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-neo-black flex items-center justify-center feature-icon" style="background: {f.color}22; color: {f.color}">
              <i class="fas {f.icon} text-2xl"></i>
            </div>
            <h3 class="brut-heading text-brut-lg mb-3 uppercase">{f.title}</h3>
            <p class="font-brut text-brut-sm text-soft">{f.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== ABOUT COLOR BLINDNESS ===== -->
  <section class="py-20 px-4 bg-primary border-b-4 border-neo-black">
    <div class="max-w-6xl mx-auto">
      <div data-reveal class="max-w-2xl mx-auto text-center mb-14">
        <span class="font-brut text-brut-xs uppercase tracking-widest text-yellow-500">/ 03</span>
        <h2 class="brut-heading text-brut-3xl mt-2 uppercase">About Color Blindness</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div data-reveal class="brutal-2 border-4 border-neo-black bg-neo-yellow p-7 shadow-brut">
          <h3 class="brut-heading text-brut-2xl mb-5 uppercase">
            <i class="fas fa-users text-yellow-600 mr-2"></i>The Numbers
          </h3>
          <p class="font-brut text-brut-lg mb-3 leading-tight">
            <strong>1 in 12 men</strong> and <strong>1 in 200 women</strong> have color blindness.
          </p>
          <p class="font-brut text-brut-sm text-soft">
            That's over 300 million people worldwide — more than the population of USA + Canada combined.
          </p>
          <div class="mt-6 grid grid-cols-3 gap-3 text-center">
            <div class="border-4 border-neo-black bg-card p-3 leading-none">
              <div class="text-brut-2xl text-neo-black"><span data-count="12">0</span></div>
              <div class="font-brut text-brut-xs text-soft mt-1">MEN</div>
            </div>
            <div class="border-4 border-neo-black bg-card p-3 leading-none">
              <div class="text-brut-2xl"><span data-count="200">0</span></div>
              <div class="font-brut text-brut-xs text-soft mt-1">WOMEN</div>
            </div>
            <div class="border-4 border-neo-black bg-card p-3 leading-none">
              <div class="text-brut-2xl"><span data-count="300">0</span>M+</div>
              <div class="font-brut text-brut-xs text-soft mt-1">PEOPLE</div>
            </div>
          </div>
        </div>

        <div data-reveal class="brutal-4 border-4 border-neo-black bg-card p-7 shadow-brut">
          <h3 class="brut-heading text-brut-2xl mb-5 uppercase">
            <i class="fas fa-palette text-orange-500 mr-2"></i>Common Types
          </h3>
          <div class="space-y-3">
            {#each cvd as c}
              <div class="flex items-start gap-3 border-3 border-neo-black p-3.5" style="background: {c.color}14">
                <span class="w-5 h-5 border-3 border-neo-black flex-shrink-0 mt-0.5" style="background: {c.color}"></span>
                <div>
                  <div class="font-brut text-brut-sm uppercase"><strong>{c.name}</strong></div>
                  <div class="font-brut text-brut-xs text-soft mt-1">{c.detail}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== Ad Slot ===== -->
  <div data-reveal class="bg-soft border-b-4 border-neo-black">
    <AdSlot unit="leaderboard" />
  </div>

  <!-- ===== HOW IT WORKS ===== -->
  <section class="py-20 px-4 bg-primary border-b-4 border-neo-black">
    <div class="max-w-4xl mx-auto">
      <div data-reveal class="max-w-2xl mx-auto text-center mb-14">
        <span class="font-brut text-brut-xs uppercase tracking-widest text-green-500">/ 04</span>
        <h2 class="brut-heading text-brut-3xl mt-2 uppercase">How It Works</h2>
      </div>

      <div class="space-y-8">
        {#each steps as s, i}
          <div data-reveal class="step brutal-{i % 2 === 0 ? 2 : 4} border-4 border-neo-black bg-card shadow-brut flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6">
            <div class="w-20 h-20 flex-shrink-0 border-4 border-neo-black flex items-center justify-center text-brut-2xl step-num" style="background: {s.color}22; color: {s.color}">
              {s.n}
            </div>
            <div class="flex-1">
              <h3 class="brut-heading text-brut-xl mb-2 uppercase">
                <i class="fas {s.icon} mr-2" style="color: {s.color}"></i>{s.title}
              </h3>
              <p class="font-brut text-brut-sm text-soft">{s.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== CTA ===== -->
  <section class="relative py-24 px-4 bg-neo-black text-neo-white overflow-hidden">
    <div class="cta-ghost" aria-hidden="true">GO!</div>

    <div data-reveal class="max-w-3xl mx-auto text-center relative z-10">
      <h2 class="brut-heading text-brut-4xl uppercase text-neo-white">Ready to See the World <span class="cta-hl">Differently?</span></h2>
      <p class="font-brut text-brut-base uppercase text-neo-white opacity-70 mt-6 mb-10">
        Join 100k+ color blind users detecting objects, colors, money &amp; food — fully private
      </p>
      {#if $session}
        <a href="/dashboard" class="brut-btn-primary text-brut-xl px-12 py-5 inline-block">
          <i class="fas fa-tachometer-alt mr-2"></i>Open Dashboard
        </a>
      {:else}
        <a href="/auth/register" class="brut-btn-primary text-brut-xl px-12 py-5 inline-block">
          <i class="fas fa-rocket mr-2"></i>Start Detecting Free
        </a>
      {/if}
    </div>
  </section>
</div>

<style>
  .hero-bg {
    background: linear-gradient(165deg, var(--color-bg-tertiary) 0%, var(--color-bg-primary) 55%, var(--color-bg-secondary) 100%);
  }
  .hero-ghost {
    position: absolute;
    top: 50%;
    right: -2%;
    transform: translateY(-50%);
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    font-size: 13rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: transparent;
    -webkit-text-stroke: 2px var(--color-border-secondary);
    opacity: 0.5;
    pointer-events: none;
    user-select: none;
  }
  @media (max-width: 1024px) {
    .hero-ghost { display: none; }
  }

  .hero-blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(70px);
    opacity: 0.55;
    pointer-events: none;
  }
  .hero-blob-a {
    top: 12%;
    left: -10%;
    width: 26rem;
    height: 26rem;
    background: radial-gradient(circle, rgba(0, 229, 255, 0.5), transparent 70%);
  }
  .hero-blob-b {
    bottom: 8%;
    right: -10%;
    width: 30rem;
    height: 30rem;
    background: radial-gradient(circle, rgba(236, 72, 153, 0.45), transparent 70%);
  }

  .hero-wheel {
    position: absolute;
    right: 4%;
    top: 22%;
    width: 15rem;
    height: 15rem;
    border-radius: 9999px;
    border: 4px solid var(--color-neo-black, #0a0a0a);
    background: conic-gradient(#ff0033, #ffd700, #39ff14, #00e5ff, #3366ff, #9b59b6, #ec4899, #ff0033);
    -webkit-mask: radial-gradient(circle, transparent 58%, #000 60%);
    mask: radial-gradient(circle, transparent 58%, #000 60%);
    box-shadow: 10px 10px 0 var(--color-shadow, #0a0a0a);
    animation: hero-spin 16s linear infinite;
  }
  @keyframes hero-spin {
    to { transform: rotate(360deg); }
  }

  .hero-bounce {
    animation: hero-bounce 1.4s ease-in-out infinite;
  }
  @keyframes hero-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(8px); }
  }

  .marquee {
    animation: marquee-scroll 22s linear infinite;
  }
  .ticker:hover .marquee {
    animation-play-state: paused;
  }
  @keyframes marquee-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  .mode-card {
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .mode-card:hover {
    transform: translate(-3px, -3px) rotate(-0.6deg);
    box-shadow: 12px 12px 0 var(--color-neo-black, #0a0a0a);
  }
  .mode-icon, .feature-icon {
    transition: transform 0.2s;
  }
  .mode-card:hover .mode-icon {
    transform: rotate(-8deg) scale(1.1);
  }
  .feature-icon:hover {
    transform: rotate(-8deg) scale(1.12);
  }

  .brutal-1 { transform: rotate(-0.6deg); }
  .brutal-2 { transform: rotate(0.6deg); }
  .brutal-3 { transform: rotate(-0.3deg); }
  .brutal-4 { transform: rotate(0.3deg); }

  .step-num {
    transition: transform 0.2s;
  }
  .step:hover .step-num {
    transform: rotate(-6deg) scale(1.08);
  }

  .cta-ghost {
    position: absolute;
    bottom: -3rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    font-size: 16rem;
    line-height: 1;
    letter-spacing: -0.06em;
    color: rgba(255, 215, 0, 0.08);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }

  .cta-hl {
    background: linear-gradient(90deg, #ffd700, #00e5ff, #ff3366, #39ff14, #ffd700);
    background-size: 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: cta-paint 6s linear infinite;
  }
  @keyframes cta-paint {
    from { background-position: 0% 0; }
    to { background-position: 300% 0; }
  }
</style>