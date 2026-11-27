# Defect Tracker

This document tracks all known issues, bugs, and technical debt across the PES Academy codebase.

## Open Defects

| ID | Title | Area | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| *None* | — | — | — | — |

---

## Resolved Defects

| ID | Title | Area | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| DEF-001 | Result tab text & badge awkward line-breaking | Result (`app/review/page.tsx`), App Shell (`components/app-shell.tsx`, `components/app-header.tsx`, `components/bottom-nav.tsx`), Badge (`components/ui/badge.tsx`) | Resolved | Widened app container frame from `max-w-md` to `max-w-lg` and added `shrink-0`, `whitespace-nowrap`, and `min-w-0` guards on header buttons, scan/summary banners, YouTube context pills, and `Badge` base styles. |
| DEF-002 | Overdue matches remain in `"Check-In Live"` status and still allow check-in | Matches (`lib/utils.ts`, `components/matches/match-hero-card.tsx`, `app/page.tsx`, `components/matches/checkin-board.tsx`, `lib/store.tsx`) | Fixed | Added `isMatchOverdue()` helper, displayed `Overdue` badge/label on overdue `'voting'`/`'checkin'` matches, disabled voting & player check-in toggles with an overdue banner while keeping match finalization available, and guarded `setCheckin`/`SET_CHECKIN`. |
| DEF-003 | Upcoming matches appear in Match Results (`/result`, `/review`) and allow video analysis | Result (`app/review/page.tsx`, `app/api/analyze-match/route.ts`) | Fixed | Filtered `availableMatches` strictly to `'review'` and `'completed'` (removing `m.video_url` inclusion and `matches[0]` fallbacks), gated selector pills/empty state/analysis trigger, and blocked `'voting'`/`'checkin'` matches in `/api/analyze-match`. |
