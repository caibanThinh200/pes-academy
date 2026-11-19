'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { AppStoreProvider } from '@/lib/store';
import { PwaProvider } from '@/components/pwa-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PwaProvider>
        <AppStoreProvider>{children}</AppStoreProvider>
      </PwaProvider>
    </ThemeProvider>
  );
}
