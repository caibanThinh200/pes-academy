import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMatchDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatTimestamp(seconds: number): string {
  const totalSec = Math.floor(Math.max(0, seconds));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a canonical 11-character YouTube video ID from watch, youtu.be,
 * live, embed, or shorts URLs.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    let candidateId: string | null = null;

    if (hostname === 'youtu.be') {
      candidateId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        candidateId = parsed.searchParams.get('v');
      } else {
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (
          segments.length >= 2 &&
          (segments[0] === 'live' || segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'v')
        ) {
          candidateId = segments[1];
        }
      }
    }

    if (candidateId && YOUTUBE_ID_REGEX.test(candidateId)) {
      return candidateId;
    }
    return null;
  } catch {
    return null;
  }
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return Boolean(extractYouTubeVideoId(url));
}

export function normalizeYouTubeUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
