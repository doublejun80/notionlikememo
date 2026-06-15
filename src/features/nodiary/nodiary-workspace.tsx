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
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  approveAiAction,
  createAiRun,
  defaultNodiaryState,
  insertBlockFromSlash,
  rejectAiAction,
  selectCalendarDate,
  switchDatabaseView,
  undoLastAiAction,
  updatePreference,
  type DatabaseBlock,
  type DatabaseRow,
  type DatabaseViewType,
  type NodiaryBlock,
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

export function NodiaryWorkspace() {
  const [state, setState] = useState(() => defaultNodiaryState());
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSlashOpen, setSlashOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAiPanelOpen, setAiPanelOpen] = useState(
    state.preferences.rightAiPanel === "open"
  );
  const [aiInput, setAiInput] = useState("");
  const [quickCapture, setQuickCapture] = useState("");
  const [activePageId, setActivePageId] = useState(state.activePage.id);

  const documentWidthClass =
    state.preferences.documentWidth === "wide" ? "max-w-[900px]" : "max-w-[800px]";
  const densityClass =
    state.preferences.density === "compact" ? "nodiary-density-compact" : "";

  function insertSlashBlock(type: SlashInsertType) {
    setState((current) => insertBlockFromSlash(current, "memo-body", type));
    setSlashOpen(false);
  }

  function sendAiCommand() {
    const command = aiInput.trim();

    if (!command) {
      return;
    }

    setState((current) => createAiRun(current, command));
    setAiInput("");
  }

  return (
    <div
      className={cn(
        "flex min-h-screen bg-[#fbfaf7] text-[#24211d]",
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
        onOpenSettings={() => setSettingsOpen(true)}
        onQuickCapture={(value) => setQuickCapture(value)}
        onSelectPage={setActivePageId}
        quickCapture={quickCapture}
        state={state}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <NodiaryTopBar
          isAiPanelOpen={isAiPanelOpen}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleAiPanel={() => setAiPanelOpen((open) => !open)}
          pageTitle={state.activePage.title}
        />
        <main className="min-w-0 flex-1 overflow-auto bg-white">
          <DocumentCanvas
            blocks={state.activePage.blocks}
            documentWidthClass={documentWidthClass}
            isSlashOpen={isSlashOpen}
            onOpenSlash={() => setSlashOpen((open) => !open)}
            onSlashInsert={insertSlashBlock}
            onSwitchDatabaseView={(blockId, view) =>
              setState((current) => switchDatabaseView(current, blockId, view))
            }
            pageProperties={state.activePage.properties}
            pageTitle={state.activePage.title}
            slashOpen={isSlashOpen}
          />
        </main>
      </div>

      {isAiPanelOpen ? (
        <AiOperatorPanel
          aiInput={aiInput}
          aiState={state.ai}
          onApprove={(actionId) =>
            setState((current) => approveAiAction(current, actionId))
          }
          onChangeAiInput={setAiInput}
          onReject={(actionId) =>
            setState((current) => rejectAiAction(current, actionId))
          }
          onSend={sendAiCommand}
          onUndo={() => setState((current) => undoLastAiAction(current))}
        />
      ) : null}

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
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
            onOpenSettings={() => setSettingsOpen(true)}
            onQuickCapture={(value) => setQuickCapture(value)}
            onSelectPage={(pageId) => {
              setActivePageId(pageId);
              setMobileSidebarOpen(false);
            }}
            quickCapture={quickCapture}
            state={state}
          />
        </div>
      ) : null}

      {isSettingsOpen ? (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onUpdate={(patch) =>
            setState((current) => {
              const next = updatePreference(current, patch);

              setAiPanelOpen(next.preferences.rightAiPanel === "open");
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
  className?: string;
  quickCapture: string;
  state: ReturnType<typeof defaultNodiaryState>;
  onCalendarDateSelect: (isoDate: string) => void;
  onOpenSettings: () => void;
  onQuickCapture: (value: string) => void;
  onSelectPage: (pageId: string) => void;
};

function NodiarySidebar({
  activePageId,
  className,
  onCalendarDateSelect,
  onOpenSettings,
  onQuickCapture,
  onSelectPage,
  quickCapture,
  state
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-[320px] shrink-0 flex-col border-r border-[#e4e0d8] bg-[#f4f2ee] px-3 py-3",
        className
      )}
    >
      <div className="flex h-9 items-center gap-2 px-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-[#24211d] text-white">
          <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="text-[12px] font-bold tracking-[0.14em] text-[#7c766d]">
          NODIARY
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <SidebarUtilityRow icon={Search} label="검색" />
        <SidebarUtilityRow icon={Inbox} label="INBOX" />
        <SidebarUtilityRow icon={Plus} label="QUICK CAPTURE" />
        <SidebarUtilityRow icon={Sparkles} label="AI 글쓰기" />
      </div>

      <div className="mt-4 border-t border-[#e4e0d8] pt-4">
        <div className="flex h-7 items-center justify-between px-2">
          <div className="text-[13px] font-semibold text-[#3a3630]">
            {state.sidebarCalendar.monthLabel}
          </div>
          <button
            className="h-7 rounded px-2 text-[12px] font-medium text-[#6f6a61] hover:bg-white"
            onClick={() => onCalendarDateSelect("2026-06-15")}
            type="button"
          >
            오늘
          </button>
        </div>
        <MiniCalendar
          onSelectDate={onCalendarDateSelect}
          selectedDate={state.sidebarCalendar.selectedDate}
          days={state.sidebarCalendar.days}
          monthLabel={state.sidebarCalendar.monthLabel}
        />
        <div className="mt-3 space-y-2 px-1">
          {state.sidebarCalendar.schedule.map((event) => (
            <button
              key={event.id}
              className="flex w-full items-start gap-2 rounded-md bg-[#ebe7df] px-2.5 py-2 text-left hover:bg-white"
              type="button"
            >
              <span className="min-w-[44px] text-[12px] font-semibold text-[#3a3630]">
                {event.time}
              </span>
              <span className="min-w-0 text-[12px] leading-5 text-[#6f6a61]">
                {event.title}
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
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-white"
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
              onSelectPage={onSelectPage}
            />
          ))}
        </nav>
      </div>

      <form
        className="mt-auto border-t border-[#e4e0d8] pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          onQuickCapture("");
        }}
      >
        <label className="px-2 text-[11px] font-semibold text-[#8c867c]">
          QUICK CAPTURE
          <input
            className="mt-2 h-9 w-full rounded border border-[#dedad1] bg-white px-2 text-[12px] text-[#24211d] outline-none placeholder:text-[#9a948a]"
            onChange={(event) => onQuickCapture(event.target.value)}
            placeholder="떠오른 생각을 Inbox로"
            value={quickCapture}
          />
        </label>
      </form>

      <button
        aria-label="설정 열기"
        className="mt-3 flex h-9 items-center gap-2 rounded-md px-2 text-[13px] text-[#6f6a61] hover:bg-white hover:text-[#24211d]"
        onClick={onOpenSettings}
        type="button"
      >
        <span className="flex h-5 w-5 items-center justify-center">
          <Settings className="h-4 w-4" aria-hidden="true" />
        </span>
        설정
      </button>
    </aside>
  );
}

function SidebarUtilityRow({
  icon: Icon,
  label
}: {
  icon: typeof Search;
  label: string;
}) {
  return (
    <button
      className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-semibold tracking-[0.04em] text-[#8c867c] hover:bg-white hover:text-[#24211d]"
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
  onSelectPage,
  depth = 0
}: {
  activePageId: string;
  node: PageNode;
  onSelectPage: (pageId: string) => void;
  depth?: number;
}) {
  const hasChildren = Boolean(node.children?.length);
  const ChevronIcon = node.expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        className={cn(
          "flex h-8 w-full items-center gap-1 rounded-md pr-2 text-left text-[13px] text-[#7c766d] hover:bg-white hover:text-[#24211d]",
          activePageId === node.id && "bg-[#ebe7df] font-medium text-[#24211d]"
        )}
        onClick={() => onSelectPage(node.id)}
        style={{ paddingLeft: 8 + depth * 18 }}
        type="button"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <ChevronIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
          )}
        </span>
        <span className="min-w-0 truncate leading-none">{node.title}</span>
      </button>
      {node.expanded && node.children
        ? node.children.map((child) => (
            <PageTreeRow
              activePageId={activePageId}
              depth={depth + 1}
              key={child.id}
              node={child}
              onSelectPage={onSelectPage}
            />
          ))
        : null}
    </div>
  );
}

