# Desktop and Database Decision

Date: 2026-06-15

## Decision

MyPlan should continue as a Next.js web app first, then add an Electron desktop
shell when packaging starts.

Use Electron before Tauri or Wails for the next desktop step.

## Why Electron

- The current app is already a Next.js App Router app.
- MyPlan needs local SQLite persistence through a Node-compatible data layer.
- Electron embeds Chromium and Node.js, so it fits a Next.js + Prisma/SQLite
  path with the least architectural churn.
- Electron has a larger runtime than Tauri or Wails, but the MVP risk is lower
  because the app can keep the current React/Next code and npm tooling.

## Why Not Tauri Yet

Tauri is attractive for a smaller desktop binary and Rust-based native shell.
However, the official Next.js guidance requires static export and says Tauri
does not support server-based solutions. That conflicts with a Prisma-backed
Next.js App Router path unless the app is reworked around a client-side or
Tauri-command data layer.

Tauri can be revisited after the data-access boundary is stable.

## Why Not Wails Yet

The Go-based option the user was thinking of is Wails.

Wails is a strong lightweight Electron alternative for Go apps, but adopting it
now would introduce a Go backend and a different desktop app structure. That is
useful if MyPlan becomes a Go-native local app, but it is unnecessary for the
current Next.js MVP.

## SQLite Decision

Use SQLite for the local-first MVP database.

Current implementation:

- Prisma schema: `prisma/schema.prisma`
- SQLite file: `prisma/dev.db`
- Seed mapper: `prisma/seed-data.ts`
- SQLite bootstrap runner: `prisma/bootstrap-sqlite.ts`
- Prisma client helper: `src/server/db/client.ts`

Prisma is pinned to `6.19.3` because Prisma 7 requires a SQLite driver adapter,
and the `better-sqlite3` adapter failed to install in this Windows environment
due to a self-signed certificate chain during native build/header download.

The schema is still Prisma-first. The actual local DB file is currently created
with Node 24's built-in `node:sqlite` module so the project can proceed without
native addon setup.

## Current Boundary

The UI still reads from mock data.

Do not replace all screen data with DB queries in the next step without first
adding a repository layer. The next implementation should add server-side data
access functions such as:

- `getTodayOverview()`
- `getCalendarEvents(dateRange)`
- `getTasks(filter)`
- `getJournalEntry(dateKey)`
- `getNotes(filter)`
- `getProjects()`

React components should not call Prisma directly.
