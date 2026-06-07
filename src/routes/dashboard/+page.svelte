<script>
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { userSettings, userProfile, feedback, objectAnalytics } from '$lib/supabase/db';
  import { onMount } from 'svelte';

  let initials = $state('');
  let profile = $state(null);
  let stats = $state([]);
  let avatarError = $state(false);

  async function loadData() {
    try {
      profile = await userProfile.get();
      avatarError = false;
      stats = await objectAnalytics.getStats();
    } catch (_) {}
  }

  onMount(() => {
    if ($user?.email) {
      loadData();
    }
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

<div class="min-h-[calc(100vh-8rem)] bg-neo-white">
  <div class="max-w-7xl mx-auto px-4 py-12">
    
    <div class="brut-card mb-8 border-4 border-neo-black bg-gradient-to-r from-blue-50 to-purple-50">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="flex items-center gap-6">
          
          {#if profile?.avatarurl && !avatarError}
            <img src={profile.avatarurl} alt="" class="dash-avatar" onerror={() => avatarError = true} />
          {:else}
            <div class="brut-avatar w-24 h-24 text-brut-2xl flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-400 border-4 border-neo-black shadow-brut-lg">
              {initials}
            </div>
          {/if}
          
          
          <div>
            <h1 class="brut-heading text-brut-3xl mb-1 capitalize">{profile?.name || $user?.email?.split('@')[0] || 'User'}</h1>
            <p class="font-brut text-brut-sm text-neo-darkgray mb-3">{$user?.email || 'No email'}</p>
            
            
            {#if profile?.colorblindmode}
              <div class="inline-block">
                <span class="font-brut text-brut-xs uppercase bg-blue-200 text-blue-900 px-3 py-1 border-2 border-neo-black">
                  <i class="fas fa-eye mr-1"></i> {getColorBlindModeLabel(profile.colorblindmode)}
                </span>
              </div>
            {/if}
          </div>
        </div>

        
        <div class="w-full md:w-auto flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="brut-card bg-white border-2 border-neo-black text-center p-3">
              <div class="font-brut text-brut-2xl font-bold">{stats.length || 0}</div>
              <div class="font-brut text-brut-xs text-neo-darkgray uppercase">Detections</div>
            </div>
            <div class="brut-card bg-white border-2 border-neo-black text-center p-3">
              <div class="font-brut text-brut-2xl font-bold">{profile?.voiceenabled ? '✓' : '✗'}</div>
              <div class="font-brut text-brut-xs text-neo-darkgray uppercase">Voice</div>
            </div>
          </div>
          <a href="/profile" class="brut-btn text-center w-full">
            <i class="fas fa-cog mr-2"></i> Profile Settings
          </a>
        </div>
      </div>
    </div>

    
    <div class="brut-card mb-8 bg-gradient-to-r from-green-100 to-teal-100 border-3 border-neo-black">
      <h2 class="brut-heading text-brut-3xl">
        <i class="fas fa-hand-wave text-green-600 mr-2"></i> {getGreeting()}, {profile?.name || 'User'}!
      </h2>
      <p class="font-brut text-brut-sm text-neo-darkgray uppercase tracking-wider mt-2">
        Welcome back to your color blindness detection dashboard
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div class="brut-card border-3 border-neo-black bg-cyan-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-eye text-blue-600 mr-2"></i> New Detection
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Detect and analyze objects & colors
            </p>
          </div>
        </div>
          <a href="/detects" class="brut-btn inline-block mt-4">
            Start Detecting
          </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-purple-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-file-lines text-purple-600 mr-2"></i> OCR Scanner
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Extract text from images
            </p>
          </div>
        </div>
        <a href="/ocr" class="brut-btn inline-block mt-4">
          Open OCR
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-teal-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-robot text-teal-600 mr-2"></i> AI Assistant
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Ask about colors, detection & accessibility
            </p>
          </div>
        </div>
        <a href="/assistant" class="brut-btn inline-block mt-4">
          Chat Now
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-pink-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-history text-pink-600 mr-2"></i> Detection History
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              View your previous scans
            </p>
          </div>
        </div>
        <a href="/history" class="brut-btn inline-block mt-4">
          View History
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-green-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-palette text-green-600 mr-2"></i> Saved Colors
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Browse your saved color palette
            </p>
          </div>
        </div>
        <a href="/saved-colors" class="brut-btn inline-block mt-4">
          View Colors
        </a>
      </div>

      <div class="brut-card border-3 border-neo-black bg-orange-100 hover:shadow-brut-lg transition-all">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="brut-heading text-brut-2xl mb-2">
              <i class="fas fa-cog text-orange-600 mr-2"></i> Account Settings
            </h2>
            <p class="font-brut text-brut-sm text-neo-darkgray uppercase">
              Profile, notifications & preferences
            </p>
          </div>
        </div>
        <a href="/profile" class="brut-btn inline-block mt-4">
          Settings
        </a>
      </div>
    </div>

    <div class="brut-card border-3 border-neo-black bg-yellow-100">
      <h2 class="brut-heading text-brut-2xl mb-4">
        <i class="fas fa-lightbulb text-yellow-600 mr-2"></i> About Color Blindness Detection
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-brut font-bold text-brut-lg mb-2 uppercase">What We Do</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Our advanced machine learning algorithms analyze images to detect patterns indicative of color vision deficiencies. We help you understand and improve accessibility for all users.
          </p>
        </div>
        <div>
          <h3 class="font-brut font-bold text-brut-lg mb-2 uppercase">Why It Matters</h3>
          <p class="font-brut text-brut-sm text-neo-darkgray">
            Approximately 1 in 12 men and 1 in 200 women have color blindness. Making your designs accessible ensures everyone can enjoy your content equally.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
