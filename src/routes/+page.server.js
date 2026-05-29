import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (!session) {
    throw redirect(303, '/auth/login');
  }
  return {};
};
