import { writable } from 'svelte/store';

/** @type {import('svelte/store').Writable<import('@supabase/supabase-js').User | null>} */
export const user = writable(null);
/** @type {import('svelte/store').Writable<import('@supabase/supabase-js').Session | null>} */
export const session = writable(null);
/** @type {import('svelte/store').Writable<boolean>} */
export const isAuthLoading = writable(true);

/**
 * @param {{ session: import('@supabase/supabase-js').Session | null; user?: import('@supabase/supabase-js').User | null }} authData
 */
export function initializeAuthStores(authData) {
  session.set(authData.session);
  if (authData.user !== undefined) {
    user.set(authData.user);
  }
  isAuthLoading.set(false);
}
