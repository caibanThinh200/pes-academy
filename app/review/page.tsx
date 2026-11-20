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
  Link2,
  Check,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { FootballIcon } from '@/components/icons/football';
import { useAppStore } from '@/lib/store';
import { MatchEvent } from '@/types/database';
import { formatMatchDate, formatTimestamp, isYouTubeUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MatchVideoPlayer,
  MatchVideoPlayerHandle,
} from '@/components/review/match-video-player';
import { EventVerificationQueue } from '@/components/review/event-verification-queue';
import { ConfirmedHighlightsList } from '@/components/review/confirmed-highlights-list';

const CHUNK_SIZE_SEC = 15 * 60; // 900 seconds (15 minutes)
const CHUNK_OVERLAP_SEC = 15;
const CHUNK_STEP_SEC = CHUNK_SIZE_SEC - CHUNK_OVERLAP_SEC; // 885 seconds
const DURATION_PRESETS = [15, 60, 75, 90] as const;

function buildOverlappingChunks(
  totalDurationSec: number
): Array<{ startSec: number; endSec: number }> {
  const safeDuration = Math.max(1, Math.floor(totalDurationSec));
  const chunks: Array<{ startSec: number; endSec: number }> = [];

  let start = 0;
  while (start < safeDuration) {
    const endSec = Math.min(safeDuration, start + CHUNK_SIZE_SEC);
    chunks.push({ startSec: start, endSec });
    if (endSec >= safeDuration) break;
    start += CHUNK_STEP_SEC;
  }

  return chunks;
}

