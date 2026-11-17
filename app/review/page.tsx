'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Calendar,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Award,
  Video,
} from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { useAppStore } from '@/lib/store';
import { MatchEvent } from '@/types/database';
import { formatMatchDate, formatTimestamp } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MatchVideoPlayer } from '@/components/review/match-video-player';
import { EventVerificationQueue } from '@/components/review/event-verification-queue';
import { ConfirmedHighlightsList } from '@/components/review/confirmed-highlights-list';

export default function ReviewPage() {
  const {
    matches,
    events,
    users,
    attendance,
    role,
    confirmEvent,
    dismissEvent,
    setMatchEvents,
  } = useAppStore();

  const isAdmin = role === 'admin';

  // Find default match: preferably one in 'review' or 'completed'
  const availableMatches = matches.filter(
    (m) => m.status === 'review' || m.status === 'completed' || m.video_url
  );
  const defaultMatchId =
    availableMatches.find((m) => m.status === 'review')?.id ||
    availableMatches[0]?.id ||
    matches[0]?.id;

  const [userSelectedMatchId, setUserSelectedMatchId] = React.useState<string | null>(null);
  const selectedMatchId =
    userSelectedMatchId && matches.some((m) => m.id === userSelectedMatchId)
      ? userSelectedMatchId
      : defaultMatchId;
  const setSelectedMatchId = setUserSelectedMatchId;

  const selectedMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  // Match events
  const matchEvents = events.filter((e) => e.match_id === selectedMatch?.id);
  const pendingEvents = matchEvents.filter((e) => e.status === 'pending_review');
  const confirmedEvents = matchEvents.filter((e) => e.status === 'confirmed');

  // Present players for this match (attendance === 'present')
  const presentAttendance = attendance.filter(
    (a) => a.match_id === selectedMatch?.id && a.checkin_status === 'present'
  );
  const presentUserIds = new Set(presentAttendance.map((a) => a.user_id));
  const presentPlayers =
    presentUserIds.size > 0
      ? users.filter((u) => presentUserIds.has(u.id))
      : users; // fallback to all players if no attendance record

  // Video Ref & Seeking State
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [userSelectedEventId, setUserSelectedEventId] = React.useState<string | null>(null);

  const activeEventId =
    pendingEvents.length === 0
      ? null
      : userSelectedEventId && pendingEvents.some((e) => e.id === userSelectedEventId)
      ? userSelectedEventId
      : pendingEvents[0].id;

  const [seekFeedback, setSeekFeedback] = React.useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = React.useState<{
    message: string;
    type: 'success' | 'dismiss' | 'info';
  } | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'pending' | 'confirmed'>('pending');

  // Clear toast timer
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: 'success' | 'dismiss' | 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFeedbackToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Seek video to 5s before event
  const seekToEvent = React.useCallback(
    (event: MatchEvent) => {
      setUserSelectedEventId(event.id);
      const preRollSec = Math.max(0, event.timestamp_sec - 5);
      const targetTimeFormatted = formatTimestamp(preRollSec);
      const eventTimeFormatted =
        event.timestamp_formatted || formatTimestamp(event.timestamp_sec);
      const eventLabel = event.event_type === 'goal' ? 'Goal' : 'Save';

      setSeekFeedback(
        `Replaying clip @ ${targetTimeFormatted} (5s pre-roll for ${eventTimeFormatted} ${eventLabel})`
      );

      if (videoRef.current) {
        videoRef.current.currentTime = preRollSec;
        videoRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        setSeekFeedback(null);
      }, 3500);
    },
    [setUserSelectedEventId]
  );

  // One-Tap Event Confirmation
  const handleConfirmEvent = (eventId: string, userId: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    const assignedPlayer = users.find((u) => u.id === userId);
    const playerName = assignedPlayer?.name || 'Player';
    const jerseyText = assignedPlayer?.jersey_number ? ` (#${assignedPlayer.jersey_number})` : '';
    const eventTypeLabel = targetEvent?.event_type === 'goal' ? 'Goal' : 'Save';

    confirmEvent(eventId, userId);
    showToast(
      `${eventTypeLabel} confirmed & assigned to ${playerName}${jerseyText}!`,
      'success'
    );

    // Auto-advance to next pending clip
    const remaining = pendingEvents.filter((e) => e.id !== eventId);
    if (remaining.length > 0) {
      const next = remaining[0];
      seekToEvent(next);
    } else {
      setUserSelectedEventId(null);
      showToast('All match clips verified! Confirmed stats updated.', 'info');
      setActiveTab('confirmed');
    }
  };

  // One-Tap Event Dismissal (False positive)
  const handleDismissEvent = (eventId: string) => {
    dismissEvent(eventId);
    showToast('Event dismissed as false alarm.', 'dismiss');

    const remaining = pendingEvents.filter((e) => e.id !== eventId);
    if (remaining.length > 0) {
      const next = remaining[0];
      seekToEvent(next);
    } else {
      setUserSelectedEventId(null);
    }
  };

  // Trigger Gemini API scan (or fallback simulation)
  const handleSimulateAiScan = async () => {
    if (!selectedMatch) return;
    setIsScanning(true);
    showToast('Gemini 2.5 Flash analyzing match footage...', 'info');

    try {
      const res = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          videoUrl: selectedMatch.video_url,
        }),
      });

      const data = await res.json();
      if (data?.events && Array.isArray(data.events)) {
        setMatchEvents(selectedMatch.id, data.events);
        showToast(
          `AI Scan Complete: ${data.events.length} clips detected & ready for verification!`,
          'success'
        );
        setActiveTab('pending');
        if (data.events.length > 0) {
          seekToEvent(data.events[0]);
        }
      } else {
        showToast('AI analysis completed with no new clips detected.', 'info');
      }
    } catch (e) {
      console.error('Scan error:', e);
      showToast('AI scan completed with fallback simulated events.', 'info');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Result
          </h1>
          <p className="text-xs text-muted">
            Match highlights, AI clip verification & confirmed stats
          </p>
        </div>

        {/* AI Scan Action Button */}
        <Button
          variant="gold"
          size="sm"
          onClick={handleSimulateAiScan}
          disabled={isScanning}
          className="gap-1.5 shadow-sm"
        >
          {isScanning ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>{isScanning ? 'Scanning...' : 'Simulate AI Scan'}</span>
        </Button>
      </div>

      {/* Floating Action Feedback Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="flex items-center justify-between rounded-xl border border-primary/40 bg-surface/95 px-3.5 py-2.5 text-xs font-semibold shadow-md backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-foreground">{feedbackToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Selector Dropdown / Pills if multiple matches exist */}
      {matches.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {matches.map((m) => {
            const isSel = m.id === selectedMatchId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMatchId(m.id)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-surface border border-border text-muted hover:text-foreground'
                }`}
              >
                {m.title.split(':')[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Match Banner & Live Scoreboard */}
      {selectedMatch && (
        <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{formatMatchDate(selectedMatch.match_date)}</span>
                <span>•</span>
                <MapPin className="h-3.5 w-3.5 text-muted" />
                <span className="truncate max-w-[150px]">{selectedMatch.location}</span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-foreground">
                {selectedMatch.title}
              </h2>
            </div>

            <Badge
              variant={selectedMatch.status === 'review' ? 'gold' : 'primary'}
              className="font-bold text-[10px] uppercase shrink-0"
            >
              {selectedMatch.status === 'review' ? 'Review Active' : selectedMatch.status}
            </Badge>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-2.5 text-center">
            <div className="rounded-xl bg-gold/10 p-2">
              <div className="text-base font-extrabold text-gold flex items-center justify-center gap-1">
                <FootballIcon className="h-3.5 w-3.5" />
                <span>
                  {confirmedEvents.filter((e) => e.event_type === 'goal').length}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-muted">Confirmed Goals</div>
            </div>

            <div className="rounded-xl bg-primary/10 p-2">
              <div className="text-base font-extrabold text-primary flex items-center justify-center gap-1">
                <Award className="h-3.5 w-3.5" />
                <span>
                  {confirmedEvents.filter((e) => e.event_type === 'save').length}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-muted">Confirmed Saves</div>
            </div>

            <div className="rounded-xl bg-secondary/25 dark:bg-secondary/80 p-2">
              <div className="text-base font-extrabold text-foreground">
                {pendingEvents.length}
              </div>
              <div className="text-[10px] font-semibold text-muted">Pending Clips</div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Card */}
      {selectedMatch && (
        <MatchVideoPlayer
          videoRef={videoRef}
          videoUrl={selectedMatch.video_url}
          matchTitle={selectedMatch.title}
          events={matchEvents}
          activeEventId={activeEventId}
          onSelectEvent={seekToEvent}
          seekFeedback={seekFeedback}
        />
      )}

      {/* Verification Queue Section */}
      <div className="space-y-3 pt-1">
        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>Pending AI Clips</span>
              <Badge
                variant={activeTab === 'pending' ? 'gold' : 'outline'}
                className="ml-0.5 px-1.5 py-0 text-[10px]"
              >
                {pendingEvents.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('confirmed')}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'confirmed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <span>Confirmed Highlights</span>
              <Badge
                variant={activeTab === 'confirmed' ? 'gold' : 'outline'}
                className="ml-0.5 px-1.5 py-0 text-[10px]"
              >
                {confirmedEvents.length}
              </Badge>
            </button>
          </div>

          {!isAdmin && (
            <span className="hidden sm:inline-block text-[11px] text-muted font-medium">
              Switch role to Admin to verify
            </span>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'pending' ? (
          <div className="space-y-2">
            {!isAdmin && (
              <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 p-2.5 text-xs text-foreground">
                <Video className="h-4 w-4 text-gold shrink-0" />
                <span>
                  Tap clips to inspect video footage. Switch to <strong>Admin</strong> in the header to approve goals & saves.
                </span>
              </div>
            )}
            <EventVerificationQueue
              events={pendingEvents}
              presentPlayers={presentPlayers}
              activeEventId={activeEventId}
              isAdmin={isAdmin}
              onSelectEvent={seekToEvent}
              onConfirmEvent={handleConfirmEvent}
              onDismissEvent={handleDismissEvent}
            />
          </div>
        ) : (
          <ConfirmedHighlightsList
            events={confirmedEvents}
            users={users}
            onSeekEvent={seekToEvent}
          />
        )}
      </div>
    </div>
  );
}
