import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {import('@sveltejs/kit').RequestEvent['setHeaders']} [setHeaders]
 */
export function createSupabaseServerClient(cookies, setHeaders) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      /**
       * @param {Array<{ name: string, value: string, options: Record<string, unknown> }>} cookiesToSet
       * @param {Record<string, string>} [headers]
       */
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: '/' });
        });
        if (headers && setHeaders) {
          setHeaders(headers);
        }
      }
    }
  });
}
