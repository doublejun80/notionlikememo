"use client";

import { useState, type ReactNode } from "react";

import { LeftSidebar } from "@/components/navigation/left-sidebar";
import { RightContextPanel } from "@/components/layout/right-context-panel";
import { TopCommandBar } from "@/components/layout/top-command-bar";
import { cn } from "@/lib/utils";
import {
  useWorkspace,
  WorkspaceProvider
} from "@/components/layout/workspace-context";

type AppShellProps = {
  active: string;
  children: ReactNode;
};

export function AppShell({ active, children }: AppShellProps) {
  return (
    <WorkspaceProvider>
      <AppShellFrame active={active}>{children}</AppShellFrame>
    </WorkspaceProvider>
  );
}

function AppShellFrame({ active, children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-ink">
      <LeftSidebar active={active} className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopCommandBar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-auto px-4 py-5 lg:px-6">
          {children}
        </main>
      </div>
      <RightContextPanel />
      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="카테고리 닫기"
            className="absolute inset-0 bg-ink/20"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
          <LeftSidebar
            active={active}
            className="relative z-10 flex h-full w-[280px]"
            navLabel="모바일 워크스페이스"
            onNavigate={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      ) : null}
      <NewItemDialog />
      <MobileDetailPanel />
    </div>
  );
}

function NewItemDialog() {
  const { closeNewItem, createItem, isNewItemOpen } = useWorkspace();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("작업");

  if (!isNewItemOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 px-4">
      <form
        aria-label="새 항목 추가"
        className="w-full max-w-md rounded-md border border-border bg-white p-4 shadow-workspace"
        onSubmit={(event) => {
          event.preventDefault();
          createItem({ title: title || "제목 없는 항목", type });
          setTitle("");
          setType("작업");
        }}
        role="dialog"
      >
        <div className="text-[15px] font-semibold text-ink">새 항목 추가</div>
        <div className="mt-4">
          <label
            className="block text-[13px] font-medium text-muted"
            htmlFor="new-item-type"
          >
            종류
          </label>
          <select
            id="new-item-type"
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] text-ink outline-none"
            onChange={(event) => setType(event.target.value)}
            value={type}
          >
            <option>작업</option>
            <option>일정</option>
            <option>노트</option>
            <option>저널</option>
          </select>
        </div>
        <div className="mt-3">
          <label
            className="block text-[13px] font-medium text-muted"
            htmlFor="new-item-title"
          >
            제목
          </label>
          <input
            id="new-item-title"
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] text-ink outline-none placeholder:text-faint"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="추가할 항목 제목"
            value={title}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="h-9 rounded-md border border-border bg-white px-3 text-[13px] text-muted"
            onClick={closeNewItem}
            type="button"
          >
            취소
          </button>
          <button
            className="h-9 rounded-md bg-accent px-3 text-[13px] font-medium text-white"
            type="submit"
          >
            추가
          </button>
        </div>
      </form>
    </div>
  );
}

function MobileDetailPanel() {
  const { activeDetail } = useWorkspace();

  return (
    <section className="fixed bottom-3 left-3 right-3 z-40 rounded-md border border-border bg-white px-3 py-3 shadow-workspace xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-accent">선택 항목</div>
          <div className="truncate text-[13px] font-semibold text-ink">
            {activeDetail.title}
          </div>
        </div>
        <span className="shrink-0 rounded border border-border bg-surface-muted px-2 py-1 text-[11px] text-muted">
          {activeDetail.type}
        </span>
      </div>
      {activeDetail.description ? (
        <p className={cn("mt-2 line-clamp-2 text-[12px] leading-5 text-muted")}>
          {activeDetail.description}
        </p>
      ) : null}
    </section>
  );
}
