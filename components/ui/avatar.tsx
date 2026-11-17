import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const BG_PALETTE = [
  'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-400/30',
  'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-400/30',
  'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-400/30',
  'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-400/30',
  'bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-400/30',
  'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-400/30',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDeterministicColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BG_PALETTE.length;
  return BG_PALETTE[index];
}

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base font-bold',
  };

  const initials = getInitials(name);
  const colorClass = getDeterministicColor(name);

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border font-semibold select-none overflow-hidden',
        sizeStyles[size],
        colorClass,
        className
      )}
      title={name}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
