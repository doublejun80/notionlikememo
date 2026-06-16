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

export type NodiaryPage = {
  id: string;
  title: string;
  properties: Array<{
    label: string;
    value: string;
  }>;
  blocks: NodiaryBlock[];
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
  date?: string;
  conflictRisk?: RiskLevel;
};

export type SidebarCalendar = {
  monthLabel: string;
  selectedDate: string;
  days: CalendarDay[];
  schedule: CalendarEvent[];
  movedEvents: Record<string, CalendarEvent>;
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
    restoreActivePageBlocks?: NodiaryBlock[];
    restoreSidebarCalendar?: SidebarCalendar;
  };
  applyPayload: {
    insertAfterBlockId?: string;
    blocks?: NodiaryBlock[];
    operation?: {
      toolName: string;
      argsJson: Record<string, unknown>;
    };
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
  pages: Record<string, NodiaryPage>;
  activePage: NodiaryPage;
  sidebarCalendar: SidebarCalendar;
  ai: AiState;
  preferences: AppPreference;
};

export type OperatorPlanDraft = {
  summary: string;
  actions: Array<{
    toolName: string;
    argsJson?: Record<string, unknown>;
    diffJson?: unknown;
    riskLevel?: RiskLevel;
    undoJson?: Record<string, unknown>;
  }>;
  memories?: string[];
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
  const activePage = createTodayPage();

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
    pages: {
      [activePage.id]: activePage
    },
    activePage,
    sidebarCalendar: buildJuneCalendar("2026-06-16"),
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

function createTodayPage(): NodiaryPage {
  return {
    id: "today",
    title: "오늘의 계획",
    properties: [
      { label: "상태", value: "진행중" },
      { label: "날짜", value: "2026년 6월 16일 화요일" },
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
  };
}

export function insertBlockFromSlash(
  state: NodiaryState,
  afterBlockId: string,
  insertType: SlashInsertType
): NodiaryState {
  const block = createBlockFromSlash(insertType, state);
  const afterIndex = state.activePage.blocks.findIndex(
    (candidate) => candidate.id === afterBlockId
  );
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : state.activePage.blocks.length;

  return withActivePage(state, {
    ...state.activePage,
    blocks: [
      ...state.activePage.blocks.slice(0, insertIndex),
      block,
      ...state.activePage.blocks.slice(insertIndex)
    ]
  });
}

export function insertParagraphBlock(
  state: NodiaryState,
  afterBlockId: string,
  text: string
): NodiaryState {
  const existingIds = new Set(state.activePage.blocks.map((block) => block.id));
  const block: NodiaryBlock = {
    id: createUniqueId(existingIds, "paragraph"),
    type: "paragraph",
    text
  };
  const afterIndex = state.activePage.blocks.findIndex(
    (candidate) => candidate.id === afterBlockId
  );
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : state.activePage.blocks.length;

  return withActivePage(state, {
    ...state.activePage,
    blocks: [
      ...state.activePage.blocks.slice(0, insertIndex),
      block,
      ...state.activePage.blocks.slice(insertIndex)
    ]
  });
}

export function updateBlockText(
  state: NodiaryState,
  blockId: string,
  text: string
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) =>
      block.id === blockId ? { ...block, text } : block
    )
  });
}

export function updateTodoBlock(
  state: NodiaryState,
  blockId: string,
  patch: {
    checked?: boolean;
    text?: string;
  }
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            checked: patch.checked ?? block.checked,
            text: patch.text ?? block.text
          }
        : block
    )
  });
}

export function updateBlockTitle(
  state: NodiaryState,
  blockId: string,
  title: string
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) =>
      block.id === blockId ? { ...block, title } : block
    )
  });
}

export function createNewPage(state: NodiaryState): NodiaryState {
  const existingIds = new Set(flattenPageNodes(state.pageTree).map((node) => node.id));
  const pageId = createUniqueId(existingIds, "new-page");
  const page: NodiaryPage = {
    id: pageId,
    title: "새 페이지",
    properties: [
      { label: "상태", value: "문서" },
      { label: "날짜", value: "2026년 6월 16일 화요일" },
      { label: "캘린더", value: "왼쪽 미니 캘린더와 연결" }
    ],
    blocks: createPageTemplate("새 페이지")
  };
  const node: PageNode = {
    id: pageId,
    title: page.title,
    expanded: false
  };

  return {
    ...state,
    pageTree: [...state.pageTree, node],
    pages: {
      ...getStatePages(state),
      [state.activePage.id]: state.activePage,
      [page.id]: page
    },
    activePage: page
  };
}

