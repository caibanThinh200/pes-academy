'use client';

import * as React from 'react';
import { useAppStore } from '@/lib/store';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

export interface CreateMatchSheetProps {
  open: boolean;
  onClose: () => void;
}

function getNextSaturday18Local(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const nextSat = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSaturday,
    18,
    0,
    0,
    0
  );

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = nextSat.getFullYear();
  const month = pad(nextSat.getMonth() + 1);
  const date = pad(nextSat.getDate());
  const hours = pad(nextSat.getHours());
  const mins = pad(nextSat.getMinutes());
  return `${year}-${month}-${date}T${hours}:${mins}`;
}

interface CreateMatchFormProps {
  onClose: () => void;
}

function CreateMatchForm({ onClose }: CreateMatchFormProps) {
  const { matches, createMatch } = useAppStore();

  const defaultTitle = React.useMemo(() => `Matchday ${matches.length + 1}`, [matches.length]);
  const defaultLocation = React.useMemo(
    () => matches[0]?.location || 'Centenario Stadium Pitch A',
    [matches]
  );
  const defaultDate = React.useMemo(() => getNextSaturday18Local(), []);

  const [title, setTitle] = React.useState(defaultTitle);
  const [dateLocal, setDateLocal] = React.useState(defaultDate);
  const [location, setLocation] = React.useState(defaultLocation);

  const isValid =
    title.trim().length > 0 &&
    location.trim().length > 0 &&
    Boolean(dateLocal) &&
    !isNaN(new Date(dateLocal).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    createMatch({
      title: title.trim(),
      match_date: new Date(dateLocal).toISOString(),
      location: location.trim(),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <div className="space-y-1.5">
        <label htmlFor="match-title" className="text-xs font-semibold text-foreground">
          Match Title
        </label>
        <input
          id="match-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Matchday 25"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="match-date" className="text-xs font-semibold text-foreground">
          Date & Time
        </label>
        <input
          id="match-date"
          type="datetime-local"
          value={dateLocal}
          onChange={(e) => setDateLocal(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="match-location" className="text-xs font-semibold text-foreground">
          Location
        </label>
        <input
          id="match-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Centenario Stadium Pitch A"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          required
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={!isValid}
          className="w-full font-bold"
        >
          Open Vote Board
        </Button>
      </div>
    </form>
  );
}

export function CreateMatchSheet({ open, onClose }: CreateMatchSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Create Match"
      description="Open a new weekly vote board"
    >
      {open && <CreateMatchForm onClose={onClose} />}
    </BottomSheet>
  );
}
