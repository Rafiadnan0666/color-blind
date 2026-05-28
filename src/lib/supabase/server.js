import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

/** @param {import('@sveltejs/kit').Cookies} cookies */
export function createSupabaseServerClient(cookies) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      /** @param {Array<{ name: string, value: string, options: Record<string, unknown> }>} cookiesToSet */
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: '/' });
        });
      }
    }
  });
}
