'use server';

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/auth-shared';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TEMP_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

const ResetTargetSchema = z.string().uuid('Invalid player ID.');

export type ResetPasswordResult =
  | { ok: true; tempPassword: string }
  | { ok?: false; error: string };

export async function resetPlayerPassword(
  userId: string
): Promise<ResetPasswordResult> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const parsedId = ResetTargetSchema.safeParse(userId);
  if (!parsedId.success) {
    return { error: 'Invalid player selected.' };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Forbidden' };
  }

  const { data: callerProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (callerProfile?.role !== 'admin') {
    return { error: 'Forbidden' };
  }

  if (parsedId.data === user.id) {
    return {
      error:
        'You cannot reset your own password here. Use Change Password instead.',
    };
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    return {
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.',
    };
  }

  const tempPassword = generateTempPassword(10);

  const { error: updateAuthError } =
    await adminClient.auth.admin.updateUserById(parsedId.data, {
      password: tempPassword,
    });

  if (updateAuthError) {
    return {
      error: updateAuthError.message || 'Failed to reset player password.',
    };
  }

  const { error: updateProfileError } = await adminClient
    .from('users')
    .update({ must_change_password: true })
    .eq('id', parsedId.data);

  if (updateProfileError) {
    return {
      error:
        updateProfileError.message ||
        'Password updated, but failed to flag must_change_password.',
    };
  }

  return { ok: true, tempPassword };
}

