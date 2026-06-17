"use client";

import {
  AlertCircle,
  Bot,
  Brain,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Circle,
  Columns3,
  Database,
  FileText,
  GripVertical,
  Inbox,
  Loader2,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Text,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from "react";

import { cn } from "@/lib/utils";

import {
  addDatabaseRow,
  approveAiAction,
  changeCalendarMonth,
  createAiAnswerRun,
  createNewPage,
  createAiRun,
  createAiRunFromOperatorPlan,
  defaultNodiaryState,
  deleteBlock,
  deletePage,
  getNodiaryTodayIsoDate,
  getDatabaseRowsForView,
  insertBlockFromSlash,
  insertParagraphBlock,
  moveBlock,
  moveBlockByKeyboard,
  moveDatabaseRow,
  movePageNode,
  movePageNodeByKeyboard,
  prepareWorkspaceForStartup,
  rejectAiAction,
  renamePage,
  requestCalendarEventMove,
  selectCalendarDate,
  selectPage,
  switchDatabaseView,
  togglePageNodeExpanded,
  undoLastAiAction,
  updateDatabaseField,
  updateDatabaseFilter,
  updateDatabaseSort,
  updateBlockText,
  updateBlockTitle,
  updatePageTitle,
  updatePreference,
  updateTodoBlock,
  type AiModelRoute,
  type DatabaseBlock,
  type DatabaseField,
  type DatabaseFilter,
  type DatabaseRow,
  type DatabaseSort,
  type DatabaseViewType,
  type NodiaryBlock,
  type NodiaryState,
  type OperatorPlanDraft,
  type PageNode,
  type SlashInsertType
} from "./nodiary-model";

const slashItems: Array<{
  label: string;
  type: SlashInsertType;
  icon: typeof Text;
}> = [
  { label: "텍스트", type: "paragraph", icon: Text },
  { label: "제목 2", type: "heading", icon: FileText },
  { label: "할 일 목록", type: "todo", icon: CheckSquare },
  { label: "콜아웃", type: "callout", icon: MessageSquareText },
  { label: "데이터베이스 추가", type: "database", icon: Database },
  { label: "AI에게 이 블록 편집 요청", type: "ai", icon: Bot }
];

const databaseStatusLabel: Record<DatabaseRow["status"], string> = {
  backlog: "대기",
  doing: "진행",
  review: "검토",
  done: "완료"
};

const databaseFieldTypeLabel: Record<DatabaseField["type"], string> = {
  text: "텍스트",
  status: "상태",
  date: "날짜",
  person: "사람"
};

type CapturedItem = {
  id: string;
  text: string;
  createdLabel: string;
};

type AiRequestStatus = {
  command: string;
  message?: string;
  modelName: string;
  modelRoute: AiModelRoute;
  status: "reading" | "error";
};

type AiContextSnapshot = {
  calendarContext?: {
    selectedDate: string;
    schedule: NodiaryState["sidebarCalendar"]["schedule"];
  };
  memory: string[];
  pageTitle: string;
  selectedText: string;
};

const workspaceStorageKey = "nodiary.workspace.v2";
const captureStorageKey = "nodiary.quickCapture.v1";
const koreanWeekdayLabels = ["일", "월", "화", "수", "목", "금", "토"] as const;

const aiContextScopes = [
  { id: "currentPage", label: "현재 페이지" },
  { id: "selectedBlock", label: "선택 블록" },
  { id: "sidebarCalendar", label: "왼쪽 캘린더" },
  { id: "longTermMemory", label: "장기 메모리" }
] as const;

type AiContextScope = (typeof aiContextScopes)[number]["id"];

const defaultEnabledAiScopes = aiContextScopes.map((scope) => scope.id);
const defaultOpenAiModelName = "gpt-5.5";
const aiModelOptions: Array<{
  id: AiModelRoute;
  label: string;
  modelName: string;
  description: string;
}> = [
  {
    id: "planner",
    label: "균형 작업",
    modelName: defaultOpenAiModelName,
    description: "문서 편집과 승인 제안을 균형 있게 처리"
  },
  {
    id: "quick",
    label: "빠른 초안",
    modelName: defaultOpenAiModelName,
    description: "짧은 질문과 가벼운 정리 요청"
  },
  {
    id: "large-context",
    label: "긴 문맥",
    modelName: defaultOpenAiModelName,
    description: "긴 페이지와 여러 컨텍스트를 함께 검토"
  }
];

const accentTokens: Record<
  NodiaryState["preferences"]["accent"],
  {
    accent: string;
    accentHover: string;
    accentSoft: string;
  }
> = {
  teal: {
    accent: "#2f5d62",
    accentHover: "#284f53",
    accentSoft: "#e4efed"
  },
  slate: {
    accent: "#4d5662",
    accentHover: "#3f4752",
    accentSoft: "#eceff2"
  },
  blue: {
    accent: "#315f9c",
    accentHover: "#284f82",
    accentSoft: "#e7eef8"
  }
};

const workspaceThemeOptions: NodiaryState["preferences"]["theme"][] = [
  "system",
  "light",
  "dark",
  "lavender",
  "yellow",
  "navy"
];

export function NodiaryWorkspace({
  todayIsoDate = getNodiaryTodayIsoDate()
}: {
  todayIsoDate?: string;
} = {}) {
  const [state, setState] = useState(() =>
    defaultNodiaryState({ todayIsoDate })
  );
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSlashOpen, setSlashOpen] = useState(false);
  const [slashAnchorBlockId, setSlashAnchorBlockId] = useState("memo-body");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [aiRequestStatus, setAiRequestStatus] = useState<AiRequestStatus | null>(
    null
  );
  const [selectedAiModelRoute, setSelectedAiModelRoute] =
    useState<AiModelRoute>("planner");
  const [quickCapture, setQuickCapture] = useState("");
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activePageId, setActivePageId] = useState(state.activePage.id);
  const [isDesktopShell, setDesktopShell] = useState(false);
  const [enabledAiScopes, setEnabledAiScopes] = useState<AiContextScope[]>(
    defaultEnabledAiScopes
  );
  const quickCaptureInputRef = useRef<HTMLInputElement>(null);
  const hasHydratedWorkspaceRef = useRef(false);
  const hasLoadedCapturesRef = useRef(false);

  const documentWidthClass =
    state.preferences.documentWidth === "wide" ? "max-w-[900px]" : "max-w-[800px]";
  const densityClass =
    state.preferences.density === "compact" ? "nodiary-density-compact" : "";
  const themeStyle = getWorkspaceThemeStyle(
    state.preferences.accent,
    state.preferences.theme
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDesktopShell(runsInNodiaryDesktopShell());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAiPanelOpen(
        shouldOpenAiPanelFromStoredPreference(state.preferences.rightAiPanel)
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [state.preferences.rightAiPanel]);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateWorkspace() {
      function applyHydratedState(hydratedState: NodiaryState) {
        setState(hydratedState);
        setActivePageId(hydratedState.activePage.id);
        setAiPanelOpen(
          shouldOpenAiPanelFromStoredPreference(
            hydratedState.preferences.rightAiPanel
          )
        );
      }

      try {
        const headers = getNodiarySessionHeaders();
        const response = await fetch(
          "/api/nodiary/workspace",
          Object.keys(headers).length > 0
            ? {
                headers
              }
            : undefined
        );

        if (!response.ok) {
          throw new Error("Workspace API failed");
        }

        const payload = (await response.json()) as { state?: unknown };
        const hydratedState = readHydratedWorkspaceState(
          payload.state,
          todayIsoDate
        );

        if (!hydratedState) {
          throw new Error("Workspace API returned invalid state");
        }

        if (!isCancelled) {
          applyHydratedState(hydratedState);
        }
      } catch {
        if (!isCancelled) {
          applyHydratedState(loadStoredWorkspaceState(todayIsoDate));
        }
      } finally {
        if (!isCancelled) {
          hasHydratedWorkspaceRef.current = true;
        }
      }
    }

    void hydrateWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [todayIsoDate]);

  useEffect(() => {
    storeWorkspaceState(state);

    if (!hasHydratedWorkspaceRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void saveWorkspaceStateToApi(state);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedCaptures = loadStoredCaptures();

      hasLoadedCapturesRef.current = true;
      setCapturedItems(storedCaptures);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasLoadedCapturesRef.current) {
      return;
    }

    storeCaptures(capturedItems);
  }, [capturedItems]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }

      if (event.key === "Escape") {
        setSlashOpen(false);
        setCommandPaletteOpen(false);
        setMobileSidebarOpen(false);
        if (isAiPanelOpen && !isSettingsOpen) {
          setAiPanelOpen(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAiPanelOpen, isSettingsOpen]);

  function insertSlashBlock(type: SlashInsertType) {
    setState((current) => insertBlockFromSlash(current, slashAnchorBlockId, type));
    setSlashOpen(false);
  }

  function openSlash(anchorBlockId?: string) {
    setSlashAnchorBlockId(anchorBlockId ?? state.activePage.blocks.at(-1)?.id ?? "memo-body");
    setSlashOpen(true);
  }

  function closeSlash() {
    setSlashOpen(false);
  }

  function openPage(pageId: string) {
    setActivePageId(pageId);
    setState((current) => selectPage(current, pageId));
  }

  function createPage() {
    setState((current) => {
      const next = createNewPage(current);
      setActivePageId(next.activePage.id);
      setWorkspaceNotice("새 페이지를 만들었습니다.");
      return next;
    });
  }

  function renameExistingPage(pageId: string, title: string) {
    setState((current) => renamePage(current, pageId, title));
  }

  function removeExistingPage(pageId: string) {
    setState((current) => {
      const next = deletePage(current, pageId);

      setActivePageId(next.activePage.id);
      setWorkspaceNotice("페이지를 삭제했습니다.");
      return next;
    });
  }

  function focusQuickCapture() {
    quickCaptureInputRef.current?.focus();
    setWorkspaceNotice("빠른 메모 입력으로 이동했습니다.");
  }

  function openInbox() {
    setWorkspaceNotice(
      capturedItems.length > 0
        ? "최근 Inbox 캡처를 사이드바에 표시했습니다."
        : "아직 Inbox에 저장된 빠른 메모가 없습니다."
    );
  }

  function openSearch() {
    setCommandPaletteOpen(true);
  }

  function submitQuickCapture() {
    const text = quickCapture.trim();

    if (!text) {
      return;
    }

    const item: CapturedItem = {
      id: `capture-${Date.now()}`,
      text,
      createdLabel: "방금"
    };

    setCapturedItems((items) => [item, ...items].slice(0, 5));
    setQuickCapture("");
    setWorkspaceNotice("Inbox에 빠른 메모를 저장했습니다.");
  }

  async function sendAiCommand() {
    const command = aiInput.trim();

    if (!command) {
      return;
    }

    const modelOption = getAiModelOption(selectedAiModelRoute);
    const contextSnapshot = buildAiContextSnapshot(state, enabledAiScopes);

    setAiInput("");
    setAiNotice("");
    setAiRequestStatus({
      command,
      modelName: modelOption.modelName,
      modelRoute: selectedAiModelRoute,
      status: "reading"
    });

    if (!hasPendingAiRequestBlock(state) && shouldAnswerDirectly(command)) {
      await Promise.resolve();
      setState((current) =>
        createAiAnswerRun(
          current,
          command,
          createLocalAiAnswer(command, selectedAiModelRoute, contextSnapshot),
          selectedAiModelRoute,
          modelOption.modelName
        )
      );
      setAiRequestStatus(null);
      return;
    }

    try {
      const response = await fetch("/api/ai/operator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getNodiarySessionHeaders()
        },
        body: JSON.stringify({
          command,
          modelRoute: selectedAiModelRoute,
          pageTitle: contextSnapshot.pageTitle,
          selectedText: contextSnapshot.selectedText,
          memory: contextSnapshot.memory,
          calendarContext: contextSnapshot.calendarContext
        })
      });

      if (!response.ok) {
        throw new Error("AI operator route failed");
      }

      const payload = (await response.json()) as {
        model?: string;
        modelRoute?: AiModelRoute;
        plan?: OperatorPlanDraft;
      };

      if (!payload.plan) {
        throw new Error("AI operator route returned no plan");
      }

      setState((current) =>
        createAiRunFromOperatorPlan(
          current,
          command,
          payload.plan as OperatorPlanDraft,
          payload.modelRoute ?? selectedAiModelRoute,
          payload.model ?? getAiModelOption(selectedAiModelRoute).modelName
        )
      );
      setAiRequestStatus(null);
    } catch {
      const message = "AI 연결에 실패했습니다. 로컬 초안으로 대체 제안을 만들었습니다.";

      setAiNotice(message);
      setAiRequestStatus({
        command,
        message,
        modelName: "로컬 초안",
        modelRoute: selectedAiModelRoute,
        status: "error"
      });
      setState((current) =>
        createAiRun(current, command, selectedAiModelRoute, "로컬 초안")
      );
    }
  }

  function approvePendingAiAction(actionId: string) {
    setAiRequestStatus(null);
    setState((current) => approveAiAction(current, actionId));
  }

  function rejectPendingAiAction(actionId: string) {
    setAiRequestStatus(null);
    setState((current) => rejectAiAction(current, actionId));
  }

  return (
    <div
      className={cn(
        "flex h-dvh overflow-hidden bg-[var(--nodiary-app-bg)] text-[var(--nodiary-text)]",
        densityClass
      )}
      data-accent={state.preferences.accent}
      data-testid="nodiary-workspace"
      data-theme={state.preferences.theme}
      style={themeStyle}
    >
      <NodiarySidebar
        activePageId={activePageId}
        className="hidden lg:flex"
        onCalendarDateSelect={(isoDate) =>
          setState((current) => selectCalendarDate(current, isoDate))
        }
        onCalendarEventMove={(eventId, isoDate) =>
          setState((current) =>
            requestCalendarEventMove(current, eventId, {
              date: isoDate,
              time: "16:30"
            })
          )
        }
        onCalendarMonthChange={(direction) =>
          setState((current) => changeCalendarMonth(current, direction))
        }
        onMovePageNode={(nodeId, parentNodeId, index) =>
          setState((current) => movePageNode(current, nodeId, parentNodeId, index))
        }
        onMovePageNodeByKeyboard={(nodeId, direction) =>
          setState((current) => movePageNodeByKeyboard(current, nodeId, direction))
        }
        capturedItems={capturedItems}
        isDesktopShell={isDesktopShell}
        onCreatePage={createPage}
        onDeletePage={removeExistingPage}
        onFocusQuickCapture={focusQuickCapture}
        onOpenAi={() => setAiPanelOpen(true)}
        onOpenInbox={openInbox}
        onOpenSearch={openSearch}
        onOpenSettings={() => setSettingsOpen(true)}
        onQuickCapture={(value) => setQuickCapture(value)}
        onRenamePage={renameExistingPage}
        onSelectPage={openPage}
        onTogglePageExpanded={(nodeId) =>
          setState((current) => togglePageNodeExpanded(current, nodeId))
        }
        onSubmitQuickCapture={submitQuickCapture}
        quickCaptureInputRef={quickCaptureInputRef}
        quickCapture={quickCapture}
        state={state}
        todayIsoDate={todayIsoDate}
        workspaceNotice={workspaceNotice}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NodiaryTopBar
          isAiPanelOpen={isAiPanelOpen}
          onAnnounce={setWorkspaceNotice}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleAiPanel={() => setAiPanelOpen((open) => !open)}
          pageTitle={state.activePage.title}
        />
        <main
          className="min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--nodiary-canvas)]"
        >
          <DocumentCanvas
            blocks={state.activePage.blocks}
            documentWidthClass={documentWidthClass}
            isSlashOpen={isSlashOpen}
            onAddDatabaseRow={(databaseBlockId) =>
              setState((current) => addDatabaseRow(current, databaseBlockId))
            }
            onCloseSlash={closeSlash}
            onDeleteBlock={(blockId) =>
              setState((current) => deleteBlock(current, blockId))
            }
            onInsertParagraph={(text) =>
              setState((current) =>
                insertParagraphBlock(
                  current,
                  current.activePage.blocks.at(-1)?.id ?? "memo-body",
                  text
                )
              )
            }
            onMoveBlock={(blockId, beforeBlockId) =>
              setState((current) => moveBlock(current, blockId, beforeBlockId))
            }
            onMoveBlockByKeyboard={(blockId, direction) =>
              setState((current) => moveBlockByKeyboard(current, blockId, direction))
            }
            onMoveDatabaseRow={(databaseBlockId, rowId, patch) =>
              setState((current) =>
                moveDatabaseRow(current, databaseBlockId, rowId, patch)
              )
            }
            onUpdateDatabaseField={(databaseBlockId, fieldId, patch) =>
              setState((current) =>
                updateDatabaseField(current, databaseBlockId, fieldId, patch)
              )
            }
            onUpdateDatabaseFilter={(databaseBlockId, patch) =>
              setState((current) =>
                updateDatabaseFilter(current, databaseBlockId, patch)
              )
            }
            onUpdateDatabaseSort={(databaseBlockId, sort) =>
              setState((current) =>
                updateDatabaseSort(current, databaseBlockId, sort)
              )
            }
            onOpenSlash={openSlash}
            onSlashInsert={insertSlashBlock}
            onSwitchDatabaseView={(blockId, view) =>
              setState((current) => switchDatabaseView(current, blockId, view))
            }
            onUpdateBlockText={(blockId, text) =>
              setState((current) => updateBlockText(current, blockId, text))
            }
            onUpdateBlockTitle={(blockId, title) =>
              setState((current) => updateBlockTitle(current, blockId, title))
            }
            onUpdatePageTitle={(title) =>
              setState((current) => updatePageTitle(current, title))
            }
            onUpdateTodo={(blockId, patch) =>
              setState((current) => updateTodoBlock(current, blockId, patch))
            }
            pageProperties={state.activePage.properties}
            pageTitle={state.activePage.title}
            slashOpen={isSlashOpen}
            todayIsoDate={todayIsoDate}
          />
        </main>
      </div>

      {isAiPanelOpen ? (
        <>
          <button
            aria-label="AI 패널 닫기"
            className="fixed inset-0 z-40 bg-black/10 xl:hidden"
            onClick={() => setAiPanelOpen(false)}
            type="button"
          />
          <AiOperatorPanel
            className="fixed inset-y-0 right-0 z-50 block w-[min(380px,calc(100vw-24px))] shadow-[0_20px_70px_rgba(36,33,29,0.2)] xl:static xl:z-auto xl:block xl:w-[360px] xl:shadow-none"
            aiInput={aiInput}
            requestStatus={aiRequestStatus}
            aiState={state.ai}
            enabledScopes={enabledAiScopes}
            notice={aiNotice}
            onApprove={approvePendingAiAction}
            onChangeAiInput={setAiInput}
            onChangeModelRoute={setSelectedAiModelRoute}
            onReject={rejectPendingAiAction}
            onClose={() => setAiPanelOpen(false)}
            onSend={sendAiCommand}
            onToggleScope={(scope) =>
              setEnabledAiScopes((scopes) =>
                scopes.includes(scope)
                  ? scopes.filter((candidate) => candidate !== scope)
                  : [...scopes, scope]
              )
            }
            onUndo={() => setState((current) => undoLastAiAction(current))}
            selectedModelRoute={selectedAiModelRoute}
          />
        </>
      ) : null}

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="사이드바 닫기"
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileSidebarOpen(false)}
            type="button"
          />
          <NodiarySidebar
            activePageId={activePageId}
            className="relative z-10 flex h-full"
            onCalendarDateSelect={(isoDate) =>
              setState((current) => selectCalendarDate(current, isoDate))
            }
            onCalendarEventMove={(eventId, isoDate) =>
              setState((current) =>
                requestCalendarEventMove(current, eventId, {
                  date: isoDate,
                  time: "16:30"
                })
              )
            }
            onCalendarMonthChange={(direction) =>
              setState((current) => changeCalendarMonth(current, direction))
            }
            onMovePageNode={(nodeId, parentNodeId, index) =>
              setState((current) => movePageNode(current, nodeId, parentNodeId, index))
            }
            onMovePageNodeByKeyboard={(nodeId, direction) =>
              setState((current) => movePageNodeByKeyboard(current, nodeId, direction))
            }
            capturedItems={capturedItems}
            isDesktopShell={isDesktopShell}
            onClose={() => setMobileSidebarOpen(false)}
            onCreatePage={createPage}
            onDeletePage={removeExistingPage}
            onFocusQuickCapture={focusQuickCapture}
            onOpenAi={() => {
              setAiPanelOpen(true);
              setMobileSidebarOpen(false);
            }}
            onOpenInbox={openInbox}
            onOpenSearch={openSearch}
            onOpenSettings={() => {
              setSettingsOpen(true);
              setMobileSidebarOpen(false);
            }}
            onQuickCapture={(value) => setQuickCapture(value)}
            onRenamePage={renameExistingPage}
            onSelectPage={(pageId) => {
              openPage(pageId);
              setMobileSidebarOpen(false);
            }}
            onTogglePageExpanded={(nodeId) =>
              setState((current) => togglePageNodeExpanded(current, nodeId))
            }
            onSubmitQuickCapture={submitQuickCapture}
            quickCaptureInputRef={quickCaptureInputRef}
            quickCapture={quickCapture}
            state={state}
            todayIsoDate={todayIsoDate}
            workspaceNotice={workspaceNotice}
          />
        </div>
      ) : null}

      {commandPaletteOpen ? (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onFocusQuickCapture={() => {
            setCommandPaletteOpen(false);
            focusQuickCapture();
          }}
          onOpenAi={() => {
            setAiPanelOpen(true);
            setCommandPaletteOpen(false);
          }}
          onOpenInbox={() => {
            openInbox();
            setCommandPaletteOpen(false);
          }}
        />
      ) : null}

      {isSettingsOpen ? (
        <SettingsDialog
          memories={state.ai.memories}
          onClose={() => setSettingsOpen(false)}
          onUpdate={(patch) =>
            setState((current) => {
              const next = updatePreference(current, patch);

              if (patch.rightAiPanel === "closed") {
                setAiPanelOpen(false);
              }
              return next;
            })
          }
          preferences={state.preferences}
        />
      ) : null}
    </div>
  );
}

