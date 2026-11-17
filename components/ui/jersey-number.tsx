import * as React from 'react';
import { cn } from '@/lib/utils';

export interface JerseyNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  number: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'gold' | 'surface';
}

export function JerseyNumber({
  number,
  size = 'md',
  variant = 'primary',
  className,
  ...props
}: JerseyNumberProps) {
  if (number == null) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1 py-0.2 min-w-[18px] h-4',
    md: 'text-[11px] px-1.5 py-0.5 min-w-[22px] h-5',
    lg: 'text-xs px-2 py-0.5 min-w-[26px] h-6 font-extrabold',
  };

  const variantClasses = {
    primary: 'bg-primary/15 text-primary border-primary/25',
    secondary: 'bg-secondary text-secondary-foreground border-secondary-foreground/20',
    gold: 'bg-gold/15 text-gold-foreground dark:text-gold border-gold/30',
    surface: 'bg-surface text-foreground border-border shadow-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-bold tabular-nums border leading-none shrink-0 select-none tracking-tight',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label={`Shirt number ${number}`}
      {...props}
    >
      #{number}
    </span>
  );
}

export default JerseyNumber;
