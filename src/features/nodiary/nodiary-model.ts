export type BlockType =
  | "paragraph"
  | "heading"
  | "todo"
  | "callout"
  | "divider"
  | "database"
  | "ai";

export type SlashInsertType =
  | "paragraph"
  | "heading"
  | "todo"
  | "callout"
  | "database"
  | "ai";

export type DatabaseViewType = "table" | "board" | "calendar";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "undone";

export type RiskLevel = "low" | "medium" | "high";

export type NodiaryBlock = {
  id: string;
  type: BlockType;
  title?: string;
  text?: string;
  checked?: boolean;
  database?: DatabaseBlock;
};

export type DatabaseRow = {
  id: string;
  title: string;
  status: "backlog" | "doing" | "review" | "done";
  owner: string;
  date: string;
};

export type DatabaseBlock = {
  id: string;
  name: string;
  activeView: DatabaseViewType;
  fields: Array<{
    id: string;
    name: string;
    type: "text" | "status" | "date" | "person";
  }>;
  rows: DatabaseRow[];
};

export type PageNode = {
  id: string;
  title: string;
  expanded: boolean;
  children?: PageNode[];
};

export type CalendarDay = {
  id: string;
  label: string;
  isoDate: string;
  isToday: boolean;
  isSelected: boolean;
  hasEvent: boolean;
};

export type CalendarEvent = {
  id: string;
  time: string;
  title: string;
  source: "nodiary" | "google" | "apple";
};

export type SidebarCalendar = {
  monthLabel: string;
  selectedDate: string;
  days: CalendarDay[];
  schedule: CalendarEvent[];
};

export type AiProposedAction = {
  id: string;
  toolName: string;
  summary: string;
  diff: string;
  riskLevel: RiskLevel;
  approvalStatus: ApprovalStatus;
  undoPayload: {
    removeBlockIds?: string[];
    restoreBlocks?: NodiaryBlock[];
  };
  applyPayload: {
    insertAfterBlockId?: string;
    blocks?: NodiaryBlock[];
  };
};

export type AiRun = {
  id: string;
  command: string;
  status: "awaiting_approval" | "completed";
  modelRoute: "quick" | "planner" | "large-context";
  actions: AiProposedAction[];
};

export type AiState = {
  panelInput: string;
  runs: AiRun[];
  undoLog: AiProposedAction[];
  memories: Array<{
    id: string;
    content: string;
    source: string;
    confidence: number;
  }>;
};

export type AppPreference = {
  theme: "system" | "light" | "dark";
  accent: "teal" | "slate" | "blue";
  density: "comfortable" | "compact";
  documentWidth: "standard" | "wide";
  rightAiPanel: "open" | "closed";
  startupPage: "today" | "last";
  approvalStrictness: "balanced" | "strict";
};

export type NodiaryState = {
  workspace: {
    name: string;
    subtitle: string;
  };
  pageTree: PageNode[];
  activePage: {
    id: string;
    title: string;
    properties: Array<{
      label: string;
      value: string;
    }>;
    blocks: NodiaryBlock[];
  };
  sidebarCalendar: SidebarCalendar;
  ai: AiState;
  preferences: AppPreference;
};

const projectDatabase: DatabaseBlock = {
  id: "project-db",
  name: "고쳐야 할 50개 리스트",
  activeView: "table",
  fields: [
    { id: "title", name: "작업", type: "text" },
    { id: "status", name: "상태", type: "status" },
    { id: "owner", name: "담당", type: "person" },
    { id: "date", name: "날짜", type: "date" }
  ],
  rows: [
    {
      id: "row-1",
      title: "문서-first 첫 화면 구현",
      status: "doing",
      owner: "나",
      date: "2026-06-15"
    },
    {
      id: "row-2",
      title: "AI 승인 큐와 undo log 연결",
      status: "review",
      owner: "AI",
      date: "2026-06-15"
    },
    {
      id: "row-3",
      title: "캘린더 충돌 처리 정책 정리",
      status: "backlog",
      owner: "나",
      date: "2026-06-17"
    },
    {
      id: "row-4",
      title: "패키징/CI 체크리스트",
      status: "done",
      owner: "시스템",
      date: "2026-06-20"
    }
  ]
};

