import { createSupabaseServerClient } from '$lib/supabase/server';

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

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();

    if (error) {
      sessionCache = { session: null, user: null };
      return sessionCache;
    }

    sessionCache = { session, user };
    return sessionCache;
  };

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