function MiniCalendar({
  days,
  monthLabel,
  onSelectDate
}: {
  days: ReturnType<typeof defaultNodiaryState>["sidebarCalendar"]["days"];
  monthLabel: string;
  selectedDate: string;
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
          <button
            aria-label={`${day.isoDate}${day.isSelected ? " 선택됨" : ""}`}
            className={cn(
              "flex h-8 items-center justify-center rounded-md text-[12px] leading-none text-[#6f6a61] hover:bg-white",
              day.hasEvent && "bg-[#ebe7df]",
              day.isSelected && "bg-[#2f5d62] font-semibold text-white hover:bg-[#2f5d62]"
            )}
            key={day.id}
            onClick={() => onSelectDate(day.isoDate)}
            role="button"
            type="button"
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NodiaryTopBar({
  isAiPanelOpen,
  onOpenMobileSidebar,
  onOpenSettings,
  onToggleAiPanel,
  pageTitle
}: {
  isAiPanelOpen: boolean;
  pageTitle: string;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  onToggleAiPanel: () => void;
}) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-[#eeeae3] bg-white px-3 text-[13px]">
      <div className="flex min-w-0 items-center gap-2 text-[#8c867c]">
        <button
          aria-label="사이드바 열기"
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee] lg:hidden"
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
        <button className="h-8 rounded px-2 hover:bg-[#f4f2ee]" type="button">
          댓글
        </button>
        <button className="h-8 rounded px-2 hover:bg-[#f4f2ee]" type="button">
          공유
        </button>
        <button
          aria-label={isAiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
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
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
          onClick={onOpenSettings}
          type="button"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          aria-label="더보기"
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f4f2ee]"
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
  onOpenSlash,
  onSlashInsert,
  onSwitchDatabaseView,
  pageProperties,
  pageTitle
}: {
  blocks: NodiaryBlock[];
  documentWidthClass: string;
  isSlashOpen: boolean;
  pageProperties: ReturnType<typeof defaultNodiaryState>["activePage"]["properties"];
  pageTitle: string;
  slashOpen: boolean;
  onOpenSlash: () => void;
  onSlashInsert: (type: SlashInsertType) => void;
  onSwitchDatabaseView: (blockId: string, view: DatabaseViewType) => void;
}) {
  return (
    <div className={cn("mx-auto min-h-full px-8 pb-24 pt-14", documentWidthClass)}>
      <h1
        className="min-h-[68px] text-[42px] font-bold leading-tight tracking-normal text-[#24211d] outline-none"
        contentEditable
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
            onSwitchDatabaseView={onSwitchDatabaseView}
          />
        ))}
      </div>

      <div className="relative mt-4 pl-9">
        <button
          aria-label="slash 메뉴 열기"
          className="flex h-10 w-full items-center rounded-md px-3 text-left text-[14px] text-[#8c867c] hover:bg-[#f7f5f0]"
          onClick={onOpenSlash}
          type="button"
        >
          빈 블록. 여기에 바로 입력하거나 / 를 누르세요.
        </button>
        {isSlashOpen ? <SlashMenu onInsert={onSlashInsert} /> : null}
      </div>
    </div>
  );
}