export function defaultNodiaryState(): NodiaryState {
  return {
    workspace: {
      name: "Nodiary",
      subtitle: "문서와 계획을 함께 쓰는 개인 작업공간"
    },
    pageTree: [
      {
        id: "today",
        title: "오늘의 계획",
        expanded: true,
        children: [
          { id: "morning-check", title: "아침 점검", expanded: false },
          { id: "memo-ideas", title: "메모와 아이디어", expanded: false }
        ]
      },
      {
        id: "planning",
        title: "기획 노트",
        expanded: true,
        children: [
          { id: "notion-standard", title: "NOTION-LIKE 기준", expanded: false },
          { id: "fix-list", title: "고쳐야 할 50개", expanded: false }
        ]
      },
      { id: "meetings", title: "회의록", expanded: false },
      { id: "personal-log", title: "개인 기록", expanded: false },
      { id: "archive", title: "아카이브", expanded: false }
    ],
    activePage: {
      id: "today",
      title: "오늘의 계획",
      properties: [
        { label: "상태", value: "진행중" },
        { label: "날짜", value: "2026년 6월 15일 월요일" },
        { label: "캘린더", value: "왼쪽 미니 캘린더와 연결" }
      ],
      blocks: [
        {
          id: "today-todos",
          type: "heading",
          title: "오늘 해야 할 것"
        },
        {
          id: "todo-ui",
          type: "todo",
          text: "Notion처럼 보이는 기본 편집 화면부터 제대로 만든다.",
          checked: false
        },
        {
          id: "todo-project",
          type: "todo",
          text: "프로젝트 DB는 첫 화면에서 빼고, 필요할 때 slash 메뉴로만 추가한다.",
          checked: false
        },
        {
          id: "todo-openai",
          type: "todo",
          text: "OpenAI 키는 .env.local에 저장했고 화면에 노출하지 않는다.",
          checked: true
        },
        {
          id: "owner-note",
          type: "callout",
          text: "이 화면의 주인공은 문서다. AI와 DB는 옆에서 도와야지, 첫 화면을 잡아먹으면 안 된다."
        },
        {
          id: "memo",
          type: "heading",
          title: "메모"
        },
        {
          id: "memo-body",
          type: "paragraph",
          text: "Notion-like의 첫인상은 사이드바, 큰 페이지 제목, 빈 여백, 블록 핸들, slash 메뉴에서 온다."
        }
      ]
    },
    sidebarCalendar: buildJuneCalendar("2026-06-15"),
    ai: {
      panelInput: "",
      runs: [],
      undoLog: [],
      memories: [
        {
          id: "memory-1",
          content: "사용자는 첫 화면이 프로젝트 대시보드가 아니라 문서 편집 화면이어야 한다고 강조했다.",
          source: "handoff",
          confidence: 0.96
        },
        {
          id: "memory-2",
          content: "AI 변경은 diff, 항목별 승인, undo log를 거쳐야 한다.",
          source: "spec",
          confidence: 0.94
        }
      ]
    },
    preferences: {
      theme: "system",
      accent: "teal",
      density: "comfortable",
      documentWidth: "standard",
      rightAiPanel: "open",
      startupPage: "today",
      approvalStrictness: "balanced"
    }
  };
}

export function insertBlockFromSlash(
  state: NodiaryState,
  afterBlockId: string,
  insertType: SlashInsertType
): NodiaryState {
  const block = createBlockFromSlash(insertType);
  const afterIndex = state.activePage.blocks.findIndex(
    (candidate) => candidate.id === afterBlockId
  );
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : state.activePage.blocks.length;

  return {
    ...state,
    activePage: {
      ...state.activePage,
      blocks: [
        ...state.activePage.blocks.slice(0, insertIndex),
        block,
        ...state.activePage.blocks.slice(insertIndex)
      ]
    }
  };
}

