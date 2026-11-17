import * as React from 'react';

export interface FootballIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export function FootballIcon({
  className,
  size = 24,
  strokeWidth = 2,
  'aria-hidden': ariaHidden = true,
  ...props
}: FootballIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 7.5 16.3 10.6 14.6 15.6 9.4 15.6 7.7 10.6" />
      <path d="M12 7.5V2" />
      <path d="m16.3 10.6 5.2-1.7" />
      <path d="m14.6 15.6 3.3 4.5" />
      <path d="m9.4 15.6-3.3 4.5" />
      <path d="m7.7 10.6-5.2-1.7" />
    </svg>
  );
}

export default FootballIcon;
