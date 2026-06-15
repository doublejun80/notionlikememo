# Notion Core + AI Operator Redesign Spec

Status: Review needed
Date: 2026-06-15
Repository: `/Volumes/mac_dock/github/notionlikememo`

App name: `Nodiary`

## Goal

Turn the current MyPlan shell into a Notion-like desktop productivity app with a powerful OpenAI-based operator.

The current app is useful as a Today-centered planning shell, but it does not yet satisfy the user intent: a Notion-like app with high freedom, block editing, database views, drag-and-drop, and AI that can operate the app.

## Locked Decisions

- App display name: `Nodiary`.
- Product direction: A. Notion Core Clone-lite.
- First page: `오늘의 계획`.
- Visual style: close to Notion by default, with personalization in settings.
- Personalization: theme, accent, density, document width, right panel, default page, last-page restore.
- Editor: TipTap full rich text.
- Blocks: full drag support for blocks, board cards, page tree, DB rows, calendar events.
- DB views: table, board, calendar.
- Persistence: SQLite with Prisma.
- Desktop shell: Electron stays.
- Packaging: macOS and Windows.
- CI packaging: GitHub Actions matrix.
- Mobile: proper responsive support, not a throwaway narrow layout.

## AI Decisions

- OpenAI API key: stored locally in `.env.local` as `OPENAI_API_KEY`; never print the key.
- AI authority: approval-gated execution.
- AI tool scope: full productivity manipulation.
- AI surfaces: right AI panel, selected-block AI, `/ai` slash command, command palette.
- AI context: current page, workspace search, long-term memory.
- AI memory: automatic memory plus periodic cleanup.
- First AI package: AI Operator.
- Trigger mode: manual commands, scheduled checks, event detection.
- Approval queue: diff, item-level approval, execution log, undo log.
- Calendar integration: Google Calendar and Apple Calendar.
- Calendar permission: two-way automatic sync with conflict handling.
- Conflict policy: auto-resolve low-risk conflicts, require approval for high-risk changes.
- OpenAI data scope: full original context allowed for related pages/databases/events.
- Model and budget policy: task-based routing plus daily budget.

## OpenAI Architecture

Use OpenAI as a planner and tool-call generator, not as a direct database writer.

Recommended shape:

- Use the OpenAI Responses API for model requests.
- Use function/tool calling with JSON schemas for app actions.
- Use structured outputs for approval queue plans.
- Consider the Agents SDK when orchestration, state, tool execution, approvals, and tracing become large enough to justify it.
- Keep authenticated app state, database clients, local file paths, and secrets in local app context. Do not send them as model context unless needed.

Official references checked:

- OpenAI function/tool calling: https://developers.openai.com/api/docs/guides/function-calling
- OpenAI Agents SDK: https://developers.openai.com/api/docs/guides/agents
- OpenAI tools: https://developers.openai.com/api/docs/guides/tools
- OpenAI SDKs and CLI: https://developers.openai.com/api/docs/libraries

## Product Structure

Primary desktop layout:

- Left sidebar: workspace switcher, page tree, favorites, database shortcuts, trash.
- Top bar: search, command palette, quick capture, sync state, AI budget indicator.
- Main document canvas: Notion-like page editor.
- Right panel: AI Operator, page context, linked records, approval queue.
- Bottom/mobile detail sheet: selected block/page/AI action details on small screens.

Primary routes:

- `/`: default document page, `오늘의 계획`.
- `/pages/:pageId`: document editor.
- `/databases/:databaseId`: table/board/calendar DB views.
- `/calendar`: calendar hub with internal and external calendars.
- `/ai`: AI Operator command center.
- `/search`: global search and command history.
- `/settings`: personalization, AI, calendar sync, data, backup.

## Data Model Additions

Add models around the existing Prisma schema rather than throwing it away.

Needed models:

- `Page`: title, icon, cover, parentId, sortOrder, favorite, archived.
- `Block`: pageId, parentBlockId, type, contentJson, sortOrder, checked, metadataJson.
- `Database`: source page/block, name, view config.
- `DatabaseField`: name, type, optionsJson, sortOrder.
- `DatabaseRow`: databaseId, pageId optional, sortOrder, propertiesJson.
- `DatabaseView`: type table/board/calendar, filtersJson, sortsJson, layoutJson.
- `ExternalCalendarAccount`: provider google/apple, accountLabel, encrypted tokens or credentials reference.
- `ExternalCalendarEventLink`: local event id, provider event id, sync state, etag/version.
- `AiMemory`: type, content, source, confidence, lastUsedAt, archivedAt.
- `AiRun`: command, context summary, model route, status, token/cost estimate.
- `AiProposedAction`: runId, toolName, argsJson, diffJson, riskLevel, approvalStatus.
- `AiExecutionLog`: actionId, result, undoJson, executedAt.
- `AppPreference`: theme, accent, density, editor width, panel defaults.

## AI Tool Surface

Tool calls should be narrow and typed.

Initial tool set:

- `searchWorkspace(query, scope)`
- `readPage(pageId)`
- `createPage(parentId, title, blocks)`
- `updateBlock(blockId, patch)`
- `moveBlock(blockId, targetParentId, sortOrder)`
- `createDatabase(pageId, schema, views)`
- `updateDatabaseRow(rowId, patch)`
- `moveBoardCard(rowId, targetGroup, sortOrder)`
- `createCalendarEvent(input)`
- `updateCalendarEvent(eventId, patch)`
- `resolveCalendarConflict(conflictId, strategy)`
- `createTask(input)`
- `updateTask(taskId, patch)`
- `writeAiMemory(memory)`
- `archiveAiMemory(memoryId)`
- `createWeeklyReview(input)`

Every mutating tool call must produce:

- human-readable summary,
- machine-readable diff,
- risk level,
- undo payload,
- approval status.

## UX Requirements

Editor:

- A page is a real editable document, not a dashboard.
- The first visible screen must not show a project database by default.
- The first visible screen must prioritize the page title, editable blocks, block handles, slash menu, and quiet document whitespace.
- The left sidebar must include both the page tree and a complete compact monthly calendar, not a cropped partial calendar.
- AI must be secondary to editing. The right AI panel starts as a writable prompt/editor area, not as a stack of proposal cards, and its input text must never overlap or visually corrupt.
- Every block has hover controls, drag handle, slash command, duplicate, delete, turn-into, and AI action.
- TipTap must support headings, paragraphs, checkboxes, bullets, numbered lists, quote, code, divider, callout, table-like blocks, links, inline styles, and paste handling.
- Dragging must preserve stable layout dimensions and avoid text jump.

Databases:

- Table view supports columns, row creation, inline cell editing, sort, filter, grouping basics.
- Board view supports drag between status columns.
- Calendar view supports event drag and resize where practical.
- A database row can open as a page.

AI Operator:

- AI can be called from the right panel, selected blocks, `/ai`, and command palette.
- AI proposals appear in an approval queue.
- Low-risk internal rearrangements can auto-resolve only when policy allows.
- High-risk changes such as external calendar event move/delete require explicit approval.
- The user can inspect context used, diff, risk, and undo before executing.
- AI memory has a visible management screen with edit/delete/archive and cleanup log.
- Budget/routing panel shows daily budget, current route, large-context warnings, and stop rules.

Calendar:

- Google Calendar and Apple Calendar are planned.
- External sync must distinguish read, write, conflict, and deletion states.
- External changes can trigger AI suggestions.
- Two-way sync needs conflict logs and undo where provider APIs allow it.

Settings:

- Appearance: theme, accent, density.
- Layout: document width, right panel behavior, sidebar width, default page, restore last page.
- AI: model route policy, budget, memory, data scope, approval policy, execution history.
- Calendar: connected accounts, sync direction, conflict policy, provider status.
- Data: local database path, backup, export/import.

