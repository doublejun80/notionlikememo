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

export type AiModelRoute = "quick" | "planner" | "large-context";

export type DatabaseFieldType = "text" | "status" | "date" | "person";

export type DatabaseField = {
  id: string;
  name: string;
  type: DatabaseFieldType;
};

export type DatabaseFilter = {
  status: DatabaseRow["status"] | "all";
  query: string;
};

export type DatabaseSort = {
  fieldId: keyof Pick<DatabaseRow, "title" | "status" | "owner" | "date">;
  direction: "asc" | "desc";
};

export type NodiaryBlock = {
  id: string;
  type: BlockType;
  title?: string;
  text?: string;
  checked?: boolean;
  database?: DatabaseBlock;
  aiTargetBlockId?: string;
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
  fields: DatabaseField[];
  filter: DatabaseFilter;
  sort: DatabaseSort;
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
  visibleMonth: string;
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
    removeBlockIds?: string[];
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
  modelRoute: AiModelRoute;
  modelName?: string;
  answer?: string;
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
  theme: "system" | "light" | "dark" | "lavender" | "yellow" | "navy";
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

type DefaultNodiaryStateOptions = {
  todayIsoDate?: string;
};

const koreanWeekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;
const koreanTimeZone = "Asia/Seoul";

export function getKoreanTodayIsoDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: koreanTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "2026-06-16";
  }

  return `${year}-${month}-${day}`;
}

export function getNodiaryTodayIsoDate() {
  return readTodayIsoDateOverride() ?? getKoreanTodayIsoDate();
}

function readTodayIsoDateOverride() {
  const value = (globalThis as { __NODIARY_TODAY_ISO_DATE__?: unknown })
    .__NODIARY_TODAY_ISO_DATE__;

  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined;
}

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
  filter: {
    status: "all",
    query: ""
  },
  sort: {
    fieldId: "title",
    direction: "asc"
  },
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

