'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, FastForward, Sparkles, AlertCircle } from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { MatchEvent } from '@/types/database';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MatchVideoPlayerProps {
  videoUrl: string | null;
  matchTitle: string;
  events: MatchEvent[];
  activeEventId: string | null;
  onSelectEvent: (event: MatchEvent) => void;
  seekFeedback: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function MatchVideoPlayer({
  videoUrl,
  matchTitle,
  events,
  activeEventId,
  onSelectEvent,
  seekFeedback,
  videoRef,
}: MatchVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(180);
  const [videoError, setVideoError] = React.useState(false);

  const fallbackUrl =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const effectiveUrl = videoUrl || fallbackUrl;

  const handleLoadedMetadata = () => {
    if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Compute maximum timeline width for markers
  const maxEventTime = events.reduce((max, e) => Math.max(max, e.timestamp_sec), 0);
  const timelineDuration = Math.max(duration, maxEventTime + 10, 160);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black/90 shadow-lg">
      {/* Video Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
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

        {/* Video Error Fallback */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center text-white">
            <AlertCircle className="mb-2 h-8 w-8 text-danger" />
            <p className="text-xs font-semibold">Video stream preview simulated</p>
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
              className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex justify-center"
            >
              <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-black/85 px-3.5 py-1.5 text-xs font-bold text-gold shadow-md backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>{seekFeedback}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Play/Pause Overlay Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center transition-opacity bg-black/20 hover:bg-black/30',
            isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md transition-transform hover:scale-110 active:scale-95">
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
          </div>
        </button>

        {/* Top Gradient Badge */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 text-white">
          <span className="truncate text-xs font-bold tracking-tight text-white/95">
            {matchTitle}
          </span>
          <Badge variant="gold" className="text-[10px] font-bold">
            HD 1080p
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
            <span className="font-mono">{formatTimestamp(duration)}</span>
          </div>

          {/* Timeline Track */}
          <div className="relative h-6 w-full cursor-pointer select-none rounded-lg bg-muted/20 px-1 py-1">
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 bottom-0 rounded-lg bg-primary/20 transition-all"
              style={{
                width: `${Math.min(100, (currentTime / timelineDuration) * 100)}%`,
              }}
            />

            {/* Event Markers on Timeline */}
            {events.map((event) => {
              const posPercent = Math.min(
                96,
                Math.max(4, (event.timestamp_sec / timelineDuration) * 100)
              );
              const isGoal = event.event_type === 'goal';
              const isActive = event.id === activeEventId;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  title={`Jump to ${event.timestamp_formatted || formatTimestamp(event.timestamp_sec)} (${isGoal ? 'Goal' : 'Save'})`}
                  style={{ left: `${posPercent}%` }}
                  className={cn(
                    'group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 transition-all',
                    isActive ? 'scale-125 z-10' : 'hover:scale-115'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black shadow-sm ring-2',
                      isGoal
                        ? 'bg-gold text-gold-foreground ring-gold/40'
                        : 'bg-primary text-primary-foreground ring-primary/40',
                      isActive && 'ring-4 ring-offset-1 ring-offset-background animate-pulse'
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
              onClick={() => skipRelative(5)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-95"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>+5s</span>
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
