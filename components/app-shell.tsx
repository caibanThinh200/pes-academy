'use client';

import * as React from 'react';
import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';
import { InstallBanner } from './install-banner';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/20 dark:bg-black/40 flex justify-center">
      <div className="relative flex w-full max-w-md flex-col min-h-dvh bg-background text-foreground shadow-2xl border-x border-border/40">
        <AppHeader />
        <main className="flex-1 px-4 py-5 pb-28">
          <InstallBanner />
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
