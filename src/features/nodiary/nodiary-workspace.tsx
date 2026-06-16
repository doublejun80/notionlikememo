"use client";

import {
  Bot,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Columns3,
  Database,
  FileText,
  GripVertical,
  Inbox,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Table2,
  Text,
  Undo2,
  X
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from "react";

import { cn } from "@/lib/utils";

import {
  approveAiAction,
  createNewPage,
  createAiRun,
  createAiRunFromOperatorPlan,
  defaultNodiaryState,
  insertBlockFromSlash,
  insertParagraphBlock,
  moveBlock,
  moveDatabaseRow,
  movePageNode,
  rejectAiAction,
  requestCalendarEventMove,
  selectCalendarDate,
  selectPage,
  switchDatabaseView,
  togglePageNodeExpanded,
  undoLastAiAction,
  updateBlockText,
  updateBlockTitle,
  updatePageTitle,
  updatePreference,
  updateTodoBlock,
  type DatabaseBlock,
  type DatabaseRow,
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

type CapturedItem = {
  id: string;
  text: string;
  createdLabel: string;
};

const workspaceStorageKey = "nodiary.workspace.v2";
const captureStorageKey = "nodiary.quickCapture.v1";

export function NodiaryWorkspace() {
  const [state, setState] = useState(() => loadStoredWorkspaceState());
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSlashOpen, setSlashOpen] = useState(false);
  const [slashAnchorBlockId, setSlashAnchorBlockId] = useState("memo-body");
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAiPanelOpen, setAiPanelOpen] = useState(
    state.preferences.rightAiPanel === "open"
  );
  const [aiInput, setAiInput] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [quickCapture, setQuickCapture] = useState("");
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>(() =>
    loadStoredCaptures()
  );
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activePageId, setActivePageId] = useState(state.activePage.id);
  const quickCaptureInputRef = useRef<HTMLInputElement>(null);

  const documentWidthClass =
    state.preferences.documentWidth === "wide" ? "max-w-[900px]" : "max-w-[800px]";
  const densityClass =
    state.preferences.density === "compact" ? "nodiary-density-compact" : "";

  useEffect(() => {
    if (shouldCloseInitialAiPanelOnSmallScreen(state.preferences.rightAiPanel)) {
      const timeoutId = window.setTimeout(() => setAiPanelOpen(false), 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [state.preferences.rightAiPanel]);

  useEffect(() => {
    storeWorkspaceState(state);
  }, [state]);

  useEffect(() => {
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

    setAiInput("");

    try {
      const response = await fetch("/api/ai/operator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getNodiarySessionHeaders()
        },
        body: JSON.stringify({
          command,
          pageTitle: state.activePage.title,
          selectedText: "",
          memory: state.ai.memories.map((memory) => memory.content)
        })
      });

      if (!response.ok) {
        throw new Error("AI operator route failed");
      }

      const payload = (await response.json()) as { plan?: OperatorPlanDraft };

      if (!payload.plan) {
        throw new Error("AI operator route returned no plan");
      }

      setState((current) =>
        createAiRunFromOperatorPlan(current, command, payload.plan as OperatorPlanDraft)
      );
    } catch {
      setAiNotice("OpenAI 연결에 실패해 로컬 초안으로 승인 큐를 만들었습니다.");
      setState((current) => createAiRun(current, command));
    }
  }

  return (
    <div
      className={cn(
        "flex h-dvh overflow-hidden bg-[#fbfaf7] text-[#24211d]",
        densityClass
      )}
      data-accent={state.preferences.accent}
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
        onMovePageNode={(nodeId, parentNodeId, index) =>
          setState((current) => movePageNode(current, nodeId, parentNodeId, index))
        }
        capturedItems={capturedItems}
        onCreatePage={createPage}
        onFocusQuickCapture={focusQuickCapture}
        onOpenAi={() => setAiPanelOpen(true)}
        onOpenInbox={openInbox}
        onOpenSearch={openSearch}
        onOpenSettings={() => setSettingsOpen(true)}
        onQuickCapture={(value) => setQuickCapture(value)}
        onSelectPage={openPage}
        onTogglePageExpanded={(nodeId) =>
          setState((current) => togglePageNodeExpanded(current, nodeId))
        }
        onSubmitQuickCapture={submitQuickCapture}
        quickCaptureInputRef={quickCaptureInputRef}
        quickCapture={quickCapture}
        state={state}
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
        <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-white">
          <DocumentCanvas
            blocks={state.activePage.blocks}
            documentWidthClass={documentWidthClass}
            isSlashOpen={isSlashOpen}
            onCloseSlash={closeSlash}
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
            onMoveDatabaseRow={(databaseBlockId, rowId, patch) =>
              setState((current) =>
                moveDatabaseRow(current, databaseBlockId, rowId, patch)
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
            aiState={state.ai}
            notice={aiNotice}
            onApprove={(actionId) =>
              setState((current) => approveAiAction(current, actionId))
            }
            onChangeAiInput={setAiInput}
            onReject={(actionId) =>
              setState((current) => rejectAiAction(current, actionId))
            }
            onClose={() => setAiPanelOpen(false)}
            onSend={sendAiCommand}
            onUndo={() => setState((current) => undoLastAiAction(current))}
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
            onMovePageNode={(nodeId, parentNodeId, index) =>
              setState((current) => movePageNode(current, nodeId, parentNodeId, index))
            }
            capturedItems={capturedItems}
            onClose={() => setMobileSidebarOpen(false)}
            onCreatePage={createPage}
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
  quickCapture: string;
  quickCaptureInputRef: RefObject<HTMLInputElement | null>;
  state: ReturnType<typeof defaultNodiaryState>;
  onCalendarDateSelect: (isoDate: string) => void;
  onCalendarEventMove: (eventId: string, isoDate: string) => void;
  onClose?: () => void;
  onCreatePage: () => void;
  onFocusQuickCapture: () => void;
  onMovePageNode: (nodeId: string, parentNodeId: string, index: number) => void;
  onOpenAi: () => void;
  onOpenInbox: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onQuickCapture: (value: string) => void;
  onSelectPage: (pageId: string) => void;
  onSubmitQuickCapture: () => void;
  onTogglePageExpanded: (nodeId: string) => void;
  workspaceNotice: string;
};

function NodiarySidebar({
  activePageId,
  capturedItems,
  className,
  onCalendarDateSelect,
  onCalendarEventMove,
  onClose,
  onCreatePage,
  onFocusQuickCapture,
  onMovePageNode,
  onOpenAi,
  onOpenInbox,
  onOpenSearch,
  onOpenSettings,
  onQuickCapture,
  onSelectPage,
  onSubmitQuickCapture,
  onTogglePageExpanded,
  quickCapture,
  quickCaptureInputRef,
  workspaceNotice,
  state
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-[320px] shrink-0 flex-col overflow-hidden border-r border-[#e4e0d8] bg-[#f4f2ee] px-3 py-3",
        className
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#24211d] text-white">
            <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="truncate text-[12px] font-bold tracking-[0.14em] text-[#7c766d]">
            NODIARY
          </span>
        </div>
        {onClose ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="설정 열기"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white"
              onClick={onOpenSettings}
              type="button"
            >
              <Settings className="h-4 w-4 text-[#6f6a61]" aria-hidden="true" />
            </button>
            <button
              aria-label="사이드바 닫기"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4 text-[#6f6a61]" aria-hidden="true" />
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

        <div className="mt-4 border-t border-[#e4e0d8] pt-4">
          <div className="flex h-8 items-center justify-between px-2">
            <div className="text-[13px] font-semibold text-[#3a3630]">
              {state.sidebarCalendar.monthLabel}
            </div>
            <button
              className="h-8 rounded px-2 text-[12px] font-medium text-[#6f6a61] hover:bg-white"
              onClick={() => onCalendarDateSelect("2026-06-16")}
              type="button"
            >
              오늘
            </button>
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
              <div className="rounded-md border border-dashed border-[#dedad1] bg-white/50 px-3 py-2 text-[12px] leading-5 text-[#8c867c]">
                선택한 날짜에 일정이 없습니다.
              </div>
            ) : null}
            {state.sidebarCalendar.schedule.map((event) => (
              <button
                aria-label={`일정 드래그: ${event.title}`}
                key={event.id}
                className="flex min-h-11 w-full items-start gap-2 rounded-md bg-[#ebe7df] px-2.5 py-2 text-left hover:bg-white"
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
                <span className="min-w-[44px] text-[12px] font-semibold text-[#3a3630]">
                  {event.time}
                </span>
                <span className="min-w-0 text-[12px] leading-5 text-[#6f6a61]">
                  {event.title}
                  {event.conflictRisk ? (
                    <span className="ml-2 rounded bg-[#fff3e2] px-1.5 py-0.5 text-[10px] font-semibold text-[#9a5a1f]">
                      {event.conflictRisk} risk
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-[#e4e0d8] pt-3">
          <div className="flex h-7 items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8c867c]">
              Pages
            </span>
            <button
              aria-label="새 페이지"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white"
              onClick={onCreatePage}
              type="button"
            >
              <Plus className="h-4 w-4 text-[#8c867c]" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="페이지 트리" className="mt-1 space-y-0.5">
            {state.pageTree.map((node) => (
              <PageTreeRow
                activePageId={activePageId}
                key={node.id}
                node={node}
                onMovePageNode={onMovePageNode}
                onSelectPage={onSelectPage}
                onTogglePageExpanded={onTogglePageExpanded}
              />
            ))}
          </nav>
        </div>
      </div>

      <div className="shrink-0">
        <form
          className="mt-3 border-t border-[#e4e0d8] pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitQuickCapture();
          }}
        >
          <label className="px-2 text-[11px] font-semibold text-[#8c867c]">
            QUICK CAPTURE
            <input
              ref={quickCaptureInputRef}
              className="mt-2 h-10 w-full rounded border border-[#dedad1] bg-white px-2 text-[12px] text-[#24211d] outline-none placeholder:text-[#9a948a] focus:border-[#2f5d62]"
              onChange={(event) => onQuickCapture(event.target.value)}
              placeholder="떠오른 생각을 Inbox로"
              value={quickCapture}
            />
          </label>
        </form>

        {workspaceNotice ? (
          <div className="mt-2 rounded-md bg-white px-2.5 py-2 text-[12px] leading-5 text-[#2f5d62]">
            {workspaceNotice}
          </div>
        ) : null}

        {capturedItems.length > 0 ? (
          <div className="mt-2 space-y-1">
            {capturedItems.slice(0, 2).map((item) => (
              <div
                className="rounded-md bg-[#ebe7df] px-2.5 py-2 text-[12px] leading-5 text-[#6f6a61]"
                key={item.id}
              >
                <div className="font-medium text-[#3a3630]">{item.createdLabel}</div>
                <div className="truncate">{item.text}</div>
              </div>
            ))}
          </div>
        ) : null}

        <button
          aria-label="설정 열기"
          className="mt-3 flex h-10 w-full items-center gap-2 rounded-md px-2 text-[13px] text-[#6f6a61] hover:bg-white hover:text-[#24211d]"
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
      className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-semibold tracking-[0.04em] text-[#8c867c] hover:bg-white hover:text-[#24211d]"
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
  onMovePageNode,
  onSelectPage,
  onTogglePageExpanded,
  depth = 0
}: {
  activePageId: string;
  node: PageNode;
  onMovePageNode: (nodeId: string, parentNodeId: string, index: number) => void;
  onSelectPage: (pageId: string) => void;
  onTogglePageExpanded: (nodeId: string) => void;
  depth?: number;
}) {
  const hasChildren = Boolean(node.children?.length);
  const ChevronIcon = node.expanded ? ChevronDown : ChevronRight;

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
          "flex h-8 w-full items-center gap-1 rounded-md pr-2 text-left text-[13px] text-[#7c766d] hover:bg-white hover:text-[#24211d]",
          activePageId === node.id && "bg-[#ebe7df] font-medium text-[#24211d]"
        )}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <button
          aria-label={hasChildren ? `페이지 펼치기/접기: ${node.title}` : `페이지 드래그: ${node.title}`}
          className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-[#aaa399] hover:bg-[#f7f5f0] hover:text-[#6f6a61]"
          draggable={!hasChildren}
          onDragStart={(event) => {
            if (hasChildren) {
              return;
            }
            event.dataTransfer.setData("text/nodiary-page", node.id);
            event.dataTransfer.setData("text/plain", node.id);
          }}
          onClick={() => {
            if (hasChildren) {
              onTogglePageExpanded(node.id);
            }
          }}
          type="button"
        >
          {hasChildren ? (
            <ChevronIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        {hasChildren ? (
          <button
            aria-label={`페이지 드래그: ${node.title}`}
            className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-[#aaa399] hover:bg-[#f7f5f0] hover:text-[#6f6a61]"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/nodiary-page", node.id);
              event.dataTransfer.setData("text/plain", node.id);
            }}
            type="button"
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        <button
          className="min-w-0 flex-1 truncate text-left leading-none"
          onClick={() => onSelectPage(node.id)}
          type="button"
        >
          {node.title}
        </button>
      </div>
      {node.expanded && node.children
        ? node.children.map((child) => (
            <PageTreeRow
              activePageId={activePageId}
              depth={depth + 1}
              key={child.id}
              node={child}
              onMovePageNode={onMovePageNode}
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
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#8c867c]">
        {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
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
                "flex h-8 w-full items-center justify-center rounded-md text-[12px] leading-none text-[#6f6a61] hover:bg-white",
                day.hasEvent && "bg-[#ebe7df]",
                day.isSelected && "bg-[#2f5d62] font-semibold text-white hover:bg-[#2f5d62]"
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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#eeeae3] bg-white px-2 text-[13px] sm:px-3">
      <div className="flex min-w-0 items-center gap-2 text-[#8c867c]">
        <button
          aria-label="사이드바 열기"
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee] lg:hidden"
          onClick={onOpenMobileSidebar}
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="hidden sm:inline">Pages</span>
        <ChevronRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        <span className="truncate font-medium text-[#3a3630]">{pageTitle}</span>
      </div>
      <div className="flex items-center gap-1 text-[#6f6a61]">
        <button
          aria-label="댓글"
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee] sm:w-auto sm:gap-1.5 sm:px-2"
          onClick={() => onAnnounce("댓글 패널은 다음 검수 패스에서 연결할 예정입니다.")}
          type="button"
        >
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">댓글</span>
        </button>
        <button
          aria-label="공유"
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee] sm:w-auto sm:gap-1.5 sm:px-2"
          onClick={() => onAnnounce("공유 기능은 로컬 문서 보존 검수 이후 연결합니다.")}
          type="button"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">공유</span>
        </button>
        <button
          aria-label={isAiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee]"
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
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee]"
          onClick={onOpenSettings}
          type="button"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          aria-label="더보기"
          className="flex h-10 w-10 items-center justify-center rounded hover:bg-[#f4f2ee]"
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
  onCloseSlash,
  onInsertParagraph,
  onMoveBlock,
  onMoveDatabaseRow,
  onOpenSlash,
  onSlashInsert,
  onSwitchDatabaseView,
  onUpdateBlockText,
  onUpdateBlockTitle,
  onUpdatePageTitle,
  onUpdateTodo,
  pageProperties,
  pageTitle
}: {
  blocks: NodiaryBlock[];
  documentWidthClass: string;
  isSlashOpen: boolean;
  pageProperties: ReturnType<typeof defaultNodiaryState>["activePage"]["properties"];
  pageTitle: string;
  slashOpen: boolean;
  onMoveBlock: (blockId: string, beforeBlockId: string) => void;
  onMoveDatabaseRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
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
        className="min-h-[68px] text-[38px] font-bold leading-tight tracking-normal text-[#24211d] outline-none sm:text-[42px]"
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
            <div className="text-[#7c766d]">{property.label}</div>
            <div className="font-medium text-[#3a3630]">{property.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-1">
        {blocks.map((block) => (
          <DocumentBlock
            block={block}
            key={block.id}
            onMoveBlock={onMoveBlock}
            onMoveDatabaseRow={onMoveDatabaseRow}
            onOpenSlash={onOpenSlash}
            onSwitchDatabaseView={onSwitchDatabaseView}
            onUpdateBlockText={onUpdateBlockText}
            onUpdateBlockTitle={onUpdateBlockTitle}
            onUpdateTodo={onUpdateTodo}
          />
        ))}
      </div>

      <div className="relative mt-4 pl-9">
        <button
          aria-label="빈 블록 입력"
          className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-[14px] text-[#8c867c] outline-none hover:bg-[#f7f5f0] focus:bg-[#f7f5f0]"
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
  onMoveBlock,
  onMoveDatabaseRow,
  onOpenSlash,
  onSwitchDatabaseView,
  onUpdateBlockText,
  onUpdateBlockTitle,
  onUpdateTodo
}: {
  block: NodiaryBlock;
  onMoveBlock: (blockId: string, beforeBlockId: string) => void;
  onMoveDatabaseRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  onOpenSlash: (anchorBlockId?: string) => void;
  onSwitchDatabaseView: (blockId: string, view: DatabaseViewType) => void;
  onUpdateBlockText: (blockId: string, text: string) => void;
  onUpdateBlockTitle: (blockId: string, title: string) => void;
  onUpdateTodo: (
    blockId: string,
    patch: Parameters<typeof updateTodoBlock>[2]
  ) => void;
}) {
  return (
    <div
      aria-label={`블록 드롭 위치: ${getBlockLabel(block)}`}
      className="group grid min-h-9 grid-cols-[28px_1fr] items-start gap-2 rounded-md"
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
      <div className="flex h-9 items-center justify-center text-[#c0bab0] opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <button
          aria-label={`블록 드래그: ${getBlockLabel(block)}`}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#f7f5f0] hover:text-[#6f6a61]"
          draggable
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
            className="min-h-10 rounded px-1 text-[26px] font-bold leading-10 tracking-normal outline-none hover:bg-[#f7f5f0]"
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
          <div className="flex min-h-10 items-start gap-3 rounded-md bg-[#f4f2ee] px-3 py-2 text-[15px] leading-7 text-[#3a3630]">
            <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-[#6f6a61]" />
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
            onMoveRow={onMoveDatabaseRow}
            onSwitchView={onSwitchDatabaseView}
          />
        ) : null}
        {block.type === "ai" ? (
          <div className="rounded-md border border-[#dedad1] bg-white px-3 py-2 text-[14px] text-[#6f6a61]">
            <Bot className="mr-2 inline h-4 w-4 text-[#2f5d62]" />
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
        "nodiary-tiptap min-h-8 rounded px-1 text-[15px] leading-8 outline-none hover:bg-[#f7f5f0]",
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
  return (
    <label className="flex min-h-9 items-center gap-3 rounded px-1 text-[15px] leading-8 text-[#3a3630] hover:bg-[#f7f5f0]">
      <button
        aria-label={block.checked ? "할 일 완료됨" : "할 일 미완료"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded border sm:h-[22px] sm:w-[22px]",
          block.checked
            ? "border-[#2f5d62] bg-[#2f5d62] text-white"
            : "border-[#cfc9be] bg-white"
        )}
        onClick={(event) => {
          event.preventDefault();
          onUpdate(block.id, { checked: !block.checked });
        }}
        type="button"
      >
        {block.checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </button>
      <span
        className={cn(
          "min-w-0 outline-none",
          block.checked && "text-[#8c867c] line-through"
        )}
        contentEditable
        onBlur={(event) =>
          onUpdate(block.id, { text: event.currentTarget.textContent ?? "" })
        }
        suppressContentEditableWarning
      >
        {block.text}
      </span>
    </label>
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
      className="absolute bottom-11 left-0 right-0 z-20 max-h-[min(320px,calc(100vh-160px))] overflow-y-auto rounded-md border border-[#dedad1] bg-white shadow-[0_12px_36px_rgba(36,33,29,0.12)] sm:left-9 sm:right-auto sm:w-[320px]"
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
      <div className="border-b border-[#eeeae3] px-3 py-2 text-[12px] font-medium text-[#6f6a61]">
        / 입력 중
      </div>
      <div className="py-1">
        {slashItems.map((item, index) => (
          <button
            className={cn(
              "flex h-11 w-full items-center gap-3 px-3 text-left text-[14px] text-[#3a3630] hover:bg-[#f7f5f0]",
              activeIndex === index && "bg-[#f7f5f0]"
            )}
            id={`slash-item-${index}`}
            key={item.label}
            onClick={() => onInsert(item.type)}
            onMouseEnter={() => setActiveIndex(index)}
            role="menuitem"
            type="button"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded border border-[#dedad1] text-[#6f6a61]">
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
  onMoveRow,
  onSwitchView
}: {
  blockId: string;
  database: DatabaseBlock;
  onMoveRow: (
    databaseBlockId: string,
    rowId: string,
    patch: Parameters<typeof moveDatabaseRow>[3]
  ) => void;
  onSwitchView: (blockId: string, view: DatabaseViewType) => void;
}) {
  return (
    <section className="my-4 rounded-md border border-[#dedad1] bg-white">
      <div className="flex flex-col gap-2 border-b border-[#eeeae3] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="h-4 w-4 shrink-0 text-[#6f6a61]" aria-hidden="true" />
          <div className="truncate text-[15px] font-semibold text-[#24211d]">
            {database.name}
          </div>
        </div>
        <div className="flex shrink-0 overflow-x-auto rounded border border-[#dedad1] bg-[#f7f5f0] p-0.5">
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
                "flex h-7 items-center gap-1.5 rounded px-2 text-[12px] text-[#6f6a61]",
                database.activeView === view && "bg-white font-medium text-[#24211d]"
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
      {database.activeView === "table" ? (
        <DatabaseTable database={database} />
      ) : null}
      {database.activeView === "board" ? (
        <DatabaseBoard
          blockId={blockId}
          onMoveRow={onMoveRow}
          rows={database.rows}
        />
      ) : null}
      {database.activeView === "calendar" ? (
        <DatabaseCalendar rows={database.rows} />
      ) : null}
    </section>
  );
}

function DatabaseTable({ database }: { database: DatabaseBlock }) {
  return (
    <div className="overflow-x-auto">
      <table
        aria-label={`${database.name} 테이블`}
        className="min-w-[620px] w-full border-collapse text-left text-[13px]"
      >
        <thead className="bg-[#fbfaf7] text-[#6f6a61]">
          <tr>
            {database.fields.map((field) => (
              <th className="border-b border-[#eeeae3] px-3 py-2 font-medium" key={field.id}>
                {field.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {database.rows.map((row) => (
            <tr
              aria-label={`DB 행 드래그: ${row.title}`}
              className="hover:bg-[#fbfaf7]"
              draggable
              key={row.id}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/nodiary-db-row", row.id);
                event.dataTransfer.setData("text/plain", row.id);
              }}
            >
              <td className="border-b border-[#eeeae3] px-3 py-2 font-medium text-[#24211d]">
                {row.title}
              </td>
              <td className="border-b border-[#eeeae3] px-3 py-2 text-[#6f6a61]">
                {databaseStatusLabel[row.status]}
              </td>
              <td className="border-b border-[#eeeae3] px-3 py-2 text-[#6f6a61]">
                {row.owner}
              </td>
              <td className="border-b border-[#eeeae3] px-3 py-2 text-[#6f6a61]">
                {row.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          className="min-h-28 rounded border border-[#eeeae3] bg-[#fbfaf7] p-2"
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
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#6f6a61]">
            <Circle className="h-3 w-3" aria-hidden="true" />
            {databaseStatusLabel[group.status]}
          </div>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <article
                aria-label={`DB 행 드래그: ${row.title}`}
                className="rounded border border-[#dedad1] bg-white px-2 py-2 text-[12px] shadow-[0_1px_1px_rgba(36,33,29,0.04)]"
                draggable
                key={row.id}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/nodiary-db-row", row.id);
                  event.dataTransfer.setData("text/plain", row.id);
                }}
              >
                <div className="font-medium text-[#24211d]">{row.title}</div>
                <div className="mt-2 text-[#8c867c]">{row.date}</div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DatabaseCalendar({ rows }: { rows: DatabaseRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
      {rows.map((row) => (
        <button
          aria-label={`DB 행 드래그: ${row.title}`}
          className="flex items-center justify-between rounded border border-[#dedad1] px-3 py-2 text-left text-[13px] hover:bg-[#fbfaf7]"
          draggable
          key={row.id}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/nodiary-db-row", row.id);
            event.dataTransfer.setData("text/plain", row.id);
          }}
          type="button"
        >
          <span className="min-w-0 truncate font-medium text-[#24211d]">
            {row.title}
          </span>
          <span className="shrink-0 text-[#6f6a61]">{row.date}</span>
        </button>
      ))}
    </div>
  );
}

function AiOperatorPanel({
  className,
  aiInput,
  aiState,
  notice,
  onApprove,
  onChangeAiInput,
  onClose,
  onReject,
  onSend,
  onUndo
}: {
  className?: string;
  aiInput: string;
  aiState: ReturnType<typeof defaultNodiaryState>["ai"];
  notice: string;
  onApprove: (actionId: string) => void;
  onChangeAiInput: (value: string) => void;
  onClose: () => void;
  onReject: (actionId: string) => void;
  onSend: () => void;
  onUndo: () => void;
}) {
  const pendingActions = aiState.runs.flatMap((run) =>
    run.actions.map((action) => ({ ...action, runCommand: run.command }))
  );

  return (
    <aside
      className={cn(
        "shrink-0 border-l border-[#e4e0d8] bg-[#fbfaf7] px-3 py-3",
        className
      )}
    >
      <div className="flex h-9 items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#24211d]">
          <Bot className="h-4 w-4 text-[#2f5d62]" aria-hidden="true" />
          AI 글쓰기
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded bg-[#e4efed] px-2 py-1 text-[11px] font-medium text-[#2f5d62]">
            승인 후 실행
          </span>
          <button
            aria-label="AI 패널 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <textarea
        aria-label="AI 명령 입력"
        className="mt-3 h-[184px] w-full resize-none rounded-md border border-[#dedad1] bg-white px-3 py-3 text-[13px] leading-6 text-[#24211d] outline-none placeholder:text-[#9a948a]"
        onChange={(event) => onChangeAiInput(event.target.value)}
        placeholder="예: 이 페이지를 더 날카로운 실행 계획으로 다듬어줘. 캘린더 충돌은 승인 큐에 올려."
        value={aiInput}
      />
      {notice ? (
        <div className="mt-2 rounded-md border border-[#f0d6b8] bg-[#fff8ee] px-3 py-2 text-[12px] leading-5 text-[#8a5a23]">
          {notice}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {["현재 페이지", "선택 블록", "왼쪽 캘린더", "장기 메모리"].map((scope) => (
          <span
            className="rounded border border-[#dedad1] bg-white px-2 py-1 text-[11px] text-[#6f6a61]"
            key={scope}
          >
            {scope}
          </span>
        ))}
      </div>
      <button
        className="mt-3 h-10 w-full rounded-md bg-[#2f5d62] text-[13px] font-semibold text-white hover:bg-[#284f53]"
        onClick={onSend}
        type="button"
      >
        AI에게 보내기
      </button>

      <section className="mt-4 rounded-md border border-[#dedad1] bg-white px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-[#24211d]">승인 대기</div>
          <button
            className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-[#6f6a61] hover:bg-[#f7f5f0]"
            disabled={aiState.undoLog.length === 0}
            onClick={onUndo}
            type="button"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            되돌리기
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {pendingActions.length === 0 ? (
            <div className="rounded border border-dashed border-[#dedad1] px-3 py-4 text-[12px] leading-5 text-[#8c867c]">
              AI가 바로 바꾸지 않고, 문서 변경안과 일정 변경안을 승인 큐로 올립니다.
            </div>
          ) : null}
          {pendingActions.map((action) => (
            <article className="rounded border border-[#dedad1] p-3" key={action.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold text-[#2f5d62]">
                    {getOperatorToolLabel(action.toolName)}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#24211d]">
                    {action.summary}
                  </div>
                </div>
                <span className="rounded bg-[#f4f2ee] px-2 py-1 text-[11px] text-[#6f6a61]">
                  {getRiskLabel(action.riskLevel)}
                </span>
              </div>
              <div className="mt-3 rounded bg-[#fbfaf7] px-2 py-2 font-mono text-[12px] leading-5 text-[#3a3630]">
                {action.diff.split("\n").map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[#8c867c]">
                  {getApprovalStatusLabel(action.approvalStatus)}
                </span>
                {action.approvalStatus === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      className="h-8 rounded border border-[#dedad1] px-3 text-[12px] text-[#6f6a61] hover:bg-[#f7f5f0]"
                      onClick={() => onReject(action.id)}
                      type="button"
                    >
                      거절
                    </button>
                    <button
                      className="h-8 rounded bg-[#2f5d62] px-3 text-[12px] font-medium text-white"
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

      <section className="mt-3 rounded-md border border-[#dedad1] bg-white px-3 py-3">
        <div className="text-[13px] font-semibold text-[#24211d]">장기 메모리</div>
        <div className="mt-2 space-y-2">
          {aiState.memories.map((memory) => (
            <div className="rounded bg-[#fbfaf7] px-2 py-2 text-[12px] leading-5 text-[#6f6a61]" key={memory.id}>
              {memory.content}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function SettingsDialog({
  onClose,
  onUpdate,
  preferences
}: {
  preferences: ReturnType<typeof defaultNodiaryState>["preferences"];
  onClose: () => void;
  onUpdate: (patch: Partial<typeof preferences>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-4 sm:items-center">
      <section
        aria-label="개인화 설정"
        aria-modal="true"
        className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-y-auto rounded-md border border-[#dedad1] bg-white p-4 shadow-[0_20px_60px_rgba(36,33,29,0.18)] sm:p-5"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[18px] font-semibold text-[#24211d]">
              개인화 설정
            </div>
            <div className="mt-1 text-[13px] text-[#6f6a61]">
              Notion에 가까운 기본값에서 밀도와 AI 패널을 조정합니다.
            </div>
          </div>
          <button
            aria-label="설정 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SettingGroup label="Theme">
            {["system", "light", "dark"].map((theme) => (
              <button
                className={settingButtonClass(preferences.theme === theme)}
                key={theme}
                onClick={() => onUpdate({ theme: theme as typeof preferences.theme })}
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

        <div className="mt-5 rounded bg-[#fbfaf7] px-3 py-3 font-mono text-[12px] leading-5 text-[#6f6a61]">
          <div>density: {preferences.density}</div>
          <div>right panel: {preferences.rightAiPanel}</div>
          <div>document width: {preferences.documentWidth}</div>
          <div>startup: {preferences.startupPage}</div>
        </div>
      </section>
    </div>
  );
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
        className="w-full max-w-lg rounded-md border border-[#dedad1] bg-white p-3 shadow-[0_20px_60px_rgba(36,33,29,0.18)]"
        role="dialog"
      >
        <div className="flex items-center gap-2 rounded border border-[#dedad1] px-3">
          <Search className="h-4 w-4 text-[#8c867c]" aria-hidden="true" />
          <input
            aria-label="검색어 입력"
            autoFocus
            className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9a948a]"
            placeholder="페이지, 캡처, AI 명령 검색"
          />
          <button
            aria-label="검색 닫기"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
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
      className="flex h-10 w-full items-center gap-3 rounded px-2 text-left text-[13px] text-[#3a3630] hover:bg-[#f7f5f0]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded border border-[#dedad1] text-[#6f6a61]">
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
      <div className="mb-2 text-[12px] font-semibold text-[#6f6a61]">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function settingButtonClass(isActive: boolean) {
  return cn(
    "h-8 rounded border px-3 text-[12px]",
    isActive
      ? "border-[#2f5d62] bg-[#e4efed] font-medium text-[#2f5d62]"
      : "border-[#dedad1] bg-white text-[#6f6a61] hover:bg-[#f7f5f0]"
  );
}

function loadStoredWorkspaceState(): NodiaryState {
  const fallback = defaultNodiaryState();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(workspaceStorageKey);

    if (!rawValue) {
      return fallback;
    }

    const stored = JSON.parse(rawValue) as Partial<NodiaryState>;

    return {
      ...fallback,
      ...stored,
      pages: stored.pages ?? {
        [stored.activePage?.id ?? fallback.activePage.id]:
          stored.activePage ?? fallback.activePage
      },
      activePage: stored.activePage ?? fallback.activePage,
      sidebarCalendar: stored.sidebarCalendar ?? fallback.sidebarCalendar,
      ai: stored.ai ?? fallback.ai,
      preferences: stored.preferences ?? fallback.preferences
    };
  } catch {
    return fallback;
  }
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

function getOperatorToolLabel(toolName: string) {
  const labels: Record<string, string> = {
    updateBlock: "문서 블록 변경",
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shouldCloseInitialAiPanelOnSmallScreen(
  panelPreference: "open" | "closed"
) {
  return (
    panelPreference === "open" &&
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(min-width: 1280px)").matches
  );
}
