'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Sparkles,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { MatchEvent } from '@/types/database';
import { extractYouTubeVideoId, formatTimestamp, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface MatchVideoPlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getDuration: () => number;
}

interface MatchVideoPlayerProps {
  videoUrl: string | null;
  matchTitle: string;
  events: MatchEvent[];
  activeEventId: string | null;
  onSelectEvent: (event: MatchEvent) => void;
  seekFeedback: string | null;
  playerRef?: React.RefObject<MatchVideoPlayerHandle | null>;
  onDurationChange?: (durationSec: number) => void;
}

interface YTPlayerInstance {
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
}

interface YTPlayerConstructor {
  new(
    element: HTMLElement | string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: () => void;
      };
    }
  ): YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: {
      Player?: YTPlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_API_CALLBACKS: Array<() => void> = [];
let youtubeScriptLoading = false;

function loadYouTubeIframeApi(onReady: () => void) {
  if (typeof window === 'undefined') return;
  if (window.YT?.Player) {
    onReady();
    return;
  }

  YOUTUBE_API_CALLBACKS.push(onReady);

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[src="https://www.youtube.com/iframe_api"]'
  );

  if (!existingScript && !youtubeScriptLoading) {
    youtubeScriptLoading = true;
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      youtubeScriptLoading = false;
      while (YOUTUBE_API_CALLBACKS.length > 0) {
        const cb = YOUTUBE_API_CALLBACKS.shift();
        cb?.();
      }
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  }
}

