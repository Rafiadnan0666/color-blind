import { getSupabaseBrowserClient } from '$lib/supabase/client';
import { user, session, isAuthLoading } from '$lib/stores/auth';

const supabase = getSupabaseBrowserClient();

supabase.auth.getSession().then((/** @type {any} */ { data: { session: s } }) => {
  session.set(s);
  user.set(s?.user ?? null);
  isAuthLoading.set(false);
});

supabase.auth.onAuthStateChange((/** @type {string} */ event, /** @type {any} */ s) => {
  session.set(s);
  user.set(s?.user ?? null);
  isAuthLoading.set(false);

  if (event === 'SIGNED_OUT') {
    session.set(null);
    user.set(null);
  }
});
