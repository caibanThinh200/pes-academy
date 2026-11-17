'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldAlert, Play, Users } from 'lucide-react';
import { Match, Attendance, User } from '@/types/database';
import { useAppStore } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { JerseyNumber } from '@/components/ui/jersey-number';
import { FinalizeCheckinSheet } from './finalize-checkin-sheet';
import { cn } from '@/lib/utils';

export interface CheckinBoardProps {
  match: Match;
  joinedAttendance: Attendance[];
  users: User[];
}

export function CheckinBoard({ match, joinedAttendance, users }: CheckinBoardProps) {
  const { setMatchStatus, setCheckin } = useAppStore();
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);

  const joinedUserItems = React.useMemo(() => {
    return joinedAttendance
      .map((att) => {
        const user = users.find((u) => u.id === att.user_id);
        return user ? { att, user } : null;
      })
      .filter((item): item is { att: Attendance; user: User } => item !== null);
  }, [joinedAttendance, users]);

  const presentCount = joinedUserItems.filter(
    (i) => i.att.checkin_status === 'present'
  ).length;

  const noShows = joinedUserItems
    .filter((i) => i.att.checkin_status !== 'present')
    .map((i) => i.user);

  const isVoting = match.status === 'voting';

  return (
    <>
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-foreground">
                Pitch-Side Check-In Board
              </CardTitle>
              <p className="text-xs text-muted">
                Tap player to mark attendance & verify lineup
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="primary" className="text-xs font-semibold tabular-nums">
                {presentCount}/{joinedUserItems.length} Present
              </Badge>

              {isVoting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMatchStatus(match.id, 'checkin')}
                  className="text-xs text-primary font-semibold hover:text-primary/90"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start Check-In
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {joinedUserItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted font-medium bg-muted/5 rounded-xl border border-dashed border-border/70 flex flex-col items-center gap-1.5">
              <Users className="h-5 w-5 text-muted/60" />
              <span>No players have voted to join yet.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
              <AnimatePresence initial={false}>
                {joinedUserItems.map(({ att, user }) => {
                  const isPresent = att.checkin_status === 'present';
                  return (
                    <motion.button
                      key={user.id}
                      type="button"
                      layout
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setCheckin(match.id, user.id, isPresent ? 'pending' : 'present')
                      }
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer',
                        isPresent
                          ? 'border-success/40 bg-success/10 shadow-xs'
                          : 'border-border/70 bg-surface hover:bg-muted/10'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={user.name} src={user.avatar_url} size="sm" />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <JerseyNumber number={user.jersey_number} size="sm" />
                          <span className="text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                            {user.name}
                          </span>
                          {user.penalty_count > 0 && (
                            <Badge variant="danger" className="text-[10px] px-1.5 py-0">
                              {user.penalty_count} pt{user.penalty_count > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="pl-2 shrink-0">
                        {isPresent ? (
                          <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-success fill-success/20" />
                          </motion.div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted/40" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <div className="pt-1">
            <Button
              type="button"
              variant="danger"
              size="lg"
              disabled={joinedUserItems.length === 0}
              onClick={() => setFinalizeOpen(true)}
              className="w-full font-bold shadow-xs gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              Finalize Check-In & Apply Penalties
            </Button>
          </div>
        </CardContent>
      </Card>

      <FinalizeCheckinSheet
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        match={match}
        noShows={noShows}
        presentCount={presentCount}
      />
    </>
  );
}
