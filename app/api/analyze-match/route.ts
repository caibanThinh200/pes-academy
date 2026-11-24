import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { z } from 'zod';
import { MatchEvent } from '@/types/database';
import { formatTimestamp, normalizeYouTubeUrl } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/auth-shared';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const DEFAULT_GEMINI_MODEL = 'models/gemini-4-hydrogen';
const FALLBACK_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-4-hydrogen',
  'gemini-3.5-flash-lite',
] as const;

function getGeminiCandidateModels(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(
    new Set(
      [configured || DEFAULT_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS].filter(
        (m): m is string => Boolean(m)
      )
    )
  );
}
const MAX_CANDIDATES_PER_CHUNK = 12;
const PASS2_CONCURRENCY = 2;
const EVENT_DEDUP_WINDOW_SEC = 6;

interface RosterPlayerInput {
  id: string;
  name: string;
  jersey_number: number | null;
  position: 'field' | 'gk';
}

interface AnalyzeMatchPayload {
  matchId?: string;
  videoUrl?: string | null;
  chunkStartSec?: number;
  chunkEndSec?: number;
  teamKitNote?: string;
  roster?: RosterPlayerInput[];
  presentRoster?: RosterPlayerInput[];
}

const CandidateWindowSchema = z.object({
  candidate_sec: z.number(),
  clip_start_sec: z.number(),
  clip_end_sec: z.number(),
  suspected_type: z.enum(['goal', 'save']),
  preliminary_visual_cue: z.string(),
  preliminary_audio_cue: z.string(),
});

const CandidateWindowArraySchema = z.array(CandidateWindowSchema);

type CandidateWindow = z.infer<typeof CandidateWindowSchema>;

const VerifiedMatchEventSchema = z.object({
  timestamp_sec: z.number(),
  timestamp_formatted: z.string(),
  clip_start_sec: z.number(),
  clip_end_sec: z.number(),
  action_outcome: z.enum(['goal', 'save', 'miss', 'block', 'post_hit']),
  confidence_score: z.number(),
  visual_cue: z.string(),
  audio_cue: z.string(),
  suggested_user_id: z.string().nullable().optional(),
  suggested_jersey_number: z.number().nullable().optional(),
});

const VerifiedMatchEventArraySchema = z.array(VerifiedMatchEventSchema);

type VerifiedMatchEvent = z.infer<typeof VerifiedMatchEventSchema>;

const PASS1_CANDIDATE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      candidate_sec: {
        type: Type.NUMBER,
        description: 'Peak event timestamp in seconds on the full match timeline.',
      },
      clip_start_sec: {
        type: Type.NUMBER,
        description: 'Start of candidate clip window (typically candidate_sec - 4).',
      },
      clip_end_sec: {
        type: Type.NUMBER,
        description: 'End of candidate clip window (typically candidate_sec + 6).',
      },
      suspected_type: {
        type: Type.STRING,
        enum: ['goal', 'save'],
        description: 'Suspected highlight type for high-FPS Pass 2 zoom verification.',
      },
      preliminary_visual_cue: {
        type: Type.STRING,
        description:
          'What was seen in the 0.5 FPS (every 2s) frames (attacker box approach, jersey/kit, shot, GK dive, net movement, celebration).',
      },
      preliminary_audio_cue: {
        type: Type.STRING,
        description:
          'What was heard in the audio stream (crowd roar/cheer/whistle, or Double-Impact kick + glove slap + reaction shout).',
      },
    },
    required: [
      'candidate_sec',
      'clip_start_sec',
      'clip_end_sec',
      'suspected_type',
      'preliminary_visual_cue',
      'preliminary_audio_cue',
    ],
  },
};

