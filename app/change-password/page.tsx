'use client';

import * as React from 'react';
import { Eye, EyeOff, Lock, LogOut, ShieldAlert } from 'lucide-react';
import { changePassword, type AuthActionState } from '@/app/actions/auth';
import { useAppStore } from '@/lib/store';
import { Crest } from '@/components/crest';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ChangePasswordPage() {
  const { currentUser, signOut } = useAppStore();
  const [state, formAction, isPending] = React.useActionState<
    AuthActionState,
    FormData
  >(changePassword, null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    if (state?.ok) {
      window.location.assign(state.redirectTo || '/');
    }
  }, [state]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const isForced = Boolean(currentUser?.must_change_password);

  return (
    <div className="relative w-full space-y-6">
      <div className="absolute right-0 -top-2">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center text-center space-y-2 pt-4">
        <Crest className="h-14 w-auto" />
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          PES ACADEMY
        </h1>
      </div>

      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Set a new password
          </CardTitle>
          <CardDescription>
            Choose a strong password of at least 8 characters
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isForced && (
            <div className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-foreground">
              <ShieldAlert className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <span>
                Your password was reset by an admin. Please set a new password
                before continuing.
              </span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="block text-xs font-semibold text-foreground"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 pr-11 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
              disabled={isPending}
              className="w-full font-bold"
            >
              <Lock className="h-4 w-4" />
              <span>{isPending ? 'Updating...' : 'Update password'}</span>
            </Button>
          </form>

          <div className="pt-1 border-t border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={signingOut}
              onClick={handleSignOut}
              className="w-full text-xs font-semibold text-muted hover:text-danger"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{signingOut ? 'Logging out...' : 'Log out'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

