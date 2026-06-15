# AGENTS.md

## Current Direction Override

As of 2026-06-15, the user explicitly reset the product direction from the
older MyPlan/TODAY-centered MVP toward **Nodiary**, a Notion-like document
workspace with AI assistance.

Follow the handoff document first:

- `docs/superpowers/specs/2026-06-15-nodiary-development-handoff.md`

This override supersedes older notes in this file that say AI, full
Notion-style editing, and Google/Apple calendar integration are out of scope.
Those features are now part of the requested product direction and should be
planned/implemented deliberately.

Hard product rules from the user:

- The first screen must be document-first, not a dashboard-first project DB.
- The left sidebar must keep the full monthly calendar visible and unclipped.
- Project management belongs inside planning notes as an insertable
  database/project block, not as the default first-screen focus.
- AI must be a writable assistant/operator surface with approval and undo, not
  passive suggestion cards.
- Do not remove or downgrade UI affordances because alignment is hard.
- Do not replace icons, handles, or disclosure controls with crude placeholder
  CSS/text workarounds in the real product.
- Use a proper icon library already available to the app, such as
  `lucide-react`, or vetted polished SVG assets. Fix alignment through stable
  component geometry, fixed icon boxes, line-height, spacing tokens, and visual
  QA.
- Before claiming a UI alignment fix is done, compare the rendered screen
  visually at the target viewport.

## Project

This project is **MyPlan**, a Notion-style personal planning and record app.

MyPlan is not a Notion clone and not a generic admin dashboard. It is a calm,
premium, Today-centered personal workspace for planning, recording, reviewing,
and connecting daily life data.

The product connects:

- Today
- Calendar
- Journal
- Tasks
- Notes
- Projects
- Search
- Settings

## Current Phase

The project has moved from product/design direction into MVP implementation.

The current UI is implemented as a Next.js App Router screen draft using mock
data. A local SQLite foundation now exists, but the visible screens have not yet
been switched to database-backed repositories.

Do not implement the following during the MVP phase unless the user explicitly
requests it:

- Authentication
- Sync
- AI features
- Google Calendar integration
- Full Notion-style block editor
- Plugin system
- Real-time collaboration

## Technical Stack

Use the following stack unless the user approves a change:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- Prisma
- Prisma 6.19.3
- SQLite for local-first MVP
- PostgreSQL-ready Prisma schema for future deployment

Desktop shell baseline:

- Prefer Electron first for the desktop wrapper.
- Tauri is deferred because the official Next.js path requires static export,
  which conflicts with the current Prisma-backed Next.js direction.
- The Go-based candidate is Wails. Do not switch to Wails unless the user
  explicitly decides to introduce a Go backend.

Package manager baseline:

- Use `npm` for the first setup because it is available in the current Windows
  Native environment.
- `pnpm` may be adopted later if it is installed or enabled through Corepack and
  the user approves the package manager switch.

Do not introduce heavy dependencies without a clear reason.

## Expected Folder Structure

The project should be initialized toward this structure after approval:

```text
myplan/
├─ AGENTS.md
├─ DESIGN.md
├─ README.md
├─ package.json
├─ next.config.ts
├─ tsconfig.json
├─ tailwind.config.ts
├─ prisma/
│  └─ schema.prisma
├─ docs/
│  ├─ 00_project-direction.md
│  ├─ 01_product-spec.md
│  ├─ 02_information-architecture.md
│  ├─ 03_design-system.md
│  ├─ 04_data-model.md
│  ├─ 05_roadmap.md
│  └─ 06_open-design-prompts.md
└─ src/
   ├─ app/
   │  ├─ page.tsx
   │  ├─ today/
   │  ├─ calendar/
   │  ├─ journal/
   │  ├─ tasks/
   │  ├─ notes/
   │  ├─ projects/
   │  ├─ search/
   │  └─ settings/
   ├─ components/
   │  ├─ layout/
   │  ├─ navigation/
   │  ├─ calendar/
   │  ├─ editor/
   │  ├─ database/
   │  ├─ task/
   │  └─ ui/
   ├─ features/
   │  ├─ today/
   │  ├─ calendar/
   │  ├─ journal/
   │  ├─ task/
   │  ├─ note/
   │  ├─ project/
   │  ├─ search/
   │  ├─ quick-capture/
   │  └─ sync/
   ├─ lib/
   ├─ data/
   └─ styles/
```

