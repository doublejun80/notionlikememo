"use client";

import { CheckSquare, Inbox, Link2, PenLine } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { getProjectName, myplanData } from "@/data/myplan-data";

export function RightContextPanel() {
  const { activeDetail, createdItems, inspectItem } = useWorkspace();
  const [quickText, setQuickText] = useState("");
  const openTasks = myplanData.tasks.filter((task) => task.status !== "done");

  return (
    <aside className="hidden w-[336px] shrink-0 border-l border-border bg-surface px-4 py-4 xl:block">
      <section className="rounded-md border border-border bg-background px-3 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <PenLine className="h-4 w-4 text-accent" aria-hidden="true" />
          빠른 기록
        </div>
        <textarea
          className="mt-3 min-h-24 w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-[13px] leading-6 text-ink outline-none placeholder:text-faint"
          onChange={(event) => setQuickText(event.target.value)}
          placeholder="일정, 작업, 메모를 빠르게 남기기"
          value={quickText}
        />
        <button
          className="mt-2 h-8 rounded-md bg-accent px-3 text-[12px] font-medium text-white"
          onClick={() =>
            inspectItem({
              type: "빠른 기록",
              title: quickText || "빈 빠른 기록",
              description: quickText
                ? "오른쪽 빠른 기록에서 작성한 내용입니다."
                : "내용을 입력한 뒤 다시 눌러 기록 내용을 확인하세요.",
              meta: ["mock capture"]
            })
          }
          type="button"
        >
          기록 남기기
        </button>
      </section>

      <section className="mt-5 rounded-md border border-border bg-white px-3 py-3">
        <div className="text-[12px] font-medium text-accent">선택 항목</div>
        <div className="mt-1 text-[14px] font-semibold text-ink">
          {activeDetail.title}
        </div>
        {activeDetail.description ? (
          <p className="mt-2 text-[13px] leading-6 text-muted">
            {activeDetail.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded border border-border bg-surface-muted px-2 py-1 text-[11px] text-muted">
            {activeDetail.type}
          </span>
          {activeDetail.meta?.map((item) => (
            <span
              key={item}
              className="rounded border border-border bg-surface-muted px-2 py-1 text-[11px] text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <CheckSquare className="h-4 w-4 text-accent" aria-hidden="true" />
          대기 중인 작업
        </div>
        <div className="mt-3 space-y-2">
          {openTasks.slice(0, 3).map((task) => (
            <button
              key={task.id}
              className="block w-full rounded-md border border-border bg-white px-3 py-2 text-left hover:bg-background"
              onClick={() =>
                inspectItem({
                  type: "작업",
                  title: task.title,
                  description: `${task.due}까지 처리할 작업입니다.`,
                  meta: [task.priority, getProjectName(task.projectId) ?? "개인"]
                })
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">
                  {task.title}
                </span>
                <span className="shrink-0 text-[12px] text-faint">{task.due}</span>
              </div>
              <div className="mt-1 text-[12px] text-muted">
                {getProjectName(task.projectId) ?? "개인"}
              </div>
            </button>
          ))}
        </div>
      </section>

      {createdItems.length > 0 ? (
        <section className="mt-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Inbox className="h-4 w-4 text-accent" aria-hidden="true" />
            방금 추가됨
          </div>
          <div className="mt-3 space-y-2">
            {createdItems.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className="block w-full rounded-md bg-surface-muted px-3 py-2 text-left"
                onClick={() =>
                  inspectItem({
                    type: item.type,
                    title: item.title,
                    description: "새 항목 버튼으로 추가한 mock 항목입니다.",
                    meta: ["로컬 미리보기"]
                  })
                }
                type="button"
              >
                <div className="text-[13px] font-medium text-ink">{item.title}</div>
                <div className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.type}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-md border border-border bg-white px-3 py-3">
        <div className="text-[13px] font-semibold text-ink">리뷰 질문</div>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          오늘의 작업 중 내일로 넘겨야 할 것은 무엇인가?
        </p>
      </section>
    </aside>
  );
}
