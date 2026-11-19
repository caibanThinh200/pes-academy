import { NextRequest, NextResponse } from 'next/server';
import { MatchEvent } from '@/types/database';
import { formatTimestamp, normalizeYouTubeUrl } from '@/lib/utils';

export const maxDuration = 60;

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
}

interface RawGeminiEvent {
  timestamp_sec?: number;
  clip_start_sec?: number;
  timestamp_formatted?: string;
  timestamp_mm_ss?: string;
  event_type?: 'goal' | 'save';
  confidence_score?: number;
  confidence?: number;
  visual_cue?: string;
  description?: string;
  suggested_user_id?: string | null;
  suggested_jersey_number?: number | null;
}

const SYSTEM_INSTRUCTION =
  'You are an expert football match analyst. Analyze the provided match video segment and identify every instance where a goal is scored or a goalkeeper makes a clear save/deflection. Match players to the provided squad roster whenever jersey numbers or goalkeeper positions are identifiable. Return ONLY a strict JSON array conforming to the response schema.';

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
  item: RawGeminiEvent,
  eventType: 'goal' | 'save',
  roster: RosterPlayerInput[],
  validRosterIds: Set<string>
): string | null {
  if (item.suggested_user_id && validRosterIds.has(item.suggested_user_id)) {
    return item.suggested_user_id;
  }

  if (
    item.suggested_jersey_number !== null &&
    item.suggested_jersey_number !== undefined &&
    Number.isFinite(Number(item.suggested_jersey_number))
  ) {
    const jerseyNum = Number(item.suggested_jersey_number);
    const byJersey = roster.find((p) => p.jersey_number === jerseyNum);
    if (byJersey) return byJersey.id;
  }

  if (eventType === 'save') {
    const firstGk = roster.find((p) => p.position === 'gk');
    if (firstGk) return firstGk.id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnalyzeMatchPayload;
    const matchId = body.matchId || '10000000-0000-0000-0000-000000000002';
    const videoUrl = body.videoUrl ?? null;
    const teamKitNote = typeof body.teamKitNote === 'string' ? body.teamKitNote.trim() : '';
    const roster: RosterPlayerInput[] = Array.isArray(body.roster) ? body.roster : [];

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

    if (!isValidApiKey || !canonicalYoutubeUrl) {
      const reason = !isValidApiKey
        ? 'No valid GEMINI_API_KEY detected in environment; returning realistic AI simulation.'
        : 'No YouTube URL attached to this match; returning chunked demo simulation.';
      return NextResponse.json({
        success: true,
        simulated: true,
        mode: 'simulated' as const,
        chunkStartSec,
        chunkEndSec,
        message: reason,
        events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
      });
    }

    const formattedRoster =
      roster.length > 0
        ? roster
            .map(
              (p) =>
                `- ID: "${p.id}" | Name: "${p.name}" | Jersey #: ${
                  p.jersey_number ?? 'N/A'
                } | Position: ${p.position === 'gk' ? 'GK (Goalkeeper)' : 'Outfield'}`
            )
            .join('\n')
        : 'No roster provided.';

    const promptText = [
      `Analyze ONLY the video segment from ${chunkStartSec} seconds (${formatTimestamp(
        chunkStartSec
      )}) to ${chunkEndSec} seconds (${formatTimestamp(chunkEndSec)}).`,
      teamKitNote ? `Team / Kit Context: ${teamKitNote}` : null,
      `Squad Roster:\n${formattedRoster}`,
      'Task: Detect every Goal (`goal`) and Goalkeeper Save (`save`) in this segment.',
      'Look closely at ball trajectory crossing the goal line, net ripples, goalkeeper dives/parries/deflections, celebrations, and kickoff resets.',
      'For each event:',
      `- Set timestamp_sec to the exact match video timestamp in seconds (between ${chunkStartSec} and ${chunkEndSec}).`,
      '- Set visual_cue to a concise 1-sentence description including kit color, visible jersey number (if any), shot/save type, and why it is a goal or save.',
      '- Set suggested_user_id: for `save` events where our goalkeeper makes the save, use the matching GK `id` from the Squad Roster; for `goal` events, match a visible jersey number to a player `id` in the Squad Roster, or choose the best roster match or null if uncertain.',
      '- Set suggested_jersey_number to the visible jersey number integer if clearly seen, else null.',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const payload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            parts: [
              {
                fileData: {
                  fileUri: canonicalYoutubeUrl,
                  mimeType: 'video/mp4',
                },
                videoMetadata: {
                  startOffset: `${Math.floor(chunkStartSec)}s`,
                  endOffset: `${Math.floor(chunkEndSec)}s`,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                timestamp_sec: { type: 'NUMBER' },
                timestamp_formatted: { type: 'STRING' },
                event_type: { type: 'STRING', enum: ['goal', 'save'] },
                confidence_score: { type: 'NUMBER' },
                visual_cue: { type: 'STRING' },
                suggested_user_id: { type: 'STRING', nullable: true },
                suggested_jersey_number: { type: 'INTEGER', nullable: true },
              },
              required: ['timestamp_sec', 'event_type', 'confidence_score', 'visual_cue'],
            },
          },
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(
          `Gemini API returned status ${res.status}; falling back to simulation.`,
          errBody.slice(0, 300)
        );
        return NextResponse.json({
          success: true,
          simulated: true,
          mode: 'simulated' as const,
          chunkStartSec,
          chunkEndSec,
          message: `Gemini API responded with status ${res.status}. Fallback simulation applied.`,
          events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
        });
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return NextResponse.json({
          success: true,
          simulated: true,
          mode: 'simulated' as const,
          chunkStartSec,
          chunkEndSec,
          events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
        });
      }

      const parsed = JSON.parse(rawText) as RawGeminiEvent[];

      if (!Array.isArray(parsed)) {
        return NextResponse.json({
          success: true,
          simulated: true,
          mode: 'simulated' as const,
          chunkStartSec,
          chunkEndSec,
          events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
        });
      }

      const validRosterIds = new Set(roster.map((p) => p.id));

      const events: MatchEvent[] = parsed.map((item) => {
        let rawTs = Number(item.timestamp_sec ?? item.clip_start_sec ?? chunkStartSec);
        if (!Number.isFinite(rawTs) || rawTs < 0) {
          rawTs = chunkStartSec;
        }
        // Normalize segment-relative timestamps (0..900) to absolute match seconds
        if (
          chunkStartSec > 0 &&
          rawTs >= 0 &&
          rawTs <= chunkEndSec - chunkStartSec + 5 &&
          rawTs < chunkStartSec
        ) {
          rawTs += chunkStartSec;
        }

        const timestampFormatted = formatTimestamp(rawTs);
        const eventType: 'goal' | 'save' = item.event_type === 'save' ? 'save' : 'goal';
        const confidenceScore = Math.min(
          1,
          Math.max(0, Number(item.confidence_score ?? item.confidence ?? 0.9))
        );
        const visualCue =
          item.visual_cue ||
          item.description ||
          `${eventType === 'goal' ? 'Goal' : 'Save'} detected at ${timestampFormatted}`;
        const assignedUserId = resolveSuggestedUserId(item, eventType, roster, validRosterIds);

        return {
          id: crypto.randomUUID(),
          match_id: matchId,
          timestamp_sec: rawTs,
          timestamp_formatted: timestampFormatted,
          event_type: eventType,
          confidence_score: confidenceScore,
          visual_cue: visualCue,
          assigned_user_id: assignedUserId,
          status: 'pending_review',
        };
      });

      return NextResponse.json({
        success: true,
        simulated: false,
        mode: 'gemini_youtube' as const,
        chunkStartSec,
        chunkEndSec,
        events,
      });
    } catch (err) {
      console.error('Error querying Gemini API:', err);
      return NextResponse.json({
        success: true,
        simulated: true,
        mode: 'simulated' as const,
        chunkStartSec,
        chunkEndSec,
        message: 'Exception occurred while contacting Gemini API; fallback simulation applied.',
        events: getSimulatedEvents(matchId, chunkStartSec, chunkEndSec, roster),
      });
    }
  } catch (err) {
    console.error('Route error in /api/analyze-match:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
