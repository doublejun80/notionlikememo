# MyPlan MVP Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mock-data MyPlan desktop web app shell and core screens.

**Architecture:** Use Next.js App Router with a stable three-surface workspace shell: left sidebar, main canvas, and right context panel. Keep mock data in `src/data`, reusable shell components in `src/components`, and route pages in `src/app`.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, React Testing Library, lucide-react.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `src/styles/globals.css`
- Create: `src/app/layout.tsx`

- [ ] Create a Next.js App Router project foundation using npm.
- [ ] Add scripts for `dev`, `build`, `lint`, `typecheck`, and `test`.
- [ ] Configure Tailwind tokens to match `DESIGN.md`.

### Task 2: Test Harness

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/app/page.test.tsx`
- Create: `src/data/myplan-data.test.ts`

- [ ] Write tests that expect Korean navigation labels and Today content to render.
- [ ] Write tests that expect mock data relationships for tasks, notes, projects, and events.
- [ ] Run tests before implementation and confirm they fail for missing files/modules.

### Task 3: Data and Layout

**Files:**
- Create: `src/data/myplan-data.ts`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/navigation/left-sidebar.tsx`
- Create: `src/components/layout/top-command-bar.tsx`
- Create: `src/components/layout/right-context-panel.tsx`
- Create: `src/lib/utils.ts`

- [ ] Define typed mock data for schedule, tasks, journal, notes, and projects.
- [ ] Build the three-surface workspace shell.
- [ ] Keep Korean UI labels concise and dense.

### Task 4: Screens

**Files:**
- Create: `src/features/today/today-screen.tsx`
- Create: `src/features/calendar/calendar-screen.tsx`
- Create: `src/features/journal/journal-screen.tsx`
- Create: `src/features/task/tasks-screen.tsx`
- Create: `src/features/note/notes-screen.tsx`
- Create: `src/features/project/projects-screen.tsx`
- Modify: `src/app/page.tsx`
- Create route pages under `src/app/calendar`, `src/app/journal`, `src/app/tasks`, `src/app/notes`, `src/app/projects`, `src/app/search`, `src/app/settings`

- [ ] Implement Today as the strongest surface.
- [ ] Implement the other core screens as usable mock-data base screens.
- [ ] Avoid KPI cards, heavy gradients, purple AI theme, and marketing page spacing.

### Task 5: Verification

**Files:**
- Modify as needed only to fix verified failures.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Start the dev server.
- [ ] Inspect the app in the browser at desktop size.

