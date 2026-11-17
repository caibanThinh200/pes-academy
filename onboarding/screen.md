Now implement the "AI Review" tab and the Gemini API video analysis route to detect goals and goalkeeper saves from match footage.

1. Backend AI Analysis Route (`app/api/analyze-match/route.ts`):
   - Create a POST endpoint that accepts a `matchId` and `videoUrl` (or uploaded file URI) using `@google/genai` (Gemini 2.5 Flash).
   - Use the following system instruction for the model:
     "You are a football match analyst. Analyze this match video and identify every instance where a goal is scored or a goalkeeper makes a save/deflection. Return ONLY a structured JSON array of events. Each object must contain: `timestamp_sec` (integer seconds from start), `timestamp_formatted` ('MM:SS'), `event_type` ('goal' | 'save'), `confidence_score` (0.0 to 1.0), and `visual_cue` (brief 1-sentence description of jersey color or action, e.g., 'White jersey shoots into bottom left corner')."
   - Include a "Simulate AI Scan" fallback in the UI that populates 5 realistic detected timestamps if no API key is configured yet.

2. Admin "One-Tap Clip Verification" UI:
   - Embed a responsive video player at the top of the review screen that seeks directly to `timestamp_sec - 5` (5 seconds before the event) when an event card is tapped.
   - Below the player, display the queue of `pending_review` AI-detected events (`Goal` or `Save` badges, timestamp, confidence, and visual cue).
   - When an Admin taps an event card:
     - Auto-seek the video to that moment.
     - Display a horizontal scrollable row of ONLY the players marked `present` in that match.
     - Tapping a player's avatar immediately assigns the Goal or Save to that player, marks the event `confirmed`, increments the player's `total_goals` or `total_saves`, and advances to the next unverified clip.
     - Include a "False Alarm / Dismiss" button to reject false positives.

3. Leaderboard & Penalty Tracker Tab:
   - Build the "Leaderboard" tab with three filter pills: `Top Scorers (Goals)`, `Golden Glove (Saves)`, and `Penalty Board (Absences)`.