export const REMEMBER_COOKIE = 'pes_remember';
export const REMEMBER_MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // 400 days
export const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,32}$/;

export const AUTH_ROUTES = ['/login', '/forgot-password'] as const;
export const PUBLIC_ROUTES = AUTH_ROUTES;
export const CHANGE_PASSWORD_ROUTE = '/change-password';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
);

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@pes.local`;
}

export function applyRemember<
  T extends { maxAge?: number; expires?: Date | string | number },
>(options: T | undefined, remember: boolean): T {
  const next = { ...(options ?? {}) } as T;
  if (remember) {
    return next;
  }

  // Preserve explicit cookie deletions (maxAge <= 0 or past expires)
  if (typeof next.maxAge === 'number' && next.maxAge <= 0) {
    return next;
  }
  if (next.expires instanceof Date && next.expires.getTime() <= Date.now()) {
    return next;
  }

  delete next.maxAge;
  delete next.expires;
  return next;
}

