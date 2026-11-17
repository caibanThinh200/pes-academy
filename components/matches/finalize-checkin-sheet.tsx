'use client';

import * as React from 'react';
import { useAppStore } from '@/lib/store';
import { Match, User } from '@/types/database';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { JerseyNumber } from '@/components/ui/jersey-number';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface FinalizeCheckinSheetProps {
  open: boolean;
  onClose: () => void;
  match: Match;
  noShows: User[];
  presentCount: number;
}

export function FinalizeCheckinSheet({
  open,
  onClose,
  match,
  noShows,
  presentCount,
}: FinalizeCheckinSheetProps) {
  const { finalizeCheckin } = useAppStore();

  const handleConfirm = () => {
    finalizeCheckin(match.id);
    onClose();
  };

  const footer = (
    <div className="flex items-center gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onClose}
        className="flex-1 font-semibold"
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="lg"
        onClick={handleConfirm}
        className="flex-1 font-bold"
      >
        Confirm & Apply
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Finalize Check-In?"
      description={`Review attendance for ${match.title} before closing`}
      footer={footer}
    >
      <div className="space-y-4 py-1">
        <div className="rounded-xl bg-secondary/25 dark:bg-secondary/80 border border-secondary/30 dark:border-border/50 p-3 text-xs flex items-center justify-between">
          <span className="font-semibold text-foreground">Confirmed Attendees:</span>
          <Badge variant="success" className="text-xs">
            {presentCount} Present
          </Badge>
        </div>

        {noShows.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-danger">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {noShows.length} no-show{noShows.length > 1 ? 's' : ''} will receive +1 penalty point
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {noShows.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 p-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={user.name} src={user.avatar_url} size="sm" />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <JerseyNumber number={user.jersey_number} size="sm" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {user.name}
                      </span>
                    </div>
                  </div>

                  <Badge variant="danger" className="text-[11px] font-mono shrink-0">
                    {user.penalty_count} → {user.penalty_count + 1} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-sm font-bold text-foreground">
              Perfect attendance — no penalties applied 🎉
            </p>
            <p className="text-xs text-muted max-w-xs">
              Every joined player checked in at pitch-side. Ready to transition match to review.
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
