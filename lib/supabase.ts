import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  REMEMBER_COOKIE,
  applyRemember,
  isSupabaseConfigured,
} from './auth-shared';

export { isSupabaseConfigured };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function parseDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined' || !document.cookie) {
    return [];
  }

  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf('=');
      if (idx === -1) {
        return { name: decodeURIComponent(entry), value: '' };
      }
      return {
        name: decodeURIComponent(entry.slice(0, idx)),
        value: decodeURIComponent(entry.slice(idx + 1)),
      };
    });
}

function readBrowserCookie(name: string): string | undefined {
  return parseDocumentCookies().find((c) => c.name === name)?.value;
}

function serializeBrowserCookie(
  name: string,
  value: string,
  options: CookieOptions
): string {
  const parts: string[] = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
  ];

  parts.push(`Path=${options.path ?? '/'}`);

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    const expiresDate =
      options.expires instanceof Date
        ? options.expires
        : new Date(options.expires);
    parts.push(`Expires=${expiresDate.toUTCString()}`);
  }
  if (options.sameSite) {
    const sameSite =
      typeof options.sameSite === 'boolean'
        ? options.sameSite
          ? 'Strict'
          : undefined
        : options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
    if (sameSite) {
      parts.push(`SameSite=${sameSite}`);
    }
  } else {
    parts.push('SameSite=Lax');
  }
  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export const supabase: SupabaseClient<Database> | null =
  isSupabaseConfigured && typeof window !== 'undefined'
    ? createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        cookies: {
          getAll() {
            return parseDocumentCookies();
          },
          setAll(cookiesToSet) {
            if (typeof document === 'undefined') return;
            const remember = readBrowserCookie(REMEMBER_COOKIE) !== '0';
            cookiesToSet.forEach(({ name, value, options }) => {
              const adjusted = applyRemember(options, remember);
              document.cookie = serializeBrowserCookie(name, value, adjusted);
            });
          },
        },
      })
    : null;