export function switchDatabaseView(
  state: NodiaryState,
  databaseBlockId: string,
  view: DatabaseViewType
): NodiaryState {
  return withActivePage(state, {
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
  });
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
      days: buildCalendarDaysWithMoves(state.sidebarCalendar, isoDate),
      schedule: getScheduleForCalendar(state.sidebarCalendar, isoDate)
    }
  };
}

export function selectPage(
  state: NodiaryState,
  pageId: string
): NodiaryState {
  if (pageId === state.activePage.id) {
    return state;
  }

  const pageNode = findPageNode(state.pageTree, pageId);

  if (!pageNode) {
    return state;
  }

  const pages = {
    ...getStatePages(state),
    [state.activePage.id]: state.activePage
  };
  const targetPage = pages[pageId] ?? createPageFromNode(pageNode);

  return {
    ...state,
    pages: {
      ...pages,
      [targetPage.id]: targetPage
    },
    activePage: targetPage
  };
}

export function updatePageTitle(
  state: NodiaryState,
  title: string
): NodiaryState {
  const nextTitle = title.trim() || state.activePage.title;

  return withActivePage(
    {
      ...state,
      pageTree: updatePageNodeTitle(state.pageTree, state.activePage.id, nextTitle)
    },
    {
      ...state.activePage,
      title: nextTitle
    }
  );
}

export function togglePageNodeExpanded(
  state: NodiaryState,
  nodeId: string
): NodiaryState {
  return {
    ...state,
    pageTree: togglePageTreeNode(state.pageTree, nodeId)
  };
}

export function moveBlock(
  state: NodiaryState,
  blockId: string,
  beforeBlockId: string
): NodiaryState {
  if (blockId === beforeBlockId) {
    return state;
  }

  const movingBlock = state.activePage.blocks.find((block) => block.id === blockId);

  if (!movingBlock) {
    return state;
  }

  const remainingBlocks = state.activePage.blocks.filter(
    (block) => block.id !== blockId
  );
  const beforeIndex = remainingBlocks.findIndex(
    (block) => block.id === beforeBlockId
  );
  const insertIndex = beforeIndex >= 0 ? beforeIndex : remainingBlocks.length;

  return withActivePage(state, {
    ...state.activePage,
    blocks: [
      ...remainingBlocks.slice(0, insertIndex),
      movingBlock,
      ...remainingBlocks.slice(insertIndex)
    ]
  });
}

export function movePageNode(
  state: NodiaryState,
  nodeId: string,
  parentNodeId: string,
  index: number
): NodiaryState {
  if (nodeId === parentNodeId || isDescendantPageNode(state.pageTree, nodeId, parentNodeId)) {
    return state;
  }

  const { nodes: treeWithoutNode, removed } = removePageNode(state.pageTree, nodeId);

  if (!removed) {
    return state;
  }

  const insertedTree = insertPageNode(treeWithoutNode, parentNodeId, removed, index);

  if (!insertedTree.inserted) {
    return state;
  }

  return {
    ...state,
    pageTree: insertedTree.nodes
  };
}

export function moveDatabaseRow(
  state: NodiaryState,
  databaseBlockId: string,
  rowId: string,
  patch: Partial<Pick<DatabaseRow, "status" | "date" | "owner" | "title">> & {
    index?: number;
  }
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) => {
        if (block.id !== databaseBlockId || !block.database) {
          return block;
        }

        const row = block.database.rows.find((candidate) => candidate.id === rowId);

        if (!row) {
          return block;
        }

        const updatedRow: DatabaseRow = {
          ...row,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
          ...(patch.date !== undefined ? { date: patch.date } : {})
        };
        const remainingRows = block.database.rows.filter(
          (candidate) => candidate.id !== rowId
        );
        const rows = insertDatabaseRowAtStatusIndex(
          remainingRows,
          updatedRow,
          patch.index
        );

        return {
          ...block,
          database: {
            ...block.database,
            rows
          }
        };
    })
  });
}

