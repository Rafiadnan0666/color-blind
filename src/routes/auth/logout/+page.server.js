import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const load = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  await supabase.auth.signOut();
  throw redirect(303, '/auth/login');
};
