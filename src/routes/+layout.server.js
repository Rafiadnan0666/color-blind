export const load = async ({ locals: { safeGetSession } }) => {
  return safeGetSession();
};
