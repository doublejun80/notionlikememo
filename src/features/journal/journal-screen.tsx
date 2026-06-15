"use client";

import { BookOpen, PenLine } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { myplanData } from "@/data/myplan-data";

export function JournalScreen() {
  const { inspectItem } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [selectedDate, setSelectedDate] = useState("6월 15일");

  return (
    <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-5 pb-24 xl:grid-cols-[1fr_300px] xl:pb-0">
      <section className="rounded-md border border-border bg-white shadow-workspace">
        <div className="border-b border-border px-5 py-4">
          <div className="text-[13px] text-muted">{myplanData.today.dateLabel}</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink">저널</h1>
        </div>
        <article className="px-8 py-7">
          <button
            className="text-left"
            onClick={() =>
              inspectItem({
                type: "저널 질문",
                title: myplanData.journal.prompt,
                description: myplanData.journal.draft,
                meta: [selectedDate, myplanData.journal.mood]
              })
            }
            type="button"
          >
            <div className="flex items-center gap-2 text-[13px] font-medium text-accent">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              오늘의 질문
            </div>
            <h2 className="mt-3 text-xl font-semibold text-ink">
              {myplanData.journal.prompt}
            </h2>
          </button>
          <p className="mt-5 text-[15px] leading-8 text-ink">
            {myplanData.journal.draft}
          </p>
          <div className="mt-8 border-t border-border pt-5">
            <textarea
              className="min-h-56 w-full resize-none border-0 bg-transparent text-[15px] leading-8 text-ink outline-none placeholder:text-faint"
              onChange={(event) => {
                setDraft(event.target.value);
                inspectItem({
                  type: "저널 작성",
                  title: "작성 중인 저널",
                  description: event.target.value || "오늘 남길 기록을 이어서 작성하세요.",
                  meta: [selectedDate]
                });
              }}
              placeholder="오늘 남길 기록을 이어서 작성하세요."
              value={draft}
            />
          </div>
        </article>
      </section>

      <aside className="space-y-4">
        <section className="rounded-md border border-border bg-white px-4 py-4 shadow-workspace">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
            날짜별 기록
          </div>
          <div className="mt-3 space-y-2">
            {["6월 15일", "6월 14일", "6월 13일", "6월 12일"].map((date) => (
              <button
                key={date}
                className="block w-full rounded-md px-2 py-2 text-left text-[13px] text-muted hover:bg-surface-muted hover:text-ink"
                onClick={() => {
                  setSelectedDate(date);
                  inspectItem({
                    type: "저널 날짜",
                    title: date,
                    description: `${date} 기록을 선택했습니다.`,
                    meta: ["날짜별 기록"]
                  });
                }}
                type="button"
              >
                {date}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
