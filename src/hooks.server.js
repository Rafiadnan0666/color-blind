import { createSupabaseServerClient } from '$lib/supabase/server';

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com https://storage.googleapis.com https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://storage.googleapis.com https://cdn.jsdelivr.net blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://mepnivbdpeuqplgeiyia.supabase.co wss://mepnivbdpeuqplgeiyia.supabase.co https://storage.googleapis.com https://tfhub.dev https://tessdata.projectnaptha.com https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net";

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
};

export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(event.cookies, event.setHeaders);

  /** @type {{ session: import('@supabase/supabase-js').Session | null; user: import('@supabase/supabase-js').User | null } | null} */
  let sessionCache = null;

  event.locals.safeGetSession = async () => {
    if (sessionCache) return sessionCache;

    const { data: { session } } = await event.locals.supabase.auth.getSession();
    if (!session) {
      sessionCache = { session: null, user: null };
      return sessionCache;
    }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser();

    if (error) {
      sessionCache = { session: null, user: null };
      return sessionCache;
    }

    sessionCache = { session, user };
    return sessionCache;
  };

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
};