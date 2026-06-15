"use client";

import { FolderKanban } from "lucide-react";

import { useWorkspace } from "@/components/layout/workspace-context";
import { myplanData } from "@/data/myplan-data";

export function ProjectsScreen() {
  const { inspectItem } = useWorkspace();

  return (
    <div className="mx-auto max-w-[1080px] pb-24 xl:pb-0">
      <div>
        <div className="text-[13px] text-muted">장기 목표와 연결된 기록</div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">프로젝트</h1>
      </div>

      <section className="mt-5 space-y-3">
        {myplanData.projects.map((project) => (
          <button
            key={project.id}
            className="block w-full rounded-md border border-border bg-white px-4 py-4 text-left shadow-workspace hover:bg-background"
            onClick={() =>
              inspectItem({
                type: "프로젝트",
                title: project.name,
                description: project.summary,
                meta: [project.status, project.nextStep, `${project.progress}%`]
              })
            }
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <FolderKanban className="h-4 w-4 text-accent" aria-hidden="true" />
                  {project.name}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-muted">
                  {project.summary}
                </p>
              </div>
              <span className="rounded border border-border bg-surface-muted px-2 py-1 text-[12px] text-muted">
                {project.status}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] text-muted">
                <span>다음 단계: {project.nextStep}</span>
                <span>{project.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
