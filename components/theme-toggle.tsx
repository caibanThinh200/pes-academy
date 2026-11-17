'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { switchThemeWithTransition } from '@/lib/theme-transition';

const isMounted = () => true;
const isServer = () => false;
const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(subscribe, isMounted, isServer);

  if (!mounted) {
    return (
      <div className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-surface/50 p-2" aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const origin = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        const next = isDark ? 'light' : 'dark';
        switchThemeWithTransition(() => setTheme(next), origin);
      }}
      className="relative flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-sm transition-colors hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer select-none"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center justify-center text-primary"
          >
            <Moon className="h-5 w-5" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center justify-center text-gold-foreground"
          >
            <Sun className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
