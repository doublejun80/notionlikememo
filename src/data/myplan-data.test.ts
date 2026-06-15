import { myplanData } from "./myplan-data";

describe("myplanData", () => {
  it("connects today's tasks, notes, projects, journal, and events", () => {
    expect(myplanData.today.dateLabel).toContain("2026");
    expect(myplanData.events.length).toBeGreaterThanOrEqual(3);
    expect(myplanData.tasks.length).toBeGreaterThanOrEqual(5);
    expect(myplanData.notes.length).toBeGreaterThanOrEqual(4);
    expect(myplanData.projects.length).toBeGreaterThanOrEqual(3);

    const taskProjectIds = new Set(
      myplanData.tasks
        .map((task) => task.projectId)
        .filter((projectId): projectId is string => Boolean(projectId))
    );
    const projectIds = new Set(myplanData.projects.map((project) => project.id));

    for (const projectId of taskProjectIds) {
      expect(projectIds.has(projectId)).toBe(true);
    }

    expect(myplanData.journal.prompt).toContain("오늘");
  });
});

