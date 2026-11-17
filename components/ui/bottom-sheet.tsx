'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const subscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const mounted = React.useSyncExternalStore(subscribe, isClient, isServer);
  const shouldReduceMotion = useReducedMotion();
  const titleId = React.useId();
  const descId = React.useId();

  // Lock body scroll and handle Escape key
  React.useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  if (!mounted) return null;

  const panelTransition = shouldReduceMotion
    ? { duration: 0.2 }
    : { type: 'spring' as const, damping: 30, stiffness: 300 };

  const panelAnimation = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="relative z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Bottom Sheet Container */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descId : undefined}
              drag={shouldReduceMotion ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              {...panelAnimation}
              transition={panelTransition}
              className={cn(
                'pointer-events-auto w-full max-w-md rounded-t-3xl border-t border-border bg-surface shadow-2xl max-h-[85dvh] flex flex-col',
                className
              )}
            >
              {/* Drag Handle */}
              <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-muted/30 shrink-0 cursor-grab active:cursor-grabbing" />

              {/* Header */}
              {(title || description) && (
                <div className="flex items-start justify-between px-5 pt-1 pb-3 shrink-0">
                  <div className="space-y-0.5 pr-4">
                    {title && (
                      <h2 id={titleId} className="text-lg font-bold text-foreground">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={descId} className="text-xs text-muted">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full text-muted hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="overflow-y-auto px-5 py-2 flex-1 overscroll-contain">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-5 pt-3 pb-safe shrink-0 border-t border-border/40 mb-2">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
