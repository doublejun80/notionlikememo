# Nodiary Next Context Active Plan

작성일: 2026-06-18
Repo: `/Volumes/mac_dock/github/notionlikememo`
Branch: `main`
Baseline pushed commit: `707f4d5 Fix Nodiary AI immediate apply flow`

> **For agentic workers:** read this after `AGENTS.md` and
> `docs/2026-06-16-nodiary-next-context-handoff.md`. This is the active plan
> for the next context. Keep the app document-first, Electron-based, and Korean
> UI-first.

## Current Product Rules

- App name: Nodiary.
- Direction: Notion Core Clone-lite.
- Desktop shell: Electron only. Do not switch to Tauri.
- First screen: `오늘의 계획` document editor.
- Do not place the project database as the first-screen center.
- Keep the left monthly calendar complete and unclipped.
- Use real icons/handles/disclosure controls, preferably `lucide-react`.
- Do not expose, print, screenshot, or commit `.env.local`.
- AI local flow is now immediate apply + undo. Do not restore default approval
  cards for normal document/calendar edits.
- Explicit approval is still appropriate for future external provider writes,
  destructive/bulk operations, and sync conflicts.

## Completed Baseline

- Workspace API GET/PUT hydrate/save.
- `DATABASE_URL` missing dev fallback.
- Workspace API validation for `pageTree`, `pages`, database fields, filters,
  sorts, and rows.
- DB row add/inline edit/filter/sort/schema edit.
- DB calendar 7-column month grid and month navigation.
- Mobile DB card editing.
- AI context chips as real toggles.
- Theme/accent/density/document-width preferences.
- Lavender/yellow/navy/dark theme polish.
- macOS Electron titlebar color, draggable region, app name, and icon polish.
- Page rename/delete and block delete.
- Todo checkbox/text editing split.
- KST today handling and Sunday-first calendar.
- Long-term memory visible in settings, not as a space-consuming AI panel card.
- AI model route selector and current model display.
- AI reading/error/result feedback in right panel.
- Direct AI answers also appear in the central document.
- AI block edit target tracking via `aiTargetBlockId`.
- AI selected-block context uses the actually focused/clicked block id.
- AI operator/local fallback changes apply immediately and preserve undo.
- AI Markdown is normalized to plain document text before entering state.
- Google/Apple calendar sync adapter exists only as mocked preview tests.

## Latest Verification Baseline

- `npm test`: 13 files, 119 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Electron QA with mocked Markdown AI response:
  - direct answer central callout visible with answer body only.
  - AI request placeholder count: `0`.
  - approval button count: `0`.
  - Markdown marker count (`##`/`**`): `0`.
  - `memo-body` updated in place.
  - console/page errors: `0`.
- Latest AI QA artifacts outside repo:
  - `/tmp/nodiary-ai-immediate-qa/electron-ai-immediate.png`
  - `/tmp/nodiary-ai-immediate-qa/result.json`

## Active Priority Order

### Task 1: Slash Menu Search and Filter

**Goal:** make slash insert usable beyond the current static menu.

- [ ] Add slash menu search input or inline filtering from typed `/query`.
- [ ] Keep Arrow/Enter/Escape keyboard support.
- [ ] Ensure Korean labels filter predictably.
- [ ] Add tests for filtering, no-result state, and insertion after filtering.
- [ ] Verify in Electron that the menu is positioned and not clipped.

### Task 2: AI Drawer A11y and Focus

**Goal:** make the right AI panel keyboard reliable without making it a modal.

- [ ] When AI panel opens from sidebar/topbar, move focus to AI input.
- [ ] Restore focus to the triggering control when the panel closes.
- [ ] Keep panel scrollable at short heights.
- [ ] Confirm Escape behavior does not fight settings modal focus trap.
- [ ] Add regression tests for autofocus, restore, and keyboard send.

### Task 3: Narrow Board and 1024px Layout

**Goal:** remove the remaining cramped responsive behavior.

- [ ] Improve DB board layout under narrow content widths.
- [ ] Smooth the 1024/1023 sidebar breakpoint transition.
- [ ] Confirm document remains first-screen dominant.
- [ ] Verify 1440px desktop, around 1024px, and mobile.

### Task 4: Calendar Source Abstraction

**Goal:** prepare real provider-backed calendar data without wiring real auth yet.

- [ ] Separate fixture calendar events from provider-ready event source shape.
- [ ] Keep KST today and Sunday-first month grid unchanged.
- [ ] Extend mocked Google/Apple preview tests around conflict/write intent.
- [ ] Do not implement real provider auth until the adapter boundary is stable.

### Task 5: External Calendar Approval Policy

**Goal:** define the one place where approval remains important.

- [ ] Keep local document/calendar operations immediate apply + undo.
- [ ] For external Google/Apple writes, design explicit approval cards with clear
  summary and no raw JSON/code.
- [ ] Add tests proving local edits do not create approval buttons, while mocked
  external writes do.

## Quality Gate Before Any Next Commit

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`
- [ ] Electron screen QA for the touched workflow.
- [ ] No `.env.local` output, screenshots, staged changes, or commit contents.

## Handoff Notes For The Next Agent

- Start by reading:
  - `AGENTS.md`
  - `docs/2026-06-16-nodiary-next-context-handoff.md`
  - this plan file
  - `docs/2026-06-16-nodiary-ux50-final-report.md`
- The current user preference is direct AI results in the document, not approval
  ceremony.
- Do not put execution logs into the central document.
- Do not show raw JSON/diff/code to the user in normal AI result cards.
- If AI returns Markdown, normalize it to plain text before updating the
  document state.
- If a task touches UI layout, visually inspect Electron before calling it done.