type SidebarProps = {
  activePageId: string;
  capturedItems: CapturedItem[];
  className?: string;
  isDesktopShell: boolean;
  quickCapture: string;
  quickCaptureInputRef: RefObject<HTMLInputElement | null>;
  state: ReturnType<typeof defaultNodiaryState>;
  todayIsoDate: string;
  onCalendarDateSelect: (isoDate: string) => void;
  onCalendarEventMove: (eventId: string, isoDate: string) => void;
  onCalendarMonthChange: (direction: "previous" | "next") => void;
  onClose?: () => void;
  onCreatePage: () => void;
  onDeletePage: (pageId: string) => void;
  onFocusQuickCapture: () => void;
  onMovePageNode: (nodeId: string, parentNodeId: string, index: number) => void;
  onMovePageNodeByKeyboard: (nodeId: string, direction: "up" | "down") => void;
  onOpenAi: () => void;
  onOpenInbox: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onQuickCapture: (value: string) => void;
  onRenamePage: (pageId: string, title: string) => void;
  onSelectPage: (pageId: string) => void;
  onSubmitQuickCapture: () => void;
  onTogglePageExpanded: (nodeId: string) => void;
  workspaceNotice: string;
};

function NodiarySidebar({
  activePageId,
  capturedItems,
  className,
  isDesktopShell,
  onCalendarDateSelect,
  onCalendarEventMove,
  onCalendarMonthChange,
  onClose,
  onCreatePage,
  onDeletePage,
  onFocusQuickCapture,
  onMovePageNode,
  onMovePageNodeByKeyboard,
  onOpenAi,
  onOpenInbox,
  onOpenSearch,
  onOpenSettings,
  onQuickCapture,
  onRenamePage,
  onSelectPage,
  onSubmitQuickCapture,
  onTogglePageExpanded,
  quickCapture,
  quickCaptureInputRef,
  todayIsoDate,
  workspaceNotice,
  state
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative w-[320px] shrink-0 flex-col overflow-hidden border-r border-[var(--nodiary-border)] bg-[var(--nodiary-sidebar)] px-3 py-3",
        isDesktopShell && "pt-[52px]",
        className
      )}
      data-testid="nodiary-sidebar"
    >
      {isDesktopShell ? (
        <div
          aria-hidden="true"
          className="nodiary-window-drag absolute inset-x-0 top-0 h-[52px]"
          data-testid="nodiary-sidebar-drag-strip"
        />
      ) : null}
      <div
        className="nodiary-window-drag flex h-9 shrink-0 items-center gap-2 px-2"
        data-testid="nodiary-brand-row"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--nodiary-logo-bg)] text-[var(--nodiary-logo-fg)]"
            data-testid="nodiary-brand-mark"
          >
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="truncate text-[12px] font-bold tracking-[0.14em] text-[var(--nodiary-muted-strong)]">
            NODIARY
          </span>
        </div>
        {onClose ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="설정 열기"
              className="nodiary-window-no-drag flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-hover)]"
              onClick={onOpenSettings}
              type="button"
            >
              <Settings className="h-4 w-4 text-[var(--nodiary-muted)]" aria-hidden="true" />
            </button>
            <button
              aria-label="사이드바 닫기"
              className="nodiary-window-no-drag flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-hover)]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4 text-[var(--nodiary-muted)]" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mt-3 space-y-1">
          <SidebarUtilityRow icon={Search} label="검색" onClick={onOpenSearch} />
          <SidebarUtilityRow icon={Inbox} label="INBOX" onClick={onOpenInbox} />
          <SidebarUtilityRow icon={Plus} label="QUICK CAPTURE" onClick={onFocusQuickCapture} />
          <SidebarUtilityRow icon={Sparkles} label="AI 글쓰기" onClick={onOpenAi} />
        </div>

        <div className="mt-4 border-t border-[var(--nodiary-border)] pt-4">
          <div className="flex h-8 items-center justify-between px-2">
            <div className="text-[13px] font-semibold text-[var(--nodiary-text-strong)]">
              {state.sidebarCalendar.monthLabel}
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="이전 달"
                className="flex h-8 w-8 items-center justify-center rounded text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
                onClick={() => onCalendarMonthChange("previous")}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                aria-label="오늘"
                className="h-8 rounded px-2 text-[12px] font-medium text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
                onClick={() => onCalendarDateSelect(todayIsoDate)}
                type="button"
              >
                오늘
              </button>
              <button
                aria-label="다음 달"
                className="flex h-8 w-8 items-center justify-center rounded text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
                onClick={() => onCalendarMonthChange("next")}
                type="button"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <MiniCalendar
            onSelectDate={onCalendarDateSelect}
            onEventDrop={onCalendarEventMove}
            selectedDate={state.sidebarCalendar.selectedDate}
            days={state.sidebarCalendar.days}
            monthLabel={state.sidebarCalendar.monthLabel}
          />
          <div className="mt-3 space-y-2 px-1">
            {state.sidebarCalendar.schedule.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel-muted)] px-3 py-2 text-[12px] leading-5 text-[var(--nodiary-muted-soft)]">
                선택한 날짜에 일정이 없습니다.
              </div>
            ) : null}
            {state.sidebarCalendar.schedule.map((event) => (
              <button
                aria-label={`일정 드래그: ${event.title}`}
                key={event.id}
                className="flex min-h-11 w-full items-center gap-2 rounded-md bg-[var(--nodiary-selected)] px-2.5 py-2 text-left hover:bg-[var(--nodiary-hover)]"
                draggable
                onDragStart={(dragEvent) => {
                  dragEvent.dataTransfer.setData(
                    "text/nodiary-calendar-event",
                    event.id
                  );
                  dragEvent.dataTransfer.setData("text/plain", event.id);
                }}
                type="button"
              >
                <span className="flex h-7 min-w-[44px] items-center text-[12px] font-semibold leading-none text-[var(--nodiary-text-strong)]">
                  {event.time}
                </span>
                <span className="flex min-h-7 min-w-0 items-center text-[12px] leading-5 text-[var(--nodiary-muted)]">
                  {event.title}
                  {event.conflictRisk ? (
                    <span className="ml-2 rounded bg-[var(--nodiary-warning-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--nodiary-warning-text)]">
                      {event.conflictRisk} risk
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--nodiary-border)] pt-3">
          <div className="flex h-7 items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--nodiary-muted-soft)]">
              Pages
            </span>
            <button
              aria-label="새 페이지"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-hover)]"
              onClick={onCreatePage}
              type="button"
            >
              <Plus className="h-4 w-4 text-[var(--nodiary-muted-soft)]" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="페이지 트리" className="mt-1 space-y-0.5">
            {state.pageTree.map((node) => (
              <PageTreeRow
                activePageId={activePageId}
                key={node.id}
                node={node}
                onDeletePage={onDeletePage}
                onMovePageNode={onMovePageNode}
                onMovePageNodeByKeyboard={onMovePageNodeByKeyboard}
                onRenamePage={onRenamePage}
                onSelectPage={onSelectPage}
                onTogglePageExpanded={onTogglePageExpanded}
              />
            ))}
          </nav>
        </div>
      </div>

      <div className="shrink-0">
        <form
          className="mt-3 border-t border-[var(--nodiary-border)] pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitQuickCapture();
          }}
        >
          <label className="px-2 text-[11px] font-semibold text-[var(--nodiary-muted-soft)]">
            QUICK CAPTURE
            <input
              ref={quickCaptureInputRef}
              className="mt-2 h-10 w-full rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[12px] text-[var(--nodiary-text)] outline-none placeholder:text-[var(--nodiary-placeholder)] focus:border-[var(--nodiary-accent)]"
              onChange={(event) => onQuickCapture(event.target.value)}
              placeholder="떠오른 생각을 Inbox로"
              value={quickCapture}
            />
          </label>
        </form>

        {workspaceNotice ? (
          <div className="mt-2 rounded-md bg-[var(--nodiary-panel)] px-2.5 py-2 text-[12px] leading-5 text-[var(--nodiary-accent)]">
            {workspaceNotice}
          </div>
        ) : null}

        {capturedItems.length > 0 ? (
          <div className="mt-2 space-y-1">
            {capturedItems.slice(0, 2).map((item) => (
              <div
                className="rounded-md bg-[var(--nodiary-selected)] px-2.5 py-2 text-[12px] leading-5 text-[var(--nodiary-muted)]"
                key={item.id}
              >
                <div className="font-medium text-[var(--nodiary-text-strong)]">{item.createdLabel}</div>
                <div className="truncate">{item.text}</div>
              </div>
            ))}
          </div>
        ) : null}

        <button
          aria-label="설정 열기"
          className="mt-3 flex h-10 w-full items-center gap-2 rounded-md px-2 text-[13px] text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)]"
          onClick={onOpenSettings}
          type="button"
        >
          <span className="flex h-5 w-5 items-center justify-center">
            <Settings className="h-4 w-4" aria-hidden="true" />
          </span>
          설정
        </button>
      </div>
    </aside>
  );
}