const PASS2_VERIFIED_EVENT_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      timestamp_sec: {
        type: Type.NUMBER,
        description:
          'Exact event peak timestamp in seconds relative to full match timeline (ball crossing line or GK glove parry).',
      },
      timestamp_formatted: {
        type: Type.STRING,
        description: 'Human-readable MM:SS timestamp matching timestamp_sec.',
      },
      clip_start_sec: {
        type: Type.NUMBER,
        description: 'Start of the review clip window in seconds (typically timestamp_sec - 4).',
      },
      clip_end_sec: {
        type: Type.NUMBER,
        description: 'End of the review clip window in seconds (typically timestamp_sec + 6).',
      },
      action_outcome: {
        type: Type.STRING,
        enum: ['goal', 'save', 'miss', 'block', 'post_hit'],
        description:
          "Verified outcome from Pass 2. Only 'goal' and 'save' are surfaced as match highlights.",
      },
      confidence_score: {
        type: Type.NUMBER,
        minimum: 0,
        maximum: 1,
        description: 'Model confidence in action_outcome and timing (0.0 to 1.0).',
      },
      visual_cue: {
        type: Type.STRING,
        description:
          'Concise description of the decisive visual evidence (e.g., net ripple, glove deflection, kit/jersey sighting).',
      },
      audio_cue: {
        type: Type.STRING,
        description:
          "Concise description of the paired acoustic evidence (e.g., Double-Impact kick + glove slap + 'Corner!' shout, or crowd roar + whistle).",
      },
      suggested_user_id: {
        type: Type.STRING,
        nullable: true,
        description:
          'Matched player ID from presentRoster (scorer for goal, GK for save), or null if unidentifiable.',
      },
      suggested_jersey_number: {
        type: Type.INTEGER,
        nullable: true,
        description:
          'Observed jersey number (1-99) from 2s approach/celebration or 4-5 FPS save frames, or null if occluded.',
      },
    },
    required: [
      'timestamp_sec',
      'timestamp_formatted',
      'clip_start_sec',
      'clip_end_sec',
      'action_outcome',
      'confidence_score',
      'visual_cue',
      'audio_cue',
    ],
  },
};

const PASS1_SYSTEM_INSTRUCTION = [
  'You are Pass 1 (Audio + 2s Frame Catch Candidate Spotter) in a two-pass football match analysis pipeline.',
  'You receive a match video segment sampled at 0.5 FPS (1 frame every 2 seconds) together with its FULL native audio track.',
  'Your job is to spot every candidate Goal or Goalkeeper Save window `[clip_start_sec, clip_end_sec]` for high-FPS Pass 2 verification — prioritize high recall so no fast (<1.5s) goalkeeper parry or counter-attack goal is missed between 2-second frames.',
  'Return ONLY a strict JSON array conforming to the response schema.',
].join(' ');

const PASS2_SYSTEM_INSTRUCTION = [
  'You are Pass 2 (High-FPS Visual & Player Verifier) in a two-pass football match analysis pipeline.',
  'You receive a zoomed 8-12 second match clip sampled at 5 FPS alongside full audio and Pass 1 preliminary context.',
  'Verify the exact outcome (`goal`, `save`, `miss`, `block`, or `post_hit`), pinpoint the peak timestamp, and identify the scorer or goalkeeper from the provided squad roster.',
  'Return ONLY a strict JSON array conforming to the response schema.',
].join(' ');

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !isTransientGeminiError(err)) {
        throw err;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function isTransientGeminiError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode ?? record.code);
  if (status === 429 || (Number.isFinite(status) && status >= 500 && status < 600)) {
    return true;
  }
  const message = String(record.message ?? err).toUpperCase();
  return (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('UNAVAILABLE') ||
    message.includes('INTERNAL') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('500') ||
    message.includes('504') ||
    message.includes('TIMEOUT') ||
    message.includes('ECONNRESET')
  );
}

function isModelNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode ?? record.code);
  if (status === 404) return true;
  const message = String(record.message ?? err).toUpperCase();
  return (
    message.includes('404') ||
    message.includes('NOT_FOUND') ||
    message.includes('NO LONGER AVAILABLE')
  );
}

function findSimulatedPlayerId(
  roster: RosterPlayerInput[],
  eventType: 'goal' | 'save',
  preferredJerseys: number[],
  fallbackOffset: number
): string | null {
  if (roster.length === 0) return null;

  if (eventType === 'save') {
    const gk = roster.find((p) => p.position === 'gk');
    if (gk) return gk.id;
  }

  for (const num of preferredJerseys) {
    const match = roster.find((p) => p.jersey_number === num);
    if (match) return match.id;
  }

  const outfield = roster.filter((p) => p.position !== 'gk');
  const pool = outfield.length > 0 ? outfield : roster;
  return pool[fallbackOffset % pool.length]?.id ?? null;
}

