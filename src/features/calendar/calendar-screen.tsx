"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { myplanData } from "@/data/myplan-data";
import { cn } from "@/lib/utils";

export function CalendarScreen() {
  const { inspectItem } = useWorkspace();
  const [view, setView] = useState("주");

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[13px] text-muted">2026년 6월</div>
          <h1 className="mt-2 text-2xl font-semibold text-ink">캘린더</h1>
        </div>
        <div className="inline-flex rounded-md border border-border bg-white p-1 text-[13px]">
          {["월", "주", "일"].map((item) => (
            <button
              key={item}
              className={cn(
                "rounded px-3 py-1.5 text-muted",
                view === item && "bg-accent-soft text-accent"
              )}
              onClick={() => {
                setView(item);
                inspectItem({
                  type: "캘린더 보기",
                  title: `${item} 보기`,
                  description: `캘린더를 ${item} 보기 기준으로 전환했습니다.`,
                  meta: ["mock view"]
                });
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-md border border-border bg-white shadow-workspace">
        <div className="grid grid-cols-7 border-b border-border text-center text-[12px] font-medium text-muted">
          {myplanData.weekDays.map((day) => (
            <div key={day.date} className="border-r border-border px-3 py-2 last:border-r-0">
              {day.label}
            </div>
          ))}
        </div>
        <div className="grid min-h-[440px] grid-cols-7">
          {myplanData.weekDays.map((day) => (
            <button
              key={day.date}
              className={cn(
                "border-r border-border px-3 py-3 text-left last:border-r-0",
                day.active && "bg-accent-soft/45"
              )}
              onClick={() =>
                inspectItem({
                  type: "날짜",
                  title: `6월 ${day.date}일`,
                  description: `${day.items}개의 일정/작업이 연결되어 있습니다.`,
                  meta: [day.label, view]
                })
              }
              type="button"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">{day.date}</span>
                <span className="text-[11px] text-faint">{day.items}개</span>
              </div>
              {day.active ? (
                <div className="mt-4 space-y-2">
                  {myplanData.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded border border-border bg-white px-2 py-2 text-left"
                    >
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {event.time}
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-ink">
                        {event.title}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
