'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, Trash2, CheckCircle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { MatchEvent, User } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { JerseyNumber } from '@/components/ui/jersey-number';
import { cn } from '@/lib/utils';

interface EventVerificationQueueProps {
  events: MatchEvent[];
  presentPlayers: User[];
  activeEventId: string | null;
  isAdmin: boolean;
  onSelectEvent: (event: MatchEvent) => void;
  onConfirmEvent: (eventId: string, userId: string) => void;
  onDismissEvent: (eventId: string) => void;
}

export function EventVerificationQueue({
  events,
  presentPlayers,
  activeEventId,
  isAdmin,
  onSelectEvent,
  onConfirmEvent,
  onDismissEvent,
}: EventVerificationQueueProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
          <CheckCircle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">All Clips Verified!</h3>
        <p className="mt-1 text-xs text-muted">
          No pending detections in the queue. Paste your YouTube match link and run AI Match Analysis to detect goals and goalkeeper saves.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, idx) => {
        const isGoal = event.event_type === 'goal';
        const isActive = event.id === activeEventId;
        const confidencePct = Math.round(event.confidence_score * 100);
        const suggestedPlayer = event.assigned_user_id
          ? presentPlayers.find((p) => p.id === event.assigned_user_id) ?? null
          : null;

        const sortedPlayers = [...presentPlayers].sort((a, b) => {
          if (suggestedPlayer) {
            if (a.id === suggestedPlayer.id) return -1;
            if (b.id === suggestedPlayer.id) return 1;
          }
          if (!isGoal) {
            if (a.position === 'gk' && b.position !== 'gk') return -1;
            if (b.position === 'gk' && a.position !== 'gk') return 1;
          }
          return 0;
        });

        const jerseyLabel =
          suggestedPlayer && suggestedPlayer.jersey_number !== null
            ? `#${suggestedPlayer.jersey_number} `
            : '';

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className={cn(
              'overflow-hidden rounded-2xl border transition-all',
              isActive
                ? 'border-gold/60 bg-surface shadow-md ring-2 ring-gold/25'
                : 'border-border bg-surface/70 hover:border-primary/40 hover:bg-surface'
            )}
          >
            {/* Card Header / Summary (Click to Seek) */}
            <div
              onClick={() => onSelectEvent(event)}
              className="cursor-pointer p-3.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isGoal ? 'gold' : 'primary'}
                    className="font-bold uppercase tracking-wider text-[10px]"
                  >
                    {isGoal ? (
                      <FootballIcon className="h-3 w-3" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span>{event.event_type}</span>
                  </Badge>

                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                    <Clock className="h-3 w-3 text-muted" />
                    <span>{event.timestamp_formatted || `${event.timestamp_sec.toFixed(0)}s`}</span>
                  </div>

                  {isActive && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold uppercase tracking-wider">
                      Selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 text-right">
                  {suggestedPlayer && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>
                        AI Pick: {jerseyLabel}
                        {suggestedPlayer.name.split(' ')[0]}
                      </span>
                    </span>
                  )}
                  <span className="text-[11px] text-muted">AI Conf:</span>
                  <span
                    className={cn(
                      'text-xs font-extrabold',
                      confidencePct >= 90
                        ? 'text-success'
                        : confidencePct >= 75
                        ? 'text-gold'
                        : 'text-muted'
                    )}
                  >
                    {confidencePct}%
                  </span>
                </div>
              </div>

              {/* Visual Cue Description */}
              {event.visual_cue && (
                <p className="mt-2 text-xs text-foreground/90 leading-relaxed font-medium">
                  {event.visual_cue}
                </p>
              )}
            </div>

            {/* Expanded Action Panel for Active Event */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/60 bg-secondary/15 dark:bg-secondary/60 p-3.5"
                >
                  {isAdmin ? (
                    <div className="space-y-3">
                      {suggestedPlayer && (
                        <div className="flex flex-col gap-2.5 rounded-xl border border-gold/40 bg-gold/10 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <Avatar
                                name={suggestedPlayer.name}
                                src={suggestedPlayer.avatar_url}
                                size="sm"
                              />
                              {suggestedPlayer.jersey_number !== null && (
                                <div className="absolute -bottom-1 -right-1">
                                  <JerseyNumber
                                    number={suggestedPlayer.jersey_number}
                                    size="sm"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                                <Sparkles className="h-3 w-3" />
                                <span>
                                  {isGoal
                                    ? 'AI Suggested Scorer'
                                    : 'AI Suggested Goalkeeper'}
                                </span>
                              </div>
                              <p className="truncate text-xs font-bold text-foreground">
                                {jerseyLabel}
                                {suggestedPlayer.name}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onConfirmEvent(event.id, suggestedPlayer.id)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>
                              Confirm {jerseyLabel}
                              {suggestedPlayer.name.split(' ')[0]} (+1{' '}
                              {isGoal ? 'Goal' : 'Save'})
                            </span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-gold" />
                          <span>
                            {suggestedPlayer
                              ? `Or override & assign ${event.event_type} to:`
                              : `Tap player to assign this ${event.event_type}:`}
                          </span>
                        </span>
                        <span className="text-[10px] font-semibold text-muted">
                          {presentPlayers.length} Present Pitch-side
                        </span>
                      </div>

                      {/* Horizontal Scrollable Row of Present Players */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                        {sortedPlayers.map((player) => {
                          const isGk = player.position === 'gk';
                          const isAiPick = suggestedPlayer?.id === player.id;
                          const isRecommended = isAiPick || (!suggestedPlayer && !isGoal && isGk);

                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => onConfirmEvent(event.id, player.id)}
                              className={cn(
                                'relative flex flex-col items-center justify-center shrink-0 rounded-xl border p-2 transition-all active:scale-95 text-center min-w-[78px]',
                                isAiPick
                                  ? 'border-gold/70 bg-gold/10 shadow-sm'
                                  : isRecommended
                                  ? 'border-primary/60 bg-primary/10 shadow-sm'
                                  : 'border-border bg-surface hover:border-primary/40 hover:bg-muted/10'
                              )}
                            >
                              {isAiPick && (
                                <span className="mb-1 rounded-full bg-gold px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-gold-foreground">
                                  AI Pick
                                </span>
                              )}
                              <div className="relative mb-1">
                                <Avatar name={player.name} src={player.avatar_url} size="sm" />
                                {player.jersey_number !== null && (
                                  <div className="absolute -bottom-1 -right-1">
                                    <JerseyNumber number={player.jersey_number} size="sm" />
                                  </div>
                                )}
                              </div>
                              <span className="max-w-[70px] truncate text-[11px] font-bold text-foreground">
                                {player.name.split(' ')[0]}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] font-extrabold uppercase tracking-wider',
                                  isGk ? 'text-primary' : 'text-muted'
                                )}
                              >
                                {isGk ? 'GK' : 'Field'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Card Action Buttons (Dismiss false positive or Replay) */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => onDismissEvent(event.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>False Alarm / Dismiss</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectEvent(event)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/10 active:scale-95"
                        >
                          <Play className="h-3.5 w-3.5 text-primary" />
                          <span>Replay Clip (-5s)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Player view */
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted">
                        <ShieldAlert className="h-3.5 w-3.5 text-gold" />
                        <span>Admin verification required to confirm stats.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/10"
                      >
                        <Play className="h-3 w-3 text-primary" />
                        <span>Watch Clip</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