function getSimulatedEvents(
  matchId: string,
  chunkStartSec: number,
  chunkEndSec: number,
  roster: RosterPlayerInput[]
): MatchEvent[] {
  const span = Math.max(60, chunkEndSec - chunkStartSec);
  const chunkIndex = Math.floor(chunkStartSec / 900);

  const templates: Array<{
    fraction: number;
    event_type: 'goal' | 'save';
    confidence_score: number;
    visual_cue: string;
    preferredJerseys: number[];
  }> = [
      {
        fraction: 0.08 + (chunkIndex % 2) * 0.04,
        event_type: 'goal',
        confidence_score: 0.94,
        visual_cue: 'Forward (#10) curls a left-footed strike into the top-right corner',
        preferredJerseys: [10, 9, 7],
      },
      {
        fraction: 0.28 + (chunkIndex % 3) * 0.03,
        event_type: 'save',
        confidence_score: 0.89,
        visual_cue: 'Goalkeeper dives full-stretch to parry a low driven shot around the post',
        preferredJerseys: [1],
      },
      {
        fraction: 0.56,
        event_type: 'goal',
        confidence_score: 0.96,
        visual_cue: 'Striker (#9) finishes a one-touch counter-attack at the near post',
        preferredJerseys: [9, 10, 11],
      },
      {
        fraction: 0.78,
        event_type: 'save',
        confidence_score: 0.84,
        visual_cue: 'Point-blank reflex deflection off the crossbar by the goalkeeper',
        preferredJerseys: [1],
      },
      {
        fraction: 0.91,
        event_type: 'goal',
        confidence_score: 0.91,
        visual_cue: 'Midfielder (#7) volleys from the edge of the box into the bottom-left corner',
        preferredJerseys: [7, 8, 10],
      },
    ];

  // For chunks beyond the first, simulate 2-3 events so multi-chunk scans feel realistic
  const selectedTemplates =
    chunkIndex === 0 ? templates : templates.slice(0, chunkIndex % 2 === 1 ? 3 : 2);

  return selectedTemplates.map((tpl, idx) => {
    const timestampSec = Number(
      Math.min(chunkEndSec - 2, chunkStartSec + Math.round(span * tpl.fraction)).toFixed(1)
    );
    return {
      id: crypto.randomUUID(),
      match_id: matchId,
      timestamp_sec: timestampSec,
      timestamp_formatted: formatTimestamp(timestampSec),
      event_type: tpl.event_type,
      confidence_score: tpl.confidence_score,
      visual_cue: tpl.visual_cue,
      assigned_user_id: findSimulatedPlayerId(
        roster,
        tpl.event_type,
        tpl.preferredJerseys,
        idx + chunkIndex
      ),
      status: 'pending_review',
    };
  });
}

function resolveSuggestedUserId(
  eventType: 'goal' | 'save',
  suggestedUserId: string | null | undefined,
  suggestedJerseyNumber: number | null | undefined,
  roster: RosterPlayerInput[],
  validRosterIds: Set<string>
): string | null {
  if (suggestedUserId && validRosterIds.has(suggestedUserId)) {
    return suggestedUserId;
  }

  if (
    suggestedJerseyNumber !== null &&
    suggestedJerseyNumber !== undefined &&
    Number.isFinite(Number(suggestedJerseyNumber))
  ) {
    const jerseyNum = Number(suggestedJerseyNumber);
    const byJersey = roster.find((p) => p.jersey_number === jerseyNum);
    if (byJersey) return byJersey.id;
  }

  if (eventType === 'save') {
    const firstGk = roster.find((p) => p.position === 'gk');
    if (firstGk) return firstGk.id;
  }

  return null;
}

