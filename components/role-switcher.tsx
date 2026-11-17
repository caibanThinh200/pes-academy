'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, User as UserIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function RoleSwitcher() {
  const { role, setRole } = useAppStore();

  return (
    <div
      role="radiogroup"
      aria-label="Active role selector"
      className="inline-flex h-10 items-center rounded-xl border border-border bg-surface/70 p-1 shadow-sm backdrop-blur-sm"
    >
      <button
        type="button"
        role="radio"
        aria-checked={role === 'player'}
        onClick={() => setRole('player')}
        className={cn(
          'relative z-10 flex h-8 min-h-[36px] items-center gap-1.5 px-3 text-xs font-semibold rounded-lg transition-colors select-none cursor-pointer',
          role === 'player' ? 'text-primary-foreground dark:text-primary-foreground' : 'text-muted hover:text-foreground'
        )}
      >
        {role === 'player' && (
          <motion.div
            layoutId="role-pill-active"
            className="absolute inset-0 z-[-1] rounded-lg bg-primary shadow-xs"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <UserIcon className="h-3.5 w-3.5" />
        <span>Player</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={role === 'admin'}
        onClick={() => setRole('admin')}
        className={cn(
          'relative z-10 flex h-8 min-h-[36px] items-center gap-1.5 px-3 text-xs font-semibold rounded-lg transition-colors select-none cursor-pointer',
          role === 'admin' ? 'text-gold-foreground font-bold' : 'text-muted hover:text-foreground'
        )}
      >
        {role === 'admin' && (
          <motion.div
            layoutId="role-pill-active"
            className="absolute inset-0 z-[-1] rounded-lg bg-gold shadow-xs"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <ShieldAlert className="h-3.5 w-3.5 text-gold-foreground" />
        <span>Admin</span>
      </button>
    </div>
  );
}
