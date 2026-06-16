import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { myplanData } from "../src/data/myplan-data";
import { buildSeedRecords } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  const seed = buildSeedRecords(myplanData);

  await prisma.aiExecutionLog.deleteMany();
  await prisma.aiProposedAction.deleteMany();
  await prisma.aiRun.deleteMany();
  await prisma.aiMemory.deleteMany();
  await prisma.databaseView.deleteMany();
  await prisma.databaseRow.deleteMany();
  await prisma.databaseField.deleteMany();
  await prisma.database.deleteMany();
  await prisma.block.deleteMany();
  await prisma.page.deleteMany();
  await prisma.appPreference.deleteMany();
  await prisma.externalCalendarEventLink.deleteMany();
  await prisma.externalCalendarAccount.deleteMany();
  await prisma.noteTag.deleteMany();
  await prisma.inboxItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.note.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspace.deleteMany();

  await prisma.workspace.create({ data: seed.workspace });

  for (const project of seed.projects) {
    await prisma.project.create({ data: project });
  }

  for (const tag of seed.tags) {
    await prisma.tag.create({ data: tag });
  }

  for (const note of seed.notes) {
    await prisma.note.create({ data: note });
  }

  for (const noteTag of seed.noteTags) {
    await prisma.noteTag.create({ data: noteTag });
  }

  for (const entry of seed.journalEntries) {
    await prisma.journalEntry.create({ data: entry });
  }

  for (const event of seed.calendarEvents) {
    await prisma.calendarEvent.create({ data: event });
  }

  for (const task of seed.tasks) {
    await prisma.task.create({ data: task });
  }

  for (const item of seed.inboxItems) {
    await prisma.inboxItem.create({ data: item });
  }

  console.log(
    `Seeded Nodiary SQLite data: ${seed.projects.length} projects, ${seed.tasks.length} tasks, ${seed.calendarEvents.length} events, ${seed.notes.length} notes`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
