# Goal, Save & Player Detection — Approach & Tracking

This document defines and tracks the two-pass hybrid detection pipeline for PES Academy match footage analysis. It combines **Audio Signatures** (crowd/celebration noise and the "Double-Impact + Reaction" acoustic pattern) with **Multi-FPS Visual Frame Sampling** (`0.5 FPS` / every `2s` for coarse player flow and goal buildup; `4–5 FPS` for high-speed goalkeeper saves and net-crossing verification) — requiring zero manual dataset labeling.

> **Status**: Implemented. The two-pass hybrid detection pipeline (`DET-000` through `DET-005`) is live in `/api/analyze-match` and `app/review/page.tsx`.

---

## 1. Full Mapping & Verification Matrix

| ID | Component | Original / Research Baseline | Current Implementation | Filtered Plan | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MAP-001** | **Video Ingestion & Chunking** | Fixed chunking with uniform 1 FPS sampling across full video | 15-min (`900s`) non-overlapping chunks sent straight to Gemini at default 1 FPS | Add **15-second overlap** between chunks so boundary events (e.g., `14:58`) are not cut in half; use Pass 1 coarse scan (`0.5 FPS` / 1 frame every `2s` + audio stream) to locate `[clip_start_sec, clip_end_sec]` candidate windows before zooming in. | **ADAPT** |
| **MAP-002** | **Goal Detection** (2s Frame Catch + Net Crossing + Crowd/Cheer Audio) | Single-pass 1 FPS visual scan for celebrations/net motion | 1 FPS visual-only prompt looking for net ripples or celebrations | 1. **Every 2s Frame Catch (`0.5 FPS` in Pass 1 / 2s pre-window)**: Track active attacking players approaching the box (identifying jersey number, kit color, and build).<br>2. **Ball Crossing the Net (`2–4 FPS` around impact)**: Verify the ball trajectory crosses the goal line / ripples the net and stays inside (not bouncing off the post or side-netting).<br>3. **Crowd / Pitch Celebration Audio**: Confirm concurrent audio spike (crowd roar, teammates cheering, kickoff whistle reset). | **ADAPT** *(Core User Strategy)* |
| **MAP-003** | **Goalkeeper Save Detection** ("Double-Impact + Reaction" Audio + High-FPS Frame Catch) | High-FPS full-match scanning or custom action classifier | 1 FPS visual-only prompt outputting only `goal \| save` (misses `<1.5s` GK parries and misclassifies misses/blocks) | 1. **Audio Trigger ("Double-Impact + Reaction")**: Detect the paired acoustic signature:<br>  - *Impact 1 (`t = 0.0s`)*: Boot striking the ball (hard shot).<br>  - *Impact 2 (`t = +0.2s to +1.2s`)*: Sharp glove slap / latex parry thud (or crossbar/post deflection).<br>  - *Reaction (`t = +1.0s to +3.0s`)*: Vocal reaction from GK/defenders/crowd (*"Hay quá!"*, *"Good save!"*, *"Corner!"*) with play continuing (no kickoff reset).<br>2. **High-FPS Frame Catch (`4–5 FPS` over `[t - 3s, t + 5s]`)**: Sample 4–5 frames per second during the `1.5s` dive window to capture the exact glove-ball deflection frame and identify the Goalkeeper (via GK jersey/gloves + roster `'gk'` position match). | **ADAPT** *(Core User Strategy)* |
| **MAP-004** | **Player Identification** (Frame Catching + Roster Matching) | Dedicated jersey OCR + ReID embedding pipeline | Simple prompt matching `presentRoster` (`id`, `name`, `jersey_number`, `position`) + `teamKitNote` | **For Goals**: Use the `2s` pre-shot frames (`[t - 6s, t]`) and celebration frames (`[t, t + 6s]`) where the scorer runs clear of the crowd to read `jersey_number` and kit color, matching against `presentRoster`.<br>**For Saves**: Match the goalkeeper caught in the `4–5 FPS` parry frame against `presentRoster` players with `position === 'gk'` (and `teamKitNote`). | **KEEP & ENHANCE** |
| **MAP-005** | **Negative Class Filtering** (`miss`, `block`, `post_hit`) | Binary highlight classification (`goal \| save`) | Enum only has `['goal', 'save']` | Expand internal VLM classification enum to `['goal', 'save', 'miss', 'block', 'post_hit']` so loud shots hitting the fence or a defender's shin are classified as `miss`/`block` and filtered out before saving to `match_events`. | **KEEP** |
| **MAP-006** | **Scoreboard OCR Tracking** | Dedicated PaddleOCR sidecar worker tracking TV scorebug changes | None | Raw amateur pitch-side footage has no TV broadcast scorebug; no OCR or `scoreboard_text` tracking needed. | **DROP** |
| **MAP-007** | **Replay & Boundary Deduplication** | Broadcast replay logo detector + long-window deduplication | Client-side 6-second deduplication (`mergeChunkEventsWithDedup` in `app/review/page.tsx`) | PES Academy match recordings are continuous single-take football footage without broadcast slow-motion replays. Removed `is_replay`, 45s replay deduplication, and `scoreboard_text` (keep existing lightweight 6s chunk-overlap deduplication). | **DROP** |

