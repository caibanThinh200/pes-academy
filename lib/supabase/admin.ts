import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isSupabaseConfigured } from '@/lib/auth-shared';

export function createSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey || serviceRoleKey.includes('your-service-role-key')) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

