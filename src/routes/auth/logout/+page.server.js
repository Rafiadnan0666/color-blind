import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const load = async ({ cookies, setHeaders }) => {
  const supabase = createSupabaseServerClient(cookies, setHeaders);
  await supabase.auth.signOut();
  throw redirect(303, '/auth/login');
};
