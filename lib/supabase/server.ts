import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  REMEMBER_COOKIE,
  applyRemember,
  isSupabaseConfigured,
} from '@/lib/auth-shared';

export async function createSupabaseServerClient(opts?: {
  remember?: boolean;
}): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();
  const remember =
    opts?.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== '0';

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, applyRemember(options, remember));
          });
        } catch {
          // Called from a read-only context; proxy handles token refresh persistence.
        }
      },
    },
  });
}

