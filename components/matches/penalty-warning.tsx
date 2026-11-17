'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

export interface PenaltyWarningProps {
  count: number;
}

export function PenaltyWarning({ count }: PenaltyWarningProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!count || count <= 0) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
      animate={
        shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 1, x: [0, -4, 4, -2, 2, 0] }
      }
      transition={{ duration: 0.4 }}
      className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-danger shadow-xs"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="space-y-0.5 text-xs">
        <p className="font-bold">
          {count} active penalty point{count > 1 ? 's' : ''}
        </p>
        <p className="text-danger/90 leading-relaxed">
          Missed check-ins after voting add penalties. Show up to keep your record clean.
        </p>
      </div>
    </motion.div>
  );
}
