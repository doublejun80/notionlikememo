# Handoff: Desktop Direction and SQLite Foundation

Date: 2026-06-15

## Current Status

- Desktop wrapper decision: Electron first.
- Go option name: Wails.
- Tauri status: defer until the app can tolerate static export or a Tauri-native
  data boundary.
- SQLite foundation: added and initialized.
- UI data source: still mock data.

## What Changed

- Added Prisma 6.19.3 and `@prisma/client` 6.19.3.
- Added `dotenv` and `tsx`.
- Added SQLite env files:
  - `.env`
  - `.env.example`
- Added `.gitignore` for local DB, logs, build output, and env files.
- Added Prisma schema:
  - `prisma/schema.prisma`
- Added seed mapping and runners:
  - `prisma/seed-data.ts`
  - `prisma/seed.ts`
  - `prisma/bootstrap-sqlite.ts`
- Added DB client helper:
  - `src/server/db/client.ts`
  - `src/server/db/index.ts`
- Added node:sqlite type shim:
  - `src/types/node-sqlite.d.ts`
- Added DB tests:
  - `src/data/prisma-schema.test.ts`
  - `src/data/prisma-seed.test.ts`
- Updated npm scripts:
  - `db:generate`
  - `db:push`
  - `db:init`
  - `db:seed`
  - `db:reset`
  - `db:studio`

## Database State

Actual SQLite file created:

```text
prisma/dev.db
```

Seeded counts:

```text
Workspace: 1
Project: 3
Task: 5
CalendarEvent: 4
JournalEntry: 1
Note: 4
Tag: 8
InboxItem: 3
```

Prisma Client query verified:

```json
{"projects":3,"tasks":5,"events":4,"notes":4}
```

## Commands That Worked

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run db:generate
npm run db:init
npm test -- src/data/prisma-schema.test.ts src/data/prisma-seed.test.ts
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); Promise.all([prisma.project.count(), prisma.task.count(), prisma.calendarEvent.count(), prisma.note.count()]).then(([projects,tasks,events,notes]) => { console.log(JSON.stringify({projects,tasks,events,notes})); }).finally(() => prisma.`$disconnect());"
```

## Known Environment Notes

Prisma CLI engine download needed this local workaround:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'
```

Reason: this Windows environment hit `self-signed certificate in certificate
chain` while downloading Prisma engine files and while trying Prisma 7's
`better-sqlite3` adapter path.

`npm run db:push` and `npx prisma migrate dev --name init --skip-seed` currently
fail with a blank Prisma schema engine error in this environment, despite
`npx prisma validate` passing.

Use `npm run db:init` for the next local handoff until the schema engine issue is
resolved.

`node:sqlite` prints an ExperimentalWarning on Node 24.11.0. The DB file is still
created and queryable.

## Recommended Next Steps

1. Add a repository layer under `src/server/repositories`.
2. Start with read-only functions for Today:
   - `getTodayOverview()`
   - `getTodayEvents(dateKey)`
   - `getTodayTasks(dateKey)`
   - `getRecentNotes()`
   - `getActiveProjects()`
3. Add tests for each repository function against `prisma/dev.db`.
4. Switch one screen at a time from `src/data/myplan-data.ts` to repository data.
5. Add Electron dev shell:
   - `electron/main.cjs`
   - `electron/preload.cjs`
   - `electron:dev` script
   - use `http://127.0.0.1:3000` in dev
6. Later, move the SQLite path from `prisma/dev.db` to the Electron app data
   directory for packaged builds.

## Do Not Do Next

- Do not add login.
- Do not add sync.
- Do not add AI.
- Do not replace every screen with DB queries in one large change.
- Do not migrate to Tauri or Wails until the data-access boundary is stable.
