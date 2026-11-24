'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  ShieldAlert,
  Award,
  RotateCcw,
  Check,
  Sparkles,
  Smartphone,
  Download,
  CheckCircle2,
  KeyRound,
  LogOut,
  Copy,
  UserCog,
  Handshake,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { usePwa } from '@/components/pwa-provider';
import { resetPlayerPassword } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { JerseyNumber } from '@/components/ui/jersey-number';

export default function ProfilePage() {
  const { currentUser, users, role, resetDemoData, signOut } = useAppStore();
  const { isStandalone, triggerInstall } = usePwa();
  const shouldReduceMotion = useReducedMotion();
  const [resetSuccess, setResetSuccess] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const otherUsers = React.useMemo(
    () => (currentUser ? users.filter((u) => u.id !== currentUser.id) : []),
    [users, currentUser]
  );
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [resetPending, setResetPending] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [resetError, setResetError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const resolvedSelectedUserId = otherUsers.some((u) => u.id === selectedUserId)
    ? selectedUserId
    : (otherUsers[0]?.id ?? '');

  const handleReset = () => {
    resetDemoData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const handleResetPassword = async () => {
    if (!resolvedSelectedUserId) return;
    setResetPending(true);
    setTempPassword(null);
    setResetError(null);
    setCopied(false);

    try {
      const res = await resetPlayerPassword(resolvedSelectedUserId);
      if (res.ok) {
        setTempPassword(res.tempPassword);
      } else {
        setResetError(res.error);
      }
    } catch {
      setResetError('Failed to reset player password.');
    } finally {
      setResetPending(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  if (!currentUser) return null;

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: false as const,
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25, ease: 'easeOut' as const },
      };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Player Profile
          </h1>
          <p className="text-xs text-muted">Academy registration & personal stats</p>
        </div>
        <Badge
          variant={currentUser.role === 'admin' ? 'gold' : 'primary'}
          className="capitalize text-xs font-semibold"
        >
          {currentUser.role}
        </Badge>
      </div>

      {/* Profile Card */}
      <motion.div {...animationProps}>
        <Card className="border-border bg-surface shadow-sm overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Avatar
                name={currentUser.name}
                src={currentUser.avatar_url}
                size="lg"
                className="h-20 w-20 text-2xl ring-4 ring-primary/20 shadow-md"
              />
            </div>
            <CardTitle className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
              <span>{currentUser.name}</span>
              <JerseyNumber number={currentUser.jersey_number} size="md" />
            </CardTitle>
            {currentUser.username && (
              <p className="text-xs font-medium text-muted">
                @{currentUser.username}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                {currentUser.position === 'gk' ? 'Goalkeeper' : 'Field Player'}
              </Badge>
              {currentUser.role === 'admin' && (
                <Badge variant="gold" className="text-xs">
                  Academy Captain
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-gold-foreground dark:text-gold mb-1">
                  <Award className="h-3 w-3 shrink-0" />
                  <span>Goals</span>
                </div>
                <div className="text-lg font-extrabold text-foreground">
                  {currentUser.total_goals}
                </div>
              </div>

              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-violet-500 mb-1">
                  <Handshake className="h-3 w-3 shrink-0" />
                  <span>Assists</span>
                </div>
                <div className="text-lg font-extrabold text-foreground">
                  {currentUser.total_assists}
                </div>
              </div>

              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-primary mb-1">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span>Saves</span>
                </div>
                <div className="text-lg font-extrabold text-foreground">
                  {currentUser.total_saves}
                </div>
              </div>

              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-2">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-danger mb-1">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>Penalties</span>
                </div>
                <div className="text-lg font-extrabold text-foreground">
                  {currentUser.penalty_count}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Card */}
      <Card className="border-border bg-surface shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span>Account</span>
          </CardTitle>
          <CardDescription>
            Manage your password and active session
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2.5 pt-1">
          <Link href="/change-password" className="block">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full text-xs font-semibold"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Change password</span>
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={signingOut}
            onClick={handleSignOut}
            className="w-full text-xs font-semibold border-danger/30 text-danger hover:bg-danger/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{signingOut ? 'Logging out...' : 'Log out'}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Admin: Reset Player Password */}
      {role === 'admin' && otherUsers.length > 0 && (
        <Card className="border-border bg-surface shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <UserCog className="h-4 w-4 text-gold" />
              <span>Reset player password</span>
            </CardTitle>
            <CardDescription>
              Issue a temporary password when a teammate forgets theirs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="reset-player-select"
                className="block text-xs font-semibold text-muted"
              >
                Select player
              </label>
              <select
                id="reset-player-select"
                value={resolvedSelectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setTempPassword(null);
                  setResetError(null);
                }}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.jersey_number != null ? ` (#${u.jersey_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="gold"
              size="md"
              disabled={resetPending || !resolvedSelectedUserId}
              onClick={handleResetPassword}
              className="w-full text-xs font-bold"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>
                {resetPending ? 'Resetting password...' : 'Generate temporary password'}
              </span>
            </Button>

            {tempPassword && (
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-sm font-extrabold tracking-wider text-foreground select-all">
                    {tempPassword}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="h-8 px-2.5 text-xs font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] font-medium text-muted">
                  Player must change it on next login.
                </p>
              </div>
            )}

            {resetError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger"
              >
                {resetError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* App Installation */}
      <Card className="border-border bg-surface shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">App Installation</p>
                <p className="text-xs text-muted">
                  {isStandalone
                    ? 'Running in full-screen standalone mode'
                    : 'Add PES Academy to your home screen for quick pitch-side access'}
                </p>
              </div>
            </div>
          </div>

          {isStandalone ? (
            <Badge variant="success" className="w-fit gap-1.5 py-1 px-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>App Installed (Standalone Mode)</span>
            </Badge>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void triggerInstall()}
              className="w-full justify-center gap-2 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              <span>Install App to Home Screen</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reset Demo Data Action */}
      <div className="pt-2">
        <Button
          variant="secondary"
          size="md"
          onClick={handleReset}
          className="w-full justify-center gap-2 border-dashed border-border hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-xs font-semibold transition-all"
        >
          {resetSuccess ? (
            <>
              <Check className="h-4 w-4 text-success" />
              <span className="text-success">Demo data reset to default</span>
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              <span>Reset Demo Data to Initial Seed</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