## Architecture Rules

Use feature-based architecture.

Keep these concerns separated:

- Route files in `src/app`
- Reusable UI in `src/components`
- Domain-specific UI and logic in `src/features`
- Mock data in `src/data`
- Shared utilities in `src/lib`
- Global styles in `src/styles`
- Database schema and migrations in `prisma`

Database notes:

- The Prisma schema is `prisma/schema.prisma`.
- The local MVP SQLite file is `prisma/dev.db`.
- Use `npm run db:init` to create/reset the current local DB file.
- `npm run db:push` may fail in this Windows environment due to a Prisma schema
  engine issue; check `docs/08_handoff-2026-06-15-db-desktop.md` before relying
  on Prisma migration commands.
- Do not call Prisma directly from presentational components.
- Add repository functions under `src/server` before switching UI screens from
  mock data to SQLite.

Do not hard-code large mock datasets inside React components.

Do not call Prisma directly from presentational components.

Use adapters or repository functions when database access is introduced.

## Product Rules

The Today screen is the center of the product. All major modules should connect
back to what the user needs to do, review, write, or remember today.

Primary user questions:

1. What do I need to do today?
2. What is scheduled today?
3. What did I record today?
4. What is connected to my current work or life context?

MVP screens:

- App Shell
- Left Sidebar
- Top Command/Search Bar
- Right Context Panel
- Today
- Calendar
- Journal
- Tasks
- Notes
- Projects

Initial screens currently use mock data. Migrate one screen at a time to
database-backed repository functions.

## Design Workflow

Before implementing a major screen:

1. Check `DESIGN.md`.
2. Use Open Design if the MCP integration is available.
3. Generate or review 3 to 5 visual directions.
4. Compare options against the design rules.
5. Ask the user to approve the selected direction.
6. Implement only the approved scope.

If Open Design is unavailable, document that state and prepare prompts or visual
direction specs that can be used once the integration is connected.

## UI Direction

The app should feel:

- Calm
- Premium
- Quiet
- Fast
- Keyboard-friendly
- Dense enough for daily use
- Personal, not corporate

Reference qualities:

- Notion-like structure
- Linear-like precision
- Notion Calendar-like schedule clarity
- Craft-like writing surface
- Things-like task calmness

Avoid:

- Generic admin dashboard layouts
- Oversized KPI cards
- Purple AI gradients
- Toy-like icons
- Cartoon illustrations
- Marketing landing page spacing
- Random emoji decoration
- Excessive shadows
- Overly rounded cards

## Korean UI Rules

The UI copy is Korean-first.

Use concise Korean labels:

- 오늘
- 캘린더
- 저널
- 작업
- 노트
- 프로젝트
- 검색
- 설정

Keep labels short enough for dense navigation and command surfaces.

## Quality Checks

Before finishing implementation work, run the relevant checks:

- Typecheck
- Lint
- Build
- Manual layout review at 1440px desktop width
- Manual layout review around 1024px width

After frontend implementation starts, verify that:

- Text does not overflow buttons, cards, sidebars, or panels.
- The layout keeps stable dimensions when data changes.
- Korean UI text remains readable.
- The app does not resemble a generic analytics dashboard.

## Git Rules

The current folder may or may not be a Git repository. Check before using Git.

Never revert user changes without explicit approval.

Do not run destructive Git commands unless the user explicitly requests them.

If the project is not yet initialized as Git, propose initialization before
committing.

## Initial Setup Plan After Approval

If the user approves project initialization, use this plan:

1. Initialize Git if the user wants this folder tracked.
2. Create a Next.js App Router project with TypeScript and Tailwind CSS in the
   current folder.
3. Add shadcn/ui only when the base Tailwind setup is stable.
4. Add Prisma with SQLite as the local MVP database.
5. Keep the schema PostgreSQL-ready by avoiding SQLite-only assumptions where
   practical.
6. Build the app shell and mock-data screens before database persistence.