export function defaultNodiaryState(
  options: DefaultNodiaryStateOptions = {}
): NodiaryState {
  const todayIsoDate = options.todayIsoDate ?? getNodiaryTodayIsoDate();
  const activePage = createTodayPage(todayIsoDate);

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
    sidebarCalendar: buildSidebarCalendar(
      todayIsoDate.slice(0, 7),
      todayIsoDate,
      {},
      todayIsoDate
    ),
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

function createTodayPage(todayIsoDate: string): NodiaryPage {
  return {
    id: "today",
    title: "오늘의 계획",
    properties: [
      { label: "상태", value: "진행중" },
      { label: "날짜", value: formatKoreanDateLabel(todayIsoDate) },
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
  insertType: SlashInsertType,
  options: { aiTargetBlockId?: string } = {}
): NodiaryState {
  const block = createBlockFromSlash(insertType, state, {
    aiTargetBlockId: options.aiTargetBlockId ?? afterBlockId
  });
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

export function deleteBlock(state: NodiaryState, blockId: string): NodiaryState {
  if (!state.activePage.blocks.some((block) => block.id === blockId)) {
    return state;
  }

  const remainingBlocks = state.activePage.blocks.filter(
    (block) => block.id !== blockId
  );
  const blocks =
    remainingBlocks.length > 0
      ? remainingBlocks
      : [
          {
            id: createUniqueId(new Set(), "paragraph"),
            type: "paragraph" as const,
            text: ""
          }
        ];

  return withActivePage(state, {
    ...state.activePage,
    blocks
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
    sidebarCalendar: buildSidebarCalendar(
      isoDate.slice(0, 7),
      isoDate,
      state.sidebarCalendar.movedEvents
    )
  };
}

export function changeCalendarMonth(
  state: NodiaryState,
  direction: "previous" | "next"
): NodiaryState {
  const visibleMonth =
    state.sidebarCalendar.visibleMonth ?? state.sidebarCalendar.selectedDate.slice(0, 7);
  const nextMonth = addMonthsToMonthKey(visibleMonth, direction === "next" ? 1 : -1);
  const selectedDate = `${nextMonth}-01`;

  return {
    ...state,
    sidebarCalendar: buildSidebarCalendar(
      nextMonth,
      selectedDate,
      state.sidebarCalendar.movedEvents
    )
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

export function renamePage(
  state: NodiaryState,
  pageId: string,
  title: string
): NodiaryState {
  const pageNode = findPageNode(state.pageTree, pageId);

  if (!pageNode) {
    return state;
  }

  const nextTitle = title.trim() || pageNode.title;
  const pages = {
    ...getStatePages(state),
    [state.activePage.id]: state.activePage
  };
  const activePage =
    state.activePage.id === pageId
      ? {
          ...state.activePage,
          title: nextTitle
        }
      : state.activePage;
  const nextPages = {
    ...pages,
    ...(pages[pageId]
      ? {
          [pageId]: {
            ...pages[pageId],
            title: nextTitle
          }
        }
      : {}),
    [activePage.id]: activePage
  };

  return {
    ...state,
    pageTree: updatePageNodeTitle(state.pageTree, pageId, nextTitle),
    pages: nextPages,
    activePage
  };
}

export function deletePage(state: NodiaryState, pageId: string): NodiaryState {
  const { nodes, removed } = removePageNode(state.pageTree, pageId);

  if (!removed) {
    return state;
  }

  const remainingNodes = flattenPageNodes(nodes);

  if (remainingNodes.length === 0) {
    return state;
  }

  const removedIds = new Set(flattenPageNodes([removed]).map((node) => node.id));
  const pages = {
    ...getStatePages(state),
    [state.activePage.id]: state.activePage
  };

  removedIds.forEach((removedId) => {
    delete pages[removedId];
  });

  const nextActivePage = removedIds.has(state.activePage.id)
    ? pages[remainingNodes[0].id] ?? createPageFromNode(remainingNodes[0])
    : state.activePage;

  return {
    ...state,
    pageTree: nodes,
    pages: {
      ...pages,
      [nextActivePage.id]: nextActivePage
    },
    activePage: nextActivePage
  };
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

export function moveBlockByKeyboard(
  state: NodiaryState,
  blockId: string,
  direction: "up" | "down"
): NodiaryState {
  const currentIndex = state.activePage.blocks.findIndex(
    (block) => block.id === blockId
  );

  if (currentIndex < 0) {
    return state;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= state.activePage.blocks.length) {
    return state;
  }

  const blocks = [...state.activePage.blocks];
  const currentBlock = blocks[currentIndex];

  blocks[currentIndex] = blocks[targetIndex];
  blocks[targetIndex] = currentBlock;

  return withActivePage(state, {
    ...state.activePage,
    blocks
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

export function movePageNodeByKeyboard(
  state: NodiaryState,
  nodeId: string,
  direction: "up" | "down"
): NodiaryState {
  const result = movePageNodeWithinSiblings(state.pageTree, nodeId, direction);

  if (!result.moved) {
    return state;
  }

  return {
    ...state,
    pageTree: result.nodes
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

export function updateDatabaseFilter(
  state: NodiaryState,
  databaseBlockId: string,
  patch: Partial<DatabaseFilter>
): NodiaryState {
  return updateDatabaseBlock(state, databaseBlockId, (database) => ({
    ...database,
    filter: {
      ...getDatabaseFilter(database),
      ...patch
    }
  }));
}

export function updateDatabaseSort(
  state: NodiaryState,
  databaseBlockId: string,
  sort: DatabaseSort
): NodiaryState {
  return updateDatabaseBlock(state, databaseBlockId, (database) => ({
    ...database,
    sort
  }));
}

export function updateDatabaseField(
  state: NodiaryState,
  databaseBlockId: string,
  fieldId: string,
  patch: Partial<Pick<DatabaseField, "name" | "type">>
): NodiaryState {
  return updateDatabaseBlock(state, databaseBlockId, (database) => ({
    ...database,
    fields: database.fields.map((field) =>
      field.id === fieldId
        ? {
            ...field,
            ...(patch.name !== undefined
              ? { name: patch.name }
              : {}),
            ...(patch.type !== undefined ? { type: patch.type } : {})
          }
        : field
    )
  }));
}

export function getDatabaseRowsForView(database: DatabaseBlock): DatabaseRow[] {
  const filter = getDatabaseFilter(database);
  const sort = getDatabaseSort(database);
  const normalizedQuery = filter.query.trim().toLowerCase();
  const filteredRows = database.rows.filter((row) => {
    if (filter.status !== "all" && row.status !== filter.status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [row.title, row.owner, row.date, row.status]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return [...filteredRows].sort((left, right) => {
    const leftValue = getDatabaseSortValue(left, sort.fieldId);
    const rightValue = getDatabaseSortValue(right, sort.fieldId);
    const result = leftValue.localeCompare(rightValue, "ko");

    return sort.direction === "asc" ? result : -result;
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
  const nextMovedEvents = {
    ...movedEvents,
    [eventId]: movedEvent
  };

  return {
    ...state,
    sidebarCalendar: buildSidebarCalendar(
      patch.date.slice(0, 7),
      patch.date,
      nextMovedEvents
    )
  };
}

export function createAiAnswerRun(
  state: NodiaryState,
  command: string,
  answer: string,
  modelRoute: AiModelRoute = "planner",
  modelName?: string
): NodiaryState {
  const answerIndex = state.ai.runs.length + 1;
  const normalizedAnswer = normalizeAiDocumentText(answer);
  const run: AiRun = {
    id: `answer-run-${answerIndex}`,
    command,
    status: "completed",
    modelRoute,
    modelName,
    answer: normalizedAnswer,
    actions: []
  };
  const answerBlock: NodiaryBlock = {
    id: `ai-answer-${answerIndex}`,
    type: "callout",
    text: normalizedAnswer
  };

  return withActivePage({
    ...state,
    ai: {
      ...state.ai,
      panelInput: "",
      runs: [run, ...state.ai.runs]
    }
  }, {
    ...state.activePage,
    blocks: [...state.activePage.blocks, answerBlock]
  });
}

function getDefaultAiModelRoute(command: string): AiModelRoute {
  return command.length > 120 ? "large-context" : "planner";
}

export function createAiRun(
  state: NodiaryState,
  command: string,
  modelRoute: AiModelRoute = getDefaultAiModelRoute(command),
  modelName?: string,
  options: { allowCalendarContext?: boolean } = {}
): NodiaryState {
  const calendarMoveRun = options.allowCalendarContext === false
    ? undefined
    : createCalendarMoveRunFromCommand(
        state,
        command,
        modelRoute,
        modelName
      );

  if (calendarMoveRun) {
    return calendarMoveRun;
  }

  const aiRequestBlockRun = createAiRequestBlockRun(
    state,
    command,
    modelRoute,
    modelName
  );

  if (aiRequestBlockRun) {
    return aiRequestBlockRun;
  }

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
    modelRoute,
    modelName,
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

function createAiRequestBlockRun(
  state: NodiaryState,
  command: string,
  modelRoute: AiModelRoute,
  modelName?: string
): NodiaryState | undefined {
  const requestBlock = findAiRequestBlock(state);

  if (!requestBlock) {
    return undefined;
  }

  const runIndex = state.ai.runs.length + 1;
  const targetBlock =
    findBlockById(state, requestBlock.aiTargetBlockId) ?? requestBlock;
  const answerText = normalizeAiDocumentText(createLocalAiRequestBlockText(command));
  const removeBlockIds =
    targetBlock.id === requestBlock.id ? [] : [requestBlock.id];
  const action: AiProposedAction = {
    id: `ai-block-action-${runIndex}`,
    toolName: "updateBlock",
    summary: "선택한 블록에 AI 편집 결과를 바로 반영합니다.",
    diff: JSON.stringify(
      {
        before: targetBlock.text ?? targetBlock.title ?? "",
        after: answerText
      },
      null,
      2
    ),
    riskLevel: "medium",
    approvalStatus: "pending",
    applyPayload: {
      operation: {
        toolName: "updateBlock",
        argsJson: {
          blockId: targetBlock.id,
          text: answerText,
          type: "paragraph"
        }
      },
      removeBlockIds
    },
    undoPayload: {
      restoreBlocks: [targetBlock, requestBlock]
    }
  };
  const run: AiRun = {
    id: `ai-block-run-${runIndex}`,
    command,
    status: "awaiting_approval",
    modelRoute,
    modelName,
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

function createCalendarMoveRunFromCommand(
  state: NodiaryState,
  command: string,
  modelRoute: AiModelRoute = "planner",
  modelName?: string
): NodiaryState | undefined {
  const targetDate = parseCalendarCommandDate(
    command,
    state.sidebarCalendar.selectedDate
  );
  const targetTime = parseCalendarCommandTime(command);
  const event = findCalendarEventByCommand(state, command);

  if (!targetDate || !event) {
    return undefined;
  }

  const targetSchedule = getScheduleForCalendar(state.sidebarCalendar, targetDate)
    .filter((candidate) => candidate.id !== event.id);
  const riskLevel = getCalendarMoveRisk(event, targetSchedule);
  const runIndex = state.ai.runs.length + 1;
  const action: AiProposedAction = {
    id: `local-calendar-action-${runIndex}`,
    toolName: "updateCalendarEvent",
    summary: `${event.title} 일정을 ${targetDate} ${targetTime ?? event.time}로 이동합니다.`,
    diff: JSON.stringify(
      {
        before: {
          date: event.date ?? state.sidebarCalendar.selectedDate,
          time: event.time,
          source: event.source
        },
        after: {
          date: targetDate,
          time: targetTime ?? event.time,
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
          eventId: event.id,
          date: targetDate,
          time: targetTime
        }
      }
    },
    undoPayload: {}
  };
  const run: AiRun = {
    id: `local-calendar-run-${runIndex}`,
    command,
    status: "awaiting_approval",
    modelRoute,
    modelName,
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
  plan: OperatorPlanDraft,
  modelRoute: AiModelRoute = getDefaultAiModelRoute(command),
  modelName?: string
): NodiaryState {
  const runNumber = state.ai.runs.length + 1;
  const actions: AiProposedAction[] = plan.actions.map((action, index) => {
    const argsJson = normalizeOperatorArgsForAiRequest(
      state,
      command,
      action.toolName,
      action.argsJson ?? {},
      action.diffJson
    );
    const summary = `${plan.summary} (${action.toolName})`;
    const diff = formatOperatorDiff(action.diffJson);
    const actionId = `operator-action-${runNumber}-${index + 1}`;
    const restoreBlocks = getOperatorRestoreBlocks(state, argsJson);
    const requestBlock = findAiRequestBlock(state);
    const normalizedBlockId = readStringArg(argsJson, "blockId");
    const removeBlockIds =
      action.toolName === "updateBlock" &&
      requestBlock &&
      normalizedBlockId !== requestBlock.id
        ? [requestBlock.id]
        : [];

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
          argsJson
        },
        blocks: [],
        removeBlockIds
      },
      undoPayload: {
        ...(action.undoJson ?? {}),
        removeBlockIds: [],
        restoreBlocks: requestBlock ? [...restoreBlocks, requestBlock] : restoreBlocks
      }
    };
  });
  const run: AiRun = {
    id: `operator-run-${runNumber}`,
    command,
    status: "awaiting_approval",
    modelRoute,
    modelName,
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

export function applyPendingAiActions(state: NodiaryState): NodiaryState {
  return state.ai.runs
    .flatMap((run) => run.actions)
    .filter((action) => action.approvalStatus === "pending")
    .reduce(
      (nextState, action) => approveAiAction(nextState, action.id),
      state
    );
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

export function prepareWorkspaceForStartup(
  state: NodiaryState,
  todayIsoDate = getNodiaryTodayIsoDate()
): NodiaryState {
  const pages = getStatePages(state);
  const todayPage = updatePageDateProperty(
    pages.today ?? createTodayPage(todayIsoDate),
    todayIsoDate
  );
  const pagesWithToday = {
    ...pages,
    [todayPage.id]: todayPage
  };
  const shouldStartToday = state.preferences.startupPage === "today";
  const selectedDate = shouldStartToday
    ? todayIsoDate
    : state.sidebarCalendar.selectedDate;
  const visibleMonth = shouldStartToday
    ? todayIsoDate.slice(0, 7)
    : state.sidebarCalendar.visibleMonth ?? selectedDate.slice(0, 7);

  return {
    ...state,
    pages: pagesWithToday,
    activePage: shouldStartToday
      ? todayPage
      : state.activePage.id === todayPage.id
        ? todayPage
        : state.activePage,
    sidebarCalendar: buildSidebarCalendar(
      visibleMonth,
      selectedDate,
      state.sidebarCalendar.movedEvents,
      todayIsoDate
    )
  };
}

function updatePageDateProperty(page: NodiaryPage, todayIsoDate: string): NodiaryPage {
  const dateLabel = formatKoreanDateLabel(todayIsoDate);
  let hasDateProperty = false;
  const properties = page.properties.map((property) => {
    if (property.label !== "날짜") {
      return property;
    }

    hasDateProperty = true;
    return {
      ...property,
      value: dateLabel
    };
  });

  return {
    ...page,
    properties: hasDateProperty
      ? properties
      : [...properties, { label: "날짜", value: dateLabel }]
  };
}

function createBlockFromSlash(
  insertType: SlashInsertType,
  state: NodiaryState,
  options: { aiTargetBlockId?: string } = {}
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
          fields: projectDatabase.fields.map((field) => ({ ...field })),
          filter: { ...projectDatabase.filter },
          sort: { ...projectDatabase.sort },
          rows: [...projectDatabase.rows]
        }
      };
    }
    case "ai":
      return {
        id: createUniqueId(existingIds, "ai"),
        type: "ai",
        text: "이 블록을 AI에게 편집 요청",
        aiTargetBlockId: options.aiTargetBlockId
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

function buildSidebarCalendar(
  visibleMonth: string,
  selectedDate: string,
  movedEvents: Record<string, CalendarEvent> = {},
  todayIsoDate = getNodiaryTodayIsoDate()
): SidebarCalendar {
  const days = buildCalendarDays(
    visibleMonth,
    selectedDate,
    movedEvents,
    todayIsoDate
  );

  return {
    visibleMonth,
    monthLabel: formatMonthLabel(visibleMonth),
    selectedDate,
    days,
    schedule: getScheduleForCalendar(
      {
        visibleMonth,
        monthLabel: formatMonthLabel(visibleMonth),
        selectedDate,
        days,
        schedule: [],
        movedEvents
      },
      selectedDate
    ),
    movedEvents
  };
}

function buildCalendarDays(
  visibleMonth: string,
  selectedDate: string,
  movedEvents: Record<string, CalendarEvent>,
  todayIsoDate: string
): CalendarDay[] {
  const [year, month] = parseMonthKey(visibleMonth);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const sundayOffset = firstWeekday;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((sundayOffset + daysInMonth) / 7) * 7;
  const days: CalendarDay[] = [];

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const date = new Date(Date.UTC(year, month - 1, 1 - sundayOffset + cellIndex));
    const isoDate = formatIsoDate(date);
    const calendar = {
      visibleMonth,
      monthLabel: formatMonthLabel(visibleMonth),
      selectedDate,
      days: [],
      schedule: [],
      movedEvents
    } satisfies SidebarCalendar;

    days.push({
      id: isoDate,
      label: String(date.getUTCDate()),
      isoDate,
      isToday: isoDate === todayIsoDate,
      isSelected: isoDate === selectedDate,
      hasEvent: getScheduleForCalendar(calendar, isoDate).length > 0
    });
  }

  return days;
}

function parseMonthKey(visibleMonth: string): [number, number] {
  const [year, month] = visibleMonth.split("-").map(Number);

  return [year, month];
}

function formatMonthLabel(visibleMonth: string) {
  const [year, month] = parseMonthKey(visibleMonth);

  return `${year}년 ${month}월`;
}

function formatKoreanDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = koreanWeekdayLabels[date.getUTCDay()] ?? "일";

  return `${year}년 ${month}월 ${day}일 ${weekday}요일`;
}

function formatIsoDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function addMonthsToMonthKey(visibleMonth: string, delta: number) {
  const [year, month] = parseMonthKey(visibleMonth);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0")
  ].join("-");
}

function addDaysToIsoDate(isoDate: string, delta: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));

  return formatIsoDate(date);
}

function parseCalendarCommandDate(
  command: string,
  referenceDate: string
): string | undefined {
  const isoDate = command.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];

  if (isoDate) {
    return isoDate;
  }

  if (command.includes("모레")) {
    return addDaysToIsoDate(referenceDate, 2);
  }

  if (command.includes("내일")) {
    return addDaysToIsoDate(referenceDate, 1);
  }

  if (command.includes("오늘")) {
    return referenceDate;
  }

  const koreanDate = command.match(
    /(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일/
  );

  if (koreanDate) {
    const referenceYear = Number(referenceDate.slice(0, 4));
    const year = Number(koreanDate[1] ?? referenceYear);
    const month = Number(koreanDate[2]);
    const day = Number(koreanDate[3]);

    return formatCalendarCommandDate(year, month, day);
  }

  const dayOnly = command.match(/(?:^|[^\d])(\d{1,2})일/);

  if (dayOnly) {
    const [referenceYear, referenceMonth] = referenceDate.split("-").map(Number);

    return formatCalendarCommandDate(
      referenceYear,
      referenceMonth,
      Number(dayOnly[1])
    );
  }

  const weekdayIndex = getKoreanWeekdayIndex(command);

  if (weekdayIndex !== undefined) {
    const reference = new Date(`${referenceDate}T00:00:00.000Z`);
    const currentWeekday = reference.getUTCDay();
    const daysUntilTarget = (weekdayIndex - currentWeekday + 7) % 7 || 7;

    return addDaysToIsoDate(referenceDate, daysUntilTarget);
  }

  return undefined;
}

function parseCalendarCommandTime(command: string): string | undefined {
  const clockTime = command.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (clockTime) {
    return `${clockTime[1].padStart(2, "0")}:${clockTime[2]}`;
  }

  const koreanTime = command.match(
    /(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/
  );

  if (!koreanTime) {
    return undefined;
  }

  const meridiem = koreanTime[1];
  let hour = Number(koreanTime[2]);
  const minute = Number(koreanTime[3] ?? 0);

  if (meridiem === "오후" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "오전" && hour === 12) {
    hour = 0;
  }

  if (hour > 23 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatCalendarCommandDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return formatIsoDate(date);
}

function getKoreanWeekdayIndex(command: string) {
  const weekdays: Array<[string, number]> = [
    ["일요일", 0],
    ["월요일", 1],
    ["화요일", 2],
    ["수요일", 3],
    ["목요일", 4],
    ["금요일", 5],
    ["토요일", 6],
    ["일욜", 0],
    ["월욜", 1],
    ["화욜", 2],
    ["수욜", 3],
    ["목욜", 4],
    ["금욜", 5],
    ["토욜", 6]
  ];

  return weekdays.find(([label]) => command.includes(label))?.[1];
}

function getScheduleForDate(isoDate: string): CalendarEvent[] {
  return (baseCalendarSchedules[isoDate] ?? []).map((event) => ({
    ...event,
    date: isoDate
  }));
}

const baseCalendarSchedules: Record<string, CalendarEvent[]> = {
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

function updateDatabaseBlock(
  state: NodiaryState,
  databaseBlockId: string,
  update: (database: DatabaseBlock) => DatabaseBlock
): NodiaryState {
  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.map((block) => {
      if (block.id !== databaseBlockId || !block.database) {
        return block;
      }

      return {
        ...block,
        database: update(normalizeDatabaseBlock(block.database))
      };
    })
  });
}

function normalizeDatabaseBlock(database: DatabaseBlock): DatabaseBlock {
  return {
    ...database,
    filter: getDatabaseFilter(database),
    sort: getDatabaseSort(database)
  };
}

function getDatabaseFilter(database: DatabaseBlock): DatabaseFilter {
  return database.filter ?? {
    status: "all",
    query: ""
  };
}

function getDatabaseSort(database: DatabaseBlock): DatabaseSort {
  return database.sort ?? {
    fieldId: "title",
    direction: "asc"
  };
}

function getDatabaseSortValue(
  row: DatabaseRow,
  fieldId: DatabaseSort["fieldId"]
) {
  if (fieldId === "status") {
    const statusOrder: Record<DatabaseRow["status"], string> = {
      backlog: "1",
      doing: "2",
      review: "3",
      done: "4"
    };

    return statusOrder[row.status];
  }

  return row[fieldId];
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

function movePageNodeWithinSiblings(
  nodes: PageNode[],
  nodeId: string,
  direction: "up" | "down"
): {
  nodes: PageNode[];
  moved: boolean;
} {
  const nodeIndex = nodes.findIndex((node) => node.id === nodeId);

  if (nodeIndex >= 0) {
    const targetIndex = direction === "up" ? nodeIndex - 1 : nodeIndex + 1;

    if (targetIndex < 0 || targetIndex >= nodes.length) {
      return {
        nodes,
        moved: false
      };
    }

    const nextNodes = [...nodes];
    const currentNode = nextNodes[nodeIndex];

    nextNodes[nodeIndex] = nextNodes[targetIndex];
    nextNodes[targetIndex] = currentNode;

    return {
      nodes: nextNodes,
      moved: true
    };
  }

  let moved = false;
  const nextNodes = nodes.map((node) => {
    if (!node.children || moved) {
      return node;
    }

    const result = movePageNodeWithinSiblings(
      node.children,
      nodeId,
      direction
    );

    if (!result.moved) {
      return node;
    }

    moved = true;

    return {
      ...node,
      children: result.nodes
    };
  });

  return {
    nodes: nextNodes,
    moved
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

  return getKnownCalendarEvents().find((event) => event.id === eventId);
}

function findCalendarEventByCommand(
  state: NodiaryState,
  command: string
): CalendarEvent | undefined {
  const movedEvents = Object.values(state.sidebarCalendar.movedEvents ?? {});

  return [
    ...movedEvents,
    ...getCalendarEventsInVisibleRange(state.sidebarCalendar),
    ...getKnownCalendarEvents()
  ].find((event) => command.includes(event.title));
}

function getKnownCalendarEvents(): CalendarEvent[] {
  return Object.entries(baseCalendarSchedules).flatMap(([date, events]) =>
    events.map((event) => ({
      ...event,
      date
    }))
  );
}

function getCalendarEventsInVisibleRange(calendar: SidebarCalendar): CalendarEvent[] {
  const eventsById = new Map<string, CalendarEvent>();

  for (const day of calendar.days) {
    for (const event of getScheduleForCalendar(calendar, day.isoDate)) {
      eventsById.set(event.id, event);
    }
  }

  for (const event of calendar.schedule) {
    eventsById.set(event.id, event);
  }

  return Array.from(eventsById.values());
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

function normalizeOperatorArgsForAiRequest(
  state: NodiaryState,
  command: string,
  toolName: string,
  args: Record<string, unknown>,
  diffJson: unknown
): Record<string, unknown> {
  if (toolName !== "updateBlock") {
    return args;
  }

  const requestBlock = findAiRequestBlock(state);
  const providedBlockId = readStringArg(args, "blockId");
  const sanitizedArgs = normalizeAiTextArgs(args);

  if (!requestBlock) {
    return sanitizedArgs;
  }

  const targetBlock = findBlockById(state, requestBlock.aiTargetBlockId) ?? requestBlock;

  if (providedBlockId && providedBlockId !== requestBlock.id) {
    return sanitizedArgs;
  }

  return {
    ...sanitizedArgs,
    blockId: targetBlock.id,
    text: normalizeAiDocumentText(
      readStringArg(sanitizedArgs, "text") ??
        readStringArg(sanitizedArgs, "content") ??
        extractProposedText(diffJson) ??
        createLocalAiRequestBlockText(command)
    ),
    type: "paragraph"
  };
}

function findAiRequestBlock(state: NodiaryState): NodiaryBlock | undefined {
  for (let index = state.activePage.blocks.length - 1; index >= 0; index -= 1) {
    const block = state.activePage.blocks[index];

    if (block.type === "ai") {
      return block;
    }
  }

  return undefined;
}

function findBlockById(
  state: NodiaryState,
  blockId: string | undefined
): NodiaryBlock | undefined {
  if (!blockId) {
    return undefined;
  }

  return state.activePage.blocks.find((block) => block.id === blockId);
}

function normalizeAiTextArgs(args: Record<string, unknown>): Record<string, unknown> {
  const next = { ...args };

  for (const key of ["text", "content", "title"]) {
    const value = readStringArg(next, key);

    if (value !== undefined) {
      next[key] = normalizeAiDocumentText(value);
    }
  }

  return next;
}

function normalizeAiDocumentText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, (match) =>
      match
        .split("\n")
        .filter((line) => !line.trim().startsWith("```"))
        .join("\n")
    )
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createLocalAiRequestBlockText(command: string): string {
  const normalized = command.trim();
  const definitionSubject = parseDefinitionSubject(normalized);

  if (definitionSubject === "꽃") {
    return "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다. 보통 꽃잎, 꽃받침, 수술, 암술로 이루어지며 색과 향으로 곤충이나 바람 같은 매개를 끌어들입니다.";
  }

  if (definitionSubject) {
    return `${definitionSubject}의 정의는 ${definitionSubject}이 무엇인지 구분할 수 있게 하는 핵심 의미와 조건을 짧게 정리한 설명입니다.`;
  }

  return `${normalized || "요청한 내용"}에 대한 AI 답변을 이 블록에 정리합니다. 문서에 반영할 내용만 남기고 내부 실행 기록은 쓰지 않습니다.`;
}

function parseDefinitionSubject(command: string): string | undefined {
  const match = command.match(/^\s*['"“”‘’]?(.+?)['"“”‘’]?\s*(?:의|에 대한)\s*정의/);
  const subject = match?.[1]?.trim();

  return subject ? subject.replace(/[?.!。]+$/g, "") : undefined;
}

function extractProposedText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractProposedText(item);

      if (extracted) {
        return extracted;
      }
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of ["after", "to", "text", "content", "answer"]) {
      const extracted = extractProposedText(record[key]);

      if (extracted) {
        return extracted;
      }
    }
  }

  return undefined;
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
  const stateAfterRemoval = removeBlocksById(
    operatedState,
    action.applyPayload.removeBlockIds
  );

  if (operatedState !== state || stateAfterRemoval !== operatedState) {
    return stateAfterRemoval;
  }

  const insertAfterBlockId = action.applyPayload.insertAfterBlockId;
  const insertBlocks = (action.applyPayload.blocks ?? []).map(normalizeAiBlockText);
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

function normalizeAiBlockText(block: NodiaryBlock): NodiaryBlock {
  return {
    ...block,
    text: block.text === undefined ? undefined : normalizeAiDocumentText(block.text),
    title: block.title === undefined ? undefined : normalizeAiDocumentText(block.title)
  };
}

function removeBlocksById(
  state: NodiaryState,
  blockIds: string[] | undefined
): NodiaryState {
  const ids = new Set((blockIds ?? []).filter(Boolean));

  if (ids.size === 0) {
    return state;
  }

  return withActivePage(state, {
    ...state.activePage,
    blocks: state.activePage.blocks.filter((block) => !ids.has(block.id))
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
    const eventId =
      readStringArg(args, "eventId") ??
      findCalendarEventIdByTitle(
        state,
        readStringArg(args, "eventTitle") ??
          readStringArg(args, "title") ??
          readStringArg(args, "summary")
      );
    const date = readStringArg(args, "date");

    if (eventId && date) {
      return moveCalendarEvent(state, eventId, {
        date,
        time: readStringArg(args, "time")
      });
    }
  }

  if (operation.toolName === "createCalendarEvent") {
    return createCalendarEventFromArgs(state, args);
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

function findCalendarEventIdByTitle(
  state: NodiaryState,
  title: string | undefined
): string | undefined {
  const normalizedTitle = title?.trim();

  if (!normalizedTitle) {
    return undefined;
  }

  return getCalendarEventsInVisibleRange(state.sidebarCalendar).find((event) =>
    normalizedTitle.includes(event.title) || event.title.includes(normalizedTitle)
  )?.id;
}

function createCalendarEventFromArgs(
  state: NodiaryState,
  args: Record<string, unknown>
): NodiaryState {
  const title =
    readStringArg(args, "title") ??
    readStringArg(args, "eventTitle") ??
    readStringArg(args, "name") ??
    readStringArg(args, "summary");
  const start =
    readStringArg(args, "start") ??
    readStringArg(args, "startDateTime") ??
    readStringArg(args, "startsAt");
  const date =
    readStringArg(args, "date") ??
    parseDateFromDateTime(start);
  const time =
    readStringArg(args, "time") ??
    readStringArg(args, "startTime") ??
    parseTimeFromDateTime(start) ??
    "09:00";

  if (!title || !date) {
    return state;
  }

  const event: CalendarEvent = {
    id: createCalendarEventId(state.sidebarCalendar, title, date),
    title,
    time,
    date,
    source: "nodiary"
  };
  const movedEvents = state.sidebarCalendar.movedEvents ?? {};

  return {
    ...state,
    sidebarCalendar: buildSidebarCalendar(date.slice(0, 7), date, {
      ...movedEvents,
      [event.id]: event
    })
  };
}

function updateBlockTextFromArgs(
  state: NodiaryState,
  blockId: string,
  args: Record<string, unknown>
): NodiaryState {
  const rawText = readStringArg(args, "text") ?? readStringArg(args, "content");
  const rawTitle = readStringArg(args, "title");
  const text = rawText === undefined ? undefined : normalizeAiDocumentText(rawText);
  const title = rawTitle === undefined ? undefined : normalizeAiDocumentText(rawTitle);
  const type = readBlockTypeArg(args, "type");

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
          type: type ?? (block.type === "ai" && text !== undefined ? "paragraph" : block.type),
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

function readBlockTypeArg(
  args: Record<string, unknown>,
  key: string
): BlockType | undefined {
  const value = args[key];

  return value === "paragraph" ||
    value === "heading" ||
    value === "todo" ||
    value === "callout" ||
    value === "divider" ||
    value === "database" ||
    value === "ai"
    ? value
    : undefined;
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

function parseDateFromDateTime(value: string | undefined): string | undefined {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})/);

  return match?.[1];
}

function parseTimeFromDateTime(value: string | undefined): string | undefined {
  const match = value?.match(/T(\d{2}:\d{2})/);

  return match?.[1];
}

function createCalendarEventId(
  calendar: SidebarCalendar,
  title: string,
  date: string
) {
  const existingIds = new Set(
    [
      ...getCalendarEventsInVisibleRange(calendar),
      ...getScheduleForDate(date)
    ].map((event) => event.id)
  );
  const slug = slugifyId(`${date}-${title}`);
  let candidate = `ai-calendar-${slug}`;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `ai-calendar-${slug}-${index}`;
    index += 1;
  }

  return candidate;
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
