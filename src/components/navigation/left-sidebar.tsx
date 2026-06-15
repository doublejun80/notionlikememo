"use client";

import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Home,
  Search,
  Settings,
  StickyNote
} from "lucide-react";
import Link from "next/link";

import { useWorkspace } from "@/components/layout/workspace-context";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "오늘", href: "/", key: "today", icon: Home },
  { label: "캘린더", href: "/calendar", key: "calendar", icon: CalendarDays },
  { label: "저널", href: "/journal", key: "journal", icon: BookOpen },
  { label: "작업", href: "/tasks", key: "tasks", icon: CheckSquare },
  { label: "노트", href: "/notes", key: "notes", icon: StickyNote },
  { label: "프로젝트", href: "/projects", key: "projects", icon: FolderKanban },
  { label: "검색", href: "/search", key: "search", icon: Search },
  { label: "설정", href: "/settings", key: "settings", icon: Settings }
];

type LeftSidebarProps = {
  active: string;
  className?: string;
  navLabel?: string;
  onNavigate?: () => void;
};

export function LeftSidebar({
  active,
  className,
  navLabel = "워크스페이스",
  onNavigate
}: LeftSidebarProps) {
  const { inspectItem, openNewItem, settings } = useWorkspace();

  return (
    <aside
      className={cn(
        "w-[248px] shrink-0 flex-col border-r border-border bg-surface-muted/80 px-3 py-4",
        className
      )}
    >
      <div className="mb-5 px-2">
        <div className="text-[15px] font-semibold text-ink">{settings.title}</div>
        <div className="mt-1 text-xs text-muted">{settings.subtitle}</div>
      </div>

      <nav aria-label={navLabel} className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted transition hover:bg-white hover:text-ink",
                isActive && "bg-white text-ink shadow-workspace"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-border pt-4">
        <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
          고정
        </div>
        <div className="mt-2 space-y-1">
          {[
            ["MyPlan MVP", "프로젝트", "Today 화면, 정보 구조, 디자인 기준을 검토합니다."],
            ["개인 기록 정리", "프로젝트", "저널과 노트 정리 기준을 확인합니다."],
            ["이번 주 리뷰", "리뷰", "이번 주 일정과 남은 작업을 훑어봅니다."]
          ].map(([title, type, description]) => (
            <button
              key={title}
              className="block h-8 w-full truncate rounded-md px-2 text-left text-[13px] text-muted hover:bg-white hover:text-ink"
              onClick={() =>
                inspectItem({
                  type,
                  title,
                  description,
                  meta: ["고정 항목", "클릭 동작 확인"]
                })
              }
              type="button"
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <button
        className="mt-auto rounded-md border border-border bg-white px-3 py-3 text-left hover:bg-background"
        onClick={openNewItem}
        type="button"
      >
        <div className="text-xs font-medium text-ink">빠른 캡처</div>
        <p className="mt-1 text-[12px] leading-5 text-muted">
          떠오른 일정, 작업, 메모를 한 줄로 남깁니다.
        </p>
      </button>
    </aside>
  );
}
