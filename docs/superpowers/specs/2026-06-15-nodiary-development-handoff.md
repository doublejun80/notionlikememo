# Nodiary Development Handoff

Date: 2026-06-15
Repo: `/Volumes/mac_dock/github/notionlikememo`
Phase: final direction/spec/mocks captured; production rebuild starts next

## Read This First

This is the current source of truth for the next context.

The old "50 fixes" list was part of evaluation, not a final patch checklist.
The product direction has now been reset: keep the broad Notion-like shape, but
rebuild the details seriously.

The latest interactive mockup is useful for behavior and layout direction, but
it is not visual QA proof. The production Electron/Next screen still needs a
proper implementation pass and screenshot comparison.

## Final Product Direction

Product name: **Nodiary**

Nodiary is a Notion-like personal document workspace with planning, calendar,
project blocks, and AI operator support.

The first screen must feel like a real document editor:

- Left sidebar with workspace controls, search, inbox, quick capture, AI entry,
  full monthly calendar, and nested page tree.
- Main document canvas with large editable title, properties, blocks, block
  handles, slash menu, and calm whitespace.
- Right AI panel that can be opened/collapsed and used as a real writing and
  command surface.
- Project management appears inside notes as a slash-inserted database/project
  block, not as the default first-screen focus.

## Explicit User Corrections

These points came from direct review and must be honored:

- Do not crop the calendar. Show the complete monthly calendar in the left
  sidebar.
- Do not make the first page a project database dashboard.
- Do not put project DB on screen unless the user inserts or opens it inside a
  planning note.
- The AI area must accept typing and commands. It is not a passive proposal-card
  strip.
- Sidebar icon, disclosure, and label alignment must be visually centered.
- Main document layout must be centered and stable relative to the sidebar.
- Do not delete useful controls just because alignment is hard.
- Do not replace icons with ugly placeholder text, crude CSS art, or cheap
  approximations.
- Actual product work must use a proper icon system and fix component geometry.

## Rejected Shortcut

The last mockup-side icon workaround is rejected as a production strategy.

Do not carry this pattern into the real app:

- Replacing icons with letters.
- Replacing disclosure arrows with text glyphs.
- Replacing block handles with `::`.
- Making crude CSS shapes and pretending the visual problem is solved.

The correct product strategy:

- Use `lucide-react` where possible, or vetted polished SVG assets.
- Give every icon a fixed box, for example 20x20 or 24x24.
- Use explicit row heights and `align-items: center`.
- Use explicit `line-height` on labels.
- Tune optical alignment at the component level.
- Verify with screenshots in Electron before calling it fixed.

## Current 4-Person Harness

Use these four lenses during planning and review.

### 1. Harsh Product Planner

Goal: remove fake usefulness and feature bragging.

Checks:

- Does the first screen make writing/deciding obvious?
- Is the project database hidden until contextually useful?
- Is AI helping the current document rather than stealing the screen?
- Can a user understand the main affordances without reading instructions?

### 2. Notion Power User

Goal: make the skeleton recognizable as Notion-like.

Checks:

- Sidebar/page tree behaves like a workspace navigator.
- Page title, properties, blocks, handles, hover states, and slash menu exist.
- Database views can appear inside a document.
- The page feels writable before it feels managerial.

### 3. Positive Product Planner

Goal: preserve why this app can be useful.

Checks:

- A messy note can become tasks/project structure without leaving the page.
- Calendar context prevents impossible plans.
- Quick capture sends raw thoughts to Inbox.
- The flow feels like write, decide, schedule, execute.

### 4. Engineer

Goal: keep implementation clean.

Checks:

- `Page`, `Block`, `Database`, `CalendarEvent`, `AiRun`, and
  `AiProposedAction` remain separate concepts.
- Slash menu produces typed insert actions.
- AI creates proposed actions first, then approval/undo applies mutations.
- Calendar selection affects page and AI context without becoming the main app.

## UX Contract

The production app should support:

- Click nested page rows.
- Expand/collapse page groups.
- Add a new page.
- Search/focus command entry.
- Quick capture to Inbox.
- Click any visible date in the full monthly calendar.
- See selected-date schedule under the calendar.
- Edit the page title.
- See and edit page properties.
- Hover/select document blocks.
- Open slash menu from an empty block.
- Insert text, heading, todo, callout, project/database block, and AI-edit
  request.
- Switch project block between table, board, and calendar views.
- Type into the AI panel.
- Send an AI command.
- Review proposed changes.
- Approve/reject proposed AI actions.
- Undo approved AI actions where possible.
- Open settings/personalization.

## Visual Rules

Default visual tone:

- Notion-like neutral surfaces.
- Warm gray sidebar.
- Restrained teal accent.
- Quiet, dense, document-first.
- No purple AI theme.
- No dashboard-first card grid.
- No decorative blobs or gradients.
- No clipped primary UI.
- No overlapping text.
- No viewport-scaled type.
- No nested cards inside cards.

Approximate layout:

- Sidebar: about 280-320px, but must not clip the calendar.
- Document max width: about 760-820px.
- Main content should align visually as a document canvas, not float randomly.
- Right AI panel: collapsible, secondary, stable width around 320-380px.
- Icon slots: fixed-size boxes with optical centering.
- Sidebar rows: fixed row height, centered icon + label.

## AI Operator Direction

OpenAI integration is part of the product direction.

Important:

- The OpenAI key is stored in `.env.local`.
- `.env.local` must remain ignored.
- Do not print, log, commit, screenshot, or expose the key.

