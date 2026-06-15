# Nodiary 4-Person Harness Detail Design

Status: Drafted for mockup review
Date: 2026-06-15
Mockup: `.superpowers/brainstorm/58642-1781524301/content/nodiary-harness-interactive-v3.html`

## Direction Reset

The prior 50-item list is not a list of wrong answers to patch one by one. It is replaced by a reconstruction direction:

- Nodiary is a Notion-like document workspace first.
- Planning notes can contain project management, but project databases must not dominate the first screen.
- The first screen must feel like a page editor: sidebar, full calendar, title, properties, blocks, slash command, quiet whitespace.
- AI is a secondary assistant surface. It writes, rewrites, creates approval proposals, and never visually overpowers editing.
- Calendar lives in the left sidebar as a complete monthly surface, not a cropped two-week strip.

## 4-Person Harness

### 1. Harsh Product Planner

Verdict: keep the big shape, remove feature bragging.

Detailed requirements:

- The first visible task is writing, not managing a project database.
- The app should answer: "What am I writing or deciding right now?"
- Project management appears as a block inserted into a planning note.
- Empty page state must guide writing without looking like a dashboard.
- AI must not create a wall of cards before the user asks for help.
- The user must see what can be clicked without reading instructions.
- The UX must preserve control: AI proposal, approval, undo.

### 2. Notion Power User

Verdict: recognizable skeleton matters.

Detailed requirements:

- Left sidebar has workspace, search, inbox, quick capture, page tree.
- Page tree supports nested pages and active state.
- Calendar in sidebar is complete month view.
- Main page has large editable title.
- Page properties appear under title.
- Blocks show handles and hover state.
- Slash menu opens near the block insertion point.
- Database/project management is inserted through slash command.
- Database block supports table, board, calendar view switching.
- Linked page block should open or focus related planning detail.

### 3. Positive Product Planner

Verdict: the app can be useful if the flow from writing to execution is smooth.

Detailed requirements:

- A planning note can become a project plan without leaving the page.
- Quick capture sends raw thoughts to Inbox.
- AI writing panel can convert messy notes into tasks.
- Calendar context helps the user avoid impossible plans.
- The app should make "write, decide, schedule, execute" feel like one flow.
- The default Korean copy should be practical and calm.
- The design should feel quiet, not theatrical.

### 4. Engineer

Verdict: design must map to clean implementation units.

Detailed requirements:

- Page, Block, Database, CalendarEvent, AiRun, AiProposedAction must stay separate.
- Editor rendering should be componentized by block type.
- Slash menu should produce typed block insert actions.
- Project management block is a database view block, not a separate dashboard route.
- AI input creates proposed actions, not direct mutations.
- Calendar selection affects page context and AI context.
- Approval queue stores risk, diff, undo payload, and execution state.
- Settings must own density, document width, AI panel default, and accent.

## UI/UX Detail Requirements

- The first screen must have no forced project database.
- The complete monthly calendar must show all days in the month.
- AI input must be a stable text area with no overlap, selection corruption, or floating artifact.
- Buttons must have visible hover and selected states.
- Sidebar rows must be dense but readable.
- Sidebar row icons, disclosure marks, and labels must be vertically centered on the same optical baseline.
- Do not delete, hide, or downgrade icons/disclosure controls/block handles just because alignment is difficult.
- Do not use crude placeholder CSS/text substitutions as the production answer for icons or handles.
- Production icons must come from a proper icon library already available to the app, such as `lucide-react`, or from vetted polished SVG assets.
- Sidebar disclosure controls must use real chevron/disclosure icons in a fixed icon box with optical centering.
- Sidebar utility controls must use real search/inbox/capture/AI/settings/new-page icons in fixed icon boxes, not letter placeholders such as `S`, `I`, `Q`, `A`, `G`, or `+`.
- Document block handles must use a proper six-dot/grip icon, for example `GripVertical`/`Grip` from the chosen icon set, aligned to the block row height.
- Alignment fixes must happen through component layout: fixed icon boxes, `align-items: center`, explicit row height, explicit `line-height`, predictable gaps, and screenshot QA.
- Main document max width should be about 760-820px.
- Right AI panel can collapse.
- The slash menu must be click-functional.
- Inserted project block must be view-switchable.
- Calendar day clicks must update the visible schedule list.
- Quick capture must visibly add a note to Inbox.
- Page title editing must update the breadcrumb and sidebar active page name where practical.
- Settings/personalization must be visible as a modal.

## Interactive Mockup Contract

The prototype must support:

- Click page tree rows.
- Click full monthly calendar dates.
- Click quick capture.
- Open and close AI panel.
- Type into AI text area.
- Send AI request and see approval item.
- Approve or reject approval items.
- Open slash menu.
- Insert text, heading, todo, callout, project block, or AI edit request.
- Switch project block between table, board, and calendar.
- Open harness panel and filter personas.
- Open personalization modal.

## Visual Rules

- Default palette: Notion-like neutral surface, warm gray sidebar, restrained teal accent.
- No purple AI theme.
- No dashboard-first card grid.
- No nested-card look.
- No decorative blobs or gradients.
- No clipped primary UI.
- No text overlap.
- No viewport-scaled type.
- Button/control text must be explicitly styled.
- The document body must have enough whitespace to feel writable.

## Rejected Mockup Shortcut

The CSS-only icon/handle cleanup attempted in the interactive mockup is rejected
as a production direction. It may remain only as throwaway mockup scaffolding.

In the real Electron/Next app, the solution is to preserve the intended controls
and make them visually precise:

- Use real icon components or polished SVG assets.
- Keep affordances visible.
- Fix row geometry instead of swapping visuals for easier placeholders.
- Verify the rendered Electron screen before calling the alignment fixed.

## Next Implementation Priority

1. Convert the accepted interactive mockup into the real Next/Electron UI shell.
2. Replace current Today dashboard with document-first page.
3. Add page tree and complete calendar sidebar.
4. Add block renderer and slash menu.
5. Add project management block insertion.
6. Add right AI writing panel and approval queue.
7. Preserve all click states from the mockup in the real app.
