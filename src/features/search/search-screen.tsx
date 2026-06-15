"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { myplanData } from "@/data/myplan-data";

export function SearchScreen() {
  const { inspectItem } = useWorkspace();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => [...myplanData.tasks.slice(0, 2), ...myplanData.notes.slice(0, 2)],
    []
  );

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <div>
        <div className="text-[13px] text-muted">전체 검색</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">검색</h1>
      </div>
      <section className="mt-5 rounded-md border border-border bg-white px-4 py-4 shadow-workspace">
        <form
          className="flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3"
          onSubmit={(event) => {
            event.preventDefault();
            inspectItem({
              type: "검색",
              title: query || "전체 검색",
              description: query
                ? `"${query}" 검색을 실행했습니다.`
                : "검색어 없이 전체 mock 결과를 표시합니다.",
              meta: [`${results.length}개 결과`]
            });
          }}
        >
          <Search className="h-4 w-4 text-faint" aria-hidden="true" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="노트, 작업, 프로젝트 검색"
            type="search"
            value={query}
          />
        </form>
        <div className="mt-4 space-y-2">
          {results.map((item) => (
            <button
              key={item.id}
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-surface-muted"
              onClick={() =>
                inspectItem({
                  type: "검색 결과",
                  title: item.title,
                  description: "검색 결과에서 선택한 항목입니다.",
                  meta: ["mock search"]
                })
              }
              type="button"
            >
              <div className="text-[13px] font-medium text-ink">{item.title}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
