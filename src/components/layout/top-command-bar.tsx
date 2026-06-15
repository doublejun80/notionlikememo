"use client";

import { Command, Menu, Plus, Search } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";

type TopCommandBarProps = {
  onOpenSidebar: () => void;
};

export function TopCommandBar({ onOpenSidebar }: TopCommandBarProps) {
  const { inspectItem, openNewItem } = useWorkspace();
  const [query, setQuery] = useState("");

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 sm:px-5">
      <button
        aria-label="카테고리 열기"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white text-ink shadow-workspace hover:bg-surface-muted lg:hidden"
        onClick={onOpenSidebar}
        type="button"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      <form
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm text-muted shadow-workspace"
        onSubmit={(event) => {
          event.preventDefault();
          inspectItem({
            type: "검색",
            title: query || "전체 검색",
            description: query
              ? `"${query}"에 대한 mock 검색 결과를 확인합니다.`
              : "검색어를 입력하면 관련 일정, 작업, 노트, 프로젝트를 찾습니다.",
            meta: ["Command/Search", "mock result"]
          });
        }}
      >
        <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="검색하거나 명령 실행"
          type="search"
          value={query}
        />
        <span className="hidden shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-faint sm:flex">
          <Command className="h-3 w-3" aria-hidden="true" />K
        </span>
      </form>

      <button
        aria-label="새 항목"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-white px-2 text-[13px] font-medium text-ink shadow-workspace hover:bg-surface-muted sm:px-3"
        onClick={openNewItem}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">새 항목</span>
      </button>
    </header>
  );
}
