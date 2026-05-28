import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

/** @returns {ReturnType<typeof createBrowserClient>} */
export function createSupabaseBrowserClient() {
  return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** @type {ReturnType<typeof createBrowserClient> | null} */
let browserClient = null;

/** @returns {ReturnType<typeof createBrowserClient>} */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}
