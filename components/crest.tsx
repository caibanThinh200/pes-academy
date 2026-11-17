import * as React from 'react';
import { cn } from '@/lib/utils';

export function Crest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PES Academy crest"
      className={cn('h-10 w-auto select-none drop-shadow-sm', className)}
    >
      <defs>
        <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <clipPath id="crestShieldClip">
          <path d="M50 4 C75 4 92 12 92 28 C92 76 68 108 50 116 C32 108 8 76 8 28 C8 12 25 4 50 4 Z" />
        </clipPath>
      </defs>

      {/* Outer Border & Shield */}
      <path
        d="M50 4 C75 4 92 12 92 28 C92 76 68 108 50 116 C32 108 8 76 8 28 C8 12 25 4 50 4 Z"
        fill="#282327"
        stroke="url(#crestGold)"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Clipped stripes */}
      <g clipPath="url(#crestShieldClip)">
        <rect x="0" y="0" width="100" height="120" fill="#FFFFFF" />
        <rect x="8" y="0" width="20" height="120" fill="#43A1D5" />
        <rect x="42" y="0" width="16" height="120" fill="#43A1D5" />
        <rect x="72" y="0" width="20" height="120" fill="#43A1D5" />

        <path d="M0 0 L100 0 L100 32 L50 38 L0 32 Z" fill="#282327" />
        <text
          x="50"
          y="22"
          textAnchor="middle"
          fill="#FACC15"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="11"
          letterSpacing="2"
        >
          PES
        </text>
      </g>

      {/* Sun of May */}
      <g transform="translate(50, 56)">
        <g stroke="#FACC15" strokeWidth="1.8" strokeLinecap="round">
          <line x1="0" y1="-17" x2="0" y2="-12" />
          <line x1="0" y1="12" x2="0" y2="17" />
          <line x1="-17" y1="0" x2="-12" y2="0" />
          <line x1="12" y1="0" x2="17" y2="0" />
          <line x1="-12" y1="-12" x2="-8.5" y2="-8.5" />
          <line x1="8.5" y1="8.5" x2="12" y2="12" />
          <line x1="12" y1="-12" x2="8.5" y2="-8.5" />
          <line x1="-8.5" y1="8.5" x2="-12" y2="12" />
        </g>
        <circle cx="0" cy="0" r="8" fill="url(#crestGold)" stroke="#A16207" strokeWidth="1" />
      </g>

      {/* Football */}
      <g transform="translate(50, 88)">
        <circle cx="0" cy="0" r="13" fill="#FFFFFF" stroke="#282327" strokeWidth="2" />
        <polygon points="0,-4 3.8,-1.2 2.3,3.5 -2.3,3.5 -3.8,-1.2" fill="#282327" />
        <line x1="0" y1="-4" x2="0" y2="-13" stroke="#282327" strokeWidth="1.5" />
        <line x1="3.8" y1="-1.2" x2="12" y2="-3" stroke="#282327" strokeWidth="1.5" />
        <line x1="2.3" y1="3.5" x2="8" y2="10" stroke="#282327" strokeWidth="1.5" />
        <line x1="-2.3" y1="3.5" x2="-8" y2="10" stroke="#282327" strokeWidth="1.5" />
        <line x1="-3.8" y1="-1.2" x2="-12" y2="-3" stroke="#282327" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
