import { NextRequest, NextResponse } from 'next/server';
import { MatchEvent } from '@/types/database';
import { formatTimestamp } from '@/lib/utils';

const SYSTEM_INSTRUCTION =
  'You are a football match analyst. Analyze this match video and identify every instance where a goal is scored or a goalkeeper makes a save/deflection. Return ONLY a structured JSON array of events. Each object must contain: timestamp_sec (integer seconds from start), timestamp_formatted (\'MM:SS\'), event_type (\'goal\' | \'save\'), confidence_score (0.0 to 1.0), and visual_cue (brief 1-sentence description of jersey color or action, e.g., \'White jersey shoots into bottom left corner\').';

const USER_PROMPT =
  'Analyze this football match video and detect every Goal scored and every Goalkeeper Save. Look closely at ball trajectory into the net, goalkeeper dives/deflections, high-fives, and post-play resets.';

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
}

function getSimulatedEvents(matchId: string): MatchEvent[] {
  const now = Date.now();
  return [
    {
      id: `ai-sim-${now}-01`,
      match_id: matchId,
      timestamp_sec: 14.5,
      timestamp_formatted: '00:14',
      event_type: 'goal',
      confidence_score: 0.942,
      visual_cue: 'Albiceleste #10 curls a left-footed shot into the top-right corner',
      assigned_user_id: null,
      status: 'pending_review',
    },
    {
      id: `ai-sim-${now}-02`,
      match_id: matchId,
      timestamp_sec: 38.2,
      timestamp_formatted: '00:38',
      event_type: 'save',
      confidence_score: 0.887,
      visual_cue: 'Goalkeeper in green dives full-stretch to parry low drive',
      assigned_user_id: null,
      status: 'pending_review',
    },
    {
      id: `ai-sim-${now}-03`,
      match_id: matchId,
      timestamp_sec: 72.0,
      timestamp_formatted: '01:12',
      event_type: 'goal',
      confidence_score: 0.961,
      visual_cue: 'White & sky-blue #9 finishes a one-touch counter-attack at near post',
      assigned_user_id: null,
      status: 'pending_review',
    },
    {
      id: `ai-sim-${now}-04`,
      match_id: matchId,
      timestamp_sec: 105.8,
      timestamp_formatted: '01:45',
      event_type: 'save',
      confidence_score: 0.835,
      visual_cue: 'Point-blank reflex deflection off the crossbar by the keeper',
      assigned_user_id: null,
      status: 'pending_review',
    },
    {
      id: `ai-sim-${now}-05`,
      match_id: matchId,
      timestamp_sec: 142.3,
      timestamp_formatted: '02:22',
      event_type: 'goal',
      confidence_score: 0.915,
      visual_cue: 'Midfielder strikes a volley from the edge of the box into bottom-left',
      assigned_user_id: null,
      status: 'pending_review',
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchId = body.matchId || '10000000-0000-0000-0000-000000000002';
    const videoUrl = body.videoUrl as string | undefined;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Return simulated events when no API key is provided
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'No GEMINI_API_KEY detected in environment; returning realistic AI simulation.',
        events: getSimulatedEvents(matchId),
      });
    }

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
                text: `${USER_PROMPT}${
                  videoUrl ? `\nMatch Footage URL: ${videoUrl}` : ''
                }\nReturn strict JSON array of detected goal and save events.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`Gemini API returned status ${res.status}; falling back to simulation.`);
        return NextResponse.json({
          success: true,
          simulated: true,
          message: `Gemini API responded with status ${res.status}. Fallback simulation applied.`,
          events: getSimulatedEvents(matchId),
        });
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return NextResponse.json({
          success: true,
          simulated: true,
          events: getSimulatedEvents(matchId),
        });
      }

      const parsed: RawGeminiEvent[] = JSON.parse(rawText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json({
          success: true,
          simulated: true,
          events: getSimulatedEvents(matchId),
        });
      }

      const now = Date.now();
      const events: MatchEvent[] = parsed.map((item, idx) => {
        const timestampSec = Number(item.timestamp_sec ?? item.clip_start_sec ?? 0);
        const timestampFormatted =
          item.timestamp_formatted || item.timestamp_mm_ss || formatTimestamp(timestampSec);
        const eventType: 'goal' | 'save' =
          item.event_type === 'save' ? 'save' : 'goal';
        const confidenceScore = Math.min(
          1,
          Math.max(0, Number(item.confidence_score ?? item.confidence ?? 0.9))
        );
        const visualCue =
          item.visual_cue || item.description || `${eventType === 'goal' ? 'Goal' : 'Save'} detected at ${timestampFormatted}`;

        return {
          id: `ai-gen-${now}-${idx + 1}`,
          match_id: matchId,
          timestamp_sec: timestampSec,
          timestamp_formatted: timestampFormatted,
          event_type: eventType,
          confidence_score: confidenceScore,
          visual_cue: visualCue,
          assigned_user_id: null,
          status: 'pending_review',
        };
      });

      return NextResponse.json({
        success: true,
        simulated: false,
        events,
      });
    } catch (err) {
      console.error('Error querying Gemini API:', err);
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Exception occurred while contacting Gemini API; fallback simulation applied.',
        events: getSimulatedEvents(matchId),
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
