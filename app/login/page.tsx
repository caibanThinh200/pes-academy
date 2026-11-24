'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { login, type AuthActionState } from '@/app/actions/auth';
import { isSupabaseConfigured } from '@/lib/auth-shared';
import { Crest } from '@/components/crest';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [state, formAction, isPending] = React.useActionState<
    AuthActionState,
    FormData
  >(login, null);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) {
      window.location.assign(state.redirectTo || '/');
    }
  }, [state]);

  return (
    <div className="relative w-full space-y-6">
      <div className="absolute right-0 -top-2">
        <ThemeToggle />
      </div>

      {/* Brand Hero */}
      <div className="flex flex-col items-center text-center space-y-2 pt-4">
        <Crest className="h-16 w-auto" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            PES ACADEMY
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            La Albiceleste
          </p>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3.5 text-xs text-foreground space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Supabase is not configured</p>
              <p className="text-muted mt-0.5">
                Running in local demo mode. Add{' '}
                <code className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
                and{' '}
                <code className="font-mono text-[11px]">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{' '}
                to enable authentication.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
          >
            Continue to demo app &rarr;
          </Link>
        </div>
      )}

      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Sign in</CardTitle>
          <CardDescription>
            Enter your academy account name and password
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-foreground"
              >
                Account name
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. leo"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 pr-11 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {state?.error && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs font-medium text-danger"
              >
                {state.error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isPending || !isSupabaseConfigured}
              className="w-full font-bold"
            >
              <LogIn className="h-4 w-4" />
              <span>{isPending ? 'Signing in...' : 'Sign in'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