export function addDatabaseRow(
  state: NodiaryState,
  databaseBlockId: string,
  row: Partial<DatabaseRow> = {}
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) => {
      if (block.id !== databaseBlockId || !block.database) {
        return block;
      }

      const nextRow: DatabaseRow = {
        id: createDatabaseRowId(block.database.rows),
        title: row.title?.trim() || "새 작업",
        status: row.status ?? "backlog",
        owner: row.owner?.trim() || "나",
        date: row.date ?? "2026-06-16"
      };

      return {
        ...block,
        database: {
          ...block.database,
          rows: [...block.database.rows, nextRow]
        }
      };
    })
  });
}

export function requestCalendarEventMove(
  state: NodiaryState,
  eventId: string,
  patch: {
    date: string;
    time?: string;
  }
): NodiaryState {
  const event = findCalendarEvent(state, eventId);

  if (!event) {
    return state;
  }

  const targetSchedule = getScheduleForCalendar(state.sidebarCalendar, patch.date)
    .filter((candidate) => candidate.id !== eventId);
  const riskLevel = getCalendarMoveRisk(event, targetSchedule);

  if (riskLevel !== "high") {
    return moveCalendarEvent(state, eventId, patch);
  }

  const runIndex = state.ai.runs.length + 1;
  const action: AiProposedAction = {
    id: `calendar-action-${runIndex}`,
    toolName: "updateCalendarEvent",
    summary: `${event.title} 일정을 ${patch.date} ${patch.time ?? event.time}로 이동합니다.`,
    diff: JSON.stringify(
      {
        before: {
          date: event.date ?? "2026-06-16",
          time: event.time,
          source: event.source
        },
        after: {
          date: patch.date,
          time: patch.time ?? event.time,
          conflictRisk: riskLevel
        }
      },
      null,
      2
    ),
    riskLevel,
    approvalStatus: "pending",
    applyPayload: {
      operation: {
        toolName: "updateCalendarEvent",
        argsJson: {
          eventId,
          date: patch.date,
          time: patch.time
        }
      }
    },
    undoPayload: {}
  };
  const run: AiRun = {
    id: `calendar-run-${runIndex}`,
    command: `${event.title} 일정 이동`,
    status: "awaiting_approval",
    modelRoute: "planner",
    actions: [action]
  };

  return {
    ...state,
    ai: {
      ...state.ai,
      runs: [run, ...state.ai.runs]
    }
  };
}

