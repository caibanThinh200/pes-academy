'use client';

import * as React from 'react';
import { Share, PlusSquare, CheckCircle2, Smartphone, MoreVertical } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

const BANNER_DISMISSED_KEY = 'pes_pwa_banner_dismissed_v1';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export interface PwaContextValue {
  mounted: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  canInstall: boolean;
  hasNativePrompt: boolean;
  isBannerDismissed: boolean;
  showIosGuide: boolean;
  setShowIosGuide: (open: boolean) => void;
  triggerInstall: () => Promise<void>;
  dismissBanner: () => void;
}

const PwaContext = React.createContext<PwaContextValue | null>(null);

const emptySubscribe = () => () => { };
const getClientMounted = () => true;
const getServerMounted = () => false;

function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined') return () => { };
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mql.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getStandaloneSnapshot() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as NavigatorWithStandalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

function detectIOS() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isAppleMobile || isIPadOS;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted
  );
  const isStandalone = React.useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false
  );

  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedOverride, setDismissedOverride] = React.useState<boolean | null>(
    null
  );
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  const isIOS = mounted ? detectIOS() : false;

  const isBannerDismissed = React.useMemo(() => {
    if (dismissedOverride !== null) return dismissedOverride;
    if (!mounted) return false;
    try {
      return window.localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }, [dismissedOverride, mounted]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Service worker registration may fail in unsupported contexts
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const hasNativePrompt = Boolean(deferredPrompt);
  const canInstall = !isStandalone && (hasNativePrompt || isIOS);

  const triggerInstall = React.useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowIosGuide(true);
  }, [deferredPrompt]);

  const dismissBanner = React.useCallback(() => {
    setDismissedOverride(true);
    try {
      window.localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = React.useMemo<PwaContextValue>(
    () => ({
      mounted,
      isStandalone,
      isIOS,
      canInstall,
      hasNativePrompt,
      isBannerDismissed,
      showIosGuide,
      setShowIosGuide,
      triggerInstall,
      dismissBanner,
    }),
    [
      mounted,
      isStandalone,
      isIOS,
      canInstall,
      hasNativePrompt,
      isBannerDismissed,
      showIosGuide,
      triggerInstall,
      dismissBanner,
    ]
  );

  return (
    <PwaContext.Provider value={value}>
      {children}
      <BottomSheet
        open={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        title="Install PES Academy"
        description={
          isIOS
            ? 'Add PES Academy to your iPhone or iPad Home Screen for full-screen pitch-side access.'
            : 'Install PES Academy on your device for instant app-like access.'
        }
        footer={
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowIosGuide(false)}
          >
            Got it
          </Button>
        }
      >
        {isIOS ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs">
                1
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap the Share button</span>
                  <Share className="h-3.5 w-3.5 text-primary inline" />
                </p>
                <p className="text-muted leading-relaxed">
                  Open this page in Safari and tap the Share icon in the browser toolbar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs">
                2
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Select &ldquo;Add to Home Screen&rdquo;</span>
                  <PlusSquare className="h-3.5 w-3.5 text-primary inline" />
                </p>
                <p className="text-muted leading-relaxed">
                  Scroll down the Share sheet and tap Add to Home Screen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-foreground dark:text-gold font-bold text-xs">
                3
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap &ldquo;Add&rdquo; to finish</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success inline" />
                </p>
                <p className="text-muted leading-relaxed">
                  Launch PES Academy anytime from your Home Screen without browser bars.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs">
                1
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap the browser menu</span>
                  <MoreVertical className="h-3.5 w-3.5 text-primary inline" />
                  <span>or Share icon</span>
                </p>
                <p className="text-muted leading-relaxed">
                  On Android Chrome, tap the <span className="font-semibold text-foreground">⋮</span> menu in the top-right corner (or the install icon in your desktop address bar).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs">
                2
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;</span>
                  <Smartphone className="h-3.5 w-3.5 text-primary inline" />
                </p>
                <p className="text-muted leading-relaxed">
                  Confirm the prompt to add PES Academy to your home screen for full-screen pitch-side access.
                </p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </PwaContext.Provider>
  );
}

export function usePwa(): PwaContextValue {
  const ctx = React.useContext(PwaContext);
  if (!ctx) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return ctx;
}

