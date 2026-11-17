'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { AppStoreProvider } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppStoreProvider>{children}</AppStoreProvider>
    </ThemeProvider>
  );
}
