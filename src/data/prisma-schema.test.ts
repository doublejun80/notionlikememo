import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Prisma schema", () => {
  const schemaPath = join(process.cwd(), "prisma", "schema.prisma");

  it("uses SQLite and defines the Nodiary document, database, AI, and calendar models", () => {
    expect(existsSync(schemaPath)).toBe(true);

    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain('provider = "sqlite"');
    expect(schema).toContain("model Workspace");
    expect(schema).toContain("model Project");
    expect(schema).toContain("model Task");
    expect(schema).toContain("model CalendarEvent");
    expect(schema).toContain("model JournalEntry");
    expect(schema).toContain("model Note");
    expect(schema).toContain("model Tag");
    expect(schema).toContain("model InboxItem");
    expect(schema).toContain("model Page");
    expect(schema).toContain("model Block");
    expect(schema).toContain("model Database");
    expect(schema).toContain("model DatabaseField");
    expect(schema).toContain("model DatabaseRow");
    expect(schema).toContain("model DatabaseView");
    expect(schema).toContain("model ExternalCalendarAccount");
    expect(schema).toContain("model ExternalCalendarEventLink");
    expect(schema).toContain("model AiMemory");
    expect(schema).toContain("model AiRun");
    expect(schema).toContain("model AiProposedAction");
    expect(schema).toContain("model AiExecutionLog");
    expect(schema).toContain("model AppPreference");
    expect(schema).toContain("enum BlockType");
    expect(schema).toContain("enum DatabaseViewType");
    expect(schema).toContain("enum AiApprovalStatus");
  });
});
