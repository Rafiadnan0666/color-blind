import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { user, session, isAuthLoading } from '$lib/stores/auth';

const supabase = getSupabaseBrowserClient();

supabase.auth.onAuthStateChange((/** @type {string} */ event, /** @type {any} */ s) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    session.set(null);
    user.set(null);
    isAuthLoading.set(false);
    return;
  }

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY' || event === 'MFA_CHALLENGE_VERIFIED') {
    session.set(s);
    user.set(s?.user ?? null);
    isAuthLoading.set(false);
  }
});
