<script>
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { userSettings, userProfile, feedback, objectAnalytics } from '$lib/supabase/db';
  import AdSlot from '$lib/components/AdSlot.svelte';
  import { onMount } from 'svelte';

  let initials = $state('');
  let profile = $state(null);
  let stats = $state([]);
  let avatarError = $state(false);
  let animReady = $state(false);

  const cards = [
    { href: '/detects', icon: 'fa-eye', title: 'New Detection', desc: 'Detect and analyze objects & colors', color: '#00e5ff', bg: 'linear-gradient(135deg, #00e5ff11, #00e5ff04)' },
    { href: '/ocr', icon: 'fa-file-lines', title: 'OCR Scanner', desc: 'Extract text from images', color: '#9b59b6', bg: 'linear-gradient(135deg, #9b59b611, #9b59b604)' },
    { href: '/assistant', icon: 'fa-robot', title: 'AI Assistant', desc: 'Ask about colors, detection & accessibility', color: '#39ff14', bg: 'linear-gradient(135deg, #39ff1411, #39ff1404)' },
    { href: '/history', icon: 'fa-history', title: 'Detection History', desc: 'View your previous scans', color: '#ff3366', bg: 'linear-gradient(135deg, #ff336611, #ff336604)' },
    { href: '/saved-colors', icon: 'fa-palette', title: 'Saved Colors', desc: 'Browse your saved color palette', color: '#ffd700', bg: 'linear-gradient(135deg, #ffd70011, #ffd70004)' },
    { href: '/profile', icon: 'fa-cog', title: 'Account Settings', desc: 'Profile, notifications & preferences', color: '#ff6b35', bg: 'linear-gradient(135deg, #ff6b3511, #ff6b3504)' },
  ];

  async function loadData() {
    try {
      profile = await userProfile.get();
      avatarError = false;
      stats = await objectAnalytics.getStats();
    } catch (_) {}
  }

  onMount(() => {
    if ($user?.email) loadData();
    requestAnimationFrame(() => animReady = true);
  });

  $effect(() => {
    if ($user?.email) {
      initials = $user.email[0].toUpperCase();
      if (!profile) loadData();
    }
  });

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  function getColorBlindModeLabel(mode) {
    const labels = {
      'none': 'Standard Vision',
      'protanopia': 'Protanopia (Red-Blind)',
      'deuteranopia': 'Deuteranopia (Green-Blind)',
      'tritanopia': 'Tritanopia (Blue-Blind)',
      'achromatopsia': 'Achromatopsia (Total)',
    };
    return labels[mode] || mode;
  }
</script>