export function MatchVideoPlayer({
  videoUrl,
  matchTitle,
  events,
  activeEventId,
  onSelectEvent,
  seekFeedback,
  playerRef,
  onDurationChange,
}: MatchVideoPlayerProps) {
  const youtubeVideoId = React.useMemo(() => extractYouTubeVideoId(videoUrl), [videoUrl]);
  const isYouTubeMode = Boolean(youtubeVideoId);

  const htmlVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const ytMountRef = React.useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = React.useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = React.useRef(false);
  const pendingSeekRef = React.useRef<number | null>(null);
  const pendingPlayRef = React.useRef(false);
  const onDurationChangeRef = React.useRef(onDurationChange);

  React.useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(180);
  const [videoError, setVideoError] = React.useState(false);

  const fallbackUrl =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const effectiveUrl = !isYouTubeMode ? videoUrl || fallbackUrl : fallbackUrl;

  const activeEvent = React.useMemo(
    () => events.find((e) => e.id === activeEventId) ?? null,
    [events, activeEventId]
  );

  // Reset error & playback state when source changes
  React.useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    if (!isYouTubeMode) {
      setDuration(180);
    }
  }, [videoUrl, isYouTubeMode]);

  // Mount & manage YouTube IFrame Player
  React.useEffect(() => {
    if (!youtubeVideoId) {
      ytReadyRef.current = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    ytReadyRef.current = false;

    const initPlayer = () => {
      if (cancelled || !ytMountRef.current || !window.YT?.Player) return;

      // Clear previous mount child so YT replaces a clean node
      ytMountRef.current.innerHTML = '';
      const targetDiv = document.createElement('div');
      targetDiv.className = 'h-full w-full';
      ytMountRef.current.appendChild(targetDiv);

      const player = new window.YT.Player(targetDiv, {
        videoId: youtubeVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            ytPlayerRef.current = e.target;
            ytReadyRef.current = true;
            setVideoError(false);

            const dur = e.target.getDuration();
            if (Number.isFinite(dur) && dur > 0) {
              setDuration(dur);
              onDurationChangeRef.current?.(dur);
            }

            setIsMuted(Boolean(e.target.isMuted?.()));

            if (pendingSeekRef.current !== null) {
              e.target.seekTo(pendingSeekRef.current, true);
              setCurrentTime(pendingSeekRef.current);
              pendingSeekRef.current = null;
            }
            if (pendingPlayRef.current) {
              e.target.playVideo();
              pendingPlayRef.current = false;
            }
          },
          onStateChange: (e) => {
            if (cancelled) return;
            // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            if (e.data === 1) {
              setIsPlaying(true);
            } else if (e.data === 2 || e.data === 0) {
              setIsPlaying(false);
            }

            const dur = e.target.getDuration();
            if (Number.isFinite(dur) && dur > 0) {
              setDuration(dur);
              onDurationChangeRef.current?.(dur);
            }
          },
          onError: () => {
            if (!cancelled) {
              setVideoError(true);
            }
          },
        },
      });

      ytPlayerRef.current = player;
    };

    loadYouTubeIframeApi(initPlayer);

    return () => {
      cancelled = true;
      ytReadyRef.current = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
      if (ytMountRef.current) {
        ytMountRef.current.innerHTML = '';
      }
    };
  }, [youtubeVideoId]);

  // Poll YouTube player time & duration while active
  React.useEffect(() => {
    if (!isYouTubeMode) return;

    const interval = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;

      try {
        const cur = player.getCurrentTime?.();
        if (typeof cur === 'number' && Number.isFinite(cur)) {
          setCurrentTime(cur);
        }
        const dur = player.getDuration?.();
        if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
          setDuration((prev) => {
            if (Math.abs(prev - dur) > 0.5) {
              onDurationChangeRef.current?.(dur);
            }
            return dur;
          });
        }
      } catch {
        // ignore transient iframe errors
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isYouTubeMode, isPlaying]);

  const seekToSeconds = React.useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, seconds);
      setCurrentTime(clamped);

      if (isYouTubeMode) {
        if (ytPlayerRef.current && ytReadyRef.current) {
          ytPlayerRef.current.seekTo(clamped, true);
        } else {
          pendingSeekRef.current = clamped;
        }
      } else if (htmlVideoRef.current) {
        htmlVideoRef.current.currentTime = clamped;
      }
    },
    [isYouTubeMode]
  );

  const playMedia = React.useCallback(() => {
    if (isYouTubeMode) {
      if (ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } else {
        pendingPlayRef.current = true;
      }
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => { });
    }
  }, [isYouTubeMode]);

  const pauseMedia = React.useCallback(() => {
    if (isYouTubeMode) {
      pendingPlayRef.current = false;
      if (ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isYouTubeMode]);

  const getMediaDuration = React.useCallback(() => {
    if (isYouTubeMode && ytPlayerRef.current && ytReadyRef.current) {
      const dur = ytPlayerRef.current.getDuration();
      if (Number.isFinite(dur) && dur > 0) return dur;
    }
    if (!isYouTubeMode && htmlVideoRef.current) {
      const dur = htmlVideoRef.current.duration;
      if (Number.isFinite(dur) && dur > 0) return dur;
    }
    return duration;
  }, [isYouTubeMode, duration]);

  React.useImperativeHandle(
    playerRef,
    () => ({
      seekTo: seekToSeconds,
      play: playMedia,
      pause: pauseMedia,
      getDuration: getMediaDuration,
    }),
    [seekToSeconds, playMedia, pauseMedia, getMediaDuration]
  );

  const handleLoadedMetadata = () => {
    if (
      htmlVideoRef.current &&
      Number.isFinite(htmlVideoRef.current.duration) &&
      htmlVideoRef.current.duration > 0
    ) {
      const dur = htmlVideoRef.current.duration;
      setDuration(dur);
      onDurationChangeRef.current?.(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (htmlVideoRef.current) {
      setCurrentTime(htmlVideoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseMedia();
    } else {
      playMedia();
    }
  };

  const toggleMute = () => {
    if (isYouTubeMode) {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;
      if (player.isMuted()) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } else if (htmlVideoRef.current) {
      const nextMuted = !htmlVideoRef.current.muted;
      htmlVideoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  // Compute maximum timeline width for markers
  const maxEventTime = events.reduce((max, e) => Math.max(max, e.timestamp_sec), 0);
  const timelineDuration = Math.max(duration, maxEventTime + 10, 160);

  const skipRelative = (seconds: number) => {
    const newTime = Math.max(0, Math.min(timelineDuration, currentTime + seconds));
    seekToSeconds(newTime);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetSec = (clickX / rect.width) * timelineDuration;
    seekToSeconds(targetSec);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black/90 shadow-lg">
      {/* Video Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {isYouTubeMode ? (
          <div ref={ytMountRef} className="h-full w-full" />
        ) : (
          <video
            ref={htmlVideoRef}
            src={effectiveUrl}
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setVideoError(true)}
            className="h-full w-full object-cover"
          />
        )}

        {/* Video Error Fallback */}
        {videoError && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center text-white">
            <AlertCircle className="mb-2 h-8 w-8 text-danger" />
            <p className="text-xs font-semibold">
              {isYouTubeMode ? 'YouTube embed unavailable' : 'Video stream preview simulated'}
            </p>
            <p className="mt-1 text-[11px] text-white/70">
              Interactive timeline & event seeking remain active for testing.
            </p>
          </div>
        )}

        {/* Floating Seek Feedback Toast */}
        <AnimatePresence>
          {seekFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute left-3 right-3 top-11 z-20 flex justify-center"
            >
              <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-black/85 px-3.5 py-1.5 text-xs font-bold text-gold shadow-md backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>{seekFeedback}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Play/Pause Overlay Button (HTML5 <video> mode only so YouTube native controls stay unobstructed) */}
        {!isYouTubeMode && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className={cn(
              'absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30',
              isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
            )}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md transition-transform hover:scale-110 active:scale-95">
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 translate-x-0.5" />
              )}
            </div>
          </button>
        )}

        {/* Top Gradient HUD */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-bold tracking-tight text-white/95">
              {matchTitle}
            </span>
            {activeEvent && (
              <span className="shrink-0 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-gold">
                {activeEvent.event_type === 'goal' ? 'GOAL' : 'SAVE'} @{' '}
                {activeEvent.timestamp_formatted || formatTimestamp(activeEvent.timestamp_sec)}
              </span>
            )}
          </div>
          <Badge variant="gold" className="shrink-0 text-[10px] font-bold">
            {isYouTubeMode ? 'YouTube HD' : 'HD 1080p'}
          </Badge>
        </div>
      </div>

      {/* Interactive Timeline & Transport Bar */}
      <div className="bg-surface/95 p-3 backdrop-blur-md">
        {/* Timeline Bar with Event Markers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
            <span className="font-mono">{formatTimestamp(currentTime)}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted/80">
              Interactive AI Scrubber
            </span>
            <span className="font-mono">{formatTimestamp(timelineDuration)}</span>
          </div>

          {/* Timeline Track (click to scrub anywhere across 60–90 min match) */}
          <div
            onClick={handleTimelineClick}
            role="slider"
            aria-label="Match video timeline"
            aria-valuemin={0}
            aria-valuemax={Math.round(timelineDuration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            className="relative h-6 w-full cursor-pointer select-none rounded-lg bg-muted/20 px-1 py-1"
          >
            {/* Progress fill */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 top-0 rounded-lg bg-primary/25 transition-all"
              style={{
                width: `${Math.min(100, (currentTime / timelineDuration) * 100)}%`,
              }}
            />

            {/* Event Markers on Timeline */}
            {events.map((event) => {
              const posPercent = Math.min(
                97,
                Math.max(3, (event.timestamp_sec / timelineDuration) * 100)
              );
              const isGoal = event.event_type === 'goal';
              const isActive = event.id === activeEventId;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                  title={`Jump to ${event.timestamp_formatted || formatTimestamp(event.timestamp_sec)} (${isGoal ? 'Goal' : 'Save'})`}
                  style={{ left: `${posPercent}%` }}
                  className={cn(
                    'group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition-all',
                    isActive ? 'z-10 scale-125' : 'hover:scale-115'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black shadow-sm ring-2',
                      isGoal
                        ? 'bg-gold text-gold-foreground ring-gold/40'
                        : 'bg-primary text-primary-foreground ring-primary/40',
                      isActive && 'animate-pulse ring-4 ring-offset-1 ring-offset-background'
                    )}
                  >
                    {isGoal ? 'G' : 'S'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transport Controls */}
        <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => skipRelative(-5)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>-5s</span>
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-95"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={() => skipRelative(5)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-95"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>+5s</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-2 text-foreground transition-colors hover:bg-muted/10 active:scale-95"
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-muted" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-gold">
              <FootballIcon className="h-3 w-3" />
              <span>Goal</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Save</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
