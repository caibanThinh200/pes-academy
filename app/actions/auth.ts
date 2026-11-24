'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  CHANGE_PASSWORD_ROUTE,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE_SECONDS,
  USERNAME_REGEX,
  isSupabaseConfigured,
  usernameToEmail,
} from '@/lib/auth-shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthActionState = {
  ok?: boolean;
  error?: string;
  redirectTo?: string;
} | null;

const LoginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, 'Incorrect account name or password.'),
  password: z.string().min(6, 'Incorrect account name or password.'),
});

const ChangePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password is too long.'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const rawUsername = String(formData.get('username') ?? '');
  const rawPassword = String(formData.get('password') ?? '');
  const remember = formData.get('remember') === 'on';

  const parsed = LoginSchema.safeParse({
    username: rawUsername,
    password: rawPassword,
  });

  if (!parsed.success) {
    return { error: 'Incorrect account name or password.' };
  }

  const supabase = await createSupabaseServerClient({ remember });
  if (!supabase) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: 'Incorrect account name or password.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? '1' : '0', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
  });

  const { data: profile } = await supabase
    .from('users')
    .select('must_change_password')
    .eq('id', data.user.id)
    .maybeSingle();

  const mustChange = Boolean(profile?.must_change_password);
  return {
    ok: true,
    redirectTo: mustChange ? CHANGE_PASSWORD_ROUTE : '/',
  };
}

export async function logout(): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_COOKIE);

  return { ok: true };
}

export async function changePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const parsed = ChangePasswordSchema.safeParse({
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? 'Invalid password input.' };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: 'Supabase is not configured in this environment.' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Your session has expired. Please log in again.' };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    return { error: updateError.message || 'Could not update password.' };
  }

  const { error: rpcError } = await supabase.rpc('clear_must_change_password');
  if (rpcError) {
    return {
      error:
        'Password updated, but failed to clear reset flag. Please contact an admin.',
    };
  }

  return { ok: true, redirectTo: '/' };
}