function mergeChunkEventsWithDedup(
  existing: MatchEvent[],
  incoming: MatchEvent[]
): MatchEvent[] {
  const merged = [...existing];

  for (const candidate of incoming) {
    const dupIndex = merged.findIndex(
      (ev) =>
        ev.event_type === candidate.event_type &&
        Math.abs(ev.timestamp_sec - candidate.timestamp_sec) <= 6
    );

    if (dupIndex >= 0) {
      if (candidate.confidence_score > merged[dupIndex].confidence_score) {
        merged[dupIndex] = candidate;
      }
    } else {
      merged.push(candidate);
    }
  }

  return merged.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}

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
    updateMatchVideoUrl,
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

  // Video Player Ref & Seeking State
  const playerRef = React.useRef<MatchVideoPlayerHandle | null>(null);
  const [userSelectedEventId, setUserSelectedEventId] = React.useState<string | null>(null);

  const activeEventId =
    pendingEvents.length === 0
      ? null
      : userSelectedEventId && pendingEvents.some((e) => e.id === userSelectedEventId)
        ? userSelectedEventId
        : pendingEvents[0].id;

  // YouTube Link & AI Chunk Orchestrator State
  const [videoUrlDraft, setVideoUrlDraft] = React.useState<{
    matchId: string;
    value: string;
  } | null>(null);
  const [isEditingVideoUrl, setIsEditingVideoUrl] = React.useState(false);
  const [teamKitNote, setTeamKitNote] = React.useState('');
  const [videoDurationMin, setVideoDurationMin] = React.useState<number>(60);
  const [scanProgress, setScanProgress] = React.useState<{
    currentChunk: number;
    totalChunks: number;
    rangeLabel: string;
    mode?: string;
  } | null>(null);
  const [scanSummary, setScanSummary] = React.useState<string | null>(null);
  const scanAbortRef = React.useRef<AbortController | null>(null);

  const videoUrlInput =
    videoUrlDraft && videoUrlDraft.matchId === selectedMatch?.id
      ? videoUrlDraft.value
      : selectedMatch?.video_url ?? '';

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setVideoUrlDraft(null);
    setIsEditingVideoUrl(false);
    setScanSummary(null);
  };

  const [seekFeedback, setSeekFeedback] = React.useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = React.useState<{
    message: string;
    type: 'success' | 'dismiss' | 'info';
  } | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'pending' | 'confirmed'>('pending');

  const isYouTubeConnected = isYouTubeUrl(selectedMatch?.video_url);

  // Clear toast timer
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: 'success' | 'dismiss' | 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFeedbackToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Auto-update match duration when embedded YouTube player reports exact metadata duration
  const handlePlayerDurationChange = React.useCallback(
    (durationSec: number) => {
      if (Number.isFinite(durationSec) && durationSec > 60 && isYouTubeConnected) {
        setVideoDurationMin(Math.max(1, Math.ceil(durationSec / 60)));
      }
    },
    [isYouTubeConnected]
  );

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

      playerRef.current?.seekTo(preRollSec);
      playerRef.current?.play();

      setTimeout(() => {
        setSeekFeedback(null);
      }, 3500);
    },
    []
  );

  // Save YouTube / Video URL
  const handleSaveVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    const trimmed = videoUrlInput.trim();
    updateMatchVideoUrl(selectedMatch.id, trimmed || null);
    setVideoUrlDraft(null);
    setIsEditingVideoUrl(false);
    showToast(
      isYouTubeUrl(trimmed)
        ? 'YouTube match link connected & saved!'
        : trimmed
          ? 'Match video link updated!'
          : 'Video link cleared.',
      'success'
    );
  };

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

  // Stop active chunked scan
  const handleStopScan = () => {
    scanAbortRef.current?.abort();
  };

  // 15-Minute Chunked Gemini 2.5 Flash Match Analysis Orchestrator
  const handleRunAiAnalysis = async () => {
    if (!selectedMatch || isScanning) return;

    const totalDurationSec =
      isYouTubeConnected || videoDurationMin > 15
        ? Math.max(1, videoDurationMin) * 60
        : Math.max(60, videoDurationMin * 60);

    const chunks = buildOverlappingChunks(totalDurationSec);

    const controller = new AbortController();
    scanAbortRef.current = controller;
    setIsScanning(true);
    setScanSummary(null);
    setActiveTab('pending');

    let accumulatedEvents: MatchEvent[] = [];
    let firstEventSeeked = false;
    let detectedMode: string | undefined;
    let processedChunks = 0;

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (controller.signal.aborted) break;

        const chunk = chunks[i];
        const rangeLabel = `${formatTimestamp(chunk.startSec)} – ${formatTimestamp(chunk.endSec)}`;
        setScanProgress({
          currentChunk: i + 1,
          totalChunks: chunks.length,
          rangeLabel,
          mode: detectedMode,
        });

        const res = await fetch('/api/analyze-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            matchId: selectedMatch.id,
            videoUrl: selectedMatch.video_url,
            chunkStartSec: chunk.startSec,
            chunkEndSec: chunk.endSec,
            teamKitNote: teamKitNote.trim() || undefined,
            roster: presentPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              jersey_number: p.jersey_number,
              position: p.position,
            })),
          }),
        });

        const data = await res.json();
        processedChunks += 1;
        if (data?.mode) {
          detectedMode = data.mode;
        }

        const chunkEvents: MatchEvent[] = Array.isArray(data?.events) ? data.events : [];
        if (chunkEvents.length > 0) {
          accumulatedEvents = mergeChunkEventsWithDedup(accumulatedEvents, chunkEvents);
          setMatchEvents(selectedMatch.id, accumulatedEvents);

          if (!firstEventSeeked) {
            firstEventSeeked = true;
            seekToEvent(accumulatedEvents[0]);
          }
        }
      }

      if (controller.signal.aborted) {
        const msg = `AI Scan stopped after ${processedChunks}/${chunks.length} chunks: ${accumulatedEvents.length} clips saved.`;
        setScanSummary(msg);
        showToast(msg, 'info');
      } else {
        const msg = `AI Analysis Complete: ${accumulatedEvents.length} clips detected across ${chunks.length} chunk${chunks.length > 1 ? 's' : ''}`;
        setScanSummary(msg);
        showToast(msg, accumulatedEvents.length > 0 ? 'success' : 'info');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        const msg = `AI Scan stopped after ${processedChunks}/${chunks.length} chunks: ${accumulatedEvents.length} clips saved.`;
        setScanSummary(msg);
        showToast(msg, 'info');
      } else {
        console.error('Scan error:', err);
        showToast('AI analysis encountered an error during chunk processing.', 'dismiss');
      }
    } finally {
      scanAbortRef.current = null;
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title & AI Analysis Action */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Result
          </h1>
          <p className="text-xs text-muted">
            Match highlights, AI clip verification & confirmed stats
          </p>
        </div>

        {/* AI Scan Action / Stop Button */}
        <div className="flex items-center gap-2">
          {isScanning ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleStopScan}
              className="gap-1.5 shadow-sm"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Scan</span>
            </Button>
          ) : (
            <Button
              variant="gold"
              size="sm"
              onClick={handleRunAiAnalysis}
              className="gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isYouTubeConnected ? 'Analyze Match' : 'Running Analysis'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Live Chunked Scan Progress Banner */}
      <AnimatePresence>
        {scanProgress && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl border border-gold/40 bg-gold/10 p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold" />
                <span>
                  Scanning Chunk {scanProgress.currentChunk}/{scanProgress.totalChunks} (
                  {scanProgress.rangeLabel})
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                {scanProgress.mode === 'gemini_youtube'
                  ? 'Gemini 2.5 Flash'
                  : isYouTubeConnected
                    ? 'YouTube + Gemini'
                    : 'Demo Mode'}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-gold transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (scanProgress.currentChunk / scanProgress.totalChunks) * 100
                  )}%`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-Scan Summary Banner */}
      {!isScanning && scanSummary && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-success/35 bg-success/10 px-3.5 py-2 text-xs font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span>{scanSummary}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanSummary(null)}
            className="text-[11px] font-bold text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

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
                onClick={() => handleSelectMatch(m.id)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${isSel
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

          {/* Admin YouTube Match Footage & AI Context Panel */}
          {isAdmin && (
            <div className="space-y-2.5 border-t border-border/50 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    YouTube Match Footage & AI Context
                  </span>
                  {isYouTubeConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                      <Check className="h-2.5 w-2.5" />
                      YouTube Connected
                    </span>
                  ) : (
                    <span className="rounded-full border border-border bg-muted/15 px-2 py-0.5 text-[10px] font-semibold text-muted">
                      Demo Clip Active
                    </span>
                  )}
                </div>

                {!isEditingVideoUrl && (
                  <button
                    type="button"
                    onClick={() => setIsEditingVideoUrl(true)}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {selectedMatch.video_url ? 'Change Link' : '+ Paste YouTube Link'}
                  </button>
                )}
              </div>

              {(isEditingVideoUrl || !selectedMatch.video_url) && (
                <form onSubmit={handleSaveVideoUrl} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) =>
                      setVideoUrlDraft({
                        matchId: selectedMatch.id,
                        value: e.target.value,
                      })
                    }
                    placeholder="https://www.youtube.com/watch?v=... (Unlisted or Public)"
                    className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <Button type="submit" size="sm" className="h-9 shrink-0 px-3 text-xs">
                    Save
                  </Button>
                  {isEditingVideoUrl && selectedMatch.video_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVideoUrlDraft(null);
                        setIsEditingVideoUrl(false);
                      }}
                      className="h-9 shrink-0 px-2.5 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </form>
              )}

              {/* Duration Presets & Team/Kit Hint */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                    <span className="flex items-center gap-1">
                      <SlidersHorizontal className="h-3 w-3" />
                      Match Length (15m chunks)
                    </span>
                    <span className="font-mono text-foreground">
                      {videoDurationMin}m (
                      {buildOverlappingChunks(Math.max(1, videoDurationMin) * 60).length} chunks)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setVideoDurationMin(mins)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${videoDurationMin === mins
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-background text-muted hover:text-foreground'
                          }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={videoDurationMin}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isFinite(val) && val > 0) {
                          setVideoDurationMin(Math.min(180, Math.floor(val)));
                        }
                      }}
                      aria-label="Custom match video length in minutes"
                      className="h-7 w-14 rounded-lg border border-border bg-background px-2 text-center font-mono text-[11px] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="team-kit-note"
                    className="block text-[11px] font-semibold text-muted"
                  >
                    Team / Kit Hint (optional)
                  </label>
                  <input
                    id="team-kit-note"
                    type="text"
                    value={teamKitNote}
                    onChange={(e) => setTeamKitNote(e.target.value)}
                    placeholder="e.g. Our squad in White shirts, GK in Green"
                    className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Player Card */}
      {selectedMatch && (
        <MatchVideoPlayer
          playerRef={playerRef}
          videoUrl={selectedMatch.video_url}
          matchTitle={selectedMatch.title}
          events={matchEvents}
          activeEventId={activeEventId}
          onSelectEvent={seekToEvent}
          seekFeedback={seekFeedback}
          onDurationChange={handlePlayerDurationChange}
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
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'pending'
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
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeTab === 'confirmed'
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
