import { redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase/server.js';

export const GET = async ({ url, cookies, setHeaders }) => {
  const supabase = createSupabaseServerClient(cookies, setHeaders);

  // Handle PKCE code exchange (for default email templates with {{ .ConfirmationURL }})
  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw redirect(303, `/auth/login?error=${encodeURIComponent(error.message)}`);
    }
    const next = url.searchParams.get('next') || '/';
    throw redirect(303, next);
  }

  // Handle token_hash verification (for custom email templates using {{ .TokenHash }})
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
