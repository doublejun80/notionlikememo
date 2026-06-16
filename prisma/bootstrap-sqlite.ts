import "dotenv/config";

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { myplanData } from "../src/data/myplan-data";
import { buildSeedRecords } from "./seed-data";

const databasePath = join(process.cwd(), "prisma", "dev.db");
const databaseUrl = process.env.DATABASE_URL ?? `file:${databasePath}`;

const seed = buildSeedRecords(myplanData);

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  process.env.DATABASE_URL = databaseUrl;

  if (databaseUrl === `file:${databasePath}`) {
    mkdirSync(dirname(databasePath), { recursive: true });
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}-journal`, { force: true });
    rmSync(`${databasePath}-shm`, { force: true });
    rmSync(`${databasePath}-wal`, { force: true });
  }

  try {
    execFileSync(
      resolveNpxCommand(),
      ["prisma", "db", "push", "--skip-generate"],
      {
        env: process.env,
        stdio: "inherit"
      }
    );
  } catch {
    console.warn(
      "Prisma db push failed; falling back to direct SQLite bootstrap."
    );
    await bootstrapSqliteSchema(databaseUrl);
  }

  const prisma = new PrismaClient();

  try {
    await seedDatabase(prisma);
    console.log(
      `SQLite ready at ${databaseUrl}: ${seed.projects.length} projects, ${seed.tasks.length} tasks, ${seed.calendarEvents.length} events, ${seed.notes.length} notes`
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function seedDatabase(client: PrismaClient) {
  await client.$transaction(async (tx) => {
    await tx.aiExecutionLog.deleteMany();
    await tx.aiProposedAction.deleteMany();
    await tx.aiRun.deleteMany();
    await tx.aiMemory.deleteMany();
    await tx.databaseView.deleteMany();
    await tx.databaseRow.deleteMany();
    await tx.databaseField.deleteMany();
    await tx.database.deleteMany();
    await tx.block.deleteMany();
    await tx.page.deleteMany();
    await tx.appPreference.deleteMany();
    await tx.externalCalendarEventLink.deleteMany();
    await tx.externalCalendarAccount.deleteMany();
    await tx.noteTag.deleteMany();
    await tx.inboxItem.deleteMany();
    await tx.task.deleteMany();
    await tx.calendarEvent.deleteMany();
    await tx.journalEntry.deleteMany();
    await tx.note.deleteMany();
    await tx.tag.deleteMany();
    await tx.project.deleteMany();
    await tx.workspace.deleteMany();

    await tx.workspace.create({ data: seed.workspace });

    for (const project of seed.projects) {
      await tx.project.create({ data: project });
    }

    for (const tag of seed.tags) {
      await tx.tag.create({ data: tag });
    }

    for (const note of seed.notes) {
      await tx.note.create({ data: note });
    }

    for (const noteTag of seed.noteTags) {
      await tx.noteTag.create({ data: noteTag });
    }

    for (const entry of seed.journalEntries) {
      await tx.journalEntry.create({ data: entry });
    }

    for (const event of seed.calendarEvents) {
      await tx.calendarEvent.create({ data: event });
    }

    for (const task of seed.tasks) {
      await tx.task.create({ data: task });
    }

    for (const item of seed.inboxItems) {
      await tx.inboxItem.create({ data: item });
    }
  });
}

async function bootstrapSqliteSchema(url: string) {
  const { DatabaseSync } = await import("node:sqlite");
  const sqlitePath = readSqlitePath(url);
  const database = new DatabaseSync(sqlitePath);

  try {
    database.exec(SQLITE_SCHEMA_SQL);
  } finally {
    database.close();
  }
}

function readSqlitePath(url: string) {
  if (!url.startsWith("file:")) {
    throw new Error(`Unsupported SQLite DATABASE_URL: ${url}`);
  }

  const value = url.slice("file:".length);

  if (value.startsWith("/")) {
    return value;
  }

  return join(process.cwd(), value);
}

function resolveNpxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

const SQLITE_SCHEMA_SQL = `
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'ko-KR',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "summary" TEXT NOT NULL,
  "nextStep" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT,
  "noteId" TEXT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TODO',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "dueLabel" TEXT NOT NULL,
  "dueDateKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "timeLabel" TEXT NOT NULL,
  "startAt" DATETIME NOT NULL,
  "endAt" DATETIME,
  "durationLabel" TEXT NOT NULL,
  "durationMinutes" INTEGER,
  "location" TEXT,
  "tone" TEXT NOT NULL DEFAULT 'neutral',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mood" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Note" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "updatedLabel" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NoteTag" (
  "noteId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  PRIMARY KEY ("noteId", "tagId")
);

CREATE TABLE IF NOT EXISTS "InboxItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Page" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "parentId" TEXT,
  "title" TEXT NOT NULL,
  "icon" TEXT,
  "cover" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Block" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "parentBlockId" TEXT,
  "type" TEXT NOT NULL,
  "contentJson" JSONB NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Database" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "sourcePageId" TEXT,
  "sourceBlockId" TEXT,
  "name" TEXT NOT NULL,
  "schemaJson" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DatabaseField" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "databaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "optionsJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DatabaseRow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "databaseId" TEXT NOT NULL,
  "pageId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "propertiesJson" JSONB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DatabaseView" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "databaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "filtersJson" JSONB,
  "sortsJson" JSONB,
  "layoutJson" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ExternalCalendarAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountLabel" TEXT NOT NULL,
  "credentialsReference" TEXT,
  "syncDirection" TEXT NOT NULL DEFAULT 'two-way',
  "conflictPolicy" TEXT NOT NULL DEFAULT 'approval-for-high-risk',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ExternalCalendarEventLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "calendarEventId" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "syncState" TEXT NOT NULL DEFAULT 'READ',
  "etag" TEXT,
  "version" TEXT,
  "conflictJson" JSONB,
  "undoJson" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiMemory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "confidence" REAL NOT NULL DEFAULT 0,
  "lastUsedAt" DATETIME,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "contextSummary" TEXT NOT NULL,
  "modelRoute" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "tokenEstimate" INTEGER,
  "costEstimate" REAL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiProposedAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "argsJson" JSONB NOT NULL,
  "diffJson" JSONB NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "undoJson" JSONB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiExecutionLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actionId" TEXT NOT NULL,
  "resultJson" JSONB NOT NULL,
  "undoJson" JSONB NOT NULL,
  "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AppPreference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "theme" TEXT NOT NULL DEFAULT 'system',
  "accent" TEXT NOT NULL DEFAULT 'teal',
  "density" TEXT NOT NULL DEFAULT 'comfortable',
  "editorWidth" TEXT NOT NULL DEFAULT 'standard',
  "rightPanelDefault" TEXT NOT NULL DEFAULT 'open',
  "startupPageId" TEXT,
  "restoreLastPage" BOOLEAN NOT NULL DEFAULT true,
  "aiApprovalPolicy" TEXT NOT NULL DEFAULT 'balanced',
  "dailyAiBudgetCents" INTEGER NOT NULL DEFAULT 300,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_workspaceId_dateKey_key" ON "JournalEntry"("workspaceId", "dateKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalCalendarEventLink_accountId_providerEventId_key" ON "ExternalCalendarEventLink"("accountId", "providerEventId");
`;
