import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { myplanData } from "../src/data/myplan-data";
import { buildSeedRecords } from "./seed-data";

const databasePath = join(process.cwd(), "prisma", "dev.db");

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
const seed = buildSeedRecords(myplanData);

try {
  db.exec("PRAGMA foreign_keys = ON;");
  resetSchema();
  insertSeedData();
  console.log(
    `SQLite ready at ${databasePath}: ${seed.projects.length} projects, ${seed.tasks.length} tasks, ${seed.calendarEvents.length} events, ${seed.notes.length} notes`
  );
} finally {
  db.close();
}

function resetSchema() {
  db.exec(`
    DROP TABLE IF EXISTS "NoteTag";
    DROP TABLE IF EXISTS "InboxItem";
    DROP TABLE IF EXISTS "Task";
    DROP TABLE IF EXISTS "CalendarEvent";
    DROP TABLE IF EXISTS "JournalEntry";
    DROP TABLE IF EXISTS "Note";
    DROP TABLE IF EXISTS "Tag";
    DROP TABLE IF EXISTS "Project";
    DROP TABLE IF EXISTS "Workspace";

    CREATE TABLE "Workspace" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "subtitle" TEXT NOT NULL,
      "locale" TEXT NOT NULL DEFAULT 'ko-KR',
      "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Project" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PLANNED',
      "summary" TEXT NOT NULL,
      "nextStep" TEXT NOT NULL,
      "progress" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "Task" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "projectId" TEXT,
      "noteId" TEXT,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'TODO',
      "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
      "dueLabel" TEXT NOT NULL,
      "dueDateKey" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Task_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE "CalendarEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "projectId" TEXT,
      "title" TEXT NOT NULL,
      "dateKey" TEXT NOT NULL,
      "timeLabel" TEXT NOT NULL,
      "startAt" TEXT NOT NULL,
      "endAt" TEXT,
      "durationLabel" TEXT NOT NULL,
      "durationMinutes" INTEGER,
      "location" TEXT,
      "tone" TEXT NOT NULL DEFAULT 'neutral',
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CalendarEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE "JournalEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "dateKey" TEXT NOT NULL,
      "prompt" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "mood" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JournalEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "Note" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "projectId" TEXT,
      "title" TEXT NOT NULL,
      "excerpt" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "updatedLabel" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Note_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE "Tag" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "NoteTag" (
      "noteId" TEXT NOT NULL,
      "tagId" TEXT NOT NULL,
      PRIMARY KEY ("noteId", "tagId"),
      CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "InboxItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InboxItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX "Project_workspaceId_idx" ON "Project" ("workspaceId");
    CREATE INDEX "Project_status_idx" ON "Project" ("status");
    CREATE INDEX "Task_workspaceId_status_idx" ON "Task" ("workspaceId", "status");
    CREATE INDEX "Task_projectId_idx" ON "Task" ("projectId");
    CREATE INDEX "Task_noteId_idx" ON "Task" ("noteId");
    CREATE INDEX "Task_dueDateKey_idx" ON "Task" ("dueDateKey");
    CREATE INDEX "CalendarEvent_workspaceId_dateKey_idx" ON "CalendarEvent" ("workspaceId", "dateKey");
    CREATE INDEX "CalendarEvent_projectId_idx" ON "CalendarEvent" ("projectId");
    CREATE INDEX "CalendarEvent_startAt_idx" ON "CalendarEvent" ("startAt");
    CREATE UNIQUE INDEX "JournalEntry_workspaceId_dateKey_key" ON "JournalEntry" ("workspaceId", "dateKey");
    CREATE INDEX "JournalEntry_dateKey_idx" ON "JournalEntry" ("dateKey");
    CREATE INDEX "Note_workspaceId_idx" ON "Note" ("workspaceId");
    CREATE INDEX "Note_projectId_idx" ON "Note" ("projectId");
    CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag" ("workspaceId", "name");
    CREATE INDEX "Tag_workspaceId_idx" ON "Tag" ("workspaceId");
    CREATE INDEX "NoteTag_tagId_idx" ON "NoteTag" ("tagId");
    CREATE INDEX "InboxItem_workspaceId_status_idx" ON "InboxItem" ("workspaceId", "status");
  `);
}

function insertSeedData() {
  db.prepare(
    `INSERT INTO "Workspace" ("id", "title", "subtitle", "locale", "timezone") VALUES (?, ?, ?, ?, ?)`
  ).run(
    seed.workspace.id,
    seed.workspace.title,
    seed.workspace.subtitle,
    seed.workspace.locale,
    seed.workspace.timezone
  );

  const insertProject = db.prepare(
    `INSERT INTO "Project" ("id", "workspaceId", "name", "status", "summary", "nextStep", "progress") VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const project of seed.projects) {
    insertProject.run(
      project.id,
      project.workspaceId,
      project.name,
      project.status,
      project.summary,
      project.nextStep,
      project.progress
    );
  }

  const insertTag = db.prepare(
    `INSERT INTO "Tag" ("id", "workspaceId", "name") VALUES (?, ?, ?)`
  );
  for (const tag of seed.tags) {
    insertTag.run(tag.id, tag.workspaceId, tag.name);
  }

  const insertNote = db.prepare(
    `INSERT INTO "Note" ("id", "workspaceId", "projectId", "title", "excerpt", "content", "updatedLabel") VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const note of seed.notes) {
    insertNote.run(
      note.id,
      note.workspaceId,
      note.projectId ?? null,
      note.title,
      note.excerpt,
      note.content,
      note.updatedLabel
    );
  }

  const insertNoteTag = db.prepare(
    `INSERT INTO "NoteTag" ("noteId", "tagId") VALUES (?, ?)`
  );
  for (const noteTag of seed.noteTags) {
    insertNoteTag.run(noteTag.noteId, noteTag.tagId);
  }

  const insertJournal = db.prepare(
    `INSERT INTO "JournalEntry" ("id", "workspaceId", "dateKey", "prompt", "content", "mood") VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const entry of seed.journalEntries) {
    insertJournal.run(
      entry.id,
      entry.workspaceId,
      entry.dateKey,
      entry.prompt,
      entry.content,
      entry.mood
    );
  }

  const insertEvent = db.prepare(
    `INSERT INTO "CalendarEvent" ("id", "workspaceId", "projectId", "title", "dateKey", "timeLabel", "startAt", "endAt", "durationLabel", "durationMinutes", "location", "tone") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const event of seed.calendarEvents) {
    insertEvent.run(
      event.id,
      event.workspaceId,
      event.projectId ?? null,
      event.title,
      event.dateKey,
      event.timeLabel,
      event.startAt.toISOString(),
      event.endAt?.toISOString() ?? null,
      event.durationLabel,
      event.durationMinutes ?? null,
      event.location ?? null,
      event.tone
    );
  }

  const insertTask = db.prepare(
    `INSERT INTO "Task" ("id", "workspaceId", "projectId", "noteId", "title", "status", "priority", "dueLabel", "dueDateKey") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const task of seed.tasks) {
    insertTask.run(
      task.id,
      task.workspaceId,
      task.projectId ?? null,
      task.noteId ?? null,
      task.title,
      task.status,
      task.priority,
      task.dueLabel,
      task.dueDateKey ?? null
    );
  }

  const insertInboxItem = db.prepare(
    `INSERT INTO "InboxItem" ("id", "workspaceId", "content", "status") VALUES (?, ?, ?, ?)`
  );
  for (const item of seed.inboxItems) {
    insertInboxItem.run(
      item.id,
      item.workspaceId,
      item.content,
      item.status
    );
  }
}
