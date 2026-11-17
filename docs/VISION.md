# Vision & Feature Roadmap

This document tracks all features and architectural milestones for PES Academy — a mobile-first Progressive Web App (PWA) for managing weekly football match voting, pitch-side check-ins (with absence penalties), and AI-assisted goal/save tracking.

## Feature Tracker

| ID | Title | Area | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | App scaffold, Argentina kit theme, PWA shell, schema & seed | Frontend / DB | Done | Initial Next.js 16 PWA, Tailwind CSS v4, Argentina kit theme, Supabase schema & mock store. Source: `onboarding/scaffold.md` |
| **UPD-001** | Rename AI Review tab to "Result", football icon, player shirt numbers | Frontend | Done | Rebranded AI Review tab to "Result", added custom Lucide-styled FootballIcon, added player jersey numbers across database schema, seed, mock data, and UI views. |
| **FEAT-002** | Matches tab: player voting + admin check-in & penalties | Frontend / Workflow | Done | Weekly vote toggle (`joined` / `declined`), pitch-side admin check-in (`present` / `absent_penalized`), auto penalty points & bottom-sheet modals. Source: `onboarding/workflow.md` |
| **FEAT-003** | Result tab (AI Video Review) + `/api/analyze-match` Gemini route | Frontend / AI | Done | Match footage video player with interactive timeline scrubber, Gemini 2.5 Flash multimodal route, one-tap clip verification queue & player assignment. Source: `onboarding/screen.md`, `onboarding/video-detect.md` |
| **FEAT-004** | Leaderboard & penalty board tab | Frontend | Done | Academy leaderboard: Golden Boot (top scorers), Golden Glove (top saves), Hall of Shame / Penalty Board (absence fines & discipline tracker) with podium highlights. Source: `onboarding/screen.md §3` |

---

## Detailed Milestone Descriptions

### FEAT-001: App Scaffold, Argentina Kit Theme, PWA Shell, Schema & Seed
- **Scope**:
  - Next.js (App Router, TypeScript) scaffolded at repository root.
  - Tailored Argentina Kit Design System:
    - Light Mode ("La Albiceleste" Home Kit): `#F8FAFC` base, `#43A1D5` primary sky blue, `#F6B40E` AFA Sun Gold, subtle vertical pinstripes (`#74ACDF` @ 6%).
    - Dark Mode ("Away Kit" Midnight Navy): `#080E1E` base, `#111C38` elevated surface, `#5BB5E8` luminous blue, `#6366F1` violet accent, `#FACC15` metallic gold.
  - PWA configuration: standalone manifest, iOS touch icons, safe-area inset support, mobile viewport lock (`userScalable: false`, `overscroll-behavior-y: none`).
  - App Shell: Sticky header with geometric crest, Sun/Moon theme toggle, and Player/Admin role switcher pill; frosted-glass bottom navigation.
  - Database schema (`supabase/schema.sql`) and TypeScript types (`types/database.ts`): `users`, `matches`, `attendance`, `match_events`.
  - Comprehensive seed data (`supabase/seed.sql` & `lib/mock-data.ts`) with 12 players, 1 voting match, 1 review match with events.
  - Client state store (`lib/store.tsx`) with localStorage persistence and immediate reactivity.

### UPD-001: Rename AI Review Tab to "Result", Football Icon, Player Shirt Numbers
- **Scope**:
  - Rebranded AI Review tab to "Result" in bottom navigation and page header ("Goals & saves from the latest match").
  - Added custom `FootballIcon` matching Lucide icon specifications (`24x24` viewBox, `strokeWidth={2}`, `fill="none"`, crisp at 20px).
  - Extended User schema and database types with `jersey_number` (`smallint check (jersey_number between 1 and 99)`).
  - Seeded realistic shirt numbers for all 12 players (e.g. GK #1 & #12, Striker #9, Playmaker #10).
  - Upgraded client store key to `pes_academy_store_v2` for cache invalidation.
  - Created `JerseyNumber` badge component and integrated across Result page, Matches roster, Leaderboard standings, and Profile.

### FEAT-002: Matches Tab: Player Voting + Admin Check-in & Penalties
- **Scope**:
  - Player voting card: fast one-tap toggle between `joined` and `declined`.
  - Admin view: roster management, pitch-side check-in modal/swipes marking players `present` or `absent_penalized`.
  - Automatic penalty calculation for unexcused no-shows.

### FEAT-003: AI Review Tab + `/api/analyze-match` Gemini Route
- **Scope**:
  - Video player with frame scrubber for match highlights.
  - Gemini multimodal analysis API integration extracting goals, saves, timestamps, and confidence scores.
  - Interactive approval queue for pending events with player assignment and score confirmation.

### FEAT-004: Leaderboard & Penalty Board Tab
- **Scope**:
  - Competitive leaderboards: Golden Boot (goals), Golden Glove (saves).
  - Discipline & penalty leaderboard: penalty points tally, late arrival/absence tracker.
  - Player profile stat cards with historical breakdown.
