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
| **FEAT-005** | Authentication & role-based authorization | Frontend / Auth / DB | Done | Account-name + password login (`/login`, `/forgot-password`, `/change-password`), proxy route guard, role-based Supabase RLS, admin password reset (`SUPABASE_SERVICE_ROLE_KEY`), and session-derived roles (Player/Admin toggle removed). |
| **UPD-002** | Real squad import + Playmaker (assists) stat | DB / Frontend | Done | 33 players imported from "Thống Kê Chuyên Môn" CSV (season totals only), mock data removed, new `total_assists` column + Playmaker leaderboard; video AI does not detect assists yet. |

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


### FEAT-005: Authentication & Role-Based Authorization
- **Status**: Done.
- **Setup**:
  - Apply `supabase/migrations/20261121000000_feat005_auth.sql` (and keep `supabase/schema.sql` in sync for fresh installs).
  - Run `supabase/provision_seed_accounts.sql` in the Supabase SQL Editor (after `seed.sql`) to provision `auth.users` & `auth.identities` for the 12 seed players.
  - Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for the server-only admin password reset action.
- **Problem**: The app has no identity. Anyone can flip the Player/Admin pill in the header, so players and admins are not distinguished.
- **Scope**:
  - **Login screen** (`/login`): account name (username) + password, "Remember me / save login" checkbox, and "Forgot password" link. Mobile-first, Argentina kit theme (light/dark), PWA-safe.
  - **No register screen**: accounts are provisioned by admins. Players are bulk-imported into Supabase from an Excel/CSV file (account name, full name, jersey number, role, initial password). This is a one-off admin/script task (e.g. Supabase Auth admin API + `users` upsert), not a user-facing UI.
  - **Forgot password (no email)**: the academy is internal and does not use email, so there is no email/OTP reset for now. The "Forgot password" link opens a screen telling the player to contact an admin. The admin resets the password (sets a temporary one) from an admin action, and the player is forced to set a new password on next login. Email-based reset is deferred until the app scales up.
  - **Save login**: when checked, the session persists across app restarts (long-lived refresh token); otherwise it ends when the browser/PWA closes.
  - **Remove Player/Admin toggle** from the header and store. Role comes from the authenticated user's `role` (`player` | `admin`).
  - **Role-based routing**: admin login lands on the admin experience (check-in, penalties, roster management, result verification queue); players land on the player experience (voting, results, leaderboard, profile). Admin-only components/routes are hidden and also blocked server-side.
  - **Authorization**: route guard (Next.js proxy/middleware) redirects unauthenticated users to `/login`; `/api/analyze-match` and admin mutations require an admin session; Supabase RLS: players read all and update only their own attendance vote; admins write check-ins, penalties, and match events.
  - **Data model**: add unique `username` and `role` to `users`; link `users.id` to `auth.users.id`; map account name to Supabase Auth via an internal synthetic email (e.g. `username@pes.local`, never shown or used for communication); add `must_change_password` flag for admin-reset accounts. Real email fields are deferred. Replace the mock store's current-user/role switch with the session user. Add a logout action in Profile.
- **Out of scope (for now)**: self-registration, social login, in-app Excel upload UI, email-based communication and password reset (revisit when scaling up).
- **Dependencies**: Supabase project connection replacing the localStorage mock for identity; check `node_modules/next/dist/docs/` for Next.js 16 conventions before implementing.

### UPD-002: Real Squad Import + Playmaker (Assists) Stat
- **Status**: Done.
- **Setup**:
  - Run `supabase/migrations/20261124000000_import_squad_playmaker.sql` in the Supabase SQL Editor (destroys legacy mock matches, attendance, events, and the 12 mock players, adds `total_assists`, relaxes `users_username_format_chk` to allow mixed-case CSV usernames, and imports the 33 real players).
  - Run `supabase/provision_seed_accounts.sql` afterward to create `auth.users` / `auth.identities` entries (default password `pes-academy-2026`, `must_change_password = true`).
- **Scope**:
  - Imported all 33 squad players from "Thống Kê Chuyên Môn" CSV into SQL migration, `supabase/seed.sql`, and `lib/mock-data.ts` (season totals only, `jersey_number = null`, `ThinhNQ31` as `admin`).
  - Removed all mock matches, attendance, and match events (`INITIAL_MATCHES = []`, `INITIAL_ATTENDANCE = []`, `INITIAL_EVENTS = []`), bumped client store key to `pes_academy_store_v4`, and updated unconfigured offline fallback to pick the admin user (`ThinhNQ31`).
  - Added `total_assists` to database schema, `User` TypeScript type, and UI: new **Playmaker** tab + podium on `/leaderboard`, **Assists** stat card on `/profile`, and empty-state card on `/review` when no matches exist.
- **Follow-up / Out of scope**: Assist detection in video AI (`/api/analyze-match` and `match_events`) is out of scope for now; assists are tracked manually.
