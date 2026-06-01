<script>
  import { user, session } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { userSettings, userProfile, feedback, objectAnalytics } from '$lib/supabase/db';
  import { fly } from 'svelte/transition';
  import { browser } from '$app/environment';

  let initials = $state('');
  let settings = $state(null);
  let profile = $state(null);
  let stats = $state([]);
  let fbRating = $state(0);
  let fbMsg = $state('');
  let fbSending = $state(false);
  let fbDone = $state(false);
  let notifEnabled = $state(true);
  let editingProfile = $state(false);
  let saving = $state(false);
  let editName = $state('');
  let editBio = $state('');
  let saved = $state(false);
  let showToast = $state(false);
  let toastMsg = $state('');

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
      if (profile) { editName = profile.display_name || ''; editBio = profile.bio || ''; }
      if (settings) notifEnabled = settings.notifications_enabled ?? true;
    } catch (_) {}
  }

  function openEdit() {
    editName = profile?.display_name || '';
    editBio = profile?.bio || '';
    editingProfile = true; saved = false;
  }

  async function saveProfile() {
    saving = true;
    try {
      await userProfile.upsert({ display_name: editName, bio: editBio });
      profile = await userProfile.get();
      editingProfile = false; saved = true;
      toast('Profile updated!');
    } catch (e) { toast('Could not save'); }
    saving = false;
  }

  async function toggleNotifs() {
    notifEnabled = !notifEnabled;
    if (browser) localStorage.setItem('clrblind_notif', JSON.stringify(notifEnabled));
    try { await userSettings.upsert({ notifications_enabled: notifEnabled }); } catch (_) {}
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem('clrblind_notif');
      if (stored !== null) notifEnabled = JSON.parse(stored);
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
</script>

<div class="profile-page">
  {#if showToast}
    <div class="toast" transition:fly={{ y: -10, duration: 200 }}>
      <i class="fas fa-check-circle mr-1"></i> {toastMsg}
    </div>
  {/if}

  <div class="profile-header brut-card">
    <div class="brut-avatar w-16 h-16 text-brut-2xl mx-auto">{initials}</div>
    <div class="text-center mt-3">
      <div class="font-brut text-brut-xl uppercase">{getGreeting()}!</div>
      <div class="font-brut text-brut-xs text-neo-darkgray mt-1">{$user?.email || ''}</div>
      {#if profile?.display_name}
        <div class="font-brut text-brut-sm mt-1">{profile.display_name}</div>
      {/if}
    </div>
  </div>

  {#if stats.length > 0}
    <div class="brut-card" transition:fly={{ y: 8, duration: 200 }}>
      <div class="font-brut text-brut-sm uppercase mb-3">
        <i class="fas fa-chart-simple mr-2 text-neo-pink"></i> Detection Stats
      </div>
      <div class="stats-grid">
        {#each stats.slice(0, 8) as s}
          <div class="stat-item" transition:fly={{ y: 8, duration: 200 }}>
            <span class="font-brut text-brut-xs uppercase truncate">{s.objectname}</span>
            <span class="font-brut text-brut-lg">{s.totaldetections}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="brut-card">
    <div class="flex items-center justify-between mb-3">
      <div class="font-brut text-brut-sm uppercase">
        <i class="fas fa-user-pen mr-2 text-neo-pink"></i> Profile
      </div>
      {#if !editingProfile}
        <button class="brut-btn text-brut-xs px-3 py-1.5" onclick={openEdit}>
          <i class="fas fa-pen mr-1"></i> Edit
        </button>
      {/if}
    </div>
    {#if editingProfile}
      <div class="flex flex-col gap-3">
        <input class="brut-input text-brut-sm" placeholder="Display name" bind:value={editName} maxlength="100" />
        <textarea class="brut-input text-brut-sm" rows="2" placeholder="Bio" bind:value={editBio} maxlength="500"></textarea>
        <div class="flex gap-2">
          <button class="brut-btn-primary text-brut-xs px-4 py-2 flex-1" onclick={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button class="brut-btn text-brut-xs px-4 py-2" onclick={() => editingProfile = false}>Cancel</button>
        </div>
      </div>
    {:else if saved}
      <div class="brut-alert-success text-brut-xs"><i class="fas fa-check mr-1"></i> Profile saved</div>
    {:else}
      <div class="font-brut text-brut-xs text-neo-darkgray">
        {profile?.display_name || 'No display name set'} &middot; {profile?.bio || 'No bio'}
      </div>
    {/if}
  </div>

  <div class="brut-card">
    <div class="font-brut text-brut-sm uppercase mb-3">
      <i class="fas fa-sliders mr-2 text-neo-pink"></i> Settings
    </div>
    <div class="settings-list">
      <div class="setting-row">
        <div class="font-brut text-brut-xs uppercase">Push Notifications</div>
        <button class="toggle" class:on={notifEnabled} onclick={toggleNotifs} aria-label="Toggle notifications">
          <div class="toggle-knob"></div>
        </button>
      </div>
    </div>
  </div>

  <div class="brut-card">
    <div class="font-brut text-brut-sm uppercase mb-3">
      <i class="fas fa-message mr-2 text-neo-pink"></i> Feedback
    </div>
    {#if fbDone}
      <div class="brut-alert-success text-center">
        <i class="fas fa-check-circle mr-2"></i> Thanks!
      </div>
    {:else}
      <div class="stars mb-3">
        {#each [1,2,3,4,5] as n}
          <button class="star-btn" class:active={n <= fbRating} onclick={() => fbRating = n} aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}>
            <i class="fas fa-star"></i>
          </button>
        {/each}
      </div>
      <textarea class="brut-input text-brut-sm mb-2" rows="3" placeholder="Share your thoughts..." bind:value={fbMsg}></textarea>
      <button class="brut-btn-primary text-brut-xs px-4 py-2 w-full" onclick={sendFeedback} disabled={fbSending || !fbMsg}>
        {fbSending ? 'Sending...' : 'Send Feedback'}
      </button>
    {/if}
  </div>

  <div class="brut-card">
    <button class="brut-btn-danger text-brut-xs px-4 py-2 w-full" onclick={handleSignOut}>
      <i class="fas fa-right-from-bracket mr-2"></i> Logout
    </button>
  </div>
</div>

<style>
  .profile-page { max-width: 500px; margin: 1rem auto; padding: 0 0.75rem 5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .profile-header { display: flex; flex-direction: column; align-items: center; padding: 1.5rem; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .stat-item { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; border: 2px solid #0a0a0a; }
  .settings-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .setting-row { display: flex; align-items: center; justify-content: space-between; }
  .toggle { width: 48px; height: 26px; border: 3px solid #0a0a0a; background: #e0e0e0; cursor: pointer; position: relative; transition: background 0.2s; padding: 0; }
  .toggle.on { background: #39ff14; }
  .toggle-knob { position: absolute; top: 1px; left: 1px; width: 18px; height: 18px; background: #fefefe; border: 2px solid #0a0a0a; transition: left 0.2s; }
  .toggle.on .toggle-knob { left: 25px; }
  .stars { display: flex; gap: 0.25rem; }
  .star-btn { border: none; background: none; font-size: 1.5rem; cursor: pointer; padding: 2px; color: #ccc; transition: all 0.15s; }
  .star-btn.active { color: #ffd700; }
  .star-btn:hover { transform: scale(1.2); }
  .toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 300; background: #39ff14; color: #0a0a0a; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a; padding: 0.6rem 1.2rem; font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
</style>
