'use client';

import * as React from 'react';
import Link from 'next/link';
import { Crest } from './crest';
import { ThemeToggle } from './theme-toggle';
import { RoleSwitcher } from './role-switcher';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/85 backdrop-blur-md transition-colors pt-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        {/* Left: Brand Crest & Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="PES Academy Home"
        >
          <Crest className="h-9 w-auto" />
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-foreground leading-none">
              PES ACADEMY
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-primary uppercase mt-0.5">
              La Albiceleste
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
