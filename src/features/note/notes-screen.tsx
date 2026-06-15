"use client";

import { StickyNote } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { getProjectName, myplanData } from "@/data/myplan-data";

export function NotesScreen() {
  const { inspectItem } = useWorkspace();

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <div>
        <div className="text-[13px] text-muted">자유 기록과 지식 저장</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">노트</h1>
      </div>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {myplanData.notes.map((note) => (
          <button
            key={note.id}
            className="rounded-md border border-border bg-white px-4 py-4 text-left shadow-workspace hover:bg-background"
            onClick={() =>
              inspectItem({
                type: "노트",
                title: note.title,
                description: note.excerpt,
                meta: [...note.tags, getProjectName(note.projectId) ?? "프로젝트 없음"]
              })
            }
            type="button"
          >
            <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <StickyNote className="h-4 w-4 text-accent" aria-hidden="true" />
              {note.title}
            </div>
            <p className="mt-3 min-h-12 text-[13px] leading-6 text-muted">
              {note.excerpt}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border bg-surface-muted px-2 py-1 text-[11px] text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4 text-[12px] text-faint">
              {getProjectName(note.projectId) ?? "프로젝트 연결 없음"} · {note.updatedAt}
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
