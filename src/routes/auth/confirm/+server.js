import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const GET = async ({ url, cookies }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') ?? 'email';
  const next = url.searchParams.get('next') ?? '/';

  if (token_hash) {
    const supabase = createSupabaseServerClient(cookies);
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      throw redirect(303, `${next}?message=Email confirmed! You can now sign in.`);
    }
  }

  throw redirect(303, '/auth/login?error=Unable to confirm email');
};
