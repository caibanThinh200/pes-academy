'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldAlert, Award, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { JerseyNumber } from '@/components/ui/jersey-number';

export default function ProfilePage() {
  const { currentUser, users, setCurrentUserId, resetDemoData } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const [resetSuccess, setResetSuccess] = React.useState(false);

  const handleReset = () => {
    resetDemoData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  if (!currentUser) return null;

  const animationProps = shouldReduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 12 },
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
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-3">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gold-foreground dark:text-gold mb-1">
                  <Award className="h-3.5 w-3.5" />
                  <span>Goals</span>
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {currentUser.total_goals}
                </div>
              </div>

              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-3">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-primary mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Saves</span>
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {currentUser.total_saves}
                </div>
              </div>

              <div className="rounded-xl border border-secondary/30 dark:border-border bg-secondary/15 dark:bg-secondary/70 p-3">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-danger mb-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Penalties</span>
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {currentUser.penalty_count}
                </div>
              </div>
            </div>

            {/* Impersonation Switcher for Demo */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label
                htmlFor="user-switcher"
                className="block text-xs font-semibold text-muted"
              >
                Switch Player (Demo Preview)
              </label>
              <select
                id="user-switcher"
                value={currentUser.id}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.jersey_number != null ? `#${u.jersey_number} ` : ''}{u.name} ({u.position.toUpperCase()}) - {u.role}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
