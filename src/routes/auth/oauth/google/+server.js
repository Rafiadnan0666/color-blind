import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const GET = async ({ cookies, setHeaders, url }) => {
  const supabase = createSupabaseServerClient(cookies, setHeaders);

  const next = url.searchParams.get('next') || '/';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  throw redirect(303, data.url);
};
