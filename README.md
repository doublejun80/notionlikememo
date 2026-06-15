# MyPlan

MyPlan is a Today-centered personal planning and record app.

The current build is an MVP screen draft. The UI still reads from mock data,
and the local SQLite foundation is now present for the next persistence step.
It includes:

- App shell
- Left workspace sidebar
- Top command/search bar
- Right context panel on wide screens
- Today screen
- Calendar, Journal, Tasks, Notes, Projects, Search, Settings base screens

Not included yet:

- Login
- Screen-to-database persistence
- Sync
- AI summary
- Google Calendar integration
- Full block editor

## Desktop Direction

Use Electron first when adding a desktop shell.

Tauri is deferred because the official Next.js path requires static export,
which conflicts with the current Prisma-backed Next.js direction. The Go-based
candidate is Wails, but it would introduce a Go backend before the data layer is
stable.

See `docs/07_desktop-and-db-decision.md`.

## Run

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Verify

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## Database

SQLite is initialized at:

```text
prisma/dev.db
```

Generate Prisma Client:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npm run db:generate
```

Initialize/reset the local SQLite file with seed data:

```powershell
npm run db:init
```

Prisma schema engine commands may fail in this Windows environment because of a
local certificate/engine issue. Until that is resolved, use `npm run db:init`
instead of `npm run db:push`.
