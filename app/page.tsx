'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Calendar, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { User } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MatchHeroCard } from '@/components/matches/match-hero-card';
import { VoteToggleButton } from '@/components/matches/vote-toggle-button';
import { PenaltyWarning } from '@/components/matches/penalty-warning';
import { CreateMatchSheet } from '@/components/matches/create-match-sheet';
import { CheckinBoard } from '@/components/matches/checkin-board';
import { RecentMatchCard } from '@/components/matches/recent-match-card';

export default function MatchesPage() {
  const { matches, attendance, users, role, currentUser, toggleVote } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const [createSheetOpen, setCreateSheetOpen] = React.useState(false);

  // Active match = first match in matches with status 'voting' or 'checkin'
  const activeMatch = matches.find((m) => m.status === 'voting' || m.status === 'checkin');

  // Recent match = first match with status 'review' or 'completed'
  const recentMatch = matches.find((m) => m.status === 'review' || m.status === 'completed');

  // Attendance for active match
  const activeAttendance = activeMatch
    ? attendance.filter((a) => a.match_id === activeMatch.id)
    : [];
  const joinedAttendance = activeAttendance.filter((a) => a.vote_status === 'joined');
  const joinedUsers = joinedAttendance
    .map((att) => users.find((u) => u.id === att.user_id))
    .filter((u): u is User => Boolean(u));

  const currentUserVote =
    currentUser && activeMatch
      ? activeAttendance.find((a) => a.user_id === currentUser.id)
      : undefined;
  const hasJoined = currentUserVote?.vote_status === 'joined';

  const handleToggleVote = () => {
    if (activeMatch && currentUser) {
      toggleVote(activeMatch.id, currentUser.id);
    }
  };

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25, ease: 'easeOut' as const },
      };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Fixtures & Matches
          </h1>
          <p className="text-xs text-muted">Weekly academy schedule & attendance</p>
        </div>
        {role === 'admin' && (
          <Button
            size="sm"
            variant="gold"
            onClick={() => setCreateSheetOpen(true)}
            className="font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Match</span>
          </Button>
        )}
      </div>

      {/* Main Fixture Section */}
      {activeMatch ? (
        <motion.div {...animationProps} className="space-y-4">
          {/* Player role gets penalty warning callout if they have penalties */}
          {role === 'player' && currentUser && (
            <PenaltyWarning count={currentUser.penalty_count} />
          )}

          <MatchHeroCard
            match={activeMatch}
            joinedUsers={joinedUsers}
            isAdmin={role === 'admin'}
            onCreateMatch={() => setCreateSheetOpen(true)}
          />

          {/* Vote Toggle Button for both Player and Admin (admin also plays) */}
          <div className="space-y-1.5">
            <VoteToggleButton
              joined={hasJoined}
              onToggle={handleToggleVote}
              disabled={activeMatch.status === 'checkin'}
            />
            {activeMatch.status === 'checkin' && (
              <p className="text-center text-xs text-muted font-medium">
                Voting closed — check-in in progress
              </p>
            )}
          </div>

          {/* Admin Pitch-Side Check-In Board */}
          {role === 'admin' && (
            <CheckinBoard
              match={activeMatch}
              joinedAttendance={joinedAttendance}
              users={users}
            />
          )}
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div {...animationProps}>
          <Card className="p-8 text-center border-dashed border-2 border-border/80 bg-surface/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Upcoming Match</h3>
            <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
              {role === 'admin'
                ? 'No active fixture. Create a new match to open voting for academy players.'
                : 'Waiting for the admin to open next week’s vote.'}
            </p>
            {role === 'admin' && (
              <Button
                size="sm"
                className="mt-4 font-bold"
                onClick={() => setCreateSheetOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Match
              </Button>
            )}
          </Card>
        </motion.div>
      )}

      {/* Recent Match Section */}
      {recentMatch && (
        <motion.div
          {...(shouldReduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.25, delay: 0.1, ease: 'easeOut' as const },
              })}
        >
          <RecentMatchCard match={recentMatch} attendance={attendance} />
        </motion.div>
      )}

      {/* Admin Create Match Bottom Sheet */}
      <CreateMatchSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />
    </div>
  );
}
