'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Play, Clock } from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { MatchEvent, User } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { JerseyNumber } from '@/components/ui/jersey-number';
import { formatTimestamp } from '@/lib/utils';

interface ConfirmedHighlightsListProps {
  events: MatchEvent[];
  users: User[];
  onSeekEvent: (event: MatchEvent) => void;
}

export function ConfirmedHighlightsList({
  events,
  users,
  onSeekEvent,
}: ConfirmedHighlightsListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">
        <p className="text-xs">No confirmed highlights yet for this match.</p>
        <p className="mt-1 text-[11px]">
          Verify clips in the queue above to record official goals and saves on the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, idx) => {
        const isGoal = event.event_type === 'goal';
        const assignedPlayer = users.find((u) => u.id === event.assigned_user_id);

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            onClick={() => onSeekEvent(event)}
            className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface/80 p-3 text-xs transition-all hover:border-primary/40 hover:bg-surface active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
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

              {assignedPlayer ? (
                <div className="flex items-center gap-2">
                  <Avatar name={assignedPlayer.name} src={assignedPlayer.avatar_url} size="sm" />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <JerseyNumber number={assignedPlayer.jersey_number} size="sm" />
                      <span>{assignedPlayer.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <Clock className="h-3 w-3" />
                      <span>
                        {event.timestamp_formatted || formatTimestamp(event.timestamp_sec)}
                      </span>
                      {event.visual_cue && (
                        <span className="truncate max-w-[140px] text-[10px] text-muted/80">
                          • {event.visual_cue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-foreground">Unassigned Player</div>
                  <div className="text-[11px] text-muted">
                    {event.timestamp_formatted || formatTimestamp(event.timestamp_sec)}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              title="Watch Clip"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-[11px] font-semibold text-foreground opacity-80 group-hover:opacity-100 hover:bg-muted/10"
            >
              <Play className="h-3 w-3 text-primary" />
              <span>Watch</span>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
