import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'gold' | 'success' | 'danger' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-muted/15 text-foreground border-transparent',
    primary: 'bg-primary/15 text-primary border-primary/25',
    secondary: 'bg-secondary text-secondary-foreground border-secondary-foreground/15 dark:border-secondary-foreground/30',
    gold: 'bg-gold/15 text-gold-foreground dark:text-gold border-gold/30 font-medium',
    success: 'bg-success/15 text-success border-success/25',
    danger: 'bg-danger/15 text-danger border-danger/25',
    outline: 'border-border text-foreground bg-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