## 50 Fix List

Remove each item from this list when the implementation actually fixes it.

- [ ] Replace Today dashboard as the primary metaphor with a document-first page canvas.
- [ ] Add a real page tree in the left sidebar.
- [ ] Add nested pages and page parent/child ordering.
- [ ] Add favorites and recent pages.
- [ ] Add a default `오늘의 계획` page.
- [ ] Add Notion-like block hover controls.
- [ ] Add block drag handles.
- [ ] Add slash command menu.
- [ ] Add block turn-into actions.
- [ ] Add block duplicate/delete actions.
- [ ] Add TipTap rich text editor.
- [ ] Add headings, paragraph, quote, code, divider, callout.
- [ ] Add checkbox/todo blocks.
- [ ] Add bullet and numbered list blocks.
- [ ] Add inline bold/italic/code/link support.
- [ ] Add paste handling for rich text.
- [ ] Add keyboard-first block navigation.
- [ ] Add command palette.
- [ ] Add quick capture that inserts into inbox or current page.
- [ ] Add full-text search over pages and blocks.
- [ ] Add database table view.
- [ ] Add database board view.
- [ ] Add database calendar view.
- [ ] Add database row-as-page behavior.
- [ ] Add inline table cell editing.
- [ ] Add DB fields and property schema.
- [ ] Add DB sorting and filtering basics.
- [ ] Add board card drag between groups.
- [ ] Add calendar event drag support.
- [ ] Add page/block/database persistence in Prisma.
- [ ] Add migration/seed update for new schema.
- [ ] Add settings for theme/accent/density.
- [ ] Add settings for document width and panel behavior.
- [ ] Add default page and last-page restore.
- [ ] Add right AI Operator panel.
- [ ] Add selected-block AI actions.
- [ ] Add `/ai` slash command.
- [ ] Add AI command palette action.
- [ ] Add OpenAI client wrapper using `.env.local`.
- [ ] Add typed AI tool schemas.
- [ ] Add AI approval queue.
- [ ] Add diff preview for AI changes.
- [ ] Add item-level approval execution.
- [ ] Add undo log for AI actions.
- [ ] Add AI run/execution history.
- [ ] Add AI memory storage and management UI.
- [ ] Add automatic memory cleanup log.
- [ ] Add task-based model routing and daily budget UI.
- [ ] Add Google/Apple calendar integration plan and provider abstraction.
- [ ] Add two-way calendar sync conflict resolver.

## Acceptance Criteria

- The first screen looks and behaves like a Notion-style document workspace, not a set of cards.
- A user can create/edit/reorder blocks in `오늘의 계획`.
- A user can create a database and switch between table, board, and calendar views.
- A user can drag blocks, board cards, DB rows, and calendar events.
- A user can personalize the Notion-like default style.
- AI can propose multi-step changes and show diff, risk, approval status, and undo plan.
- AI can use long-term memory and show memory management.
- Calendar sync design is represented in the UI, even if provider credentials are configured later.
- Electron can show the app.
- Tests cover editor basics, DB view state, AI approval queue, settings persistence, and schema relationships.

## Open Questions Before Implementation

- Provider sequencing: Google Calendar first, Apple Calendar second, or both scaffolded behind one abstraction.
- Whether external calendar write support should ship in the first runnable build or be represented as a settings-disabled connector until credentials are configured.

## Implementation Handoff

After approval, write a new implementation plan under `docs/superpowers/plans/` and execute in phases:

1. Schema and persistence.
2. Notion-like shell and page tree.
3. TipTap block editor.
4. Database views.
5. Drag-and-drop.
6. Settings and personalization.
7. AI Operator core.
8. Approval queue, diff, undo.
9. Calendar provider abstraction and conflict resolver.
10. Packaging and CI.
