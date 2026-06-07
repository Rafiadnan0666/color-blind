<script>
  import { user, session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { userSettings, userProfile, feedback, objectAnalytics } from '$lib/supabase/db';
  import { fly } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { rawSettings, rawProfile } from '$lib/stores/settings';

  let initials = $state('');
  let avatarError = $state(false);
  let settings = $state(null);
  let profile = $state(null);
  let stats = $state([]);
  let fbRating = $state(0);
  let fbMsg = $state('');
  let fbSending = $state(false);
  let fbDone = $state(false);
  let editing = $state(false);
  let saving = $state(false);
  let saved = $state(false);
  let showToast = $state(false);
  let toastMsg = $state('');
  let activeTab = $state('profile');

  let editName = $state('');
  let editAvatarUrl = $state('');
  let editPreferredLanguage = $state('en');
  let editColorBlindMode = $state('none');
  let editVoiceEnabled = $state(true);
  let editHighContrast = $state(false);

  let editNotifEnabled = $state(true);
  let editObjectDetection = $state(true);
  let editColorDetection = $state(true);
  let editOCREnabled = $state(true);
  let editVoiceAssistant = $state(true);
  let editRealtimeDetection = $state(true);
  let editTheme = $state('system');
  let editPreferredVoice = $state('');
  let editPerfMode = $state('balanced');

  function toast(msg) {
    toastMsg = msg; showToast = true;
    setTimeout(() => showToast = false, 2000);
  }

  $effect(() => {
    if ($user?.email) {
      initials = $user.email[0].toUpperCase();
      loadData();
    }
  });

  async function loadData() {
    try {
      profile = await userProfile.get();
      settings = await userSettings.get();
      stats = await objectAnalytics.getStats();
      if (profile) {
        rawProfile.set(profile);
        avatarError = false;
        editName = profile.name || '';
        editAvatarUrl = profile.avatarurl || '';
        editPreferredLanguage = profile.preferredlanguage || 'en';
        editColorBlindMode = profile.colorblindmode || 'none';
        editVoiceEnabled = profile.voiceenabled ?? true;
        editHighContrast = profile.highcontrastmode ?? false;
      }
      if (settings) {
        rawSettings.set(settings);
        editNotifEnabled = settings.notifications_enabled ?? true;
        editObjectDetection = settings.objectdetectionenabled ?? true;
        editColorDetection = settings.colordetectionenabled ?? true;
        editOCREnabled = settings.ocrenabled ?? true;
        editVoiceAssistant = settings.voiceassistantenabled ?? true;
        editRealtimeDetection = settings.realtimedetection ?? true;
        editTheme = settings.preferredtheme || 'system';
        editPreferredVoice = settings.preferredvoice || '';
        editPerfMode = settings.performancemode || 'balanced';
      }
    } catch (_) {}
  }

  function openEdit() {
    editName = profile?.name || '';
    editAvatarUrl = profile?.avatarurl || '';
    editPreferredLanguage = profile?.preferredlanguage || 'en';
    editColorBlindMode = profile?.colorblindmode || 'none';
    editVoiceEnabled = profile?.voiceenabled ?? true;
    editHighContrast = profile?.highcontrastmode ?? false;
    editing = true; saved = false;
  }

  async function saveProfile() {
    saving = true;
    try {
      await userProfile.upsert({
        email: $user?.email,
        name: editName,
        avatarurl: editAvatarUrl || null,
        preferredlanguage: editPreferredLanguage,
        colorblindmode: editColorBlindMode,
        voiceenabled: editVoiceEnabled,
        highcontrastmode: editHighContrast,
      });
      await userSettings.upsert({
        notifications_enabled: editNotifEnabled,
        objectdetectionenabled: editObjectDetection,
        colordetectionenabled: editColorDetection,
        ocrenabled: editOCREnabled,
        voiceassistantenabled: editVoiceAssistant,
        realtimedetection: editRealtimeDetection,
        preferredtheme: editTheme,
        preferredvoice: editPreferredVoice || null,
        performancemode: editPerfMode,
      });
      if (browser) localStorage.setItem('clrblind_notif', JSON.stringify(editNotifEnabled));
      profile = await userProfile.get();
      settings = await userSettings.get();
      rawProfile.set(profile);
      rawSettings.set(settings);
      editing = false; saved = true;
      toast('Settings saved!');
    } catch (e) { toast('Could not save'); console.error(e); }
    saving = false;
  }

  function toggleVal(v) { return !v; }

  onMount(() => {
    try {
      const stored = localStorage.getItem('clrblind_notif');
      if (stored !== null) editNotifEnabled = JSON.parse(stored);
    } catch (_) {}
  });

  async function sendFeedback() {
    if (!fbMsg || fbRating === 0) return;
    fbSending = true;
    try {
      await feedback.create({ rating: fbRating, feedback: fbMsg });
      fbDone = true; fbMsg = ''; fbRating = 0;
      toast('Thanks for your feedback!');
    } catch (_) { toast('Could not send'); }
    fbSending = false;
  }

  function getGreeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  }

  function handleSignOut() { goto('/auth/logout'); }

  const LANGUAGES = [
    { value: 'en', label: 'English' }, { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' }, { value: 'pt', label: 'Português' },
    { value: 'nl', label: 'Nederlands' }, { value: 'pl', label: 'Polski' },
    { value: 'ru', label: 'Русский' }, { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' }, { value: 'zh', label: '中文' }, { value: 'ar', label: 'العربية' },
  ];

  const CVD_MODES = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
  const THEMES = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'grey', label: 'Grey' },
  ];
  const PERF_MODES = [
    { value: 'performance', label: 'Performance', desc: 'Max speed' },
    { value: 'balanced', label: 'Balanced', desc: 'Good speed & quality' },
    { value: 'quality', label: 'Quality', desc: 'Best accuracy' },
  ];
