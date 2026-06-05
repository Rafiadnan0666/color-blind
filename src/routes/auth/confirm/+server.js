import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const GET = async ({ url, cookies, setHeaders }) => {
  const supabase = createSupabaseServerClient(cookies, setHeaders);
  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
    }
    const next = url.searchParams.get('next') || '/';
    throw redirect(303, next);
  }
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') ?? 'email';
  const next = url.searchParams.get('next') ?? '/';

  if (!token_hash) {
    throw redirect(303, '/auth/login?error=Missing verification token');
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  if (type === 'recovery') {
    throw redirect(303, '/auth/reset-password');
  }

  if (type === 'email' || type === 'signup') {
    throw redirect(303, '/auth/login?message=Email confirmed! You can now sign in.');
  }

  throw redirect(303, next);
};