export function switchDatabaseView(
  state: NodiaryState,
  databaseBlockId: string,
  view: DatabaseViewType
): NodiaryState {
  return {
    ...state,
    activePage: {
      ...state.activePage,
      blocks: state.activePage.blocks.map((block) => {
        if (block.id !== databaseBlockId || !block.database) {
          return block;
        }

        return {
          ...block,
          database: {
            ...block.database,
            activeView: view
          }
        };
      })
    }
  };
}

export function selectCalendarDate(
  state: NodiaryState,
  isoDate: string
): NodiaryState {
  return {
    ...state,
    sidebarCalendar: {
      ...state.sidebarCalendar,
      selectedDate: isoDate,
      days: state.sidebarCalendar.days.map((day) => ({
        ...day,
        isSelected: day.isoDate === isoDate
      })),
      schedule: getScheduleForDate(isoDate)
    }
  };
}

export function createAiRun(state: NodiaryState, command: string): NodiaryState {
  const insertedBlocks: NodiaryBlock[] = [
    {
      id: "ai-plan",
      type: "callout",
      text: "AI가 제안한 실행 계획: 문서 정렬, 오늘 할 일 추출, 일정 충돌 확인을 순서대로 진행합니다."
    },
    {
      id: "ai-task",
      type: "todo",
      text: "AI 제안 변경을 항목별로 승인하고 undo log를 확인한다.",
      checked: false
    }
  ];
  const action: AiProposedAction = {
    id: `action-${state.ai.runs.length + 1}`,
    toolName: "updateBlock",
    summary: "현재 페이지에 실행 계획 callout과 확인 작업을 추가합니다.",
    diff: "+ AI 실행 계획 callout\n+ AI 제안 승인 확인 todo",
    riskLevel: command.includes("삭제") || command.includes("캘린더") ? "high" : "medium",
    approvalStatus: "pending",
    applyPayload: {
      insertAfterBlockId: "owner-note",
      blocks: insertedBlocks
    },
    undoPayload: {
      removeBlockIds: insertedBlocks.map((block) => block.id)
    }
  };
  const run: AiRun = {
    id: `run-${state.ai.runs.length + 1}`,
    command,
    status: "awaiting_approval",
    modelRoute: command.length > 120 ? "large-context" : "planner",
    actions: [action]
  };

  return {
    ...state,
    ai: {
      ...state.ai,
      panelInput: "",
      runs: [run, ...state.ai.runs]
    }
  };
}

export function approveAiAction(
  state: NodiaryState,
  actionId: string
): NodiaryState {
  const action = findAiAction(state, actionId);

  if (!action || action.approvalStatus !== "pending") {
    return state;
  }

  const insertAfterBlockId = action.applyPayload.insertAfterBlockId;
  const insertBlocks = action.applyPayload.blocks ?? [];
  const afterIndex = state.activePage.blocks.findIndex(
    (block) => block.id === insertAfterBlockId
  );
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : state.activePage.blocks.length;

  return {
    ...state,
    activePage: {
      ...state.activePage,
      blocks: [
        ...state.activePage.blocks.slice(0, insertIndex),
        ...insertBlocks,
        ...state.activePage.blocks.slice(insertIndex)
      ]
    },
    ai: {
      ...state.ai,
      runs: updateAiAction(state.ai.runs, actionId, {
        approvalStatus: "approved"
      }),
      undoLog: [{ ...action, approvalStatus: "approved" }, ...state.ai.undoLog]
    }
  };
}

export function rejectAiAction(
  state: NodiaryState,
  actionId: string
): NodiaryState {
  return {
    ...state,
    ai: {
      ...state.ai,
      runs: updateAiAction(state.ai.runs, actionId, {
        approvalStatus: "rejected"
      })
    }
  };
}

