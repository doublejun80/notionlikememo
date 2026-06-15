import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Prisma schema", () => {
  const schemaPath = join(process.cwd(), "prisma", "schema.prisma");

  it("uses SQLite and defines the MyPlan MVP domain models", () => {
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
  });
});