---

## 2. Library & Tooling Stack (Off-the-Shelf SDKs vs. Custom Setup)

To avoid building custom `yt-dlp` / `ffmpeg` ingestion, frame-slicing, or audio-DSP pipelines from scratch, we standardize on official SDKs and well-established libraries:

### Primary Next.js / TypeScript Stack (Zero Custom CV/Audio Infra)
- **`@google/genai`** *(Official Google Gen AI TypeScript SDK)*: Replaces raw `fetch()` calls in `app/api/analyze-match/route.ts`. Directly supports YouTube `fileData` + typed `videoMetadata: { startOffset, endOffset, fps }` so Google's servers handle YouTube stream ingestion, `0.5 FPS` (`1 frame / 2s`) frame slicing in Pass 1, `4–5 FPS` sub-clip extraction in Pass 2, full audio stream analysis, and native `Type.ARRAY` / `Type.OBJECT` schema enforcement with built-in retry handling.
- **`zod`** *(Optional Schema & Runtime Validation)*: Type-safe runtime validation for Pass 1 (`CandidateWindow`) and Pass 2 (`VerifiedMatchEvent`) responses.

### Optional Future Local Python Sidecar Libraries (If Moving Off-Cloud later)
- **`librosa`** (`librosa.onset.onset_detect`) & **`yamnet` / `mediapipe-audio`**: Off-the-shelf percussive transient detection (`boot kick -> glove slap`) and pre-trained `Cheering` / `Crowd` / `Whistle` audio classifiers.
- **`roboflow/sports` + `supervision`**: Pre-built football player/goalkeeper detection, team kit color clustering (K-Means/SigLIP), and ball tracking.
- **`soccernet`**: Pre-trained academic football action-spotting models.

---

## 3. Detailed Two-Pass Detection Pipeline Architecture

Both Pass 1 and Pass 2 run through the `@google/genai` SDK (`ai.models.generateContent`) using native `videoMetadata` windowing and frame-rate control—`videoMetadata: { startOffset, endOffset, fps: 0.5 }` in Pass 1 and `videoMetadata: { startOffset, endOffset, fps: 5 }` in Pass 2.

```
Chunked Match Video (15-min chunks with 15s overlap)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASS 1: Audio + 2s Frame Catch Spotter (@google/genai)                  │
│ videoMetadata: { startOffset, endOffset, fps: 0.5 } + Full Audio Track  │
│                                                                         │
│ Spots candidate windows [clip_start_sec, clip_end_sec] matching:        │
│   • Goal Candidate : Attacker box entry (2s catch) + Crowd/Cheer spike  │
│   • Save Candidate : "Double-Impact + Reaction" (kick -> slap -> shout) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Candidate timestamps (8–12s clips)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASS 2: High-FPS Visual & Player Verifier (@google/genai)               │
│ videoMetadata: { startOffset, endOffset, fps: 5 } on [t - 4s, t + 6s]   │
│                                                                         │
│ Verifies exact outcome & assigns player from presentRoster:             │
│   • goal     → Ball crosses goal line + stays in net; scorer from 2s    │
│                approach/celebration frames                              │
│   • save     → Glove-ball deflection aligns with audio slap; GK matched │
│   • miss / block / post_hit → Filtered / Discarded                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Deduplicate (6s overlap window)
                                     ▼
                    Persisted / Reviewed match_events
```

