import type {
  EventItem,
  JournalEntry,
  NoteItem,
  ProjectItem,
  TaskItem
} from "../src/data/myplan-data";

const WORKSPACE_ID = "workspace-default";
const TODAY_DATE_KEY = "2026-06-15";
const KST_OFFSET = "+09:00";

type MyPlanSeedSource = {
  events: EventItem[];
  inbox: string[];
  journal: JournalEntry;
  notes: NoteItem[];
  projects: ProjectItem[];
  tasks: TaskItem[];
};

export type SeedRecords = ReturnType<typeof buildSeedRecords>;

export function buildSeedRecords(data: MyPlanSeedSource) {
  const tags = Array.from(
    new Set(data.notes.flatMap((note) => note.tags))
  ).map((tag) => ({
    id: toTagId(tag),
    workspaceId: WORKSPACE_ID,
    name: tag
  }));

  return {
    workspace: {
      id: WORKSPACE_ID,
      title: "MyPlan",
      subtitle: "개인 작업공간",
      locale: "ko-KR",
      timezone: "Asia/Seoul"
    },
    projects: data.projects.map((project) => ({
      id: project.id,
      workspaceId: WORKSPACE_ID,
      name: project.name,
      status: mapProjectStatus(project.status),
      summary: project.summary,
      nextStep: project.nextStep,
      progress: project.progress
    })),
    tasks: data.tasks.map((task) => ({
      id: task.id,
      workspaceId: WORKSPACE_ID,
      projectId: task.projectId,
      noteId: task.noteId,
      title: task.title,
      status: mapTaskStatus(task.status),
      priority: mapTaskPriority(task.priority),
      dueLabel: task.due,
      dueDateKey: task.due === "오늘" ? TODAY_DATE_KEY : undefined
    })),
    calendarEvents: data.events.map((event) => {
      const durationMinutes = parseDurationMinutes(event.duration);
      const startAt = toKstDate(TODAY_DATE_KEY, event.time);

      return {
        id: event.id,
        workspaceId: WORKSPACE_ID,
        projectId: event.projectId,
        title: event.title,
        dateKey: TODAY_DATE_KEY,
        timeLabel: event.time,
        startAt,
        endAt: durationMinutes
          ? new Date(startAt.getTime() + durationMinutes * 60_000)
          : undefined,
        durationLabel: event.duration,
        durationMinutes,
        location: event.location,
        tone: event.tone
      };
    }),
    journalEntries: [
      {
        id: `journal-${data.journal.date}`,
        workspaceId: WORKSPACE_ID,
        dateKey: data.journal.date,
        prompt: data.journal.prompt,
        content: data.journal.draft,
        mood: data.journal.mood
      }
    ],
    notes: data.notes.map((note) => ({
      id: note.id,
      workspaceId: WORKSPACE_ID,
      projectId: note.projectId,
      title: note.title,
      excerpt: note.excerpt,
      content: note.excerpt,
      updatedLabel: note.updatedAt
    })),
    tags,
    noteTags: data.notes.flatMap((note) =>
      note.tags.map((tag) => ({
        noteId: note.id,
        tagId: toTagId(tag)
      }))
    ),
    inboxItems: data.inbox.map((content, index) => ({
      id: `inbox-${index + 1}`,
      workspaceId: WORKSPACE_ID,
      content,
      status: "OPEN" as const
    }))
  };
}

function mapProjectStatus(status: ProjectItem["status"]) {
  const map = {
    계획: "PLANNED",
    진행: "ACTIVE",
    정리: "REVIEW"
  } as const;

  return map[status];
}

function mapTaskStatus(status: TaskItem["status"]) {
  const map = {
    todo: "TODO",
    doing: "DOING",
    done: "DONE"
  } as const;

  return map[status];
}

function mapTaskPriority(priority: TaskItem["priority"]) {
  const map = {
    낮음: "LOW",
    보통: "MEDIUM",
    높음: "HIGH"
  } as const;

  return map[priority];
}

function parseDurationMinutes(duration: string) {
  const match = /^(\d+)분$/.exec(duration);

  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

function toKstDate(dateKey: string, timeLabel: string) {
  return new Date(`${dateKey}T${timeLabel}:00${KST_OFFSET}`);
}

function toTagId(tag: string) {
  return `tag-${tag.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
}
