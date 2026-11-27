'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Match, User } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatMatchDate, isMatchOverdue, cn } from '@/lib/utils';

export interface MatchHeroCardProps {
  match: Match;
  joinedUsers: User[];
  isAdmin?: boolean;
  onCreateMatch?: () => void;
}

export function MatchHeroCard({ match, joinedUsers }: MatchHeroCardProps) {
  const isOverdue = isMatchOverdue(match);
  const isVoting = match.status === 'voting';
  const isCheckin = match.status === 'checkin';
  const progressPercent = Math.min(100, Math.round((joinedUsers.length / 14) * 100));

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-md">
      <div className="absolute top-0 right-0 h-28 w-28 bg-secondary/30 dark:bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isOverdue ? (
            <Badge
              variant="danger"
              className="gap-1 px-2.5 py-1 text-xs uppercase tracking-wider font-bold"
            >
              Overdue
            </Badge>
          ) : isVoting ? (
            <Badge
              variant="primary"
              className="gap-1 px-2.5 py-1 text-xs uppercase tracking-wider font-bold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Voting Open
            </Badge>
          ) : isCheckin ? (
            <Badge
              variant="success"
              className="gap-1 px-2.5 py-1 text-xs uppercase tracking-wider font-bold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Check-In Live
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 px-2.5 py-1 text-xs uppercase tracking-wider font-bold"
            >
              {match.status}
            </Badge>
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              isOverdue ? 'text-danger' : 'text-muted'
            )}
          >
            {isOverdue ? 'Overdue' : isCheckin ? 'Live Now' : 'Upcoming'}
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-foreground mt-2">
          {match.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Schedule & Location Box */}
        <div className="space-y-2 rounded-xl bg-secondary/25 dark:bg-secondary/80 p-3 border border-secondary/40 dark:border-border/60">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>{formatMatchDate(match.match_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>
        </div>

        {/* Headcount & Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="inline-flex items-center gap-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={joinedUsers.length}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block tabular-nums"
                  >
                    {joinedUsers.length}
                  </motion.span>
                </AnimatePresence>
                <span>Players Joined</span>
              </span>
            </div>
            <span className="text-muted text-[11px] font-medium">Target: 14+</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/20">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Live Avatar Grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Confirmed Squad
          </div>
          {joinedUsers.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted font-medium bg-surface/50 rounded-xl border border-dashed border-border/70">
              Be the first to join!
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 py-1">
              <AnimatePresence initial={false}>
                {joinedUsers.map((user) => {
                  const firstName = user.name.split(' ')[0] || user.name;
                  return (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="relative inline-flex">
                        <Avatar
                          name={user.name}
                          src={user.avatar_url}
                          size="md"
                          className="ring-2 ring-surface shadow-xs"
                        />
                        {user.jersey_number != null && (
                          <span
                            className="absolute -bottom-1 -right-1 z-10 flex h-4 min-w-[17px] items-center justify-center rounded-full bg-secondary border border-secondary-foreground/20 px-1 text-[9px] font-bold font-mono tabular-nums text-secondary-foreground shadow-xs ring-1 ring-surface select-none"
                            aria-label={`Shirt number ${user.jersey_number}`}
                          >
                            #{user.jersey_number}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 text-[11px] font-medium text-foreground truncate max-w-full">
                        {firstName}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
