import { describe, expect, it } from "vitest";

import { buildSeedRecords } from "../../prisma/seed-data";
import { myplanData } from "./myplan-data";

describe("buildSeedRecords", () => {
  it("maps the current mock data into database seed records", () => {
    const seed = buildSeedRecords(myplanData);

    expect(seed.workspace.title).toBe("Nodiary");
    expect(seed.projects).toHaveLength(myplanData.projects.length);
    expect(seed.tasks).toHaveLength(myplanData.tasks.length);
    expect(seed.calendarEvents).toHaveLength(myplanData.events.length);
    expect(seed.notes).toHaveLength(myplanData.notes.length);
    expect(seed.journalEntries).toHaveLength(1);
    expect(seed.inboxItems).toHaveLength(myplanData.inbox.length);
  });

  it("keeps task, note, and event project references resolvable", () => {
    const seed = buildSeedRecords(myplanData);
    const projectIds = new Set(seed.projects.map((project) => project.id));

    for (const task of seed.tasks) {
      if (task.projectId) {
        expect(projectIds.has(task.projectId)).toBe(true);
      }
    }

    for (const note of seed.notes) {
      if (note.projectId) {
        expect(projectIds.has(note.projectId)).toBe(true);
      }
    }

    for (const event of seed.calendarEvents) {
      if (event.projectId) {
        expect(projectIds.has(event.projectId)).toBe(true);
      }
    }
  });
});