function DocumentBlock({
  block,
  onSwitchDatabaseView
}: {
  block: NodiaryBlock;
  onSwitchDatabaseView: (blockId: string, view: DatabaseViewType) => void;
}) {
  return (
    <div
      className="group grid min-h-9 grid-cols-[28px_1fr] items-start gap-2 rounded-md"
      draggable
    >
      <div className="flex h-9 items-center justify-center text-[#c0bab0] opacity-0 group-hover:opacity-100">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        {block.type === "heading" ? (
          <h2
            className="min-h-10 rounded px-1 text-[26px] font-bold leading-10 tracking-normal outline-none hover:bg-[#f7f5f0]"
            contentEditable
            suppressContentEditableWarning
          >
            {block.title}
          </h2>
        ) : null}
        {block.type === "todo" ? <TodoBlock block={block} /> : null}
        {block.type === "paragraph" ? <RichTextBlock text={block.text ?? ""} /> : null}
        {block.type === "callout" ? (
          <div className="flex min-h-10 items-start gap-3 rounded-md bg-[#f4f2ee] px-3 py-2 text-[15px] leading-7 text-[#3a3630]">
            <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-[#6f6a61]" />
            <RichTextBlock text={block.text ?? ""} variant="callout" />
          </div>
        ) : null}
        {block.type === "database" && block.database ? (
          <DatabaseViewBlock
            blockId={block.id}
            database={block.database}
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

function RichTextBlock({
  text,
  variant = "paragraph"
}: {
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
    immediatelyRender: false
  });

  return (
    <EditorContent
      className={cn(
        "nodiary-tiptap min-h-8 rounded px-1 text-[15px] leading-8 outline-none hover:bg-[#f7f5f0]",
        variant === "callout" && "flex-1 hover:bg-transparent"
      )}
      editor={editor}
    />
  );
}

function TodoBlock({ block }: { block: NodiaryBlock }) {
  const [checked, setChecked] = useState(Boolean(block.checked));

  return (
    <label className="flex min-h-9 items-center gap-3 rounded px-1 text-[15px] leading-8 text-[#3a3630] hover:bg-[#f7f5f0]">
      <button
        aria-label={checked ? "할 일 완료됨" : "할 일 미완료"}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border",
          checked
            ? "border-[#2f5d62] bg-[#2f5d62] text-white"
            : "border-[#cfc9be] bg-white"
        )}
        onClick={(event) => {
          event.preventDefault();
          setChecked((value) => !value);
        }}
        type="button"
      >
        {checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </button>
      <span
        className={cn(
          "min-w-0 outline-none",
          checked && "text-[#8c867c] line-through"
        )}
        contentEditable
        suppressContentEditableWarning
      >
        {block.text}
      </span>
    </label>
  );
}

function SlashMenu({ onInsert }: { onInsert: (type: SlashInsertType) => void }) {
  return (
    <div
      className="absolute left-9 top-11 z-20 w-[320px] overflow-hidden rounded-md border border-[#dedad1] bg-white shadow-[0_12px_36px_rgba(36,33,29,0.12)]"
      role="menu"
    >
      <div className="border-b border-[#eeeae3] px-3 py-2 text-[12px] font-medium text-[#6f6a61]">
        / 입력 중
      </div>
      <div className="py-1">
        {slashItems.map((item) => (
          <button
            className="flex h-11 w-full items-center gap-3 px-3 text-left text-[14px] text-[#3a3630] hover:bg-[#f7f5f0]"
            key={item.label}
            onClick={() => onInsert(item.type)}
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

function DatabaseViewBlock({
  blockId,
  database,
  onSwitchView
}: {
  blockId: string;
  database: DatabaseBlock;
  onSwitchView: (blockId: string, view: DatabaseViewType) => void;
}) {
  return (
    <section className="my-4 rounded-md border border-[#dedad1] bg-white">
      <div className="flex items-center justify-between border-b border-[#eeeae3] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="h-4 w-4 shrink-0 text-[#6f6a61]" aria-hidden="true" />
          <div className="truncate text-[15px] font-semibold text-[#24211d]">
            {database.name}
          </div>
        </div>
        <div className="flex rounded border border-[#dedad1] bg-[#f7f5f0] p-0.5">
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
      {database.activeView === "board" ? <DatabaseBoard rows={database.rows} /> : null}
      {database.activeView === "calendar" ? (
        <DatabaseCalendar rows={database.rows} />
      ) : null}
    </section>
  );
}

function DatabaseTable({ database }: { database: DatabaseBlock }) {
  return (
    <table
      aria-label={`${database.name} 테이블`}
      className="w-full border-collapse text-left text-[13px]"
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
          <tr className="hover:bg-[#fbfaf7]" draggable key={row.id}>
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
  );
}

function DatabaseBoard({ rows }: { rows: DatabaseRow[] }) {
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
        <section className="min-h-28 rounded border border-[#eeeae3] bg-[#fbfaf7] p-2" key={group.status}>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#6f6a61]">
            <Circle className="h-3 w-3" aria-hidden="true" />
            {databaseStatusLabel[group.status]}
          </div>
          <div className="space-y-2">
            {group.rows.map((row) => (
              <article
                className="rounded border border-[#dedad1] bg-white px-2 py-2 text-[12px] shadow-[0_1px_1px_rgba(36,33,29,0.04)]"
                draggable
                key={row.id}
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
          className="flex items-center justify-between rounded border border-[#dedad1] px-3 py-2 text-left text-[13px] hover:bg-[#fbfaf7]"
          draggable
          key={row.id}
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
  aiInput,
  aiState,
  onApprove,
  onChangeAiInput,
  onReject,
  onSend,
  onUndo
}: {
  aiInput: string;
  aiState: ReturnType<typeof defaultNodiaryState>["ai"];
  onApprove: (actionId: string) => void;
  onChangeAiInput: (value: string) => void;
  onReject: (actionId: string) => void;
  onSend: () => void;
  onUndo: () => void;
}) {
  const pendingActions = aiState.runs.flatMap((run) =>
    run.actions.map((action) => ({ ...action, runCommand: run.command }))
  );

  return (
    <aside className="hidden w-[360px] shrink-0 border-l border-[#e4e0d8] bg-[#fbfaf7] px-3 py-3 xl:block">
      <div className="flex h-9 items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#24211d]">
          <Bot className="h-4 w-4 text-[#2f5d62]" aria-hidden="true" />
          AI 글쓰기
        </div>
        <span className="rounded bg-[#e4efed] px-2 py-1 text-[11px] font-medium text-[#2f5d62]">
          승인 후 실행
        </span>
      </div>
      <textarea
        aria-label="AI 명령 입력"
        className="mt-3 h-[184px] w-full resize-none rounded-md border border-[#dedad1] bg-white px-3 py-3 text-[13px] leading-6 text-[#24211d] outline-none placeholder:text-[#9a948a]"
        onChange={(event) => onChangeAiInput(event.target.value)}
        placeholder="예: 이 페이지를 더 날카로운 실행 계획으로 다듬어줘. 캘린더 충돌은 승인 큐에 올려."
        value={aiInput}
      />
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
                    {action.toolName}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#24211d]">
                    {action.summary}
                  </div>
                </div>
                <span className="rounded bg-[#f4f2ee] px-2 py-1 text-[11px] text-[#6f6a61]">
                  {action.riskLevel}
                </span>
              </div>
              <div className="mt-3 rounded bg-[#fbfaf7] px-2 py-2 font-mono text-[12px] leading-5 text-[#3a3630]">
                {action.diff.split("\n").map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-[#8c867c]">
                  {action.approvalStatus}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <section
        aria-label="개인화 설정"
        className="w-full max-w-xl rounded-md border border-[#dedad1] bg-white p-5 shadow-[0_20px_60px_rgba(36,33,29,0.18)]"
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
