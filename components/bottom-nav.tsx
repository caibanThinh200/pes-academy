'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { CalendarDays, Trophy, User } from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Matches',
    icon: CalendarDays,
  },
  {
    href: '/review',
    label: 'Result',
    icon: FootballIcon,
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/80 backdrop-blur-xl transition-colors pb-safe"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : item.href === '/review'
              ? pathname.startsWith('/review') || pathname.startsWith('/result')
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1 transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive ? 'text-primary' : 'text-muted hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-indicator"
                  className="absolute inset-0 z-[-1] rounded-xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span className="mt-1 text-[11px] font-medium leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