export function moveCalendarEvent(
  state: NodiaryState,
  eventId: string,
  patch: {
    date: string;
    time?: string;
  }
): NodiaryState {
  const event = findCalendarEvent(state, eventId);

  if (!event) {
    return state;
  }

  const movedEvents = state.sidebarCalendar.movedEvents ?? {};
  const targetSchedule = getScheduleForCalendar(
    {
      ...state.sidebarCalendar,
      movedEvents: {
        ...movedEvents,
        [eventId]: {
          ...event,
          date: patch.date
        }
      }
    },
    patch.date
  ).filter((candidate) => candidate.id !== eventId);
  const conflictRisk = getCalendarMoveRisk(event, targetSchedule);
  const movedEvent: CalendarEvent = {
    ...event,
    date: patch.date,
    time: patch.time ?? event.time,
    conflictRisk
  };

  return {
    ...state,
    sidebarCalendar: {
      ...state.sidebarCalendar,
      movedEvents: {
        ...movedEvents,
        [eventId]: movedEvent
      },
      selectedDate: patch.date,
      days: buildCalendarDaysWithMoves(
        {
          ...state.sidebarCalendar,
          movedEvents: {
            ...movedEvents,
            [eventId]: movedEvent
          }
        },
        patch.date
      ),
      schedule: getScheduleForCalendar(
        {
          ...state.sidebarCalendar,
          movedEvents: {
            ...movedEvents,
            [eventId]: movedEvent
          }
        },
        patch.date
      )
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

export function createAiRunFromOperatorPlan(
  state: NodiaryState,
  command: string,
  plan: OperatorPlanDraft
): NodiaryState {
  const runNumber = state.ai.runs.length + 1;
  const actions: AiProposedAction[] = plan.actions.map((action, index) => {
    const summary = `${plan.summary} (${action.toolName})`;
    const diff = formatOperatorDiff(action.diffJson);
    const actionId = `operator-action-${runNumber}-${index + 1}`;
    const fallbackBlockId = `operator-result-${runNumber}-${index + 1}`;
    const restoreBlocks = getOperatorRestoreBlocks(state, action.argsJson ?? {});

    return {
      id: actionId,
      toolName: action.toolName,
      summary,
      diff,
      riskLevel: action.riskLevel ?? "medium",
      approvalStatus: "pending",
      applyPayload: {
        insertAfterBlockId: "owner-note",
        operation: {
          toolName: action.toolName,
          argsJson: action.argsJson ?? {}
        },
        blocks: [
          {
            id: fallbackBlockId,
            type: "callout",
            text: `AI 승인 실행 기록: ${plan.summary}`
          }
        ]
      },
      undoPayload: {
        ...(action.undoJson ?? {}),
        removeBlockIds: [fallbackBlockId],
        restoreBlocks
      }
    };
  });
  const run: AiRun = {
    id: `operator-run-${runNumber}`,
    command,
    status: "awaiting_approval",
    modelRoute: command.length > 120 ? "large-context" : "planner",
    actions
  };
  const memories = [
    ...(plan.memories ?? []).map((content, index) => ({
      id: `memory-${state.ai.memories.length + index + 1}`,
      content,
      source: "openai-operator",
      confidence: 0.82
    })),
    ...state.ai.memories
  ];

  return {
    ...state,
    ai: {
      ...state.ai,
      panelInput: "",
      runs: [run, ...state.ai.runs],
      memories
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

  const runtimeAction = attachRuntimeUndoPayload(state, action);
  const appliedState = applyAiActionPayload(state, runtimeAction);

  return {
    ...appliedState,
    ai: {
      ...appliedState.ai,
      runs: updateAiAction(state.ai.runs, actionId, {
        approvalStatus: "approved"
      }),
      undoLog: [
        { ...runtimeAction, approvalStatus: "approved" },
        ...state.ai.undoLog
      ]
    }
  };
}

export function rejectAiAction(
  state: NodiaryState,
  actionId: string
): NodiaryState {
  const action = findAiAction(state, actionId);

  if (!action || action.approvalStatus !== "pending") {
    return state;
  }

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
  const restoreBlocks = lastAction.undoPayload.restoreBlocks ?? [];
  const restoredActiveBlocks =
    lastAction.undoPayload.restoreActivePageBlocks ??
    restoreBlocks.reduce(
      (blocks, restoreBlock) =>
        blocks.map((block) =>
          block.id === restoreBlock.id ? restoreBlock : block
        ),
      state.activePage.blocks.filter((block) => !removeIds.has(block.id))
    );

  return withActivePage(
    {
      ...state,
      sidebarCalendar:
        lastAction.undoPayload.restoreSidebarCalendar ?? state.sidebarCalendar,
      ai: {
        ...state.ai,
        runs: updateAiAction(state.ai.runs, lastAction.id, {
          approvalStatus: "undone"
        }),
        undoLog: remainingUndoLog
      }
    },
    {
      ...state.activePage,
      blocks: restoredActiveBlocks
    }
  );
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

function createBlockFromSlash(
  insertType: SlashInsertType,
  state: NodiaryState
): NodiaryBlock {
  const existingIds = new Set(state.activePage.blocks.map((block) => block.id));

  switch (insertType) {
    case "heading":
      return {
        id: createUniqueId(existingIds, "heading"),
        type: "heading",
        title: "제목 2"
      };
    case "todo":
      return {
        id: createUniqueId(existingIds, "todo"),
        type: "todo",
        text: "할 일 목록",
        checked: false
      };
    case "callout":
      return {
        id: createUniqueId(existingIds, "callout"),
        type: "callout",
        text: "중요한 메모를 여기에 남깁니다."
      };
    case "database": {
      const databaseId = createUniqueId(existingIds, "project-db");
      return {
        id: databaseId,
        type: "database",
        title: projectDatabase.name,
        database: {
          ...projectDatabase,
          id: databaseId,
          rows: [...projectDatabase.rows]
        }
      };
    }
    case "ai":
      return {
        id: createUniqueId(existingIds, "ai"),
        type: "ai",
        text: "이 블록을 AI에게 편집 요청"
      };
    case "paragraph":
    default:
      return {
        id: createUniqueId(existingIds, "paragraph"),
        type: "paragraph",
        text: ""
      };
  }
}

function createPageTemplate(title: string): NodiaryBlock[] {
  return [
    {
      id: `${slugifyId(title)}-heading`,
      type: "heading",
      title
    },
    {
      id: `${slugifyId(title)}-body`,
      type: "paragraph",
      text: "이 페이지의 계획, 메모, 데이터베이스 블록을 여기에 작성합니다."
    }
  ];
}

function createPageFromNode(node: PageNode): NodiaryPage {
  return {
    id: node.id,
    title: node.title,
    properties: [
      { label: "상태", value: "문서" },
      { label: "날짜", value: "2026년 6월 16일 화요일" },
      { label: "캘린더", value: "왼쪽 미니 캘린더와 연결" }
    ],
    blocks: createPageTemplate(node.title)
  };
}

function getStatePages(state: NodiaryState): Record<string, NodiaryPage> {
  return state.pages ?? { [state.activePage.id]: state.activePage };
}

function withActivePage(
  state: NodiaryState,
  activePage: NodiaryPage
): NodiaryState {
  return {
    ...state,
    pages: {
      ...getStatePages(state),
      [activePage.id]: activePage
    },
    activePage
  };
}

function buildJuneCalendar(selectedDate: string): SidebarCalendar {
  const eventDates = new Set(["2026-06-05", "2026-06-10", "2026-06-12", "2026-06-16", "2026-06-18", "2026-06-23", "2026-06-26"]);
  const days: CalendarDay[] = [];

  for (let day = 1; day <= 30; day += 1) {
    const isoDate = `2026-06-${String(day).padStart(2, "0")}`;
    days.push({
      id: isoDate,
      label: String(day),
      isoDate,
      isToday: isoDate === "2026-06-16",
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
    schedule: getScheduleForDate(selectedDate),
    movedEvents: {}
  };
}

function getScheduleForDate(isoDate: string): CalendarEvent[] {
  const schedules: Record<string, CalendarEvent[]> = {
    "2026-06-16": [
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

  return (schedules[isoDate] ?? []).map((event) => ({
    ...event,
    date: isoDate
  }));
}

function getScheduleForCalendar(
  calendar: SidebarCalendar,
  isoDate: string
): CalendarEvent[] {
  const movedEvents = calendar.movedEvents ?? {};
  const movedEventIds = new Set(Object.keys(movedEvents));
  const movedForDate = Object.values(movedEvents).filter(
    (event) => event.date === isoDate
  );
  const baseEvents = getScheduleForDate(isoDate).filter(
    (event) => !movedEventIds.has(event.id)
  );

  return [...movedForDate, ...baseEvents];
}

function buildCalendarDaysWithMoves(
  calendar: SidebarCalendar,
  selectedDate: string
): CalendarDay[] {
  return calendar.days.map((day) => ({
    ...day,
    isSelected: day.isoDate === selectedDate,
    hasEvent: getScheduleForCalendar(calendar, day.isoDate).length > 0
  }));
}

function createUniqueId(existingIds: Set<string>, prefix: string) {
  let index = 0;
  let candidate = prefix;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }

  return candidate;
}

function createDatabaseRowId(rows: DatabaseRow[]) {
  const existingIds = new Set(rows.map((row) => row.id));
  let index = rows.length + 1;
  let candidate = `row-${index}`;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `row-${index}`;
  }

  return candidate;
}

function insertDatabaseRowAtStatusIndex(
  rows: DatabaseRow[],
  row: DatabaseRow,
  index = rows.length
): DatabaseRow[] {
  const sameStatusIndexes = rows.reduce<number[]>((indexes, candidate, rowIndex) => {
    if (candidate.status === row.status) {
      indexes.push(rowIndex);
    }

    return indexes;
  }, []);
  const boundedIndex = Math.max(0, Math.min(index, sameStatusIndexes.length));
  const insertIndex =
    sameStatusIndexes[boundedIndex] ?? sameStatusIndexes.at(-1) ?? rows.length;
  const resolvedIndex =
    sameStatusIndexes.length > 0 && boundedIndex >= sameStatusIndexes.length
      ? insertIndex + 1
      : insertIndex;

  return [
    ...rows.slice(0, resolvedIndex),
    row,
    ...rows.slice(resolvedIndex)
  ];
}

function removePageNode(
  nodes: PageNode[],
  nodeId: string
): {
  nodes: PageNode[];
  removed?: PageNode;
} {
  let removed: PageNode | undefined;
  const nextNodes = nodes.flatMap((node) => {
    if (node.id === nodeId) {
      removed = node;
      return [];
    }

    if (!node.children) {
      return [node];
    }

    const result = removePageNode(node.children, nodeId);

    if (result.removed) {
      removed = result.removed;
    }

    return [
      {
        ...node,
        children: result.nodes
      }
    ];
  });

  return {
    nodes: nextNodes,
    removed
  };
}

function insertPageNode(
  nodes: PageNode[],
  parentNodeId: string,
  node: PageNode,
  index: number
): {
  nodes: PageNode[];
  inserted: boolean;
} {
  let inserted = false;
  const nextNodes = nodes.map((candidate) => {
    if (candidate.id === parentNodeId) {
      const children = candidate.children ?? [];
      const insertIndex = Math.max(0, Math.min(index, children.length));
      inserted = true;

      return {
        ...candidate,
        expanded: true,
        children: [
          ...children.slice(0, insertIndex),
          node,
          ...children.slice(insertIndex)
        ]
      };
    }

    if (!candidate.children) {
      return candidate;
    }

    const result = insertPageNode(candidate.children, parentNodeId, node, index);

    if (result.inserted) {
      inserted = true;
    }

    return {
      ...candidate,
      children: result.nodes
    };
  });

  return {
    nodes: nextNodes,
    inserted
  };
}

function togglePageTreeNode(nodes: PageNode[], nodeId: string): PageNode[] {
  return nodes.map((node) => ({
    ...node,
    expanded: node.id === nodeId ? !node.expanded : node.expanded,
    children: node.children ? togglePageTreeNode(node.children, nodeId) : undefined
  }));
}

function updatePageNodeTitle(
  nodes: PageNode[],
  nodeId: string,
  title: string
): PageNode[] {
  return nodes.map((node) => ({
    ...node,
    title: node.id === nodeId ? title : node.title,
    children: node.children
      ? updatePageNodeTitle(node.children, nodeId, title)
      : undefined
  }));
}

function isDescendantPageNode(
  nodes: PageNode[],
  nodeId: string,
  possibleDescendantId: string
): boolean {
  const node = findPageNode(nodes, nodeId);

  if (!node?.children) {
    return false;
  }

  return Boolean(findPageNode(node.children, possibleDescendantId));
}

function findPageNode(nodes: PageNode[], nodeId: string): PageNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.children) {
      const child = findPageNode(node.children, nodeId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

function flattenPageNodes(nodes: PageNode[]): PageNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.children ? flattenPageNodes(node.children) : [])
  ]);
}

function findCalendarEvent(
  state: NodiaryState,
  eventId: string
): CalendarEvent | undefined {
  const visibleEvent = state.sidebarCalendar.schedule.find(
    (event) => event.id === eventId
  );

  if (visibleEvent) {
    return visibleEvent;
  }

  for (const day of state.sidebarCalendar.days) {
    const event = getScheduleForCalendar(state.sidebarCalendar, day.isoDate).find(
      (candidate) => candidate.id === eventId
    );

    if (event) {
      return event;
    }
  }

  return undefined;
}

function attachRuntimeUndoPayload(
  state: NodiaryState,
  action: AiProposedAction
): AiProposedAction {
  return {
    ...action,
    undoPayload: {
      ...action.undoPayload,
      restoreActivePageBlocks: state.activePage.blocks,
      restoreSidebarCalendar: state.sidebarCalendar
    }
  };
}

function getOperatorRestoreBlocks(
  state: NodiaryState,
  args: Record<string, unknown>
): NodiaryBlock[] {
  const blockId = readStringArg(args, "blockId");

  if (!blockId) {
    return [];
  }

  const block = state.activePage.blocks.find((candidate) => candidate.id === blockId);

  return block ? [block] : [];
}

function getCalendarMoveRisk(
  event: CalendarEvent,
  targetSchedule: CalendarEvent[]
): RiskLevel {
  if (
    event.source === "google" ||
    event.source === "apple" ||
    targetSchedule.some((candidate) => candidate.source !== "nodiary")
  ) {
    return "high";
  }

  return targetSchedule.length > 0 ? "medium" : "low";
}

function applyAiActionPayload(
  state: NodiaryState,
  action: AiProposedAction
): NodiaryState {
  const operatedState = applyOperatorOperation(state, action);

  if (operatedState !== state) {
    return operatedState;
  }

  const insertAfterBlockId = action.applyPayload.insertAfterBlockId;
  const insertBlocks = action.applyPayload.blocks ?? [];
  const afterIndex = state.activePage.blocks.findIndex(
    (block) => block.id === insertAfterBlockId
  );
  const insertIndex = afterIndex >= 0 ? afterIndex + 1 : state.activePage.blocks.length;

  return withActivePage(state, {
    ...state.activePage,
    blocks: [
      ...state.activePage.blocks.slice(0, insertIndex),
      ...insertBlocks,
      ...state.activePage.blocks.slice(insertIndex)
    ]
  });
}

function applyOperatorOperation(
  state: NodiaryState,
  action: AiProposedAction
): NodiaryState {
  const operation = action.applyPayload.operation;

  if (!operation) {
    return state;
  }

  const args = operation.argsJson;

  if (operation.toolName === "moveBlock") {
    const blockId = readStringArg(args, "blockId");
    const beforeBlockId = readStringArg(args, "beforeBlockId");

    if (blockId && beforeBlockId) {
      return moveBlock(state, blockId, beforeBlockId);
    }
  }

  if (operation.toolName === "updateDatabaseRow") {
    const databaseBlockId = readStringArg(args, "databaseBlockId") ?? "project-db";
    const rowId = readStringArg(args, "rowId");

    if (rowId) {
      return moveDatabaseRow(state, databaseBlockId, rowId, {
        status: readDatabaseStatusArg(args, "status"),
        date: readStringArg(args, "date"),
        owner: readStringArg(args, "owner"),
        title: readStringArg(args, "title"),
        index: readNumberArg(args, "index")
      });
    }
  }

  if (operation.toolName === "updateCalendarEvent") {
    const eventId = readStringArg(args, "eventId");
    const date = readStringArg(args, "date");

    if (eventId && date) {
      return moveCalendarEvent(state, eventId, {
        date,
        time: readStringArg(args, "time")
      });
    }
  }

  if (operation.toolName === "createDatabase") {
    const afterBlockId = readStringArg(args, "afterBlockId") ?? "memo";

    return insertBlockFromSlash(state, afterBlockId, "database");
  }

  if (operation.toolName === "createDatabaseRow") {
    const databaseBlockId = readStringArg(args, "databaseBlockId") ?? "project-db";

    return addDatabaseRow(state, databaseBlockId, {
      title: readStringArg(args, "title"),
      status: readDatabaseStatusArg(args, "status"),
      owner: readStringArg(args, "owner"),
      date: readStringArg(args, "date")
    });
  }

  if (operation.toolName === "updateBlock") {
    const blockId = readStringArg(args, "blockId");

    if (!blockId) {
      return state;
    }

    return updateBlockTextFromArgs(state, blockId, args);
  }

  return state;
}

function updateBlockTextFromArgs(
  state: NodiaryState,
  blockId: string,
  args: Record<string, unknown>
): NodiaryState {
  const text = readStringArg(args, "text") ?? readStringArg(args, "content");
  const title = readStringArg(args, "title");

  if (text === undefined && title === undefined) {
    return state;
  }

  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          text: text ?? block.text,
          title: title ?? block.title
        };
      })
  });
}

function readStringArg(
  args: Record<string, unknown>,
  key: string
): string | undefined {
  const value = args[key];

  return typeof value === "string" ? value : undefined;
}

function readNumberArg(
  args: Record<string, unknown>,
  key: string
): number | undefined {
  const value = args[key];

  return typeof value === "number" ? value : undefined;
}

function readDatabaseStatusArg(
  args: Record<string, unknown>,
  key: string
): DatabaseRow["status"] | undefined {
  const value = args[key];

  return value === "backlog" ||
    value === "doing" ||
    value === "review" ||
    value === "done"
    ? value
    : undefined;
}

function formatOperatorDiff(diffJson: unknown): string {
  if (!diffJson || typeof diffJson !== "object") {
    return "모델이 구조화된 diff를 제공하지 않았습니다.";
  }

  return JSON.stringify(diffJson, null, 2);
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
  return runs.map((run) => {
    const actions = run.actions.map((action) =>
      action.id === actionId ? { ...action, ...patch } : action
    );

    return {
      ...run,
      actions,
      status: actions.some((action) => action.approvalStatus === "pending")
        ? "awaiting_approval"
        : "completed"
    };
  });
}

function slugifyId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "page";
}
