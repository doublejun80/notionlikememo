# Nodiary

Nodiary is a Notion Core Clone-lite desktop workspace for daily planning,
document writing, lightweight databases, calendar context, and an approval-gated
AI operator.

The first screen is document-first: a Korean Notion-like page canvas with a
large title, properties, rich blocks, slash insertion, block handles, a full
monthly sidebar calendar, page tree, settings personalization, and a writable AI
operator panel.

## Stack

- Next.js App Router
- React, TypeScript, Tailwind CSS
- TipTap rich text blocks
- SQLite + Prisma
- Electron desktop shell
- Vitest, Testing Library, Playwright for visual QA
- GitHub Actions packaging for macOS and Windows

## Run

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:init
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

Desktop development:

```bash
npm run electron:dev
```

## Verify

```bash
npm test
npm run typecheck
npm run lint
npm run build
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack
```

## Database

The local development SQLite database defaults to:

```text
prisma/dev.db
```

Initialize or reset the schema and seed data:

```bash
npm run db:init
```

The packaged Electron app sets `DATABASE_URL` to the user data directory and
best-effort pushes the bundled Prisma schema on startup.

## AI

The OpenAI key belongs in `.env.local` and must not be committed. The client
never reads or displays the key. AI mutations are represented as proposed
actions with risk labels, approval controls, and undo history.