export function undoLastAiAction(state: NodiaryState): NodiaryState {
  const [lastAction, ...remainingUndoLog] = state.ai.undoLog;

  if (!lastAction) {
    return state;
  }

  const removeIds = new Set(lastAction.undoPayload.removeBlockIds ?? []);

  return {
    ...state,
    activePage: {
      ...state.activePage,
      blocks: state.activePage.blocks.filter((block) => !removeIds.has(block.id))
    },
    ai: {
      ...state.ai,
      runs: updateAiAction(state.ai.runs, lastAction.id, {
        approvalStatus: "undone"
      }),
      undoLog: remainingUndoLog
    }
  };
}

export function updatePreference(
  state: NodiaryState,
  patch: Partial<AppPreference>
): NodiaryState {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      ...patch
    }
  };
}

function createBlockFromSlash(insertType: SlashInsertType): NodiaryBlock {
  switch (insertType) {
    case "heading":
      return {
        id: `heading-${Date.now()}`,
        type: "heading",
        title: "제목 2"
      };
    case "todo":
      return {
        id: `todo-${Date.now()}`,
        type: "todo",
        text: "할 일 목록",
        checked: false
      };
    case "callout":
      return {
        id: `callout-${Date.now()}`,
        type: "callout",
        text: "중요한 메모를 여기에 남깁니다."
      };
    case "database":
      return {
        id: "project-db",
        type: "database",
        title: projectDatabase.name,
        database: { ...projectDatabase, rows: [...projectDatabase.rows] }
      };
    case "ai":
      return {
        id: `ai-${Date.now()}`,
        type: "ai",
        text: "이 블록을 AI에게 편집 요청"
      };
    case "paragraph":
    default:
      return {
        id: `paragraph-${Date.now()}`,
        type: "paragraph",
        text: ""
      };
  }
}

function buildJuneCalendar(selectedDate: string): SidebarCalendar {
  const eventDates = new Set(["2026-06-05", "2026-06-10", "2026-06-12", "2026-06-15", "2026-06-18", "2026-06-23", "2026-06-26"]);
  const days: CalendarDay[] = [];

  for (let day = 1; day <= 30; day += 1) {
    const isoDate = `2026-06-${String(day).padStart(2, "0")}`;
    days.push({
      id: isoDate,
      label: String(day),
      isoDate,
      isToday: isoDate === "2026-06-15",
      isSelected: isoDate === selectedDate,
      hasEvent: eventDates.has(isoDate)
    });
  }

  for (let day = 1; day <= 5; day += 1) {
    const isoDate = `2026-07-${String(day).padStart(2, "0")}`;
    days.push({
      id: isoDate,
      label: String(day),
      isoDate,
      isToday: false,
      isSelected: false,
      hasEvent: false
    });
  }

  return {
    monthLabel: "2026년 6월",
    selectedDate,
    days,
    schedule: getScheduleForDate(selectedDate)
  };
}

function getScheduleForDate(isoDate: string): CalendarEvent[] {
  const schedules: Record<string, CalendarEvent[]> = {
    "2026-06-15": [
      {
        id: "schedule-1",
        time: "10:00",
        title: "제품 기획서 정리",
        source: "nodiary"
      },
      {
        id: "schedule-2",
        time: "15:00",
        title: "디자인 리뷰",
        source: "google"
      }
    ],
    "2026-06-18": [
      {
        id: "schedule-3",
        time: "11:00",
        title: "AI operator 점검",
        source: "nodiary"
      },
      {
        id: "schedule-4",
        time: "16:00",
        title: "캘린더 충돌 리뷰",
        source: "apple"
      }
    ]
  };

  return (
    schedules[isoDate] ?? [
      {
        id: `schedule-empty-${isoDate}`,
        time: "종일",
        title: "연결된 일정 없음",
        source: "nodiary"
      }
    ]
  );
}

function findAiAction(
  state: NodiaryState,
  actionId: string
): AiProposedAction | undefined {
  return state.ai.runs
    .flatMap((run) => run.actions)
    .find((action) => action.id === actionId);
}

function updateAiAction(
  runs: AiRun[],
  actionId: string,
  patch: Partial<AiProposedAction>
): AiRun[] {
  return runs.map((run) => ({
    ...run,
    actions: run.actions.map((action) =>
      action.id === actionId ? { ...action, ...patch } : action
    )
  }));
}