### Pass 1: Audio + 2s Frame Catch Spotter (`fps: 0.5` + full audio track)
- **API Call**: `@google/genai` `ai.models.generateContent` with `videoMetadata: { startOffset, endOffset, fps: 0.5 }`.
- **Input**: Video chunk (`<= 900s` with `15s` overlap from previous chunk) sampled at `0.5 FPS` (1 visual frame every `2s`) alongside the full native audio stream.
- **Role**: Low-token coarse scan across the full chunk to spot candidate event windows `[clip_start_sec, clip_end_sec]` without missing fast events that occur between 2-second frames:
  - **Goal Candidate Trigger**: Attacking player(s) observed approaching/entering the penalty area in the 2-second frames **+** concurrent crowd roar, teammate cheering, or referee whistle/kickoff reset in the audio track.
  - **Save Candidate Trigger**: The **"Double-Impact + Reaction"** acoustic signature in the audio stream:
    1. *Impact 1 (`t = 0.0s`)*: Heavy boot-to-ball strike.
    2. *Impact 2 (`t = +0.2s to +1.2s`)*: Sharp latex glove parry/slap or metallic post/crossbar thud.
    3. *Reaction (`t = +1.0s to +3.0s`)*: Player/GK/pitch-side vocal reaction (*"Hay quá!"*, *"Good save!"*, *"Corner!"*) followed by continued play (ball cleared out for a corner/throw-in rather than a center kickoff reset).

### Pass 2: High-FPS Visual & Player Verifier (`fps: 4` or `5` on `8–12s` candidate clips)
- **API Call**: `@google/genai` `ai.models.generateContent` with `videoMetadata: { startOffset, endOffset, fps: 5 }` (or `4–5 FPS`).
- **Input**: For each candidate timestamp `candidate_sec` from Pass 1, extract/inspect the `8–12s` window `[candidate_sec - 4s, candidate_sec + 6s]` at **`4–5 FPS`** (yielding ~32–60 frames around the critical action).
- **Verification Rules**:
  - **Goal (`action_outcome: "goal"`)**: Confirm the ball visibly crosses the goal line into the net (net ripple / ball resting inside goal rather than bouncing off the post or side-netting). Identify the scorer using the `2s` pre-shot approach frames (`[t - 6s, t]`) and open-space celebration frames (`[t, t + 6s]`) to match `jersey_number` and kit color against `presentRoster`.
  - **Save (`action_outcome: "save"`)**: Pinpoint the exact glove-ball deflection frame aligning with *Impact 2* of the audio trigger, confirm the ball is parried away from goal (or caught cleanly), and identify the Goalkeeper by matching GK gloves/distinctive kit + `position === 'gk'` in `presentRoster` (and `teamKitNote`).
  - **Negative Classes (`miss`, `block`, `post_hit`)**: Explicitly classify loud shots hitting the perimeter fence (`miss`), shots deflected off an outfield defender (`block`), or shots hitting the frame without crossing (`post_hit`) so they are cleanly discarded before entering `match_events`.

---

## 4. Target Structured JSON Schema (Pass 2 Output)

