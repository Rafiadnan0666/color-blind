import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const GET = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  if (!code) {
    throw redirect(303, '/auth/login?error=No auth code provided');
  }

  const supabase = createSupabaseServerClient(cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  throw redirect(303, next);
};
