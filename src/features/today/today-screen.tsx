"use client";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FolderKanban,
  PenLine,
  StickyNote
} from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { getProjectName, myplanData, type TaskItem } from "@/data/myplan-data";
import { cn } from "@/lib/utils";

function TaskStatusIcon({ status }: { status: TaskItem["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
  }

  return (
    <Circle
      className={cn("h-4 w-4", status === "doing" ? "text-accent" : "text-faint")}
      aria-hidden="true"
    />
  );
}

export function TodayScreen() {
  const { inspectItem } = useWorkspace();

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <section className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[13px] font-medium text-muted">
            {myplanData.today.dateLabel} · {myplanData.today.weather}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            오늘의 계획
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-muted">
            {myplanData.today.focus}
          </p>
        </div>
        <button
          className="shrink-0 rounded-md border border-border bg-white px-3 py-2 text-right shadow-workspace hover:bg-background"
          onClick={() =>
            inspectItem({
              type: "시간 블록",
              title: myplanData.today.dayPhase,
              description: "현재 작업 블록입니다. 오늘 화면의 일정과 작업을 기준으로 표시합니다.",
              meta: [myplanData.today.dateLabel]
            })
          }
          type="button"
        >
          <div className="text-[12px] text-faint">현재 블록</div>
          <div className="mt-1 text-[13px] font-semibold text-ink">
            {myplanData.today.dayPhase}
          </div>
        </button>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-md border border-border bg-white shadow-workspace">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />
                오늘 일정
              </div>
              <span className="text-[12px] text-faint">
                {myplanData.events.length}개
              </span>
            </div>
            <div className="divide-y divide-border">
              {myplanData.events.map((event) => (
                <button
                  key={event.id}
                  aria-label={`일정 상세: ${event.title}`}
                  className="grid w-full grid-cols-[64px_1fr] gap-3 px-4 py-3 text-left hover:bg-background"
                  onClick={() =>
                    inspectItem({
                      type: "일정",
                      title: event.title,
                      description: `${event.time}부터 ${event.duration} 동안 진행됩니다.`,
                      meta: [
                        getProjectName(event.projectId) ?? event.location ?? "개인",
                        event.tone
                      ]
                    })
                  }
                  type="button"
                >
                  <div className="text-[13px] font-medium text-muted">
                    {event.time}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[14px] font-medium text-ink">
                        {event.title}
                      </div>
                      <span className="text-[12px] text-faint">
                        {event.duration}
                      </span>
                    </div>
                    <div className="mt-1 text-[12px] text-muted">
                      {getProjectName(event.projectId) ?? event.location ?? "개인"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-white shadow-workspace">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                오늘 작업
              </div>
              <span className="text-[12px] text-faint">마감 기준</span>
            </div>
            <div className="divide-y divide-border">
              {myplanData.tasks.map((task) => (
                <button
                  key={task.id}
                  aria-label={`작업 상세: ${task.title}`}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
                  onClick={() =>
                    inspectItem({
                      type: "작업",
                      title: task.title,
                      description: `${task.due}까지 처리할 작업입니다.`,
                      meta: [
                        task.status,
                        task.priority,
                        getProjectName(task.projectId) ?? "개인"
                      ]
                    })
                  }
                  type="button"
                >
                  <TaskStatusIcon status={task.status} />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "truncate text-[14px] font-medium",
                        task.status === "done" ? "text-faint line-through" : "text-ink"
                      )}
                    >
                      {task.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
                      <span>{task.due}</span>
                      <span>·</span>
                      <span>{getProjectName(task.projectId) ?? "개인"}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 text-[11px]",
                      task.priority === "높음"
                        ? "border-danger/30 bg-danger/5 text-danger"
                        : "border-border bg-surface-muted text-muted"
                    )}
                  >
                    {task.priority}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <button
            className="w-full rounded-md border border-border bg-white text-left shadow-workspace hover:bg-background"
            onClick={() =>
              inspectItem({
                type: "저널",
                title: myplanData.journal.prompt,
                description: myplanData.journal.draft,
                meta: [myplanData.journal.mood, myplanData.journal.date]
              })
            }
            type="button"
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <PenLine className="h-4 w-4 text-accent" aria-hidden="true" />
                오늘 기록
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="text-[12px] font-medium text-muted">
                {myplanData.journal.prompt}
              </div>
              <p className="mt-3 text-[14px] leading-7 text-ink">
                {myplanData.journal.draft}
              </p>
              <div className="mt-4 inline-flex rounded-md bg-accent-soft px-2 py-1 text-[12px] font-medium text-accent">
                {myplanData.journal.mood}
              </div>
            </div>
          </button>

          <section className="rounded-md border border-border bg-white shadow-workspace">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[14px] font-semibold text-ink">
              <StickyNote className="h-4 w-4 text-accent" aria-hidden="true" />
              최근 노트
            </div>
            <div className="divide-y divide-border">
              {myplanData.notes.slice(0, 3).map((note) => (
                <button
                  key={note.id}
                  className="block w-full px-4 py-3 text-left hover:bg-background"
                  onClick={() =>
                    inspectItem({
                      type: "노트",
                      title: note.title,
                      description: note.excerpt,
                      meta: [...note.tags, getProjectName(note.projectId) ?? "개인"]
                    })
                  }
                  type="button"
                >
                  <div className="text-[14px] font-medium text-ink">{note.title}</div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted">
                    {note.excerpt}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-white shadow-workspace">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[14px] font-semibold text-ink">
              <FolderKanban className="h-4 w-4 text-accent" aria-hidden="true" />
              진행 중인 프로젝트
            </div>
            <div className="space-y-3 px-4 py-4">
              {myplanData.projects.map((project) => (
                <button
                  key={project.id}
                  className="block w-full rounded-md px-2 py-2 text-left hover:bg-background"
                  onClick={() =>
                    inspectItem({
                      type: "프로젝트",
                      title: project.name,
                      description: project.summary,
                      meta: [project.status, `${project.progress}%`, project.nextStep]
                    })
                  }
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink">
                      {project.name}
                    </div>
                    <div className="text-[12px] text-faint">{project.progress}%</div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="mt-5 rounded-md border border-border bg-white px-4 py-3 shadow-workspace">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
          오늘의 흐름
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {myplanData.weekDays.map((day) => (
            <button
              key={day.date}
              className={cn(
                "rounded-md border px-3 py-2 text-left",
                day.active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-background text-muted"
              )}
              onClick={() =>
                inspectItem({
                  type: "날짜",
                  title: `6월 ${day.date}일 ${day.label}요일`,
                  description: `${day.items}개의 일정/작업이 연결되어 있습니다.`,
                  meta: [day.active ? "오늘" : "이번 주"]
                })
              }
              type="button"
            >
              <div className="text-[12px] font-medium">{day.label}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[16px] font-semibold">{day.date}</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {day.items}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
