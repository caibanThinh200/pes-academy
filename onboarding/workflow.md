Now implement the "Matches" tab with complete flows for both Player and Admin roles using smooth bottom-sheet modals and micro-animations.

1. Player View:
   - Show the active upcoming match card with date, pitch location, and live headcount (e.g., "14 Players Joined").
   - Provide a prominent one-tap "Join Match" / "Withdraw" toggle button with optimistic UI feedback.
   - Display the live avatar grid of joined players.
   - Show a warning badge if the player currently has active penalty points from previous no-shows.

2. Admin View:
   - Include a "+ Create Match" bottom sheet drawer to open a new weekly match vote board.
   - When a match is in 'voting' or 'checkin' status, show the "Pitch-Side Check-In Board":
     - List all players who voted 'joined'.
     - Allow the Admin to tap a player row to toggle them as `Present` (green highlight).
     - Provide a "Finalize Check-In & Apply Penalties" button: when triggered, show a confirmation modal listing any joined players who did not show up, mark their status as `absent_penalized`, and automatically increment their `penalty_count` by 1.