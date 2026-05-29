import { redirect } from '@sveltejs/kit';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export const load = async ({ locals: { safeGetSession }, url }) => {
  if (!PUBLIC_AUTH_PATHS.includes(url.pathname)) return {};

  const { session } = await safeGetSession();
  if (session) {
    throw redirect(303, '/');
  }
  return {};
};
