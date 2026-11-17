import { flushSync } from 'react-dom';

export interface TransitionOrigin {
  x: number;
  y: number;
}

export function switchThemeWithTransition(
  apply: () => void,
  origin?: TransitionOrigin
): void {
  if (
    typeof document === 'undefined' ||
    typeof window === 'undefined' ||
    !('startViewTransition' in document) ||
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    apply();
    return;
  }

  const x = origin?.x ?? Math.max(window.innerWidth - 40, 0);
  const y = origin?.y ?? 40;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(() => {
    flushSync(apply);
  });

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch(() => {
      // Fallback silently if the transition is aborted
    });
}
