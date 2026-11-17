'use client';

import * as React from 'react';
import { MapPin, Video, Sparkles } from 'lucide-react';
import { Match, Attendance } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMatchDate } from '@/lib/utils';

export interface RecentMatchCardProps {
  match: Match;
  attendance: Attendance[];
}

export function RecentMatchCard({ match, attendance }: RecentMatchCardProps) {
  const matchAttendance = attendance.filter((a) => a.match_id === match.id);
  const presentCount = matchAttendance.filter((a) => a.checkin_status === 'present').length;
  const penalizedCount = matchAttendance.filter(
    (a) => a.checkin_status === 'absent_penalized'
  ).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
          Recent Match
        </h2>
      </div>

      <Card className="hover:border-primary/40 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {match.status === 'review' ? (
              <Badge variant="gold" className="text-xs font-semibold gap-1">
                <Sparkles className="h-3 w-3" />
                Review Pending
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-semibold">
                Completed
              </Badge>
            )}
            <span className="text-xs text-muted">
              {formatMatchDate(match.match_date)}
            </span>
          </div>
          <CardTitle className="text-base font-semibold mt-1">
            {match.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{match.location}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary/25 dark:bg-secondary/80 border border-secondary/30 dark:border-border/50 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Turnout:</span>
              <Badge variant="success" className="text-[11px] py-0">
                {presentCount} Present
              </Badge>
              {penalizedCount > 0 && (
                <Badge variant="danger" className="text-[11px] py-0">
                  {penalizedCount} Penalized
                </Badge>
              )}
            </div>

            {match.video_url && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Video className="h-3.5 w-3.5" />
                Footage Ready
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