function SidebarUtilityRow({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Search;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-semibold tracking-[0.04em] text-[var(--nodiary-muted-soft)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 truncate leading-none">{label}</span>
    </button>
  );
}

function PageTreeRow({
  activePageId,
  node,
  onDeletePage,
  onMovePageNode,
  onMovePageNodeByKeyboard,
  onRenamePage,
  onSelectPage,
  onTogglePageExpanded,
  depth = 0
}: {
  activePageId: string;
  node: PageNode;
  onDeletePage: (pageId: string) => void;
  onMovePageNode: (nodeId: string, parentNodeId: string, index: number) => void;
  onMovePageNodeByKeyboard: (nodeId: string, direction: "up" | "down") => void;
  onRenamePage: (pageId: string, title: string) => void;
  onSelectPage: (pageId: string) => void;
  onTogglePageExpanded: (nodeId: string) => void;
  depth?: number;
}) {
  const hasChildren = Boolean(node.children?.length);
  const ChevronIcon = node.expanded ? ChevronDown : ChevronRight;
  const [isEditing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(node.title);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [isEditing]);

  function commitTitleEdit() {
    const nextTitle = draftTitle.trim();

    if (nextTitle && nextTitle !== node.title) {
      onRenamePage(node.id, nextTitle);
    } else {
      setDraftTitle(node.title);
    }

    setEditing(false);
  }

  return (
    <div
      aria-label={`페이지 드롭 위치: ${node.title}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const draggedNodeId =
          event.dataTransfer.getData("text/nodiary-page") ||
          event.dataTransfer.getData("text/plain");

        if (draggedNodeId) {
          onMovePageNode(draggedNodeId, node.id, node.children?.length ?? 0);
        }
      }}
    >
      <div
        className={cn(
          "group/page-row flex h-8 w-full items-center gap-1 rounded-md pr-1 text-left text-[13px] text-[var(--nodiary-muted-strong)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)]",
          activePageId === node.id && "bg-[var(--nodiary-selected)] font-medium text-[var(--nodiary-text)]"
        )}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <span
          className="flex h-6 w-5 shrink-0 items-center justify-center"
          data-testid={`page-tree-chevron-slot-${node.id}`}
        >
          {hasChildren ? (
            <button
              aria-label={`페이지 펼치기/접기: ${node.title}`}
              className="flex h-6 w-5 items-center justify-center rounded text-[var(--nodiary-icon-muted)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-muted)]"
              onClick={() => onTogglePageExpanded(node.id)}
              type="button"
            >
              <ChevronIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </span>
        <span
          className="flex h-6 w-5 shrink-0 items-center justify-center"
          data-testid={`page-tree-drag-slot-${node.id}`}
        >
          <button
            aria-label={`페이지 드래그: ${node.title}`}
            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
            className="flex h-6 w-5 items-center justify-center rounded text-[var(--nodiary-icon-muted)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-muted)]"
            draggable
            onKeyDown={(event) => {
              if (!event.altKey) {
                return;
              }

              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                onMovePageNodeByKeyboard(
                  node.id,
                  event.key === "ArrowUp" ? "up" : "down"
                );
              }
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/nodiary-page", node.id);
              event.dataTransfer.setData("text/plain", node.id);
            }}
            type="button"
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
        {isEditing ? (
          <input
            aria-label={`페이지 제목 편집: ${node.title}`}
            className="min-w-0 flex-1 rounded border border-[var(--nodiary-accent)] bg-[var(--nodiary-panel)] px-1 text-[13px] leading-6 text-[var(--nodiary-text)] outline-none"
            onBlur={commitTitleEdit}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTitleEdit();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                setDraftTitle(node.title);
                setEditing(false);
              }
            }}
            ref={editInputRef}
            value={draftTitle}
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate text-left leading-none"
            data-testid={`page-tree-title-${node.id}`}
            data-title-slot="page-tree-title"
            onClick={() => onSelectPage(node.id)}
            type="button"
          >
            {node.title}
          </button>
        )}
        <div className="flex w-[48px] shrink-0 items-center justify-end gap-0.5 opacity-100 md:opacity-0 md:group-focus-within/page-row:opacity-100 md:group-hover/page-row:opacity-100">
          <button
            aria-label={`페이지 이름 변경: ${node.title}`}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--nodiary-icon-muted)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)]"
            onClick={() => {
              setDraftTitle(node.title);
              setEditing(true);
            }}
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            aria-label={`페이지 삭제: ${node.title}`}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--nodiary-icon-muted)] hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)]"
            onClick={() => onDeletePage(node.id)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {node.expanded && node.children
        ? node.children.map((child) => (
            <PageTreeRow
              activePageId={activePageId}
              depth={depth + 1}
              key={child.id}
              node={child}
              onDeletePage={onDeletePage}
              onMovePageNode={onMovePageNode}
              onMovePageNodeByKeyboard={onMovePageNodeByKeyboard}
              onRenamePage={onRenamePage}
              onSelectPage={onSelectPage}
              onTogglePageExpanded={onTogglePageExpanded}
            />
          ))
        : null}
    </div>
  );
}

function MiniCalendar({
  days,
  monthLabel,
  onEventDrop,
  onSelectDate
}: {
  days: ReturnType<typeof defaultNodiaryState>["sidebarCalendar"]["days"];
  monthLabel: string;
  selectedDate: string;
  onEventDrop?: (eventId: string, isoDate: string) => void;
  onSelectDate: (isoDate: string) => void;
}) {
  return (
    <div className="mt-2 px-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--nodiary-muted-soft)]">
        {koreanWeekdayLabels.map((day) => (
          <div className="h-6 leading-6" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div
        aria-label={monthLabel}
        className="grid grid-cols-7 gap-1"
        role="grid"
      >
        {days.map((day) => (
          <div aria-selected={day.isSelected} key={day.id} role="gridcell">
            <button
              aria-current={day.isToday ? "date" : undefined}
              aria-label={`${day.isoDate}${day.isSelected ? " 선택됨" : ""}`}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-md text-[12px] leading-none text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]",
                day.hasEvent && "bg-[var(--nodiary-selected)]",
                day.isSelected && "bg-[var(--nodiary-accent)] font-semibold text-white hover:bg-[var(--nodiary-accent)]"
              )}
              onClick={() => onSelectDate(day.isoDate)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const eventId =
                  event.dataTransfer.getData("text/nodiary-calendar-event") ||
                  event.dataTransfer.getData("text/plain");

                if (eventId) {
                  onEventDrop?.(eventId, day.isoDate);
                }
              }}
              type="button"
            >
              {day.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodiaryTopBar({
  isAiPanelOpen,
  onAnnounce,
  onOpenCommandPalette,
  onOpenMobileSidebar,
  onOpenSettings,
  onToggleAiPanel,
  pageTitle
}: {
  isAiPanelOpen: boolean;
  pageTitle: string;
  onAnnounce: (message: string) => void;
  onOpenCommandPalette: () => void;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onToggleAiPanel: () => void;
}) {
  return (
    <header
      className="nodiary-window-drag flex h-12 shrink-0 items-center justify-between border-b border-[var(--nodiary-border)] bg-[var(--nodiary-panel)] px-2 text-[13px] sm:px-3"
      data-testid="nodiary-topbar"
    >
      <div className="flex min-w-0 items-center gap-2 text-[var(--nodiary-muted-soft)]">
        <button
          aria-label="사이드바 열기"
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)] lg:hidden"
          onClick={onOpenMobileSidebar}
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="hidden sm:inline">Pages</span>
        <ChevronRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        <span className="truncate font-medium text-[var(--nodiary-text-strong)]">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-1 text-[var(--nodiary-muted)]">
        <button
          aria-label="댓글"
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)] sm:w-auto sm:gap-1.5 sm:px-2"
          onClick={() => onAnnounce("댓글 패널은 다음 검수 패스에서 연결할 예정입니다.")}
          type="button"
        >
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">댓글</span>
        </button>
        <button
          aria-label="공유"
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)] sm:w-auto sm:gap-1.5 sm:px-2"
          onClick={() => onAnnounce("공유 기능은 로컬 문서 보존 검수 이후 연결합니다.")}
          type="button"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">공유</span>
        </button>
        <button
          aria-label={isAiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
          onClick={onToggleAiPanel}
          type="button"
        >
          {isAiPanelOpen ? (
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          aria-label="설정 열기"
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
          onClick={onOpenSettings}
          type="button"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          aria-label="더보기"
          className="nodiary-window-no-drag flex h-10 w-10 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
          onClick={onOpenCommandPalette}
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function DocumentCanvas({
  blocks,
  documentWidthClass,
  isSlashOpen,
  onAddDatabaseRow,
  onCloseSlash,
  onDeleteBlock,
  onInsertParagraph,
  onMoveBlock,
  onMoveBlockByKeyboard,
  onMoveDatabaseRow,
  onOpenSlash,
  onSlashInsert,
  onSwitchDatabaseView,
  onUpdateDatabaseField,
  onUpdateDatabaseFilter,
  onUpdateDatabaseSort,
  onUpdateBlockText,
  onUpdateBlockTitle,
  onUpdatePageTitle,
  onUpdateTodo,
  pageProperties,
  pageTitle,
  todayIsoDate
}: {
  blocks: NodiaryBlock[];
  documentWidthClass: string;
  isSlashOpen: boolean;
  pageProperties: ReturnType<typeof defaultNodiaryState>["activePage"]["properties"];
  pageTitle: string;
  slashOpen: boolean;
  todayIsoDate: string;
  onAddDatabaseRow: (databaseBlockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveBlockByKeyboard: (blockId: string, direction: "up" | "down") => void;
  onMoveBlock: (blockId: string, beforeBlockId: string) => void;
  onMoveDatabaseRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  onUpdateDatabaseField: (
    databaseBlockId: string,
    fieldId: string,
    patch: Partial<Pick<DatabaseField, "name" | "type">>
  ) => void;
  onUpdateDatabaseFilter: (
    databaseBlockId: string,
    patch: Partial<DatabaseFilter>
  ) => void;
  onUpdateDatabaseSort: (databaseBlockId: string, sort: DatabaseSort) => void;
  onCloseSlash: () => void;
  onInsertParagraph: (text: string) => void;
  onOpenSlash: (anchorBlockId?: string) => void;
  onSlashInsert: (type: SlashInsertType) => void;
  onSwitchDatabaseView: (blockId: string, view: DatabaseViewType) => void;
  onUpdateBlockText: (blockId: string, text: string) => void;
  onUpdateBlockTitle: (blockId: string, title: string) => void;
  onUpdatePageTitle: (title: string) => void;
  onUpdateTodo: (
    blockId: string,
    patch: Parameters<typeof updateTodoBlock>[2]
  ) => void;
}) {
  return (
    <div className={cn("mx-auto min-h-full px-6 pb-24 pt-14 sm:px-8", documentWidthClass)}>
      <h1
        className="min-h-[68px] text-[38px] font-bold leading-tight tracking-normal text-[var(--nodiary-text)] outline-none sm:text-[42px]"
        contentEditable
        onBlur={(event) =>
          onUpdatePageTitle(event.currentTarget.textContent ?? "")
        }
        suppressContentEditableWarning
      >
        {pageTitle}
      </h1>
      <div className="mt-4 grid max-w-xl grid-cols-[88px_1fr] gap-x-4 gap-y-3 text-[14px]">
        {pageProperties.map((property) => (
          <div className="contents" key={property.label}>
            <div className="text-[var(--nodiary-muted-strong)]">{property.label}</div>
            <div className="font-medium text-[var(--nodiary-text-strong)]">{property.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-1">
        {blocks.map((block) => (
          <DocumentBlock
            block={block}
            key={block.id}
            onAddDatabaseRow={onAddDatabaseRow}
            onDeleteBlock={onDeleteBlock}
            onMoveBlockByKeyboard={onMoveBlockByKeyboard}
            onMoveBlock={onMoveBlock}
            onMoveDatabaseRow={onMoveDatabaseRow}
            onOpenSlash={onOpenSlash}
            onSwitchDatabaseView={onSwitchDatabaseView}
            onUpdateDatabaseField={onUpdateDatabaseField}
            onUpdateDatabaseFilter={onUpdateDatabaseFilter}
            onUpdateDatabaseSort={onUpdateDatabaseSort}
            onUpdateBlockText={onUpdateBlockText}
            onUpdateBlockTitle={onUpdateBlockTitle}
            onUpdateTodo={onUpdateTodo}
            todayIsoDate={todayIsoDate}
          />
        ))}
      </div>

      <div className="relative mt-4 pl-9">
        <button
          aria-label="빈 블록 입력"
          className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-[14px] text-[var(--nodiary-muted-soft)] outline-none hover:bg-[var(--nodiary-hover)] focus:bg-[var(--nodiary-hover)]"
          onKeyDown={(event) => {
            if (isSlashOpen && handleSlashMenuKeyDown(event, onSlashInsert, onCloseSlash)) {
              return;
            }

            if (event.key === "/") {
              event.preventDefault();
              onOpenSlash();
              return;
            }

            if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
              event.preventDefault();
              onInsertParagraph(event.key);
            }
          }}
          role="textbox"
          type="button"
        >
          빈 블록. 여기에 바로 입력하거나 / 를 누르세요.
        </button>
        {isSlashOpen ? <SlashMenu onClose={onCloseSlash} onInsert={onSlashInsert} /> : null}
      </div>
    </div>
  );
}

function DocumentBlock({
  block,
  onAddDatabaseRow,
  onDeleteBlock,
  onMoveBlock,
  onMoveBlockByKeyboard,
  onMoveDatabaseRow,
  onOpenSlash,
  onSwitchDatabaseView,
  onUpdateDatabaseField,
  onUpdateDatabaseFilter,
  onUpdateDatabaseSort,
  onUpdateBlockText,
  onUpdateBlockTitle,
  onUpdateTodo,
  todayIsoDate
}: {
  block: NodiaryBlock;
  onAddDatabaseRow: (databaseBlockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, beforeBlockId: string) => void;
  onMoveBlockByKeyboard: (blockId: string, direction: "up" | "down") => void;
  onMoveDatabaseRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  onUpdateDatabaseField: (
    databaseBlockId: string,
    fieldId: string,
    patch: Partial<Pick<DatabaseField, "name" | "type">>
  ) => void;
  onUpdateDatabaseFilter: (
    databaseBlockId: string,
    patch: Partial<DatabaseFilter>
  ) => void;
  onUpdateDatabaseSort: (databaseBlockId: string, sort: DatabaseSort) => void;
  onOpenSlash: (anchorBlockId?: string) => void;
  onSwitchDatabaseView: (blockId: string, view: DatabaseViewType) => void;
  onUpdateBlockText: (blockId: string, text: string) => void;
  onUpdateBlockTitle: (blockId: string, title: string) => void;
  onUpdateTodo: (
    blockId: string,
    patch: Parameters<typeof updateTodoBlock>[2]
  ) => void;
  todayIsoDate: string;
}) {
  return (
    <div
      aria-label={`블록 드롭 위치: ${getBlockLabel(block)}`}
      className="group relative grid min-h-9 grid-cols-[28px_1fr] items-start gap-2 rounded-md"
      data-testid="document-block"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const blockId =
          event.dataTransfer.getData("text/nodiary-block") ||
          event.dataTransfer.getData("text/plain");

        if (blockId) {
          onMoveBlock(blockId, block.id);
        }
      }}
    >
      <button
        aria-label={`블록 삭제: ${getBlockLabel(block)}`}
        className={cn(
          "absolute right-1 z-10 flex h-7 w-7 items-center justify-center rounded text-[var(--nodiary-icon-muted)] opacity-100 hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-text)] sm:right-[-30px] md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100",
          block.type === "database" ? "top-1" : "top-1/2 -translate-y-1/2"
        )}
        onClick={() => onDeleteBlock(block.id)}
        type="button"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="flex h-9 items-center justify-center text-[var(--nodiary-icon-faint)] opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <button
          aria-label={`블록 드래그: ${getBlockLabel(block)}`}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--nodiary-hover)] hover:text-[var(--nodiary-muted)]"
          draggable
          onKeyDown={(event) => {
            if (!event.altKey) {
              return;
            }

            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              onMoveBlockByKeyboard(
                block.id,
                event.key === "ArrowUp" ? "up" : "down"
              );
            }
          }}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/nodiary-block", block.id);
            event.dataTransfer.setData("text/plain", block.id);
          }}
          type="button"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-w-0">
        {block.type === "heading" ? (
          <h2
            className="min-h-10 rounded px-1 text-[26px] font-bold leading-10 tracking-normal outline-none hover:bg-[var(--nodiary-hover)]"
            contentEditable
            onBlur={(event) =>
              onUpdateBlockTitle(block.id, event.currentTarget.textContent ?? "")
            }
            suppressContentEditableWarning
          >
            {block.title}
          </h2>
        ) : null}
        {block.type === "todo" ? (
          <TodoBlock block={block} onUpdate={onUpdateTodo} />
        ) : null}
        {block.type === "paragraph" ? (
          <RichTextBlock
            blockId={block.id}
            onChange={onUpdateBlockText}
            onOpenSlash={onOpenSlash}
            text={block.text ?? ""}
          />
        ) : null}
        {block.type === "callout" ? (
          <div
            className="flex min-h-10 items-center gap-3 rounded-md bg-[var(--nodiary-soft)] px-3 py-2 text-[15px] leading-7 text-[var(--nodiary-text-strong)]"
            data-testid={`callout-block-${block.id}`}
          >
            <MessageSquareText
              className="h-4 w-4 shrink-0 text-[var(--nodiary-muted)]"
              data-testid={`callout-icon-${block.id}`}
            />
            <RichTextBlock
              blockId={block.id}
              onChange={onUpdateBlockText}
              onOpenSlash={onOpenSlash}
              text={block.text ?? ""}
              variant="callout"
            />
          </div>
        ) : null}
        {block.type === "database" && block.database ? (
          <DatabaseViewBlock
            blockId={block.id}
            database={block.database}
            onAddRow={onAddDatabaseRow}
            onMoveRow={onMoveDatabaseRow}
            onSwitchView={onSwitchDatabaseView}
            onUpdateField={onUpdateDatabaseField}
            onUpdateFilter={onUpdateDatabaseFilter}
            onUpdateSort={onUpdateDatabaseSort}
            todayIsoDate={todayIsoDate}
          />
        ) : null}
        {block.type === "ai" ? (
          <div className="rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-3 py-2 text-[14px] text-[var(--nodiary-muted)]">
            <Bot className="mr-2 inline h-4 w-4 text-[var(--nodiary-accent)]" />
            {block.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getBlockLabel(block: NodiaryBlock) {
  if (block.id === "memo-body") {
    return "메모 본문";
  }

  return block.title ?? block.text?.slice(0, 24) ?? block.id;
}

function RichTextBlock({
  blockId,
  onChange,
  onOpenSlash,
  text,
  variant = "paragraph"
}: {
  blockId: string;
  onChange: (blockId: string, text: string) => void;
  onOpenSlash: (anchorBlockId?: string) => void;
  text: string;
  variant?: "paragraph" | "callout";
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: `<p>${escapeHtml(text)}</p>`,
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(blockId, editor.getText());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getText() !== text) {
      editor.commands.setContent(`<p>${escapeHtml(text)}</p>`, {
        emitUpdate: false
      });
    }
  }, [editor, text]);

  return (
    <EditorContent
      className={cn(
        "nodiary-tiptap min-h-8 rounded px-1 text-[15px] leading-8 outline-none hover:bg-[var(--nodiary-hover)]",
        variant === "callout" && "flex-1 hover:bg-transparent"
      )}
      editor={editor}
      onKeyDown={(event) => {
        if (event.key === "/" && editor?.getText().trim() === "") {
          event.preventDefault();
          onOpenSlash(blockId);
        }
      }}
    />
  );
}

function TodoBlock({
  block,
  onUpdate
}: {
  block: NodiaryBlock;
  onUpdate: (
    blockId: string,
    patch: Parameters<typeof updateTodoBlock>[2]
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const text = block.text ?? "";

  return (
    <div className="flex min-h-9 items-center gap-3 rounded px-1 text-[15px] leading-8 text-[var(--nodiary-text-strong)] hover:bg-[var(--nodiary-hover)]">
      <button
        aria-label={block.checked ? "할 일 완료됨" : "할 일 미완료"}
        aria-pressed={Boolean(block.checked)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded border sm:h-[22px] sm:w-[22px]",
          block.checked
            ? "border-[var(--nodiary-accent)] bg-[var(--nodiary-accent)] text-white"
            : "border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)]"
        )}
        onClick={(event) => {
          event.preventDefault();
          onUpdate(block.id, { checked: !block.checked });
        }}
        type="button"
      >
        {block.checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </button>
      <input
        aria-label={`할 일 텍스트: ${text}`}
        className={cn(
          "h-9 min-w-0 flex-1 rounded bg-transparent px-1 outline-none focus:bg-[var(--nodiary-panel)]",
          block.checked &&
            !isEditing &&
            "text-[var(--nodiary-muted-soft)] line-through"
        )}
        onBlur={() => setIsEditing(false)}
        onChange={(event) => onUpdate(block.id, { text: event.target.value })}
        onFocus={() => setIsEditing(true)}
        value={text}
      />
    </div>
  );
}

function SlashMenu({
  onClose,
  onInsert
}: {
  onClose: () => void;
  onInsert: (type: SlashInsertType) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  function selectActiveItem() {
    onInsert(slashItems[activeIndex]?.type ?? "paragraph");
  }

  return (
    <div
      aria-activedescendant={`slash-item-${activeIndex}`}
      className="absolute bottom-11 left-0 right-0 z-20 max-h-[min(320px,calc(100vh-160px))] overflow-y-auto rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] shadow-[0_12px_36px_rgba(36,33,29,0.12)] sm:left-9 sm:right-auto sm:w-[320px]"
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % slashItems.length);
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((index) => (index - 1 + slashItems.length) % slashItems.length);
        }

        if (event.key === "Enter") {
          event.preventDefault();
          selectActiveItem();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      role="menu"
      ref={menuRef}
      tabIndex={-1}
    >
      <div className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2 text-[12px] font-medium text-[var(--nodiary-muted)]">
        / 입력 중
      </div>
      <div className="py-1">
        {slashItems.map((item, index) => (
          <button
            className={cn(
              "flex h-11 w-full items-center gap-3 px-3 text-left text-[14px] text-[var(--nodiary-text-strong)] hover:bg-[var(--nodiary-hover)]",
              activeIndex === index && "bg-[var(--nodiary-hover)]"
            )}
            id={`slash-item-${index}`}
            key={item.label}
            onClick={() => onInsert(item.type)}
            onMouseEnter={() => setActiveIndex(index)}
            role="menuitem"
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded border border-[var(--nodiary-border-strong)] text-[var(--nodiary-muted)]">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function handleSlashMenuKeyDown(
  event: KeyboardEvent,
  onInsert: (type: SlashInsertType) => void,
  onClose: () => void
) {
  if (event.key === "Enter") {
    event.preventDefault();
    onInsert(slashItems[0].type);
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return true;
  }

  return event.key === "ArrowDown" || event.key === "ArrowUp";
}

function DatabaseViewBlock({
  blockId,
  database,
  onAddRow,
  onMoveRow,
  onSwitchView,
  onUpdateField,
  onUpdateFilter,
  onUpdateSort,
  todayIsoDate
}: {
  blockId: string;
  database: DatabaseBlock;
  onAddRow: (databaseBlockId: string) => void;
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  onSwitchView: (blockId: string, view: DatabaseViewType) => void;
  onUpdateField: (
    databaseBlockId: string,
    fieldId: string,
    patch: Partial<Pick<DatabaseField, "name" | "type">>
  ) => void;
  onUpdateFilter: (
    databaseBlockId: string,
    patch: Partial<DatabaseFilter>
  ) => void;
  onUpdateSort: (databaseBlockId: string, sort: DatabaseSort) => void;
  todayIsoDate: string;
}) {
  const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);
  const visibleRows = useMemo(() => getDatabaseRowsForView(database), [database]);
  const filter = database.filter ?? { status: "all", query: "" };
  const sort = database.sort ?? { fieldId: "title", direction: "asc" };

  return (
    <section className="my-4 rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)]">
      <div className="flex flex-col gap-2 border-b border-[var(--nodiary-border-subtle)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="h-4 w-4 shrink-0 text-[var(--nodiary-muted)]" aria-hidden="true" />
          <div className="truncate text-[15px] font-semibold text-[var(--nodiary-text)]">
            {database.name}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
          <button
            aria-label="새 행 추가"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[12px] font-medium text-[var(--nodiary-text-strong)] hover:bg-[var(--nodiary-hover)]"
            onClick={() => onAddRow(blockId)}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            새 행
          </button>
          <button
            aria-expanded={isFieldEditorOpen}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[12px] font-medium text-[var(--nodiary-text-strong)] hover:bg-[var(--nodiary-hover)]"
            onClick={() => setFieldEditorOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            필드 편집
          </button>
          <div className="flex shrink-0 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-hover)] p-0.5">
            {(
              [
                ["table", "표", Table2],
                ["board", "보드", Columns3],
                ["calendar", "캘린더", CalendarDays]
              ] as const
            ).map(([view, label, Icon]) => (
            <button
              aria-selected={database.activeView === view}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-2 text-[12px] text-[var(--nodiary-muted)]",
                database.activeView === view && "bg-[var(--nodiary-panel)] font-medium text-[var(--nodiary-text)]"
              )}
              key={view}
              onClick={() => onSwitchView(blockId, view)}
              role="tab"
              type="button"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-2 border-b border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel-muted)] px-3 py-2 text-[12px] text-[var(--nodiary-muted)] md:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="flex items-center gap-2">
          상태
          <select
            aria-label="DB 필터 상태"
            className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 outline-none focus:border-[var(--nodiary-accent)]"
            onChange={(event) =>
              onUpdateFilter(blockId, {
                status: event.target.value as DatabaseFilter["status"]
              })
            }
            value={filter.status}
          >
            <option value="all">전체</option>
            {Object.entries(databaseStatusLabel).map(([status, label]) => (
              <option key={status} value={status}>
                상태: {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          검색
          <input
            aria-label="DB 검색 필터"
            className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 outline-none focus:border-[var(--nodiary-accent)]"
            onChange={(event) =>
              onUpdateFilter(blockId, {
                query: event.target.value
              })
            }
            value={filter.query}
          />
        </label>
        <label className="flex items-center gap-2">
          정렬
          <select
            aria-label="DB 정렬 필드"
            className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 outline-none focus:border-[var(--nodiary-accent)]"
            onChange={(event) =>
              onUpdateSort(blockId, {
                ...sort,
                fieldId: event.target.value as DatabaseSort["fieldId"]
              })
            }
            value={sort.fieldId}
          >
            {database.fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          방향
          <select
            aria-label="DB 정렬 방향"
            className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 outline-none focus:border-[var(--nodiary-accent)]"
            onChange={(event) =>
              onUpdateSort(blockId, {
                ...sort,
                direction: event.target.value as DatabaseSort["direction"]
              })
            }
            value={sort.direction}
          >
            <option value="asc">오름차순</option>
            <option value="desc">내림차순</option>
          </select>
        </label>
      </div>
      {isFieldEditorOpen ? (
        <div className="grid gap-2 border-b border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel)] px-3 py-3 text-[12px] text-[var(--nodiary-muted)] sm:grid-cols-2">
          {database.fields.map((field) => (
            <div className="grid gap-2 rounded border border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel-muted)] p-2" key={field.id}>
              <label className="flex items-center gap-2">
                이름
                <input
                  aria-label={`필드 이름: ${getStableDatabaseFieldLabel(field)}`}
                  className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[var(--nodiary-text)] outline-none focus:border-[var(--nodiary-accent)]"
                  onChange={(event) =>
                    onUpdateField(blockId, field.id, {
                      name: event.target.value
                    })
                  }
                  value={field.name}
                />
              </label>
              <label className="flex items-center gap-2">
                유형
                <select
                  aria-label={`필드 유형: ${getStableDatabaseFieldLabel(field)}`}
                  className="h-8 min-w-0 flex-1 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[var(--nodiary-text)] outline-none focus:border-[var(--nodiary-accent)]"
                  onChange={(event) =>
                    onUpdateField(blockId, field.id, {
                      type: event.target.value as DatabaseField["type"]
                    })
                  }
                  value={field.type}
                >
                  {Object.entries(databaseFieldTypeLabel).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      ) : null}
      {database.activeView === "table" ? (
        <DatabaseTable
          blockId={blockId}
          database={database}
          onMoveRow={onMoveRow}
          rows={visibleRows}
        />
      ) : null}
      {database.activeView === "board" ? (
        <DatabaseBoard
          blockId={blockId}
          onMoveRow={onMoveRow}
          rows={visibleRows}
        />
      ) : null}
      {database.activeView === "calendar" ? (
        <DatabaseCalendar
          blockId={blockId}
          database={database}
          onMoveRow={onMoveRow}
          rows={visibleRows}
          todayIsoDate={todayIsoDate}
        />
      ) : null}
    </section>
  );
}

function DatabaseTable({
  blockId,
  database,
  onMoveRow,
  rows
}: {
  blockId: string;
  database: DatabaseBlock;
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  rows: DatabaseRow[];
}) {
  return (
    <div>
      <div className="space-y-2 p-3 md:hidden">
        {rows.map((row) => (
          <EditableDatabaseCard
            blockId={blockId}
            key={row.id}
            onMoveRow={onMoveRow}
            row={row}
          />
        ))}
      </div>
      <table
        aria-label={`${database.name} 테이블`}
        className="hidden w-full table-fixed border-collapse text-left text-[13px] md:table"
      >
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[22%]" />
        </colgroup>
        <thead className="bg-[var(--nodiary-panel-muted)] text-[var(--nodiary-muted)]">
          <tr>
            {database.fields.map((field) => (
              <th className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2 font-medium" key={field.id}>
                {field.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              aria-label={`DB 행 드래그: ${row.title}`}
              className="hover:bg-[var(--nodiary-panel-muted)]"
              draggable
              key={row.id}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/nodiary-db-row", row.id);
                event.dataTransfer.setData("text/plain", row.id);
              }}
            >
              <td className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2">
                <span className="sr-only">{row.title}</span>
                <input
                  aria-label={`DB 행 제목: ${row.title}`}
                  className="h-8 w-full rounded border border-transparent bg-transparent px-2 font-medium text-[var(--nodiary-text)] outline-none hover:border-[var(--nodiary-border-strong)] focus:border-[var(--nodiary-accent)] focus:bg-[var(--nodiary-panel)]"
                  onChange={(event) =>
                    onMoveRow(blockId, row.id, {
                      title: event.target.value
                    })
                  }
                  value={row.title}
                />
              </td>
              <td className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2">
                <select
                  aria-label={`DB 행 상태: ${row.title}`}
                  className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[var(--nodiary-muted)] outline-none hover:border-[var(--nodiary-border-strong)] focus:border-[var(--nodiary-accent)] focus:bg-[var(--nodiary-panel)]"
                  onChange={(event) =>
                    onMoveRow(blockId, row.id, {
                      status: event.target.value as DatabaseRow["status"]
                    })
                  }
                  value={row.status}
                >
                  {Object.entries(databaseStatusLabel).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2">
                <input
                  aria-label={`DB 행 담당: ${row.title}`}
                  className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[var(--nodiary-muted)] outline-none hover:border-[var(--nodiary-border-strong)] focus:border-[var(--nodiary-accent)] focus:bg-[var(--nodiary-panel)]"
                  onChange={(event) =>
                    onMoveRow(blockId, row.id, {
                      owner: event.target.value
                    })
                  }
                  value={row.owner}
                />
              </td>
              <td className="border-b border-[var(--nodiary-border-subtle)] px-3 py-2">
                <input
                  aria-label={`DB 행 날짜: ${row.title}`}
                  className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-[var(--nodiary-muted)] outline-none hover:border-[var(--nodiary-border-strong)] focus:border-[var(--nodiary-accent)] focus:bg-[var(--nodiary-panel)]"
                  onChange={(event) =>
                    onMoveRow(blockId, row.id, {
                      date: event.target.value
                    })
                  }
                  type="date"
                  value={row.date}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditableDatabaseCard({
  blockId,
  onMoveRow,
  row
}: {
  blockId: string;
  row: DatabaseRow;
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
}) {
  return (
    <article
      aria-label={`DB 행 드래그: ${row.title}`}
      className="rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] p-3"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/nodiary-db-row", row.id);
        event.dataTransfer.setData("text/plain", row.id);
      }}
    >
      <input
        aria-label={`모바일 DB 행 제목: ${row.title}`}
        className="h-9 w-full rounded border border-[var(--nodiary-border-strong)] px-2 text-[13px] font-medium text-[var(--nodiary-text)] outline-none focus:border-[var(--nodiary-accent)]"
        onChange={(event) =>
          onMoveRow(blockId, row.id, {
            title: event.target.value
          })
        }
        value={row.title}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          aria-label={`모바일 DB 행 상태: ${row.title}`}
          className="h-9 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 text-[12px] text-[var(--nodiary-muted)] outline-none focus:border-[var(--nodiary-accent)]"
          onChange={(event) =>
            onMoveRow(blockId, row.id, {
              status: event.target.value as DatabaseRow["status"]
            })
          }
          value={row.status}
        >
          {Object.entries(databaseStatusLabel).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <input
          aria-label={`모바일 DB 행 날짜: ${row.title}`}
          className="h-9 rounded border border-[var(--nodiary-border-strong)] px-2 text-[12px] text-[var(--nodiary-muted)] outline-none focus:border-[var(--nodiary-accent)]"
          onChange={(event) =>
            onMoveRow(blockId, row.id, {
              date: event.target.value
            })
          }
          type="date"
          value={row.date}
        />
      </div>
      <input
        aria-label={`모바일 DB 행 담당: ${row.title}`}
        className="mt-2 h-9 w-full rounded border border-[var(--nodiary-border-strong)] px-2 text-[12px] text-[var(--nodiary-muted)] outline-none focus:border-[var(--nodiary-accent)]"
        onChange={(event) =>
          onMoveRow(blockId, row.id, {
            owner: event.target.value
          })
        }
        value={row.owner}
      />
    </article>
  );
}

function DatabaseBoard({
  blockId,
  onMoveRow,
  rows
}: {
  blockId: string;
  rows: DatabaseRow[];
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
}) {
  const groups = useMemo(
    () =>
      (["backlog", "doing", "review", "done"] as const).map((status) => ({
        status,
        rows: rows.filter((row) => row.status === status)
      })),
    [rows]
  );

  return (
    <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-4">
      {groups.map((group) => (
        <section
          aria-label={`DB 상태 드롭: ${databaseStatusLabel[group.status]}`}
          className="min-h-28 rounded border border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel-muted)] p-2"
          key={group.status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const rowId =
              event.dataTransfer.getData("text/nodiary-db-row") ||
              event.dataTransfer.getData("text/plain");

            if (rowId) {
              onMoveRow(blockId, rowId, {
                status: group.status,
                index: 0
              });
            }
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--nodiary-muted)]">
            <Circle className="h-3 w-3" aria-hidden="true" />
            {databaseStatusLabel[group.status]}
          </div>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <article
                aria-label={`DB 행 드래그: ${row.title}`}
                aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                className="rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-2 py-2 text-[12px] shadow-[0_1px_1px_rgba(36,33,29,0.04)]"
                draggable
                key={row.id}
                onKeyDown={(event) => {
                  if (!event.altKey) {
                    return;
                  }

                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    onMoveRow(blockId, row.id, {
                      status: getAdjacentDatabaseStatus(
                        row.status,
                        event.key === "ArrowRight" ? 1 : -1
                      ),
                      index: 0
                    });
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/nodiary-db-row", row.id);
                  event.dataTransfer.setData("text/plain", row.id);
                }}
                tabIndex={0}
              >
                <div className="font-medium text-[var(--nodiary-text)]">{row.title}</div>
                <div className="mt-2 text-[var(--nodiary-muted-soft)]">{row.date}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DatabaseCalendar({
  blockId,
  database,
  onMoveRow,
  rows,
  todayIsoDate
}: {
  blockId: string;
  database: DatabaseBlock;
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  rows: DatabaseRow[];
  todayIsoDate: string;
}) {
  const days = useMemo(
    () => createDatabaseCalendarDays(rows, todayIsoDate),
    [rows, todayIsoDate]
  );

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--nodiary-muted-soft)]">
        {koreanWeekdayLabels.map((day) => (
          <div className="h-6 leading-6" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div
        aria-label={`${database.name} 캘린더`}
        className="grid grid-cols-7 gap-1"
        role="grid"
      >
        {days.map((day) => (
          <div
            aria-label={day.isoDate}
            className={cn(
              "min-h-[86px] rounded border border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel-muted)] p-1.5",
              day.isCurrentMonth ? "text-[var(--nodiary-text)]" : "text-[var(--nodiary-icon-muted)]",
              day.isToday && "border-[var(--nodiary-accent)] bg-[var(--nodiary-accent-soft)]"
            )}
            key={day.isoDate}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const rowId =
                event.dataTransfer.getData("text/nodiary-db-row") ||
                event.dataTransfer.getData("text/plain");

              if (rowId) {
                onMoveRow(blockId, rowId, {
                  date: day.isoDate
                });
              }
            }}
            role="gridcell"
          >
            <div className="mb-1 text-[11px] font-semibold leading-none">{day.label}</div>
            <div className="space-y-1">
              {day.rows.map((row) => (
                <button
                  aria-label={`DB 행 드래그: ${row.title}`}
                  aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
                  className="block w-full truncate rounded bg-[var(--nodiary-panel)] px-1.5 py-1 text-left text-[11px] font-medium text-[var(--nodiary-text-strong)] shadow-[0_1px_1px_rgba(36,33,29,0.04)] hover:bg-[var(--nodiary-hover)]"
                  draggable
                  key={row.id}
                  onKeyDown={(event) => {
                    if (!event.altKey) {
                      return;
                    }

                    const deltaByKey: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7
                    };
                    const delta = deltaByKey[event.key];

                    if (delta === undefined) {
                      return;
                    }

                    event.preventDefault();
                    onMoveRow(blockId, row.id, {
                      date: shiftIsoDateByDays(row.date, delta)
                    });
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/nodiary-db-row", row.id);
                    event.dataTransfer.setData("text/plain", row.id);
                  }}
                  type="button"
                >
                  {row.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createDatabaseCalendarDays(rows: DatabaseRow[], todayIsoDate: string) {
  const rowsByDate = rows.reduce<Record<string, DatabaseRow[]>>((groups, row) => {
    groups[row.date] = [...(groups[row.date] ?? []), row];
    return groups;
  }, {});
  const year = 2026;
  const month = 6;
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const days: Array<{
    isoDate: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    label: string;
    rows: DatabaseRow[];
  }> = [];

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const date = new Date(Date.UTC(year, month - 1, 1 - firstWeekday + cellIndex));
    const isoDate = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("-");

    days.push({
      isoDate,
      isCurrentMonth: date.getUTCMonth() === month - 1,
      isToday: isoDate === todayIsoDate,
      label: String(date.getUTCDate()),
      rows: rowsByDate[isoDate] ?? []
    });
  }

  return days;
}

function shiftIsoDateByDays(isoDate: string, delta: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getAdjacentDatabaseStatus(
  status: DatabaseRow["status"],
  delta: -1 | 1
): DatabaseRow["status"] {
  const statuses: DatabaseRow["status"][] = ["backlog", "doing", "review", "done"];
  const index = statuses.indexOf(status);
  const nextIndex = Math.max(0, Math.min(statuses.length - 1, index + delta));

  return statuses[nextIndex] ?? status;
}

function getStableDatabaseFieldLabel(field: DatabaseField) {
  const labels: Record<string, string> = {
    title: "작업",
    status: "상태",
    owner: "담당",
    date: "날짜"
  };

  return labels[field.id] ?? field.name;
}

function AiOperatorPanel({
  className,
  aiInput,
  aiState,
  enabledScopes,
  notice,
  onApprove,
  onChangeAiInput,
  onChangeModelRoute,
  onClose,
  onReject,
  requestStatus,
  onSend,
  onToggleScope,
  onUndo,
  selectedModelRoute
}: {
  className?: string;
  aiInput: string;
  aiState: ReturnType<typeof defaultNodiaryState>["ai"];
  enabledScopes: AiContextScope[];
  notice: string;
  onApprove: (actionId: string) => void;
  onChangeAiInput: (value: string) => void;
  onChangeModelRoute: (route: AiModelRoute) => void;
  onClose: () => void;
  onReject: (actionId: string) => void;
  requestStatus: AiRequestStatus | null;
  onSend: () => void;
  onToggleScope: (scope: AiContextScope) => void;
  onUndo: () => void;
  selectedModelRoute: AiModelRoute;
}) {
  const pendingActions = aiState.runs.flatMap((run) =>
    run.actions
      .filter((action) => action.approvalStatus === "pending")
      .map((action) => ({
        ...action,
        runCommand: run.command,
        runModelName: run.modelName,
        runModelRoute: run.modelRoute
      }))
  );
  const answerRuns = aiState.runs.filter((run) => run.answer).slice(0, 3);
  const selectedModel = getAiModelOption(selectedModelRoute);

  return (
    <aside
      className={cn(
        "flex h-dvh min-h-0 shrink-0 flex-col overflow-y-auto border-l border-[var(--nodiary-border)] bg-[var(--nodiary-panel-muted)] px-3 py-3",
        className
      )}
      data-testid="ai-operator-panel"
    >
      <div className="flex h-9 items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--nodiary-text)]">
          <Bot className="h-4 w-4 text-[var(--nodiary-accent)]" aria-hidden="true" />
          AI 글쓰기
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded bg-[var(--nodiary-accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--nodiary-accent)]">
            승인 후 실행
          </span>
          <button
            aria-label="AI 패널 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-3 py-2">
        <label className="flex items-center justify-between gap-3 text-[12px] font-medium text-[var(--nodiary-muted)]">
          <span>AI 모델</span>
          <select
            aria-label="AI 모델 선택"
            className="h-8 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel-muted)] px-2 text-[12px] text-[var(--nodiary-text)] outline-none"
            onChange={(event) => onChangeModelRoute(event.target.value as AiModelRoute)}
            value={selectedModelRoute}
          >
            {aiModelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {option.modelName}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-1 text-[11px] leading-5 text-[var(--nodiary-muted-soft)]">
          현재 모델: {selectedModel.modelName} · {selectedModel.description}
        </div>
      </div>
      <textarea
        aria-label="AI 명령 입력"
        className="mt-3 h-[184px] w-full resize-none rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-3 py-3 text-[13px] leading-6 text-[var(--nodiary-text)] outline-none placeholder:text-[var(--nodiary-placeholder)]"
        onChange={(event) => onChangeAiInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        placeholder="예: 이 페이지를 더 날카로운 실행 계획으로 다듬어줘. 캘린더 충돌은 승인 큐에 올려."
        value={aiInput}
      />
      {notice ? (
        <div className="mt-2 rounded-md border border-[var(--nodiary-warning-border)] bg-[var(--nodiary-warning-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--nodiary-warning-text)]">
          {notice}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {aiContextScopes.map((scope) => {
          const isEnabled = enabledScopes.includes(scope.id);

          return (
          <button
            aria-label={`${scope.label} 컨텍스트 ${isEnabled ? "포함" : "제외"}`}
            aria-pressed={isEnabled}
            className={cn(
              "rounded border px-2 py-1 text-[11px]",
              isEnabled
                ? "border-[var(--nodiary-accent)] bg-[var(--nodiary-accent-soft)] font-medium text-[var(--nodiary-accent)]"
                : "border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
            )}
            key={scope.id}
            onClick={() => onToggleScope(scope.id)}
            type="button"
          >
            {scope.label}
          </button>
          );
        })}
      </div>
      <button
        className="mt-3 h-10 w-full rounded-md bg-[var(--nodiary-accent)] text-[13px] font-semibold text-white hover:bg-[var(--nodiary-accent-hover)]"
        onClick={onSend}
        type="button"
      >
        AI에게 보내기
      </button>

      <section className="mt-4 rounded-md border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[var(--nodiary-text)]">
            답변 및 승인 대기
          </div>
          <button
            className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
            disabled={aiState.undoLog.length === 0}
            onClick={onUndo}
            type="button"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            되돌리기
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {requestStatus?.status === "reading" ? (
            <article
              aria-label="AI가 읽는 중"
              className="rounded border border-[var(--nodiary-border-strong)] p-3"
              role="status"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 animate-spin text-[var(--nodiary-accent)]"
                  data-testid="ai-reading-icon"
                />
                <div
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--nodiary-text)]"
                  title={requestStatus.command}
                >
                  {requestStatus.command}
                </div>
              </div>
              <div className="mt-2 text-[12px] leading-5 text-[var(--nodiary-muted-soft)]">
                선택한 컨텍스트를 읽는 중입니다. 모델: {requestStatus.modelName}
              </div>
            </article>
          ) : null}
          {requestStatus?.status === "error" ? (
            <article
              aria-label="AI 요청 실패"
              className="rounded border border-[var(--nodiary-warning-border)] bg-[var(--nodiary-warning-bg)] p-3"
              role="alert"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AlertCircle
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[var(--nodiary-warning-text)]"
                />
                <div
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--nodiary-warning-text)]"
                  title={requestStatus.command}
                >
                  {requestStatus.command}
                </div>
              </div>
              <div className="mt-2 text-[12px] leading-5 text-[var(--nodiary-warning-text)]">
                {requestStatus.message ?? "AI 요청에 실패했습니다."} 모델:{" "}
                {requestStatus.modelName}
              </div>
            </article>
          ) : null}
          {answerRuns.map((run) => (
            <article
              className="rounded border border-[var(--nodiary-border-strong)] p-3"
              key={run.id}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-semibold text-[var(--nodiary-accent)]">
                  AI 답변
                </div>
                <span className="rounded bg-[var(--nodiary-soft)] px-2 py-1 text-[11px] text-[var(--nodiary-muted)]">
                  모델: {run.modelName ?? getAiModelOption(run.modelRoute).modelName}
                </span>
              </div>
              <AiCommandLine command={run.command} />
              <p className="mt-2 text-[13px] leading-6 text-[var(--nodiary-text-strong)]">
                {run.answer}
              </p>
            </article>
          ))}
          {pendingActions.length === 0 && answerRuns.length === 0 && !requestStatus ? (
            <div className="rounded border border-dashed border-[var(--nodiary-border-strong)] px-3 py-4 text-[12px] leading-5 text-[var(--nodiary-muted-soft)]">
              질문은 답변으로 남기고, 문서 변경안과 일정 변경안은 승인 큐로 올립니다.
            </div>
          ) : null}
          {pendingActions.map((action) => (
            <article
              className="rounded border border-[var(--nodiary-border-strong)] p-3"
              key={action.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-[var(--nodiary-accent)]">
                    {getOperatorToolLabel(action.toolName)}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[var(--nodiary-text)]">
                    {action.summary}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--nodiary-muted-soft)]">
                    모델: {action.runModelName ?? getAiModelOption(action.runModelRoute).modelName}
                  </div>
                </div>
                <span className="rounded bg-[var(--nodiary-soft)] px-2 py-1 text-[11px] text-[var(--nodiary-muted)]">
                  {getRiskLabel(action.riskLevel)}
                </span>
              </div>
              <AiCommandLine command={action.runCommand} />
              <div className="mt-3 rounded bg-[var(--nodiary-panel-muted)] px-3 py-2 text-[12px] leading-5 text-[var(--nodiary-text-strong)]">
                <div className="mb-1 font-semibold text-[var(--nodiary-muted)]">
                  승인하면 적용되는 내용
                </div>
                <div className="space-y-1">
                  {getApprovalSummaryLines(action).map((line, index) => (
                    <div className="flex gap-2" key={`${action.id}-summary-${index}`}>
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--nodiary-accent)]" aria-hidden="true" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[var(--nodiary-muted-soft)]">
                  {getApprovalStatusLabel(action.approvalStatus)}
                </span>
                {action.approvalStatus === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      className="h-8 rounded border border-[var(--nodiary-border-strong)] px-3 text-[12px] text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
                      onClick={() => onReject(action.id)}
                      type="button"
                    >
                      거절
                    </button>
                    <button
                      className="h-8 rounded bg-[var(--nodiary-accent)] px-3 text-[12px] font-medium text-white"
                      onClick={() => onApprove(action.id)}
                      type="button"
                    >
                      승인
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

    </aside>
  );
}

function AiCommandLine({ command }: { command: string }) {
  return (
    <div className="mt-2 flex min-w-0 items-center gap-2 rounded bg-[var(--nodiary-panel-muted)] px-2 py-1 text-[12px] text-[var(--nodiary-muted)]">
      <span className="shrink-0 font-medium">질문</span>
      <span className="min-w-0 flex-1 truncate" title={command}>
        {command}
      </span>
    </div>
  );
}

function SettingsDialog({
  memories,
  onClose,
  onUpdate,
  preferences
}: {
  memories: ReturnType<typeof defaultNodiaryState>["ai"]["memories"];
  preferences: ReturnType<typeof defaultNodiaryState>["preferences"];
  onClose: () => void;
  onUpdate: (patch: Partial<typeof preferences>) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap(dialogRef, closeButtonRef, onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-4 sm:items-center">
      <section
        aria-label="개인화 설정"
        aria-modal="true"
        className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-y-auto rounded-md border border-[var(--nodiary-border)] bg-[var(--nodiary-panel)] p-4 shadow-[0_20px_60px_rgba(36,33,29,0.18)] sm:p-5"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[18px] font-semibold text-[var(--nodiary-text)]">
              개인화 설정
            </div>
            <div className="mt-1 text-[13px] text-[var(--nodiary-muted)]">
              Notion에 가까운 기본값에서 밀도와 AI 패널을 조정합니다.
            </div>
          </div>
          <button
            aria-label="설정 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SettingGroup label="Theme">
            {workspaceThemeOptions.map((theme) => (
              <button
                className={settingButtonClass(preferences.theme === theme)}
                key={theme}
                onClick={() => onUpdate({ theme })}
                type="button"
              >
                {theme}
              </button>
            ))}
          </SettingGroup>
          <SettingGroup label="Accent">
            {["teal", "slate", "blue"].map((accent) => (
              <button
                className={settingButtonClass(preferences.accent === accent)}
                key={accent}
                onClick={() =>
                  onUpdate({ accent: accent as typeof preferences.accent })
                }
                type="button"
              >
                {accent}
              </button>
            ))}
          </SettingGroup>
          <SettingGroup label="Density">
            <button
              className={settingButtonClass(preferences.density === "comfortable")}
              onClick={() => onUpdate({ density: "comfortable" })}
              type="button"
            >
              여유롭게
            </button>
            <button
              className={settingButtonClass(preferences.density === "compact")}
              onClick={() => onUpdate({ density: "compact" })}
              type="button"
            >
              조밀하게
            </button>
          </SettingGroup>
          <SettingGroup label="Right AI panel">
            <button
              className={settingButtonClass(preferences.rightAiPanel === "open")}
              onClick={() => onUpdate({ rightAiPanel: "open" })}
              type="button"
            >
              AI 패널 열림
            </button>
            <button
              className={settingButtonClass(preferences.rightAiPanel === "closed")}
              onClick={() => onUpdate({ rightAiPanel: "closed" })}
              type="button"
            >
              AI 패널 닫힘
            </button>
          </SettingGroup>
          <SettingGroup label="Document width">
            <button
              className={settingButtonClass(preferences.documentWidth === "standard")}
              onClick={() => onUpdate({ documentWidth: "standard" })}
              type="button"
            >
              기본
            </button>
            <button
              className={settingButtonClass(preferences.documentWidth === "wide")}
              onClick={() => onUpdate({ documentWidth: "wide" })}
              type="button"
            >
              넓게
            </button>
          </SettingGroup>
          <SettingGroup label="Startup page">
            <button
              className={settingButtonClass(preferences.startupPage === "today")}
              onClick={() => onUpdate({ startupPage: "today" })}
              type="button"
            >
              오늘
            </button>
            <button
              className={settingButtonClass(preferences.startupPage === "last")}
              onClick={() => onUpdate({ startupPage: "last" })}
              type="button"
            >
              마지막 페이지
            </button>
          </SettingGroup>
        </div>

        <div className="mt-5 rounded bg-[var(--nodiary-panel-muted)] px-3 py-3 font-mono text-[12px] leading-5 text-[var(--nodiary-muted)]">
          <div>density: {preferences.density}</div>
          <div>right panel: {preferences.rightAiPanel}</div>
          <div>document width: {preferences.documentWidth}</div>
          <div>startup: {preferences.startupPage}</div>
        </div>

        <section className="mt-5 rounded border border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] px-3 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--nodiary-text)]">
            <Brain className="h-4 w-4 text-[var(--nodiary-accent)]" aria-hidden="true" />
            장기 메모리
          </div>
          <div className="mt-1 text-[12px] leading-5 text-[var(--nodiary-muted)]">
            AI가 컨텍스트 칩을 켰을 때 참고하는 장기 지침입니다.
          </div>
          <div className="mt-3 space-y-2">
            {memories.length > 0 ? (
              memories.map((memory) => (
                <div
                  className="rounded border border-[var(--nodiary-border-subtle)] bg-[var(--nodiary-panel-muted)] px-3 py-2 text-[12px] leading-5 text-[var(--nodiary-text-strong)]"
                  key={memory.id}
                >
                  <div>{memory.content}</div>
                  <div className="mt-1 text-[11px] text-[var(--nodiary-muted-soft)]">
                    source: {memory.source} · confidence:{" "}
                    {Math.round(memory.confidence * 100)}%
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded border border-dashed border-[var(--nodiary-border-strong)] px-3 py-3 text-[12px] text-[var(--nodiary-muted-soft)]">
                저장된 장기 메모리가 없습니다.
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function useModalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onEscape: () => void
) {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const previousFocus = document.activeElement;

    if (!container) {
      return undefined;
    }

    const modalContainer = container;

    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[href]",
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");

    function getFocusableElements() {
      return Array.from(
        modalContainer.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute("disabled"));
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalContainer.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    (initialFocusRef.current ?? getFocusableElements()[0] ?? container).focus();
    modalContainer.addEventListener("keydown", handleKeyDown);

    return () => {
      modalContainer.removeEventListener("keydown", handleKeyDown);

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [containerRef, initialFocusRef]);
}

function CommandPalette({
  onClose,
  onFocusQuickCapture,
  onOpenAi,
  onOpenInbox
}: {
  onClose: () => void;
  onFocusQuickCapture: () => void;
  onOpenAi: () => void;
  onOpenInbox: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-black/20 px-4 pt-20">
      <section
        aria-label="검색과 명령"
        aria-modal="true"
        className="w-full max-w-lg rounded-md border border-[var(--nodiary-border)] bg-[var(--nodiary-panel)] p-3 shadow-[0_20px_60px_rgba(36,33,29,0.18)]"
        role="dialog"
      >
        <div className="flex items-center gap-2 rounded border border-[var(--nodiary-border-strong)] px-3">
          <Search className="h-4 w-4 text-[var(--nodiary-muted-soft)]" aria-hidden="true" />
          <input
            aria-label="검색어 입력"
            autoFocus
            className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--nodiary-placeholder)]"
            placeholder="페이지, 캡처, AI 명령 검색"
          />
          <button
            aria-label="검색 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--nodiary-soft)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 space-y-1">
          <CommandPaletteRow icon={Inbox} label="Inbox 최근 캡처 보기" onClick={onOpenInbox} />
          <CommandPaletteRow icon={Plus} label="빠른 메모 입력" onClick={onFocusQuickCapture} />
          <CommandPaletteRow icon={Bot} label="AI Operator 열기" onClick={onOpenAi} />
        </div>
      </section>
    </div>
  );
}

function CommandPaletteRow({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Search;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-10 w-full items-center gap-3 rounded px-2 text-left text-[13px] text-[var(--nodiary-text-strong)] hover:bg-[var(--nodiary-hover)]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded border border-[var(--nodiary-border-strong)] text-[var(--nodiary-muted)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}

function SettingGroup({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-semibold text-[var(--nodiary-muted)]">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function settingButtonClass(isActive: boolean) {
  return cn(
    "h-8 rounded border px-3 text-[12px]",
    isActive
      ? "border-[var(--nodiary-accent)] bg-[var(--nodiary-accent-soft)] font-medium text-[var(--nodiary-accent)]"
      : "border-[var(--nodiary-border-strong)] bg-[var(--nodiary-panel)] text-[var(--nodiary-muted)] hover:bg-[var(--nodiary-hover)]"
  );
}

function getWorkspaceThemeStyle(
  accent: NodiaryState["preferences"]["accent"],
  theme: NodiaryState["preferences"]["theme"]
) {
  const tokens = accentTokens[accent];
  const palette = getThemePalette(theme, tokens);

  return {
    "--nodiary-accent": palette.accent,
    "--nodiary-accent-hover": palette.accentHover,
    "--nodiary-accent-soft": palette.accentSoft,
    "--nodiary-app-bg": palette.appBg,
    "--nodiary-canvas": palette.canvas,
    "--nodiary-panel": palette.panel,
    "--nodiary-panel-muted": palette.panelMuted,
    "--nodiary-sidebar": palette.sidebar,
    "--nodiary-border": palette.border,
    "--nodiary-border-strong": palette.borderStrong,
    "--nodiary-border-subtle": palette.borderSubtle,
    "--nodiary-text": palette.text,
    "--nodiary-text-strong": palette.textStrong,
    "--nodiary-muted": palette.muted,
    "--nodiary-muted-strong": palette.mutedStrong,
    "--nodiary-muted-soft": palette.mutedSoft,
    "--nodiary-placeholder": palette.placeholder,
    "--nodiary-icon-muted": palette.iconMuted,
    "--nodiary-icon-faint": palette.iconFaint,
    "--nodiary-hover": palette.hover,
    "--nodiary-soft": palette.soft,
    "--nodiary-selected": palette.selected,
    "--nodiary-warning-bg": palette.warningBg,
    "--nodiary-warning-border": palette.warningBorder,
    "--nodiary-warning-text": palette.warningText,
    "--nodiary-logo-bg": palette.logoBg,
    "--nodiary-logo-fg": palette.logoFg,
    colorScheme: palette.colorScheme
  } as CSSProperties;
}

function getThemePalette(
  theme: NodiaryState["preferences"]["theme"],
  accent: (typeof accentTokens)[NodiaryState["preferences"]["accent"]]
) {
  const lightPalette = {
    accent: accent.accent,
    accentHover: accent.accentHover,
    accentSoft: accent.accentSoft,
    appBg: "#fbfaf7",
    canvas: "#ffffff",
    panel: "#ffffff",
    panelMuted: "#fbfaf7",
    sidebar: "#f4f2ee",
    border: "#e4e0d8",
    borderStrong: "#dedad1",
    borderSubtle: "#eeeae3",
    text: "#24211d",
    textStrong: "#3a3630",
    muted: "#6f6a61",
    mutedStrong: "#7c766d",
    mutedSoft: "#8c867c",
    placeholder: "#9a948a",
    iconMuted: "#aaa399",
    iconFaint: "#c0bab0",
    hover: "#f7f5f0",
    soft: "#f4f2ee",
    selected: "#ebe7df",
    warningBg: "#fff8ee",
    warningBorder: "#f0d6b8",
    warningText: "#8a5a23",
    logoBg: "#24211d",
    logoFg: "#fbfaf7",
    colorScheme: "light"
  };

  if (theme === "dark") {
    return {
      ...lightPalette,
      appBg: "#1f1d1a",
      canvas: "#211f1c",
      panel: "#2a2723",
      panelMuted: "#26231f",
      sidebar: "#26231f",
      border: "#3a352e",
      borderStrong: "#4a433a",
      borderSubtle: "#343029",
      text: "#f4f1ea",
      textStrong: "#f7f1e8",
      muted: "#b8afa2",
      mutedStrong: "#d2c7b8",
      mutedSoft: "#a99f91",
      placeholder: "#80776b",
      iconMuted: "#958b7d",
      iconFaint: "#756c60",
      hover: "#34302a",
      soft: "#302c26",
      selected: "#3a352e",
      warningBg: "#3f3122",
      warningBorder: "#5f452a",
      warningText: "#f1bd80",
      logoBg: "#f7f1e8",
      logoFg: "#24211d",
      colorScheme: "dark"
    };
  }

  if (theme === "lavender") {
    return {
      ...lightPalette,
      accent: "#7253a4",
      accentHover: "#60458d",
      accentSoft: "#eee8f8",
      appBg: "#fbf8ff",
      canvas: "#fffefe",
      panel: "#fffefe",
      panelMuted: "#faf7ff",
      sidebar: "#f2ecfb",
      border: "#e5ddef",
      borderStrong: "#d7cce5",
      borderSubtle: "#f0eaf7",
      text: "#2d2638",
      textStrong: "#382f45",
      muted: "#6b6078",
      mutedStrong: "#766a84",
      mutedSoft: "#8a7d96",
      placeholder: "#9a8da6",
      iconMuted: "#9d90a9",
      iconFaint: "#bdb0c8",
      hover: "#f6f1fb",
      soft: "#f2ecfb",
      selected: "#e9e0f4",
      warningBg: "#fff6df",
      warningBorder: "#ead18e",
      warningText: "#745713",
      logoBg: "#3b2b52",
      logoFg: "#fbf8ff"
    };
  }

  if (theme === "yellow") {
    return {
      ...lightPalette,
      accent: "#7a5b12",
      accentHover: "#654a0d",
      accentSoft: "#fff2bd",
      appBg: "#fffaf0",
      canvas: "#fffef9",
      panel: "#fffef9",
      panelMuted: "#fff8e8",
      sidebar: "#f7f0dc",
      border: "#e8dcc1",
      borderStrong: "#d9cba9",
      borderSubtle: "#f1e8d5",
      text: "#2d2618",
      textStrong: "#3b321f",
      muted: "#6e6041",
      mutedStrong: "#7b6b49",
      mutedSoft: "#8d7d5a",
      placeholder: "#9a8c6d",
      iconMuted: "#a89a7a",
      iconFaint: "#c4b895",
      hover: "#fbf3dd",
      soft: "#f7f0dc",
      selected: "#efe2bf",
      warningBg: "#fff3c4",
      warningBorder: "#e6c356",
      warningText: "#6d5011",
      logoBg: "#2d2618",
      logoFg: "#fff8e1"
    };
  }

  if (theme === "navy") {
    return {
      ...lightPalette,
      accent: "#8bb4ff",
      accentHover: "#a6c6ff",
      accentSoft: "#223553",
      appBg: "#111827",
      canvas: "#131c2b",
      panel: "#172033",
      panelMuted: "#131d2c",
      sidebar: "#172033",
      border: "#26344d",
      borderStrong: "#33435f",
      borderSubtle: "#202d44",
      text: "#f4f7fb",
      textStrong: "#f8fbff",
      muted: "#b8c4d6",
      mutedStrong: "#d3dced",
      mutedSoft: "#9eabc0",
      placeholder: "#7e8aa0",
      iconMuted: "#8d9bb0",
      iconFaint: "#647189",
      hover: "#1d2a41",
      soft: "#1a2639",
      selected: "#263853",
      warningBg: "#3a2c1c",
      warningBorder: "#6d5129",
      warningText: "#f2c985",
      logoBg: "#eaf2ff",
      logoFg: "#172033",
      colorScheme: "dark"
    };
  }

  return lightPalette;
}

function loadStoredWorkspaceState(todayIsoDate: string): NodiaryState {
  const fallback = defaultNodiaryState({ todayIsoDate });

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(workspaceStorageKey);

    if (!rawValue) {
      return fallback;
    }

    return readHydratedWorkspaceState(JSON.parse(rawValue), todayIsoDate) ?? fallback;
  } catch {
    return fallback;
  }
}

function readHydratedWorkspaceState(
  value: unknown,
  todayIsoDate: string
): NodiaryState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fallback = defaultNodiaryState({ todayIsoDate });
  const stored = value as Partial<NodiaryState>;

  if (!isRecord(stored.activePage) || !Array.isArray(stored.activePage.blocks)) {
    return undefined;
  }

  const activePage = {
    ...fallback.activePage,
    ...stored.activePage
  };

  return prepareWorkspaceForStartup({
    ...fallback,
    ...stored,
    workspace: {
      ...fallback.workspace,
      ...(isRecord(stored.workspace) ? stored.workspace : {})
    },
    pageTree: Array.isArray(stored.pageTree) ? stored.pageTree : fallback.pageTree,
    pages: {
      ...fallback.pages,
      ...(isRecord(stored.pages) ? stored.pages : {}),
      [activePage.id]: activePage
    },
    activePage,
    sidebarCalendar: isRecord(stored.sidebarCalendar)
      ? {
          ...fallback.sidebarCalendar,
          ...stored.sidebarCalendar,
          days: Array.isArray(stored.sidebarCalendar.days)
            ? stored.sidebarCalendar.days
            : fallback.sidebarCalendar.days,
          schedule: Array.isArray(stored.sidebarCalendar.schedule)
            ? stored.sidebarCalendar.schedule
            : fallback.sidebarCalendar.schedule,
          movedEvents: isRecord(stored.sidebarCalendar.movedEvents)
            ? stored.sidebarCalendar.movedEvents
            : fallback.sidebarCalendar.movedEvents
        }
      : fallback.sidebarCalendar,
    ai: isRecord(stored.ai)
      ? {
          ...fallback.ai,
          ...stored.ai,
          runs: Array.isArray(stored.ai.runs) ? stored.ai.runs : fallback.ai.runs,
          undoLog: Array.isArray(stored.ai.undoLog)
            ? stored.ai.undoLog
            : fallback.ai.undoLog,
          memories: Array.isArray(stored.ai.memories)
            ? stored.ai.memories
            : fallback.ai.memories
        }
      : fallback.ai,
    preferences: {
      ...fallback.preferences,
      ...(isRecord(stored.preferences) ? stored.preferences : {})
    }
  }, todayIsoDate);
}

function storeWorkspaceState(state: NodiaryState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(state));
  } catch {
    // Local storage may be disabled; the in-memory workspace still works.
  }
}

async function saveWorkspaceStateToApi(state: NodiaryState) {
  try {
    await fetch("/api/nodiary/workspace", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getNodiarySessionHeaders()
      },
      body: JSON.stringify({ state })
    });
  } catch {
    // Keep the local workspace responsive even if the desktop API is not ready.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function loadStoredCaptures(): CapturedItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(captureStorageKey);
    return rawValue ? (JSON.parse(rawValue) as CapturedItem[]) : [];
  } catch {
    return [];
  }
}

function storeCaptures(items: CapturedItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(captureStorageKey, JSON.stringify(items));
  } catch {
    // Ignore quota/storage failures without exposing local contents.
  }
}

function buildAiContextSnapshot(
  state: NodiaryState,
  enabledScopes: AiContextScope[]
): AiContextSnapshot {
  return {
    pageTitle: enabledScopes.includes("currentPage")
      ? state.activePage.title
      : "Nodiary",
    selectedText: enabledScopes.includes("selectedBlock")
      ? getSelectedBlockContext(state)
      : "",
    memory: enabledScopes.includes("longTermMemory")
      ? state.ai.memories.map((memory) => memory.content)
      : [],
    calendarContext: enabledScopes.includes("sidebarCalendar")
      ? {
          selectedDate: state.sidebarCalendar.selectedDate,
          schedule: state.sidebarCalendar.schedule
        }
      : undefined
  };
}

function getSelectedBlockContext(state: NodiaryState) {
  const selectedBlock =
    findPendingAiRequestBlock(state) ??
    state.activePage.blocks.find((block) => block.id === "memo-body") ??
    state.activePage.blocks.find((block) => block.type === "paragraph") ??
    state.activePage.blocks[0];

  return [
    selectedBlock ? `Block ID: ${selectedBlock.id}` : undefined,
    selectedBlock?.title,
    selectedBlock?.text
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

function hasPendingAiRequestBlock(state: NodiaryState) {
  return Boolean(findPendingAiRequestBlock(state));
}

function findPendingAiRequestBlock(state: NodiaryState) {
  for (let index = state.activePage.blocks.length - 1; index >= 0; index -= 1) {
    const block = state.activePage.blocks[index];

    if (block.type === "ai") {
      return block;
    }
  }

  return undefined;
}

function getAiModelOption(modelRoute: AiModelRoute) {
  return (
    aiModelOptions.find((option) => option.id === modelRoute) ?? aiModelOptions[0]
  );
}

function shouldAnswerDirectly(command: string) {
  const normalized = command.trim();

  if (!normalized) {
    return false;
  }

  if (normalized.includes("?")) {
    return true;
  }

  if (isMutatingAiCommand(normalized)) {
    return false;
  }

  if (
    ["모델", "의도", "왜", "뭐", "무엇", "어떤", "정의", "뜻", "설명", "요약", "알려", "답변", "대답"].some((token) =>
      normalized.includes(token)
    )
  ) {
    return true;
  }

  return !normalized.includes("\n") && normalized.length <= 20;
}

function isMutatingAiCommand(command: string) {
  return [
    "추가",
    "넣어",
    "작성",
    "만들",
    "바꿔",
    "변경",
    "수정",
    "편집",
    "교체",
    "삭제",
    "지워",
    "없애",
    "정리",
    "다듬",
    "옮겨",
    "이동",
    "미뤄",
    "당겨",
    "반영",
    "체크",
    "완료"
  ].some((token) => command.includes(token));
}

function createLocalAiAnswer(
  command: string,
  modelRoute: AiModelRoute,
  context: AiContextSnapshot
) {
  const modelOption = getAiModelOption(modelRoute);

  if (command.includes("모델")) {
    return `현재 선택한 AI 모델 경로는 ${modelOption.label}이고, 기본 표시 모델은 ${modelOption.modelName}입니다. 서버에 OPENAI_MODEL이 설정되어 있으면 실제 요청은 그 서버 설정 모델로 실행됩니다.`;
  }

  if (command.includes("의도") || command.includes("노디") || command.includes("Nodiary")) {
    return "Nodiary의 AI는 꼭 앱에 변경을 반영하기 위해서만 있는 것이 아닙니다. 질문에는 답변으로 돌려주고, 문서나 캘린더를 바꾸는 요청만 승인 카드로 정리해서 사용자가 승인할 때 반영합니다.";
  }

  if (command.includes("꽃")) {
    return "꽃은 식물의 번식 기관으로, 씨앗을 만들기 위해 피는 구조입니다. 보통 꽃잎, 꽃받침, 수술, 암술로 이루어지며 색과 향으로 곤충이나 바람 같은 매개를 끌어들입니다.";
  }

  if (command.includes("캘린더") || command.includes("일정")) {
    return createCalendarContextAnswer(context);
  }

  const contextLines = createContextAnswerLines(context);

  if (contextLines.length > 0) {
    return `선택한 컨텍스트 기준으로 읽었습니다. ${contextLines.join(" ")}`;
  }

  return "질문에는 답변으로 돌려주고, 문서나 캘린더를 바꾸는 요청만 승인 카드로 올립니다. 변경을 원하면 무엇을 바꿀지 말해주면 승인 전에 요약해서 보여드릴게요.";
}

function createCalendarContextAnswer(context: AiContextSnapshot) {
  const calendar = context.calendarContext;

  if (!calendar) {
    return "왼쪽 캘린더 컨텍스트가 꺼져 있어 일정 내용을 읽지 않았습니다. 왼쪽 캘린더 칩을 켜고 다시 보내면 선택 날짜의 일정을 기준으로 답합니다.";
  }

  if (calendar.schedule.length === 0) {
    return `왼쪽 캘린더 기준 ${calendar.selectedDate}에는 표시된 일정이 없습니다.`;
  }

  const schedule = calendar.schedule
    .map((event) => `${event.time} ${event.title}`)
    .join(", ");

  return `왼쪽 캘린더 기준 ${calendar.selectedDate} 일정은 ${schedule}입니다.`;
}

function createContextAnswerLines(context: AiContextSnapshot) {
  const lines: string[] = [];

  if (context.pageTitle !== "Nodiary") {
    lines.push(`현재 페이지: ${context.pageTitle}.`);
  }

  if (context.selectedText) {
    lines.push(`선택 블록: ${context.selectedText.replace(/\s+/g, " ").slice(0, 120)}.`);
  }

  if (context.calendarContext) {
    lines.push(createCalendarContextAnswer(context));
  }

  if (context.memory.length > 0) {
    lines.push(`장기 메모리: ${context.memory.join(" / ")}`);
  }

  return lines;
}

function getApprovalSummaryLines(action: {
  diff: string;
  summary: string;
}): string[] {
  const parsedDiff = parseJsonObject(action.diff);
  const parsedLines = parsedDiff ? summarizeApprovalValue(parsedDiff) : [];
  const textLines = action.diff
    .split("\n")
    .map(cleanApprovalTextLine)
    .filter(Boolean);
  const detailLines = parsedLines.length > 0 ? parsedLines : textLines;
  const lines = uniqueStrings(detailLines.length > 0 ? detailLines : [action.summary]);

  return lines.slice(0, 5);
}

function parseJsonObject(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function summarizeApprovalValue(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(summarizeApprovalValue);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const lines: string[] = [];

  if (typeof record.humanReadable === "string") {
    lines.push(record.humanReadable);
  }

  if (typeof record.target === "string") {
    lines.push(record.target);
  }

  if (typeof record.before === "string" && typeof record.after === "string") {
    lines.push(`${record.before} -> ${record.after}`);
  } else if (typeof record.after === "string") {
    lines.push(`변경 후: ${record.after}`);
  }

  if (Array.isArray(record.changes)) {
    for (const change of record.changes) {
      if (!change || typeof change !== "object") {
        continue;
      }

      const changeRecord = change as Record<string, unknown>;
      const field = typeof changeRecord.field === "string" ? changeRecord.field : "변경";
      const from = typeof changeRecord.from === "string" ? changeRecord.from : "";
      const to = typeof changeRecord.to === "string" ? changeRecord.to : "";

      if (to) {
        lines.push(from ? `${field}: ${from} -> ${to}` : `${field}: ${to}`);
      }
    }
  }

  if (record.after && typeof record.after === "object" && !Array.isArray(record.after)) {
    lines.push(...summarizeObjectFields(record.after as Record<string, unknown>));
  }

  return uniqueStrings(lines);
}

function summarizeObjectFields(record: Record<string, unknown>) {
  const labels: Record<string, string> = {
    title: "제목",
    start: "시작",
    end: "종료",
    date: "날짜",
    time: "시간",
    text: "내용",
    status: "상태",
    owner: "담당"
  };

  return Object.entries(record)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => `${labels[key] ?? key}: ${value as string}`);
}

function cleanApprovalTextLine(line: string) {
  const cleaned = line
    .trim()
    .replace(/^[+-]\s*/, "")
    .replace(/^["']|["',]+$/g, "")
    .trim();

  if (!cleaned || cleaned === "{" || cleaned === "}" || cleaned === "[" || cleaned === "]") {
    return "";
  }

  return cleaned;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getOperatorToolLabel(toolName: string) {
  const labels: Record<string, string> = {
    updateBlock: "문서 블록 변경",
    createCalendarEvent: "일정 추가 제안",
    updateCalendarEvent: "일정 이동 제안",
    createDatabaseRow: "데이터베이스 행 추가"
  };

  return labels[toolName] ?? "AI 작업 제안";
}

function getRiskLabel(riskLevel: string) {
  const labels: Record<string, string> = {
    low: "낮은 위험",
    medium: "검토 필요",
    high: "높은 위험"
  };

  return labels[riskLevel] ?? "검토 필요";
}

function getApprovalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "승인 대기",
    approved: "승인됨",
    rejected: "거절됨",
    undone: "되돌림"
  };

  return labels[status] ?? "승인 대기";
}

function getNodiarySessionHeaders(): Record<string, string> {
  const desktop = (globalThis as unknown as {
    nodiaryDesktop?: {
      sessionToken?: string;
    };
    myplanDesktop?: {
      sessionToken?: string;
    };
  }).nodiaryDesktop ?? (globalThis as unknown as {
    myplanDesktop?: {
      sessionToken?: string;
    };
  }).myplanDesktop;
  const token = desktop?.sessionToken;

  return token ? { "x-nodiary-session": token } : {};
}

function runsInNodiaryDesktopShell() {
  return Boolean(
    (globalThis as unknown as {
      nodiaryDesktop?: unknown;
      myplanDesktop?: unknown;
    }).nodiaryDesktop ??
      (globalThis as unknown as {
        myplanDesktop?: unknown;
      }).myplanDesktop
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shouldOpenAiPanelFromStoredPreference(
  panelPreference: "open" | "closed"
) {
  return panelPreference === "open" && !isNarrowViewport();
}

function isNarrowViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(min-width: 1280px)").matches
  );
}