function formatSquadRoster(roster: RosterPlayerInput[]): string {
  if (roster.length === 0) return 'No roster provided.';
  return roster
    .map(
      (p) =>
        `- ID: "${p.id}" | Name: "${p.name}" | Jersey #: ${p.jersey_number ?? 'N/A'
        } | Position: ${p.position === 'gk' ? 'GK (Goalkeeper)' : 'Outfield'}`
    )
    .join('\n');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeCandidateTimestamp(
  rawTs: number,
  chunkStartSec: number,
  chunkEndSec: number
): number {
  let ts = Number.isFinite(rawTs) && rawTs >= 0 ? rawTs : chunkStartSec;
  // Normalize segment-relative timestamps (0..900) to absolute match seconds
  if (
    chunkStartSec > 0 &&
    ts >= 0 &&
    ts <= chunkEndSec - chunkStartSec + 5 &&
    ts < chunkStartSec
  ) {
    ts += chunkStartSec;
  }
  return clamp(ts, chunkStartSec, chunkEndSec);
}

function normalizePass2Timestamp(
  rawTs: number,
  winStartSec: number,
  winEndSec: number,
  chunkStartSec: number,
  chunkEndSec: number
): number {
  let ts = Number.isFinite(rawTs) && rawTs >= 0 ? rawTs : winStartSec;
  if (winStartSec > 0 && ts >= 0 && ts <= winEndSec - winStartSec + 2 && ts < winStartSec) {
    ts += winStartSec;
  } else if (
    chunkStartSec > 0 &&
    ts >= 0 &&
    ts <= chunkEndSec - chunkStartSec + 5 &&
    ts < chunkStartSec
  ) {
    ts += chunkStartSec;
  }
  return Number(clamp(ts, chunkStartSec, chunkEndSec).toFixed(1));
}

function coalesceCandidates(
  candidates: CandidateWindow[],
  chunkStartSec: number,
  chunkEndSec: number
): CandidateWindow[] {
  const normalized = candidates
    .map((c) => {
      const candidateSec = normalizeCandidateTimestamp(c.candidate_sec, chunkStartSec, chunkEndSec);
      const clipStartSec = Math.max(chunkStartSec, Math.floor(candidateSec - 4));
      const clipEndSec = Math.min(chunkEndSec, Math.ceil(candidateSec + 6));
      return {
        ...c,
        candidate_sec: candidateSec,
        clip_start_sec: clipStartSec,
        clip_end_sec: clipEndSec,
      };
    })
    .sort((a, b) => a.candidate_sec - b.candidate_sec);

  const merged: CandidateWindow[] = [];
  for (const current of normalized) {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(current.candidate_sec - prev.candidate_sec) <= EVENT_DEDUP_WINDOW_SEC) {
      prev.clip_start_sec = Math.min(prev.clip_start_sec, current.clip_start_sec);
      prev.clip_end_sec = Math.max(prev.clip_end_sec, current.clip_end_sec);
      if (!prev.preliminary_visual_cue.includes(current.preliminary_visual_cue)) {
        prev.preliminary_visual_cue = `${prev.preliminary_visual_cue}; ${current.preliminary_visual_cue}`;
      }
      if (!prev.preliminary_audio_cue.includes(current.preliminary_audio_cue)) {
        prev.preliminary_audio_cue = `${prev.preliminary_audio_cue}; ${current.preliminary_audio_cue}`;
      }
      continue;
    }
    merged.push(current);
  }

  return merged.slice(0, MAX_CANDIDATES_PER_CHUNK);
}

function deduplicateEvents(events: MatchEvent[]): MatchEvent[] {
  const deduped: MatchEvent[] = [];

  for (const candidate of events) {
    const dupIndex = deduped.findIndex(
      (ev) =>
        ev.event_type === candidate.event_type &&
        Math.abs(ev.timestamp_sec - candidate.timestamp_sec) <= EVENT_DEDUP_WINDOW_SEC
    );

    if (dupIndex >= 0) {
      if (candidate.confidence_score > deduped[dupIndex].confidence_score) {
        deduped[dupIndex] = candidate;
      }
    } else {
      deduped.push(candidate);
    }
  }

  return deduped.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}

