'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VoteToggleButtonProps {
  joined: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoteToggleButton({ joined, onToggle, disabled = false }: VoteToggleButtonProps) {
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [showRipple, setShowRipple] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (disabled) return;

    if (!joined) {
      setShowRipple(true);
      setTimeout(() => setShowRipple(false), 500);
      setFeedback('Spot confirmed ⚽');
    } else {
      setFeedback("You've withdrawn");
    }

    onToggle();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 2000);
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative w-full">
        <motion.div whileTap={disabled ? undefined : { scale: 0.96 }}>
          <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={handleClick}
            className={cn(
              'relative w-full overflow-hidden transition-all duration-200 font-bold',
              joined
                ? 'border-2 border-success/40 bg-success/10 text-success hover:bg-success/20 shadow-none'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
            )}
          >
            {/* Burst / Ripple ring on join */}
            {showRipple && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-0 rounded-2xl border-2 border-success pointer-events-none"
              />
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {joined ? (
                <motion.div
                  key="joined"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <Check className="h-5 w-5 stroke-[2.5]" />
                  <span>You&apos;re In</span>
                  <span className="text-xs font-normal opacity-80">· Tap to withdraw</span>
                </motion.div>
              ) : (
                <motion.div
                  key="join"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Join Match</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>

      {/* Transient confirmation feedback line */}
      <AnimatePresence>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center text-xs font-semibold text-primary"
          >
            {feedback}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
