# PES Academy ⚽🇦🇷

A mobile-first Progressive Web App (PWA) tailored for weekly football academy operations: match attendance voting, pitch-side admin check-ins with absence penalties, and AI-assisted match highlight video analysis.

Styled with an Argentina kit-inspired design system:
- **Light Mode ("La Albiceleste" Home Kit)**: Crisp stadium white (`#F8FAFC`), Argentine sky blue (`#43A1D5`), AFA Sun Gold (`#F6B40E`), and subtle vertical pinstripes (`#74ACDF` @ 6%).
- **Dark Mode ("Away Kit" Midnight Navy)**: Deep navy (`#080E1E`), elevated cards (`#111C38`), luminous blue (`#5BB5E8`), electric violet (`#6366F1`), and metallic gold (`#FACC15`).

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) (Dark/Light toggle + system preference)
- **Animation**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS)
- **AI Processing**: Gemini 2.5 multimodal route for video goal/save detection (FEAT-003)

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.9.0 (Node 22 recommended)
- npm

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

> **Note on Mock Mode**: If Supabase environment variables are omitted or unset, the app automatically runs in **Mock State Mode** using realistic seed data (12 players, 2 matches, attendance, AI events) stored in browser `localStorage`. You can switch players, test voting, and reset data anytime from the Profile tab.

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your mobile device or responsive developer tools.

### 5. Supabase Setup (Production Database)
When connecting to a real Supabase instance:
1. Open the Supabase SQL Editor.
2. Run [`supabase/schema.sql`](supabase/schema.sql) to create enums, tables, indexes, and RLS policies.
3. Run [`supabase/seed.sql`](supabase/seed.sql) to populate initial players and match fixtures.

---

## Roadmap & Milestones

For a detailed roadmap of all features, refer to [docs/VISION.md](docs/VISION.md):
- **FEAT-001**: App scaffold, Argentina kit theme, PWA shell, schema & seed *(Completed)*
- **FEAT-002**: Matches tab: player voting + admin check-in & penalties *(Planned)*
- **FEAT-003**: AI Review tab + `/api/analyze-match` Gemini route *(Planned)*
- **FEAT-004**: Leaderboard & penalty board tab *(Planned)*

Defects are tracked in [docs/DEFECTS.md](docs/DEFECTS.md).