Pass 2 outputs an array of verified candidate objects conforming to the following structured schema (only `goal` and `save` events are promoted to `match_events` after lightweight `6s` overlap deduplication):

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": [
      "timestamp_sec",
      "timestamp_formatted",
      "clip_start_sec",
      "clip_end_sec",
      "action_outcome",
      "confidence_score",
      "visual_cue",
      "audio_cue"
    ],
    "properties": {
      "timestamp_sec": {
        "type": "number",
        "description": "Exact event peak timestamp in seconds relative to full match timeline (ball crossing line or GK glove parry)."
      },
      "timestamp_formatted": {
        "type": "string",
        "description": "Human-readable MM:SS timestamp matching timestamp_sec."
      },
      "clip_start_sec": {
        "type": "number",
        "description": "Start of the review clip window in seconds (typically timestamp_sec - 4)."
      },
      "clip_end_sec": {
        "type": "number",
        "description": "End of the review clip window in seconds (typically timestamp_sec + 6)."
      },
      "action_outcome": {
        "type": "string",
        "enum": ["goal", "save", "miss", "block", "post_hit"],
        "description": "Verified outcome from Pass 2. Only 'goal' and 'save' are surfaced as match highlights."
      },
      "confidence_score": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "description": "Model confidence in action_outcome and timing (0.0 to 1.0)."
      },
      "visual_cue": {
        "type": "string",
        "description": "Concise description of the decisive visual evidence (e.g., net ripple, glove deflection, kit/jersey sighting)."
      },
      "audio_cue": {
        "type": "string",
        "description": "Concise description of the paired acoustic evidence (e.g., Double-Impact kick + glove slap + 'Corner!' shout, or crowd roar + whistle)."
      },
      "suggested_user_id": {
        "type": ["string", "null"],
        "description": "Matched player ID from presentRoster (scorer for goal, GK for save), or null if unidentifiable."
      },
      "suggested_jersey_number": {
        "type": ["integer", "null"],
        "description": "Observed jersey number (1-99) from 2s approach/celebration or 4-5 FPS save frames, or null if occluded."
      }
    }
  }
}
```

---

## 5. Implementation Tracking Checklist

| ID | Task | File(s) | Status | Verification Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **DET-000** | Install & migrate `route.ts` to official `@google/genai` SDK | `package.json`, `app/api/analyze-match/route.ts` | Implemented | Replaces raw REST `fetch()` with `@google/genai` `GoogleGenAI` client, typed `Type.OBJECT` `responseSchema`, and `videoMetadata.fps` support. |
| **DET-001** | Add 15s chunk overlap & Pass 1 (`0.5 FPS` + Audio) candidate spotter prompt/schema | `app/api/analyze-match/route.ts`, `app/review/page.tsx` | Implemented | Chunking offsets advance by `885s` (`900s` chunk with `15s` overlap); Pass 1 calls `@google/genai` with `videoMetadata.fps: 0.5` + audio triggers to return bounded `[clip_start_sec, clip_end_sec]` candidate windows. |
| **DET-002** | Implement Pass 2 (`4–5 FPS`) high-FPS verifier on candidate windows | `app/api/analyze-match/route.ts` | Implemented | Pass 2 inspects `[candidate_sec - 4s, candidate_sec + 6s]` via `@google/genai` `videoMetadata.fps` (`4` or `5`) and returns the full Section 4 JSON schema. |
| **DET-003** | Add Double-Impact + Reaction audio trigger & Goal 2s-catch + net-crossing prompt rules | `app/api/analyze-match/route.ts` | Implemented | Prompt explicitly encodes Impact 1 + Impact 2 + Reaction rules for saves (`videoMetadata.fps: 5` verification) and 2s box-approach (`videoMetadata.fps: 0.5`) + net-crossing + crowd-audio rules for goals. |
| **DET-004** | Expand VLM enum (`miss`, `block`, `post_hit`) & filter non-highlight outcomes server-side | `app/api/analyze-match/route.ts` | Implemented | Internal `@google/genai` `Type.OBJECT` schema (populated from `videoMetadata.fps` Pass 2 verification) accepts `goal \| save \| miss \| block \| post_hit`; `miss`, `block`, and `post_hit` are excluded before returning events to the client. |
| **DET-005** | Enhance player & GK identification with roster/kit matching (`2s` approach/celebration & `4–5 FPS` parry) | `app/api/analyze-match/route.ts` | Implemented | Goals match `suggested_user_id` / `suggested_jersey_number` from `2s` pre-shot & celebration frames (`videoMetadata.fps: 0.5`); saves prioritize `position === 'gk'` roster matches from `4–5 FPS` parry frames (`videoMetadata.fps: 5`). |
