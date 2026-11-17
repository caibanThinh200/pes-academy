Act as a Senior Full-Stack Engineer & UI/UX Designer. We are building a mobile-first Progressive Web App (PWA) for a weekly football academy to manage match voting, pitch-side check-ins (with absence penalties), and AI-assisted video goal/save tracking.

Tech Stack:
- Framework: Next.js (App Router, TypeScript)
- Styling & Animation: Tailwind CSS + next-themes + Motion (framer-motion) + Lucide Icons
- Backend/State: Supabase (provide SQL schema + a local mock state provider so the UI works immediately)

Step 1 Deliverables:

1. Custom Argentina Kit Theme System (Light & Dark Mode):
   - Implement a smooth Light/Dark mode toggle in the top header bar alongside the Role Switcher (`Player` | `Admin`).
   - **Light Mode ("La Albiceleste" Home Kit Theme):**
     - Background: Crisp stadium white (`#F8FAFC`) with subtle vertical sky-blue pinstripe accents (`#74ACDF` at 6% opacity) on the main header/hero match card.
     - Primary Brand Accent: Argentina Sky Blue (`#43A1D5` / `#75AADB`) for active buttons, joined badges, and navigation highlights.
     - Secondary Accent: AFA Sun Gold (`#F6B40E`) for Goal badges, Golden Glove/Top Scorer highlights, and captain/admin tags.
     - Surfaces & Text: Pure white cards (`#FFFFFF`) with soft slate borders (`#E2E8F0`) and deep navy ink (`#0F172A`) for high outdoor sunlight readability on the pitch.
   - **Dark Mode ("Away Kit" Midnight Navy Theme):**
     - Background: Deep midnight navy (`#080E1E`) inspired by Argentina's away jersey.
     - Surfaces: Elevated dark navy cards (`#111C38`) with subtle indigo/navy borders (`#1E2E54`).
     - Primary Brand Accent: Luminous Sky Blue (`#5BB5E8`) and Electric Violet/Cobalt highlights (`#6366F1`) for active toggles and interactive states.
     - Secondary Accent: Metallic Gold (`#FACC15`) for goals, trophies, and key stats, paired with crisp white text (`#F8FAFC`).

2. PWA & Native Mobile Feel:
   - Configure `manifest.ts` for `"display": "standalone"`, portrait orientation, and adaptive theme colors.
   - Configure viewport and global CSS to lock mobile behavior: disable user scaling, set `overscroll-behavior-y: none`, hide scrollbars, and respect iOS safe-area insets (`env(safe-area-inset-bottom)`).
   - Build a persistent mobile App Shell (max-w-md centered on desktop, full screen on mobile) with:
     - Top Header: Custom geometric football/AFA-inspired academy crest badge, Theme Toggle (Sun/Moon), and Role Switcher pill (`Player` | `Admin`).
     - Fixed frosted-glass bottom navigation bar (`Matches`, `AI Review`, `Leaderboard`, `Profile`) styled dynamically for both Albiceleste Light and Away Navy Dark modes.

3. Database Schema & Types:
   - Create `types/database.ts` and a `supabase/schema.sql` file covering:
     - `users`: id, name, avatar_url, role ('admin' | 'player'), position ('field' | 'gk'), total_goals, total_saves, penalty_count
     - `matches`: id, title, match_date, location, status ('voting' | 'checkin' | 'review' | 'completed'), video_url
     - `attendance`: id, match_id, user_id, vote_status ('joined' | 'declined'), checkin_status ('pending' | 'present' | 'absent_penalized')
     - `match_events`: id, match_id, timestamp_sec, event_type ('goal' | 'save'), assigned_user_id, confidence_score, status ('pending_review' | 'confirmed' | 'rejected')

4. Seed Data:
   - Populate realistic mock data for 12 academy players, 1 upcoming match in 'voting' status, and 1 recent match in 'review' status so we can immediately interact with the UI.