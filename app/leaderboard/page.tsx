'use client';

import * as React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Trophy,
  Award,
  ShieldAlert,
  Crown,
  Medal,
  CheckCircle2,
  Info,
  Handshake,
} from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { JerseyNumber } from '@/components/ui/jersey-number';
import { cn } from '@/lib/utils';
import { User } from '@/types/database';

type LeaderboardTab = 'scorers' | 'playmakers' | 'saves' | 'penalties';

export default function LeaderboardPage() {
  const { users, currentUserId } = useAppStore();
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = React.useState<LeaderboardTab>('scorers');

  // Sorted list for Top Scorers (Goals)
  const topScorers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      if (b.total_goals !== a.total_goals) return b.total_goals - a.total_goals;
      if (a.penalty_count !== b.penalty_count) return a.penalty_count - b.penalty_count;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  // Sorted list for Playmakers (Assists)
  const playmakers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      if (b.total_assists !== a.total_assists) return b.total_assists - a.total_assists;
      if (b.total_goals !== a.total_goals) return b.total_goals - a.total_goals;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  // Sorted list for Golden Glove (Saves)
  const saveLeaders = React.useMemo(() => {
    return [...users].sort((a, b) => {
      if (b.total_saves !== a.total_saves) return b.total_saves - a.total_saves;
      // Prefer goalkeepers in tie-breaks
      if (a.position === 'gk' && b.position !== 'gk') return -1;
      if (b.position === 'gk' && a.position !== 'gk') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  // Sorted list for Penalty Board (Absences)
  const penaltyBoard = React.useMemo(() => {
    return [...users].sort((a, b) => {
      if (b.penalty_count !== a.penalty_count) return b.penalty_count - a.penalty_count;
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  const animationProps = shouldReduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.25, ease: 'easeOut' as const },
    };

  // Render Podium for Top 3 (Scorers, Playmakers, or Saves)
  const renderPodium = (rankedList: User[], metric: 'goals' | 'assists' | 'saves') => {
    if (rankedList.length < 3) return null;
    const first = rankedList[0];
    const second = rankedList[1];
    const third = rankedList[2];

    const podiumSlots = [
      { player: second, rank: 2, height: 'h-24', order: 'order-1', medal: '🥈', color: 'border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40' },
      { player: first, rank: 1, height: 'h-32', order: 'order-2', medal: '👑', color: 'border-gold/60 bg-gold/15 shadow-md ring-2 ring-gold/30' },
      { player: third, rank: 3, height: 'h-20', order: 'order-3', medal: '🥉', color: 'border-amber-700/40 bg-amber-900/10 dark:bg-amber-900/20' },
    ];

    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-gold" />
            <span>Season Podium</span>
          </span>
          <Badge variant="gold" className="text-[10px]">
            Top 3
          </Badge>
        </div>

        {/* 3-column Podium */}
        <div className="grid grid-cols-3 gap-2.5 items-end pt-2">
          {podiumSlots.map(({ player, rank, medal, color }) => {
            const isFirst = rank === 1;
            const score =
              metric === 'goals'
                ? player.total_goals
                : metric === 'assists'
                  ? player.total_assists
                  : player.total_saves;
            const label =
              metric === 'goals'
                ? score === 1 ? 'goal' : 'goals'
                : metric === 'assists'
                  ? score === 1 ? 'assist' : 'assists'
                  : score === 1 ? 'save' : 'saves';

            return (
              <div
                key={player.id}
                className={cn(
                  'flex flex-col items-center justify-end rounded-2xl border p-2.5 text-center transition-all',
                  color
                )}
              >
                {/* Crown / Rank Indicator */}
                <div className="relative mb-2">
                  <Avatar name={player.name} src={player.avatar_url} size={isFirst ? 'md' : 'sm'} />
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-sm">
                    {medal}
                  </span>
                  {player.jersey_number !== null && (
                    <div className="absolute -bottom-1 -right-1">
                      <JerseyNumber number={player.jersey_number} size="sm" />
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <span className="block truncate text-xs font-bold text-foreground">
                    {player.name.split(' ')[0]}
                  </span>
                  <div className="mt-0.5 inline-flex items-center gap-1">
                    <span
                      className={cn(
                        'text-sm font-extrabold',
                        isFirst ? 'text-gold' : 'text-foreground'
                      )}
                    >
                      {score}
                    </span>
                    <span className="text-[10px] text-muted font-medium">{label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Leaderboard
          </h1>
          <p className="text-xs text-muted">Academy rankings & player statistics</p>
        </div>
        <Badge variant="gold" className="gap-1 text-xs font-semibold">
          <Trophy className="h-3.5 w-3.5" />
          <span>Season 2026</span>
        </Badge>
      </div>

      {/* Filter Tabs with animated indicator */}
      <div className="grid grid-cols-4 rounded-2xl border border-border bg-surface p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('scorers')}
          className={cn(
            'relative flex min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl px-1 py-1.5 sm:py-2 text-[11px] font-bold whitespace-nowrap transition-colors',
            activeTab === 'scorers'
              ? 'text-foreground'
              : 'text-muted hover:text-foreground'
          )}
        >
          {activeTab === 'scorers' && (
            <motion.div
              layoutId="leaderboard-tab-pill"
              className="absolute inset-0 rounded-xl bg-gold/20 border border-gold/40 shadow-xs"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <FootballIcon className="relative z-10 h-3.5 w-3.5 shrink-0 text-gold" />
          <span className="relative z-10">Scorers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('playmakers')}
          className={cn(
            'relative flex min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl px-1 py-1.5 sm:py-2 text-[11px] font-bold whitespace-nowrap transition-colors',
            activeTab === 'playmakers'
              ? 'text-foreground'
              : 'text-muted hover:text-foreground'
          )}
        >
          {activeTab === 'playmakers' && (
            <motion.div
              layoutId="leaderboard-tab-pill"
              className="absolute inset-0 rounded-xl bg-violet-500/15 border border-violet-500/35 shadow-xs"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Handshake className="relative z-10 h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="relative z-10">Playmaker</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saves')}
          className={cn(
            'relative flex min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl px-1 py-1.5 sm:py-2 text-[11px] font-bold whitespace-nowrap transition-colors',
            activeTab === 'saves'
              ? 'text-foreground'
              : 'text-muted hover:text-foreground'
          )}
        >
          {activeTab === 'saves' && (
            <motion.div
              layoutId="leaderboard-tab-pill"
              className="absolute inset-0 rounded-xl bg-primary/20 border border-primary/40 shadow-xs"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Award className="relative z-10 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="relative z-10">Glove</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('penalties')}
          className={cn(
            'relative flex min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl px-1 py-1.5 sm:py-2 text-[11px] font-bold whitespace-nowrap transition-colors',
            activeTab === 'penalties'
              ? 'text-foreground'
              : 'text-muted hover:text-foreground'
          )}
        >
          {activeTab === 'penalties' && (
            <motion.div
              layoutId="leaderboard-tab-pill"
              className="absolute inset-0 rounded-xl bg-danger/15 border border-danger/35 shadow-xs"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <ShieldAlert className="relative z-10 h-3.5 w-3.5 shrink-0 text-danger" />
          <span className="relative z-10">Penalties</span>
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence initial={false} mode="wait">
        {activeTab === 'scorers' && (
          <motion.div
            key="tab-scorers"
            {...animationProps}
            className="space-y-4"
          >
            {/* Podium */}
            {renderPodium(topScorers, 'goals')}

            {/* Full Ranked List */}
            <Card className="overflow-hidden border-border bg-surface shadow-sm">
              <div className="border-b border-border/50 bg-secondary/20 dark:bg-secondary/70 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-gold" />
                  <span>Golden Boot Standings</span>
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {users.reduce((acc, u) => acc + u.total_goals, 0)} Total Goals
                </span>
              </div>

              <CardContent className="divide-y divide-border/40 p-0">
                {topScorers.map((player, index) => {
                  const rank = index + 1;
                  const isCurrent = player.id === currentUserId;

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 transition-colors',
                        isCurrent
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                            rank === 1
                              ? 'bg-gold text-gold-foreground shadow-xs'
                              : rank === 2
                                ? 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                : rank === 3
                                  ? 'bg-amber-700/80 text-white'
                                  : 'bg-muted/15 text-muted'
                          )}
                        >
                          {rank}
                        </span>

                        <Avatar name={player.name} src={player.avatar_url} size="sm" />

                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <JerseyNumber number={player.jersey_number} size="sm" />
                            <span>{player.name}</span>
                            {isCurrent && (
                              <Badge variant="primary" className="text-[9px] py-0 px-1">
                                You
                              </Badge>
                            )}
                            {player.role === 'admin' && (
                              <span className="text-[9px] font-bold uppercase text-gold">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted capitalize">
                            {player.position === 'gk' ? 'Goalkeeper' : 'Field Player'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground">
                          {player.total_goals}
                        </span>
                        <span className="ml-1 text-[11px] font-semibold text-muted">
                          goals
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'playmakers' && (
          <motion.div
            key="tab-playmakers"
            {...animationProps}
            className="space-y-4"
          >
            {/* Podium */}
            {renderPodium(playmakers, 'assists')}

            {/* Full Ranked List */}
            <Card className="overflow-hidden border-border bg-surface shadow-sm">
              <div className="border-b border-border/50 bg-secondary/20 dark:bg-secondary/70 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Handshake className="h-4 w-4 text-violet-500" />
                  <span>Playmaker Standings</span>
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {users.reduce((acc, u) => acc + u.total_assists, 0)} Total Assists
                </span>
              </div>

              <div className="border-b border-border/40 bg-violet-500/5 px-4 py-2 text-[11px] text-muted flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span>Assists are tracked manually — automated video detection coming soon.</span>
              </div>

              <CardContent className="divide-y divide-border/40 p-0">
                {playmakers.map((player, index) => {
                  const rank = index + 1;
                  const isCurrent = player.id === currentUserId;

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 transition-colors',
                        isCurrent
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                            rank === 1
                              ? 'bg-violet-500 text-white shadow-xs'
                              : rank === 2
                                ? 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                : rank === 3
                                  ? 'bg-amber-700/80 text-white'
                                  : 'bg-muted/15 text-muted'
                          )}
                        >
                          {rank}
                        </span>

                        <Avatar name={player.name} src={player.avatar_url} size="sm" />

                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <JerseyNumber number={player.jersey_number} size="sm" />
                            <span>{player.name}</span>
                            {isCurrent && (
                              <Badge variant="primary" className="text-[9px] py-0 px-1">
                                You
                              </Badge>
                            )}
                            {player.role === 'admin' && (
                              <span className="text-[9px] font-bold uppercase text-gold">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted capitalize">
                            {player.position === 'gk' ? 'Goalkeeper' : 'Field Player'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground">
                          {player.total_assists}
                        </span>
                        <span className="ml-1 text-[11px] font-semibold text-muted">
                          {player.total_assists === 1 ? 'assist' : 'assists'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'saves' && (
          <motion.div
            key="tab-saves"
            {...animationProps}
            className="space-y-4"
          >
            {/* Podium */}
            {renderPodium(saveLeaders, 'saves')}

            {/* Full Ranked List */}
            <Card className="overflow-hidden border-border bg-surface shadow-sm">
              <div className="border-b border-border/50 bg-secondary/20 dark:bg-secondary/70 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Medal className="h-4 w-4 text-primary" />
                  <span>Golden Glove Leaders</span>
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {users.reduce((acc, u) => acc + u.total_saves, 0)} Total Saves
                </span>
              </div>

              <CardContent className="divide-y divide-border/40 p-0">
                {saveLeaders.map((player, index) => {
                  const rank = index + 1;
                  const isCurrent = player.id === currentUserId;
                  const isGk = player.position === 'gk';

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 transition-colors',
                        isCurrent
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                            rank === 1
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-muted/15 text-muted'
                          )}
                        >
                          {rank}
                        </span>

                        <Avatar name={player.name} src={player.avatar_url} size="sm" />

                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <JerseyNumber number={player.jersey_number} size="sm" />
                            <span>{player.name}</span>
                            {isCurrent && (
                              <Badge variant="primary" className="text-[9px] py-0 px-1">
                                You
                              </Badge>
                            )}
                            {isGk && (
                              <Badge variant="primary" className="text-[9px] py-0 px-1 font-extrabold uppercase">
                                GK
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted capitalize">
                            {isGk ? 'Specialist Goalkeeper' : 'Outfield Save'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-foreground">
                          {player.total_saves}
                        </span>
                        <span className="ml-1 text-[11px] font-semibold text-muted">
                          saves
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'penalties' && (
          <motion.div
            key="tab-penalties"
            {...animationProps}
            className="space-y-4"
          >
            {/* Rule Callout Banner */}
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-foreground">
                    Academy Absence Penalty Rule
                  </h3>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Voting <strong>&ldquo;Joined&rdquo;</strong> and failing to check in at pitch-side incurs <strong>+1 penalty point</strong> per match. Fines fund post-match team refreshments!
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-danger/20 pt-2.5 text-center">
                <div className="rounded-xl bg-surface/70 p-2">
                  <div className="text-sm font-black text-danger">
                    {penaltyBoard.reduce((acc, u) => acc + u.penalty_count, 0)} pts
                  </div>
                  <div className="text-[10px] font-semibold text-muted">Squad Penalties</div>
                </div>

                <div className="rounded-xl bg-surface/70 p-2">
                  <div className="text-sm font-black text-success">
                    {penaltyBoard.filter((u) => u.penalty_count === 0).length} players
                  </div>
                  <div className="text-[10px] font-semibold text-muted">Zero Absences</div>
                </div>
              </div>
            </div>

            {/* Penalty Ranked List */}
            <Card className="overflow-hidden border-border bg-surface shadow-sm">
              <div className="border-b border-border/50 bg-secondary/20 dark:bg-secondary/70 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-danger" />
                  <span>Discipline & Attendance Tracker</span>
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  Ordered by No-Shows
                </span>
              </div>

              <CardContent className="divide-y divide-border/40 p-0">
                {penaltyBoard.map((player, index) => {
                  const rank = index + 1;
                  const isCurrent = player.id === currentUserId;
                  const hasPenalties = player.penalty_count > 0;

                  return (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 transition-colors',
                        isCurrent
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                            hasPenalties
                              ? 'bg-danger/15 text-danger'
                              : 'bg-success/15 text-success'
                          )}
                        >
                          {rank}
                        </span>

                        <Avatar name={player.name} src={player.avatar_url} size="sm" />

                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <JerseyNumber number={player.jersey_number} size="sm" />
                            <span>{player.name}</span>
                            {isCurrent && (
                              <Badge variant="primary" className="text-[9px] py-0 px-1">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted">
                            {hasPenalties ? (
                              <span className="text-danger font-medium">
                                {player.penalty_count} unexcused no-show{player.penalty_count > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-success font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Perfect attendance
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {hasPenalties ? (
                          <Badge variant="danger" className="text-xs font-extrabold">
                            {player.penalty_count} pts
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[11px] font-bold">
                            Clean
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