</script>

<div class="profile-page">
  {#if showToast}
    <div class="toast" transition:fly={{ y: -10, duration: 200 }}>
      <i class="fas fa-check-circle mr-1"></i> {toastMsg}
    </div>
  {/if}

  <div class="profile-header brut-card">
    {#if profile?.avatarurl && !avatarError}
      <img src={profile.avatarurl} alt="Avatar" class="avatar-img" onerror={() => avatarError = true} />
    {:else}
      <div class="brut-avatar w-16 h-16 text-brut-2xl mx-auto">{initials}</div>
    {/if}
    <div class="text-center mt-3">
      <div class="font-brut text-brut-xl uppercase">{getGreeting()}!</div>
      <div class="font-brut text-brut-xs text-neo-darkgray mt-1">{$user?.email || ''}</div>
      {#if profile?.name}
        <div class="font-brut text-brut-sm mt-1">{profile.name}</div>
      {/if}
      {#if editColorBlindMode !== 'none'}
        <div class="cvd-badge mt-1"><i class="fas fa-low-vision mr-1"></i> {editColorBlindMode}</div>
      {/if}
    </div>
  </div>

  {#if stats.length > 0}
    <div class="brut-card" transition:fly={{ y: 8, duration: 200 }}>
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-chart-simple mr-2 text-neo-pink"></i> Detection Stats</div>
      <div class="stats-grid">
        {#each stats.slice(0, 8) as s}
          <div class="stat-item">
            <span class="font-brut text-brut-xs uppercase truncate">{s.objectname}</span>
            <span class="font-brut text-brut-lg">{s.totaldetections}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="tabs-row">
    <button class="tab-btn" class:active={activeTab === 'profile'} onclick={() => activeTab = 'profile'}><i class="fas fa-user mr-1"></i> Profile</button>
    <button class="tab-btn" class:active={activeTab === 'settings'} onclick={() => activeTab = 'settings'}><i class="fas fa-sliders mr-1"></i> Settings</button>
    <button class="tab-btn" class:active={activeTab === 'feedback'} onclick={() => activeTab = 'feedback'}><i class="fas fa-message mr-1"></i> Feedback</button>
    <button class="tab-btn" class:active={activeTab === 'links'} onclick={() => activeTab = 'links'}><i class="fas fa-link mr-1"></i> Links</button>
  </div>

  {#if activeTab === 'profile'}
    <div class="brut-card">
      <div class="flex items-center justify-between mb-3">
        <span class="font-brut text-brut-sm uppercase"><i class="fas fa-user-pen mr-2 text-neo-pink"></i> Profile</span>
        {#if !editing}
          <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={openEdit}><i class="fas fa-pen mr-1"></i> Edit</button>
        {/if}
      </div>
      {#if saved && !editing}
        <div class="brut-alert-success text-brut-xs"><i class="fas fa-check mr-1"></i> Profile saved</div>
      {/if}
      <div class="profile-fields">
        <div class="field-row">
          <span class="field-label">Name</span>
          {#if editing}
            <input class="brut-input text-brut-sm flex-1" bind:value={editName} maxlength="100" />
          {:else}
            <span class="field-value">{profile?.name || 'Not set'}</span>
          {/if}
        </div>
        <div class="field-row">
          <span class="field-label">Avatar URL</span>
          {#if editing}
            <input class="brut-input text-brut-sm flex-1" bind:value={editAvatarUrl} placeholder="https://..." />
          {:else}
            <span class="field-value truncate">{profile?.avatarurl || 'Not set'}</span>
          {/if}
        </div>
        <div class="field-row">
          <span class="field-label">Language</span>
          {#if editing}
            <select class="brut-input text-brut-sm flex-1" bind:value={editPreferredLanguage}>
              {#each LANGUAGES as lang}<option value={lang.value}>{lang.label}</option>{/each}
            </select>
          {:else}
            <span class="field-value">{LANGUAGES.find(l => l.value === editPreferredLanguage)?.label || 'English'}</span>
          {/if}
        </div>
        <div class="field-row">
          <span class="field-label">CVD Mode</span>
          {#if editing}
            <div class="cvd-select">
              {#each CVD_MODES as mode}
                <button class="cvd-option" class:active={editColorBlindMode === mode} onclick={() => editColorBlindMode = mode}>{mode}</button>
              {/each}
            </div>
          {:else}
            <span class="field-value capitalize">{editColorBlindMode === 'none' ? 'None' : editColorBlindMode}</span>
          {/if}
        </div>
        <div class="field-row">
          <span class="field-label">Voice</span>
          {#if editing}
            <button class="toggle" class:on={editVoiceEnabled} onclick={() => editVoiceEnabled = !editVoiceEnabled} aria-label="Toggle voice">
              <div class="toggle-knob"></div>
            </button>
          {:else}
            <span class="field-value">{editVoiceEnabled ? 'On' : 'Off'}</span>
          {/if}
        </div>

      </div>
      {#if editing}
        <div class="flex gap-2 mt-3">
          <button class="brut-btn text-brut-xs px-4 py-2 flex-1" onclick={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
          <button class="brut-btn text-brut-xs px-4 py-2" onclick={() => editing = false}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if activeTab === 'settings'}
    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-sliders mr-2 text-neo-pink"></i> Detection</div>
      <div class="settings-list">
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Object Detection</span>
          <button class="toggle" class:on={editObjectDetection} onclick={() => editObjectDetection = !editObjectDetection} aria-label="Toggle object detection"><div class="toggle-knob"></div></button>
        </div>
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Color Detection</span>
          <button class="toggle" class:on={editColorDetection} onclick={() => editColorDetection = !editColorDetection} aria-label="Toggle color detection"><div class="toggle-knob"></div></button>
        </div>
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">OCR Enabled</span>
          <button class="toggle" class:on={editOCREnabled} onclick={() => editOCREnabled = !editOCREnabled} aria-label="Toggle OCR"><div class="toggle-knob"></div></button>
        </div>
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Voice Assistant</span>
          <button class="toggle" class:on={editVoiceAssistant} onclick={() => editVoiceAssistant = !editVoiceAssistant} aria-label="Toggle voice assistant"><div class="toggle-knob"></div></button>
        </div>
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Real-time Detection</span>
          <button class="toggle" class:on={editRealtimeDetection} onclick={() => editRealtimeDetection = !editRealtimeDetection} aria-label="Toggle real-time detection"><div class="toggle-knob"></div></button>
        </div>
      </div>
    </div>

    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-paint-brush mr-2 text-neo-pink"></i> Appearance</div>
      <div class="settings-list">
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Theme</span>
          <div class="cvd-select">
            {#each THEMES as t}
              <button class="cvd-option" class:active={editTheme === t.value} onclick={() => editTheme = t.value}>{t.label}</button>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-bolt mr-2 text-neo-pink"></i> Performance</div>
      <div class="settings-list">
        <div class="cvd-select">
          {#each PERF_MODES as m}
            <button class="cvd-option" class:active={editPerfMode === m.value} onclick={() => editPerfMode = m.value}>
              <span class="font-brut text-brut-xs">{m.label}</span>
              <span class="text-brut-xs text-neo-darkgray">{m.desc}</span>
            </button>
          {/each}
        </div>
        <div class="setting-row mt-2">
          <span class="font-brut text-brut-xs uppercase">Voice</span>
          <input class="brut-input text-brut-xs w-32" bind:value={editPreferredVoice} placeholder="e.g. Google UK" />
        </div>
      </div>
    </div>

    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-bell mr-2 text-neo-pink"></i> Notifications</div>
      <div class="settings-list">
        <div class="setting-row">
          <span class="font-brut text-brut-xs uppercase">Push Notifications</span>
          <button class="toggle" class:on={editNotifEnabled} onclick={() => editNotifEnabled = !editNotifEnabled} aria-label="Toggle notifications"><div class="toggle-knob"></div></button>
        </div>
      </div>
    </div>

    <button class="brut-btn text-brut-xs px-4 py-2 w-full mt-1" onclick={saveProfile} disabled={saving}>
      {saving ? 'Saving...' : 'Save Settings'}
    </button>
  {/if}

  {#if activeTab === 'feedback'}
    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-message mr-2 text-neo-pink"></i> Feedback</div>
      {#if fbDone}
        <div class="brut-alert-success text-center"><i class="fas fa-check-circle mr-2"></i> Thanks!</div>
      {:else}
        <div class="stars mb-3">
          {#each [1,2,3,4,5] as n}
            <button class="star-btn" class:active={n <= fbRating} onclick={() => fbRating = n} aria-label="{n} star"><i class="fas fa-star"></i></button>
          {/each}
        </div>
        <textarea class="brut-input text-brut-sm mb-2" rows="3" placeholder="Share your thoughts..." bind:value={fbMsg}></textarea>
        <button class="brut-btn text-brut-xs px-4 py-2 w-full" onclick={sendFeedback} disabled={fbSending || !fbMsg}>
          {fbSending ? 'Sending...' : 'Send Feedback'}
        </button>
      {/if}
    </div>
  {/if}

  {#if activeTab === 'links'}
    <div class="brut-card">
      <div class="font-brut text-brut-sm uppercase mb-3"><i class="fas fa-link mr-2 text-neo-pink"></i> Quick Links</div>
      <div class="links-list">
        <a href="/ocr" class="link-item"><i class="fas fa-file-lines"></i><span>OCR Scanner</span><i class="fas fa-chevron-right"></i></a>
        <a href="/assistant" class="link-item"><i class="fas fa-robot"></i><span>AI Assistant</span><i class="fas fa-chevron-right"></i></a>
        <a href="/saved-colors" class="link-item"><i class="fas fa-palette"></i><span>Saved Colors</span><i class="fas fa-chevron-right"></i></a>
        <a href="/saved-objects" class="link-item"><i class="fas fa-cube"></i><span>Saved Objects</span><i class="fas fa-chevron-right"></i></a>
        <a href="/notifications" class="link-item"><i class="fas fa-bell"></i><span>Notifications</span><i class="fas fa-chevron-right"></i></a>
        <button class="link-item w-full text-left" onclick={() => { if (typeof localStorage !== 'undefined') localStorage.removeItem('clrblind_tour_completed'); goto('/detects'); }}><i class="fas fa-map-signs"></i><span>Restart Tour</span><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="brut-card">
      <button class="brut-btn text-brut-xs px-4 py-2 w-full" onclick={handleSignOut}>
        <i class="fas fa-right-from-bracket mr-2"></i> Logout
      </button>
    </div>
  {/if}
</div>

<style>
  .profile-page { max-width: 500px; margin: 1rem auto; padding: 0 0.75rem 5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .profile-header { display: flex; flex-direction: column; align-items: center; padding: 1.5rem; }
  .cvd-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.5rem; background: #ff0033; color: #fff; border: 2px solid var(--color-border-primary); font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; }
  .tabs-row { display: flex; gap: 0.25rem; border: 3px solid var(--color-border-primary); box-shadow: 3px 3px 0 var(--color-shadow); overflow: hidden; }
  .tab-btn { flex: 1; padding: 0.5rem; border: none; background: var(--color-card-bg); color: var(--color-text-primary); font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; transition: all 0.15s; border-right: 1px solid var(--color-border-primary); }
  .tab-btn:last-child { border-right: none; }
  .tab-btn.active { background: #ffd700; color: #0a0a0a; }
  .tab-btn:hover { background: #ffd70044; }
  .profile-fields { display: flex; flex-direction: column; gap: 0.75rem; }
  .field-row { display: flex; align-items: center; gap: 0.5rem; }
  .field-label { font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; min-width: 100px; color: var(--color-text-secondary); flex-shrink: 0; }
  .field-value { font: 500 0.75rem/1 'Space Grotesk', system-ui, sans-serif; color: var(--color-text-primary); }
  .cvd-select { display: flex; flex-wrap: wrap; gap: 0.25rem; }
  .cvd-option { padding: 0.25rem 0.4rem; border: 2px solid var(--color-border-primary); background: var(--color-card-bg); color: var(--color-text-primary); font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; transition: all 0.15s; }
  .cvd-option.active { background: #ffd700; color: #0a0a0a; box-shadow: 2px 2px 0 var(--color-shadow); }
  .cvd-option:hover { background: #ffd70044; }
  .settings-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .toggle { width: 48px; height: 26px; border: 3px solid var(--color-border-primary); background: var(--color-progress-track); cursor: pointer; position: relative; transition: background 0.2s; padding: 0; flex-shrink: 0; }
  .toggle.on { background: #39ff14; }
  .toggle-knob { position: absolute; top: 1px; left: 1px; width: 18px; height: 18px; background: var(--color-bg-primary); border: 2px solid var(--color-border-primary); transition: left 0.2s; }
  .toggle.on .toggle-knob { left: 25px; }

  .links-list { display: flex; flex-direction: column; gap: 0.25rem; }
  .link-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 2px solid transparent; color: var(--color-text-primary); text-decoration: none; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; transition: all 0.15s; }
  .link-item:hover { border-color: var(--color-border-primary); background: #ffd70008; }
  .link-item i:first-child { width: 20px; text-align: center; color: #ff3366; }
  .link-item span { flex: 1; }
  .link-item i:last-child { font-size: 0.6rem; color: var(--color-text-secondary); }
  .avatar-img { width: 64px; height: 64px; border: 3px solid var(--color-border-primary); object-fit: cover; margin: 0 auto; }
  .stars { display: flex; gap: 0.25rem; }
  .star-btn { border: none; background: none; font-size: 1.5rem; cursor: pointer; padding: 2px; color: var(--color-border-secondary); transition: all 0.15s; }
  .star-btn.active { color: #ffd700; }
  .star-btn:hover { transform: scale(1.2); }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .stat-item { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; border: 2px solid var(--color-border-primary); }
  .toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 300; background: #39ff14; color: #0a0a0a; border: 3px solid var(--color-border-primary); box-shadow: 4px 4px 0 var(--color-shadow); padding: 0.6rem 1.2rem; font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
</style>