<div class="dash-wrap">
  <div class="dash-inner">

    <div class="profile-hero" style="background: linear-gradient(135deg, var(--color-bg-secondary), color-mix(in srgb, var(--color-bg-secondary) 90%, #ffd700));">
      <div class="profile-left">
        {#if profile?.avatarurl && !avatarError}
          <img src={profile.avatarurl} alt="" class="dash-avatar" onerror={() => avatarError = true} />
        {:else}
          <div class="brut-avatar" style="background: linear-gradient(135deg, #ffd700, #ff6b35); border: 4px solid var(--color-border-primary); box-shadow: 8px 8px 0 var(--color-shadow);">
            {initials}
          </div>
        {/if}
        <div class="profile-info">
          <h1 class="profile-name">{profile?.name || $user?.email?.split('@')[0] || 'User'}</h1>
          <p class="profile-email">{$user?.email || 'No email'}</p>
          {#if profile?.colorblindmode}
            <span class="mode-badge" style="border: 2px solid var(--color-border-primary); background: color-mix(in srgb, #ffd700 20%, var(--color-bg-tertiary));">
              <i class="fas fa-eye mr-1"></i> {getColorBlindModeLabel(profile.colorblindmode)}
            </span>
          {/if}
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-card accent-cyan">
          <div class="stat-num">{stats.length || 0}</div>
          <div class="stat-label">Detections</div>
        </div>
<div class="stat-card accent-green">
          <div class="stat-num">{profile?.voiceenabled ? 'ON' : 'OFF'}</div>
          <div class="stat-label">Voice</div>
        </div>
        <a href="/profile" class="stat-btn">
          <i class="fas fa-cog"></i>
          <span>Settings</span>
        </a>
      </div>

      <AdSlot unit="leaderboard" />
      <h2 class="greeting-text">
        <i class="fas fa-hand-wave greeting-wave"></i> {getGreeting()}, {profile?.name || 'User'}!
      </h2>
      <p class="greeting-sub">Welcome back to your color blindness detection dashboard</p>
    </div>

    <div class="cards-grid">
      {#each cards as card, i}
        <a href={card.href} class="feature-card" style="--card-color: {card.color}; background: {card.bg}; border-color: {card.color}44; animation-delay: {i * 0.06}s" class:anim-ready={animReady}>
          <div class="card-icon-wrap" style="background: {card.color}22; border-color: {card.color}66;">
            <i class="fas {card.icon}" style="color: {card.color};"></i>
          </div>
          <div class="card-body">
            <h3 class="card-title" style="color: var(--color-text-primary);">{card.title}</h3>
            <p class="card-desc">{card.desc}</p>
          </div>
          <div class="card-arrow" style="color: {card.color};">
            <i class="fas fa-arrow-right"></i>
          </div>
        </a>
      {/each}
    </div>

    <div class="about-card">
      <div class="about-grid">
        <div class="about-block" style="border-left: 4px solid #00e5ff;">
          <h3 class="about-title" style="color: var(--color-text-primary);"><i class="fas fa-bullseye mr-2" style="color: #00e5ff;"></i> What We Do</h3>
          <p class="about-text">Advanced machine learning algorithms analyze images to detect patterns indicative of color vision deficiencies. We help you understand and improve accessibility.</p>
        </div>
        <div class="about-block" style="border-left: 4px solid #ffd700;">
          <h3 class="about-title" style="color: var(--color-text-primary);"><i class="fas fa-heart mr-2" style="color: #ff3366;"></i> Why It Matters</h3>
          <p class="about-text">1 in 12 men and 1 in 200 women have color blindness. Making your designs accessible ensures everyone can enjoy your content equally.</p>
        </div>
      </div>
    </div>

  </div>
</div>

<style>
  .dash-wrap { min-height: calc(100vh - 8rem); background: var(--color-bg-primary); }
  .dash-inner { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 5rem; display: flex; flex-direction: column; gap: 1rem; }

  .profile-hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem; border: 4px solid var(--color-border-primary); box-shadow: 8px 8px 0 var(--color-shadow); }
  .profile-left { display: flex; align-items: center; gap: 1rem; }
  .brut-avatar { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; font: 700 1.5rem/1 'Space Grotesk', system-ui, sans-serif; color: #0a0a0a; flex-shrink: 0; }
  .dash-avatar { width: 72px; height: 72px; border: 4px solid var(--color-border-primary); object-fit: cover; }
  .profile-name { font: 700 1.6rem/1.1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: var(--color-text-primary); }
  .profile-email { font: 500 0.75rem/1 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-secondary); margin: 0.25rem 0 0.5rem; }
  .mode-badge { display: inline-flex; align-items: center; font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; padding: 0.25rem 0.6rem; color: var(--color-text-primary); }
  .profile-stats { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .stat-card { padding: 0.5rem 0.75rem; border: 3px solid var(--color-border-primary); text-align: center; min-width: 75px; box-shadow: 3px 3px 0 var(--color-shadow); }
  .stat-card.accent-cyan { background: linear-gradient(135deg, #00e5ff22, #00e5ff08); }
  .stat-card.accent-green { background: linear-gradient(135deg, #39ff1422, #39ff1408); }
  .stat-num { font: 700 1.3rem/1 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-primary); }
  .stat-label { font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: var(--color-text-secondary); margin-top: 0.2rem; }
  .stat-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0.75rem; border: 3px solid var(--color-border-primary); background: var(--color-bg-secondary); font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: var(--color-text-primary); box-shadow: 3px 3px 0 var(--color-shadow); cursor: pointer; text-decoration: none; transition: all 0.15s; }
  .stat-btn:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--color-shadow); }

  .greeting-card { padding: 1rem 1.25rem; border: 3px solid var(--color-border-primary); background: var(--color-bg-secondary); box-shadow: 6px 6px 0 var(--color-shadow); }
  .greeting-text { font: 700 1.4rem/1 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-primary); display: flex; align-items: center; gap: 0.5rem; }
  .greeting-wave { display: inline-block; animation: wave 2s ease-in-out infinite; transform-origin: 70% 70%; color: #39ff14; }
  @keyframes wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-10deg); } }
  .greeting-sub { font: 500 0.7rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-top: 0.5rem; }

  .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  @media (max-width: 500px) { .cards-grid { grid-template-columns: 1fr; } }

  .feature-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border: 3px solid; box-shadow: 5px 5px 0 var(--color-shadow); text-decoration: none; transition: all 0.2s; position: relative; opacity: 0; transform: translateY(12px); }
  .feature-card.anim-ready { animation: cardIn 0.35s ease-out forwards; }
  @keyframes cardIn { to { opacity: 1; transform: translateY(0); } }
  .feature-card:hover { transform: translate(-3px,-3px) scale(1.01); box-shadow: 8px 8px 0 var(--color-shadow); }
  .feature-card:hover .card-arrow { transform: translateX(4px); opacity: 1; }
  .card-icon-wrap { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border: 3px solid; flex-shrink: 0; font-size: 1.2rem; }
  .card-body { flex: 1; min-width: 0; }
  .card-title { font: 700 0.85rem/1.1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; margin-bottom: 0.2rem; }
  .card-desc { font: 500 0.65rem/1.3 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-secondary); }
  .card-arrow { font-size: 1rem; opacity: 0.5; transition: all 0.2s; flex-shrink: 0; }

  .about-card { padding: 1.25rem; border: 3px solid var(--color-border-primary); background: var(--color-bg-secondary); box-shadow: 6px 6px 0 var(--color-shadow); }
  .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 500px) { .about-grid { grid-template-columns: 1fr; } }
  .about-block { padding: 0.5rem 0 0.5rem 1rem; }
  .about-title { font: 700 0.9rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; margin-bottom: 0.4rem; display: flex; align-items: center; }
  .about-text { font: 500 0.7rem/1.5 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-secondary); }
</style>