function buildPass1Prompt(
  chunkStartSec: number,
  chunkEndSec: number,
  teamKitNote: string,
  formattedRoster: string
): string {
  return [
    `Scan ONLY the video segment from ${chunkStartSec}s (${formatTimestamp(
      chunkStartSec
    )}) to ${chunkEndSec}s (${formatTimestamp(chunkEndSec)}) at 0.5 FPS (every 2s frames) with the full audio track.`,
    teamKitNote ? `Team / Kit Context: ${teamKitNote}` : null,
    `Squad Roster:\n${formattedRoster}`,
    [
      'Goal Candidate Trigger (2s Frame Catch + Net/Box Approach + Crowd/Cheer Audio):',
      '1. Every 2s Frame Catch (0.5 FPS): Track active attacking players approaching/entering the penalty box (noting jersey number, kit color, and build).',
      '2. Ball & Net / Goal Line Action: Spot shots toward the goal frame, net movement, or players turning to celebrate.',
      '3. Crowd / Pitch Celebration Audio: Confirm concurrent audio spike (crowd roar, teammates cheering, or referee kickoff whistle reset).',
    ].join('\n'),
    [
      'Goalkeeper Save Candidate Trigger ("Double-Impact + Reaction" Audio Signature):',
      '1. Impact 1 (t = 0.0s): Boot striking the ball (hard shot).',
      '2. Impact 2 (t = +0.2s to +1.2s): Sharp glove slap / latex parry thud (or crossbar/post deflection).',
      '3. Reaction (t = +1.0s to +3.0s): Vocal reaction from GK/defenders/crowd ("Hay quá!", "Good save!", "Corner!") with play continuing (no center kickoff reset).',
    ].join('\n'),
    [
      'Output Rules:',
      `- Set candidate_sec to the peak event timestamp in absolute match seconds (between ${chunkStartSec} and ${chunkEndSec}).`,
      '- Set clip_start_sec = candidate_sec - 4 and clip_end_sec = candidate_sec + 6.',
      '- Set suspected_type to "goal" or "save".',
      '- Summarize what was observed in preliminary_visual_cue and preliminary_audio_cue.',
      '- If no goal or save candidates occur in this segment, return [].',
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildPass2Prompt(
  candidate: CandidateWindow,
  winStartSec: number,
  winEndSec: number,
  teamKitNote: string,
  formattedRoster: string
): string {
  return [
    `Inspect the zoomed 5 FPS clip from ${winStartSec}s (${formatTimestamp(
      winStartSec
    )}) to ${winEndSec}s (${formatTimestamp(winEndSec)}).`,
    `Pass 1 Preliminary Context (${candidate.suspected_type.toUpperCase()} near ${candidate.candidate_sec.toFixed(
      1
    )}s): Visual="${candidate.preliminary_visual_cue}" | Audio="${candidate.preliminary_audio_cue}"`,
    teamKitNote ? `Team / Kit Context: ${teamKitNote}` : null,
    `Squad Roster:\n${formattedRoster}`,
    [
      'Goal Verification (action_outcome: "goal"):',
      '1. Verify at 5 FPS that the ball trajectory visibly crosses the goal line into the net (net ripple / ball stays inside the goal, NOT bouncing off the post, hitting side-netting from outside, or flying over).',
      '2. Confirm concurrent crowd roar / celebration / whistle audio.',
      '3. Scorer Identification: Use the 2s pre-shot box-approach frames (and Pass 1 context) plus post-goal celebration frames where the scorer separates from the crowd to read suggested_jersey_number and kit color, matching against the Squad Roster and Team/Kit Context to populate suggested_user_id.',
    ].join('\n'),
    [
      'Save Verification (action_outcome: "save"):',
      '1. At 5 FPS, capture the exact <1.5s dive/parry frame where the goalkeeper\'s gloves (or body) deflect or catch an on-target shot, aligning with Impact 2 of the "Double-Impact + Reaction" audio pattern (Impact 1: boot strike -> Impact 2: glove slap -> Reaction: "Hay quá!" / "Good save!" / "Corner!").',
      '2. Goalkeeper Identification: Identify the Goalkeeper from GK gloves/distinctive kit and match against Squad Roster players with position === "gk" (and Team/Kit Context).',
    ].join('\n'),
    [
      'Negative Class Filtering (MUST classify accurately so non-highlights are discarded):',
      '- "miss": Shot missing wide/high or hitting the perimeter fence.',
      '- "block": Shot blocked/deflected by an outfield defender rather than the goalkeeper.',
      '- "post_hit": Shot hitting the goalpost or crossbar and bouncing out without a goalkeeper touch or goal.',
    ].join('\n'),
    [
      'Output Rules:',
      `- Set timestamp_sec in absolute match seconds (between ${winStartSec} and ${winEndSec}), with matching MM:SS timestamp_formatted.`,
      '- Set clip_start_sec = timestamp_sec - 4 and clip_end_sec = timestamp_sec + 6.',
      '- Provide concise visual_cue and audio_cue evidence, plus suggested_user_id and suggested_jersey_number (or null if occluded/uncertain).',
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((item) => worker(item)));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    if (isSupabaseConfigured) {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: profile } = await supabase!
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = (await req.json().catch(() => ({}))) as AnalyzeMatchPayload;
    const matchId = body.matchId || '10000000-0000-0000-0000-000000000002';
    const videoUrl = body.videoUrl ?? null;
    const teamKitNote = typeof body.teamKitNote === 'string' ? body.teamKitNote.trim() : '';
    const rawRoster = body.roster ?? body.presentRoster;
    const roster: RosterPlayerInput[] = Array.isArray(rawRoster) ? rawRoster : [];

    const parsedStart = Number(body.chunkStartSec);
    const parsedEnd = Number(body.chunkEndSec);
    const chunkStartSec =
      Number.isFinite(parsedStart) && parsedStart >= 0 ? Math.floor(parsedStart) : 0;
    const chunkEndSec =
      Number.isFinite(parsedEnd) && parsedEnd > chunkStartSec
        ? Math.floor(parsedEnd)
        : chunkStartSec + 900;

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const isValidApiKey =
      apiKey.length > 10 && !apiKey.toLowerCase().includes('your_gemini_api_key');
    const canonicalYoutubeUrl = normalizeYouTubeUrl(videoUrl);

    if (!canonicalYoutubeUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'A valid YouTube match video URL is required before running analysis.',
        },
        { status: 400 }
      );
    }

    if (!isValidApiKey) {
      return NextResponse.json({
        success: true,
        simulated: true,
        mode: 'simulated' as const,
        model: 'simulation-fallback',
        chunkStartSec,
        chunkEndSec,
        message: 'No valid GEMINI_API_KEY detected in environment; returning realistic AI simulation.',
        events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const formattedRoster = formatSquadRoster(roster);
    const validRosterIds = new Set(roster.map((p) => p.id));

    const candidateModels = getGeminiCandidateModels();
    let activeModel = candidateModels[0] ?? DEFAULT_GEMINI_MODEL;
    console.log(activeModel, 'model')

    const generateWithModel = async (
      runForModel: (model: string) => ReturnType<typeof ai.models.generateContent>
    ) => {
      const modelsToTry = [
        activeModel,
        ...candidateModels.filter((m) => m !== activeModel),
      ];
      let lastErr: unknown;
      for (const model of modelsToTry) {
        try {
          const response = await withRetry(() => runForModel(model), 2, 1200);
          activeModel = model;
          return response;
        } catch (err) {
          lastErr = err;
          if (isModelNotFoundError(err) || isTransientGeminiError(err)) {
            console.warn(
              `Gemini model "${model}" unavailable (${err instanceof Error ? err.message : String(err)}); trying next fallback model.`
            );
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    try {
      // Pass 1: Audio + 2s Frame Catch Candidate Spotter (0.5 FPS + full audio track)
      const pass1Prompt = buildPass1Prompt(chunkStartSec, chunkEndSec, teamKitNote, formattedRoster);
      const pass1Response = await generateWithModel((model) =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: canonicalYoutubeUrl,
                    mimeType: 'video/mp4',
                  },
                  videoMetadata: {
                    startOffset: `${Math.floor(chunkStartSec)}s`,
                    endOffset: `${Math.floor(chunkEndSec)}s`,
                    fps: 0.5,
                  },
                },
                {
                  text: pass1Prompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction: PASS1_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: PASS1_CANDIDATE_SCHEMA,
          },
        })
      );

      const pass1RawText = pass1Response.text;
      if (!pass1RawText) {
        return NextResponse.json({
          success: true,
          simulated: false,
          mode: 'gemini_youtube' as const,
          model: activeModel,
          chunkStartSec,
          chunkEndSec,
          events: [],
        });
      }

      const pass1Json: unknown = JSON.parse(pass1RawText);
      const pass1Parsed = CandidateWindowArraySchema.safeParse(pass1Json);

      if (!pass1Parsed.success) {
        console.warn('Pass 1 candidate schema validation failed; returning empty events.', {
          issues: pass1Parsed.error.issues.slice(0, 5),
        });
        return NextResponse.json({
          success: true,
          simulated: false,
          mode: 'gemini_youtube' as const,
          model: activeModel,
          chunkStartSec,
          chunkEndSec,
          events: [],
        });
      }

      if (pass1Parsed.data.length === 0) {
        return NextResponse.json({
          success: true,
          simulated: false,
          mode: 'gemini_youtube' as const,
          model: activeModel,
          chunkStartSec,
          chunkEndSec,
          events: [],
        });
      }

      const candidates = coalesceCandidates(pass1Parsed.data, chunkStartSec, chunkEndSec);

      // Pass 2: High-FPS Visual & Player Verifier (5 FPS on [candidate_sec - 4s, candidate_sec + 6s])
      const pass2Results = await runInBatches(
        candidates,
        PASS2_CONCURRENCY,
        async (candidate): Promise<MatchEvent[]> => {
          let winStartSec = Math.max(chunkStartSec, Math.floor(candidate.candidate_sec - 4));
          let winEndSec = Math.min(chunkEndSec, Math.ceil(candidate.candidate_sec + 6));
          if (winEndSec <= winStartSec) {
            winStartSec = Math.max(chunkStartSec, winEndSec - 2);
            winEndSec = Math.min(chunkEndSec, winStartSec + 2);
          }

          const pass2Prompt = buildPass2Prompt(
            candidate,
            winStartSec,
            winEndSec,
            teamKitNote,
            formattedRoster
          );

          const pass2Response = await generateWithModel((model) =>
            ai.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      fileData: {
                        fileUri: canonicalYoutubeUrl,
                        mimeType: 'video/mp4',
                      },
                      videoMetadata: {
                        startOffset: `${winStartSec}s`,
                        endOffset: `${winEndSec}s`,
                        fps: 5,
                      },
                    },
                    {
                      text: pass2Prompt,
                    },
                  ],
                },
              ],
              config: {
                systemInstruction: PASS2_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: PASS2_VERIFIED_EVENT_SCHEMA,
              },
            })
          );

          const rawText = pass2Response.text;
          if (!rawText) return [];

          const parsedJson: unknown = JSON.parse(rawText);
          const validated = VerifiedMatchEventArraySchema.safeParse(parsedJson);
          if (!validated.success) {
            console.warn('Pass 2 verified event validation failed for candidate window:', {
              candidateSec: candidate.candidate_sec,
              issues: validated.error.issues.slice(0, 5),
            });
            return [];
          }

          return validated.data
            .filter(
              (item): item is VerifiedMatchEvent & { action_outcome: 'goal' | 'save' } =>
                item.action_outcome === 'goal' || item.action_outcome === 'save'
            )
            .map((item) => {
              const timestampSec = normalizePass2Timestamp(
                item.timestamp_sec,
                winStartSec,
                winEndSec,
                chunkStartSec,
                chunkEndSec
              );
              const timestampFormatted = formatTimestamp(timestampSec);
              const eventType: 'goal' | 'save' = item.action_outcome;
              const confidenceScore = clamp(Number(item.confidence_score), 0, 1);
              const visualCue = item.visual_cue.trim();
              const audioCue = item.audio_cue.trim();
              const combinedCue = audioCue ? `${visualCue} | Audio: ${audioCue}` : visualCue;

              return {
                id: crypto.randomUUID(),
                match_id: matchId,
                timestamp_sec: timestampSec,
                timestamp_formatted: timestampFormatted,
                event_type: eventType,
                confidence_score: Number.isFinite(confidenceScore) ? confidenceScore : 0.85,
                visual_cue:
                  combinedCue ||
                  `${eventType === 'goal' ? 'Goal' : 'Save'} detected at ${timestampFormatted}`,
                assigned_user_id: resolveSuggestedUserId(
                  eventType,
                  item.suggested_user_id,
                  item.suggested_jersey_number,
                  roster,
                  validRosterIds
                ),
                status: 'pending_review',
              };
            });
        }
      );

      const fulfilledResults = pass2Results.filter(
        (res): res is PromiseFulfilledResult<MatchEvent[]> => res.status === 'fulfilled'
      );

      if (fulfilledResults.length === 0) {
        const firstRejected = pass2Results.find(
          (res): res is PromiseRejectedResult => res.status === 'rejected'
        );
        throw firstRejected?.reason ?? new Error('All Pass 2 verification calls failed.');
      }

      const verifiedEvents = deduplicateEvents(fulfilledResults.flatMap((res) => res.value));

      return NextResponse.json({
        success: true,
        simulated: false,
        mode: 'gemini_youtube' as const,
        model: activeModel,
        chunkStartSec,
        chunkEndSec,
        events: verifiedEvents,
      });
    } catch (err) {
      console.error('Error querying Gemini API:', err);
      const isOverloaded = isTransientGeminiError(err);
      return NextResponse.json(
        {
          success: false,
          error: isOverloaded
            ? 'Gemini AI is currently experiencing high demand across all fallback models. Please wait a moment and try again.'
            : 'Failed to analyze match video with Gemini AI. Please try again.',
        },
        { status: isOverloaded ? 503 : 502 }
      );
    }
  } catch (err) {
    console.error('Route error in /api/analyze-match:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