AI should be able to:

- Rewrite selected blocks.
- Turn notes into todos.
- Create project blocks from a planning note.
- Suggest calendar items.
- Detect events from user text.
- Clean up old memory.
- Search/use long-term memory.
- Prepare approval proposals before mutating user data.
- Show diffs for risky edits.
- Keep undo payloads for approved changes.

Default safety model:

- Low-risk local formatting can be fast.
- Data deletion, calendar writes, DB restructuring, and bulk edits require
  approval.
- User remains in control.

## Calendar Direction

The calendar belongs in the left sidebar by default.

Requirements:

- Full month visible.
- Day click updates selected-date schedule.
- Schedule cards sit under the month.
- Google Calendar and Apple Calendar are planned integrations.
- Conflict handling should auto-resolve only low-risk cases.
- High-risk conflicts need user approval.

## Project Management Direction

Project management is supported, but not as the opening screen.

It appears as:

- A slash-inserted project/database block.
- A linked database block inside `기획노트`.
- Views: table, board, calendar.
- Optional task/status/date/owner fields.

It should answer:

- What are we planning?
- What is decided?
- What tasks came out of this note?
- What is scheduled?

It should not answer first:

- "Here is a dashboard before you even wrote anything."

## Personalization Direction

Settings should allow:

- Theme.
- Accent color.
- Density.
- Document width.
- Sidebar calendar visibility.
- Right AI panel default open/closed.
- Startup page: last page or chosen page.
- AI approval strictness.

Default style can stay close to Notion, but the user can personalize later.

## Current Mockup Files

Latest interactive mockup:

- `.superpowers/brainstorm/58642-1781524301/content/nodiary-harness-interactive-v3.html`

Earlier useful mockups:

- `.superpowers/brainstorm/58642-1781524301/content/nodiary-notion-editor-v2.html`
- `.superpowers/brainstorm/58642-1781524301/content/a-locked-drag-included.html`
- `.superpowers/brainstorm/58642-1781524301/content/notion-redesign-evaluation.html`

Treat these as behavior/spec references, not final production visuals.

## Current Spec Files

- `docs/superpowers/specs/2026-06-15-notion-ai-operator-redesign.md`
- `docs/superpowers/specs/2026-06-15-nodiary-harness-detail-design.md`
- `docs/superpowers/specs/2026-06-15-nodiary-development-handoff.md`

Start from this handoff file in the next context.

## Current Repo State Notes

Known changes:

- `.gitignore` was updated so `.env.local` and `.superpowers/` stay out of git.
- `.env.local` exists locally and must stay private.
- The icon experiments were in mockup files, not the real Electron UI.
- Actual Electron/Next product UI still needs the real rebuild.

Earlier verification passed before the documentation pass:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Mockup interaction verification:

- `jsdom` regression checks passed for click/insert/AI/settings behavior.
- Playwright was not installed, so full browser screenshot QA was not completed.

## Development Plan For Next Context

### Phase 1. Foundation

- Re-read this handoff and `AGENTS.md`.
- Inspect current app routes/components/styles.
- Confirm current Electron entry and Next route structure.
- Identify the existing icon library and Tailwind/shadcn conventions.
- Set a screenshot QA path before claiming UI fixes.

### Phase 2. Design System Cleanup

- Create stable layout tokens for sidebar width, document width, AI panel width,
  row height, icon box size, spacing, typography, and accent.
- Build reusable sidebar row, disclosure row, icon button, page row, calendar
  cell, block row, block handle, and AI panel components.
- Use proper icons from `lucide-react` or vetted polished SVG assets.
- Do not use letter placeholders in production UI.

### Phase 3. App Shell

- Replace dashboard-first opening view with document-first layout.
- Left sidebar: workspace, search, inbox, quick capture, AI entry, full calendar,
  page tree, new page, settings.
- Main canvas: breadcrumb, title, properties, blocks.
- Right panel: collapsible AI operator.

### Phase 4. Editor

- Add page title editing.
- Add block renderer.
- Add block handles and hover/selected states.
- Add slash menu.
- Insert text, heading, todo, callout, project block, and AI edit request.
- Keep block data typed and serializable.

### Phase 5. Project Block

- Implement project/database block inside a document.
- Add table, board, and calendar view switching.
- Keep it contextual, not first-screen dominant.

### Phase 6. Calendar

- Implement complete monthly sidebar calendar.
- Date click updates schedule list.
- Later connect Google/Apple calendar adapters.

### Phase 7. AI Operator

- Add AI panel input.
- Add proposed action list.
- Add approval/reject.
- Add undo log.
- Add OpenAI API route/server-side boundary using `.env.local`.
- Never expose the key to the renderer/client.

### Phase 8. Personalization

- Add settings modal.
- Persist theme/accent/density/document width/AI panel default/startup page.

### Phase 9. Verification

- Run unit/type/lint/build checks.
- Run Electron locally.
- Capture screenshots at desktop viewport.
- Compare sidebar alignment, full calendar, main canvas centering, AI input, and
  slash menu.
- Fix visible defects before claiming done.

## Do Not Do

- Do not ask the user to accept a weaker substitute for core Notion-like
  affordances.
- Do not remove icons, handles, disclosure controls, or calendar content to make
  layout easier.
- Do not call mockup success equal to product success.
- Do not expose `.env.local`.
- Do not make the first screen a marketing page.
- Do not make the first screen a project dashboard.
- Do not let AI visually overpower the document.
- Do not end with "implemented" until the rendered Electron app is checked.
