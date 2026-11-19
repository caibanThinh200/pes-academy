'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';
import { usePwa } from '@/components/pwa-provider';
import { Button } from '@/components/ui/button';

export function InstallBanner() {
  const { mounted, isStandalone, isBannerDismissed, canInstall, triggerInstall, dismissBanner } =
    usePwa();

  if (!mounted || isStandalone || isBannerDismissed || !canInstall) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Install PES Academy"
      className="bg-surface border border-primary/30 rounded-2xl p-3.5 mb-4 shadow-sm flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">
            Install PES Academy
          </p>
          <p className="text-[11px] text-muted leading-tight">
            Add to home screen for instant pitch-side access
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void triggerInstall()}
          className="h-8 min-h-[32px] px-3 text-xs font-semibold"
        >
          Install
        </Button>
        <button
          type="button"
          onClick={dismissBanner}
          aria-label="Dismiss install banner"
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

