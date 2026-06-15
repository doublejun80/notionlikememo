"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { getProjectName, myplanData, type TaskItem } from "@/data/myplan-data";
import { cn } from "@/lib/utils";

export function TasksScreen() {
  const { inspectItem } = useWorkspace();
  const [statuses, setStatuses] = useState<Record<string, TaskItem["status"]>>(
    Object.fromEntries(myplanData.tasks.map((task) => [task.id, task.status]))
  );

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <div>
        <div className="text-[13px] text-muted">마감일, 상태, 프로젝트 기준</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">작업</h1>
      </div>

      <section className="mt-5 rounded-md border border-border bg-white shadow-workspace">
        <div className="grid grid-cols-[1fr_90px_90px] border-b border-border px-4 py-2 text-[12px] font-medium text-muted xl:grid-cols-[1fr_120px_120px_160px]">
          <div>작업</div>
          <div>마감</div>
          <div>우선순위</div>
          <div className="hidden xl:block">프로젝트</div>
        </div>
        <div className="divide-y divide-border">
          {myplanData.tasks.map((task) => {
            const status = statuses[task.id] ?? task.status;

            return (
              <button
                key={task.id}
                className="grid w-full grid-cols-[1fr_90px_90px] items-center px-4 py-3 text-left text-[13px] hover:bg-background xl:grid-cols-[1fr_120px_120px_160px]"
                onClick={() =>
                  inspectItem({
                    type: "작업",
                    title: task.title,
                    description: `${task.due}까지 처리할 작업입니다. 한 번 더 체크하면 상태를 바꿀 수 있습니다.`,
                    meta: [status, task.priority, getProjectName(task.projectId) ?? "개인"]
                  })
                }
                type="button"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      const nextStatus = status === "done" ? "todo" : "done";
                      setStatuses((current) => ({
                        ...current,
                        [task.id]: nextStatus
                      }));
                      inspectItem({
                        type: "작업 상태",
                        title: task.title,
                        description: `상태를 ${nextStatus}로 변경했습니다.`,
                        meta: [task.due, task.priority]
                      });
                    }}
                  >
                    {status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 text-faint" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "truncate font-medium",
                      status === "done" ? "text-faint line-through" : "text-ink"
                    )}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="text-muted">{task.due}</div>
                <div className="text-muted">{task.priority}</div>
                <div className="hidden truncate text-muted xl:block">
                  {getProjectName(task.projectId) ?? "개인"}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
