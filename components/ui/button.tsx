import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variantStyles = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]',
      secondary:
        'bg-secondary text-secondary-foreground border border-border/60 hover:bg-secondary/85 shadow-xs active:scale-[0.98]',
      ghost:
        'text-foreground hover:bg-muted/10 active:bg-muted/20',
      gold:
        'bg-gold text-gold-foreground font-semibold hover:bg-gold/90 shadow-sm active:scale-[0.98]',
      danger:
        'bg-danger text-white hover:bg-danger/90 shadow-sm active:scale-[0.98]',
      outline:
        'border border-border bg-transparent text-foreground hover:bg-muted/10 active:scale-[0.98]',
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs rounded-xl min-h-[36px]',
      md: 'h-11 px-4 text-sm rounded-xl min-h-[44px]',
      lg: 'h-12 px-6 text-base rounded-2xl min-h-[48px]',
      icon: 'h-11 w-11 p-0 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
