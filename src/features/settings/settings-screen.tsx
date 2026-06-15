"use client";

import { useState } from "react";

import { useWorkspace } from "@/components/layout/workspace-context";

export function SettingsScreen() {
  const { settings, updateSettings } = useWorkspace();
  const [title, setTitle] = useState(settings.title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-[1080px]">
      <div>
        <div className="text-[13px] text-muted">
          테마, 데이터, 백업, 동기화 설정
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-ink">설정</h1>
      </div>

      <section className="mt-5 rounded-md border border-border bg-white px-4 py-4 shadow-workspace">
        <div className="text-[15px] font-semibold text-ink">작업공간</div>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          왼쪽 사이드바에 표시되는 이름과 부제를 수정합니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div>
            <label
              className="block text-[13px] font-medium text-muted"
              htmlFor="workspace-title"
            >
              앱 이름
            </label>
            <input
              id="workspace-title"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] text-ink outline-none"
              onChange={(event) => {
                setTitle(event.target.value);
                setSaved(false);
              }}
              value={title}
            />
          </div>
          <div>
            <label
              className="block text-[13px] font-medium text-muted"
              htmlFor="workspace-subtitle"
            >
              작업공간 부제
            </label>
            <input
              id="workspace-subtitle"
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-[13px] text-ink outline-none"
              onChange={(event) => {
                setSubtitle(event.target.value);
                setSaved(false);
              }}
              value={subtitle}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="h-9 rounded-md bg-accent px-3 text-[13px] font-medium text-white"
            onClick={() => {
              updateSettings({ title, subtitle });
              setSaved(true);
            }}
            type="button"
          >
            설정 저장
          </button>
          {saved ? (
            <span className="text-[13px] text-success">
              설정이 저장되었습니다.
            </span>
          ) : null}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[
          ["테마", "밝은 기본 테마와 조용한 색상 토큰을 사용합니다."],
          ["데이터", "MVP에서는 mock data를 사용하고, 이후 SQLite를 연결합니다."],
          ["백업", "로컬 파일 백업과 export 경로를 준비합니다."],
          ["동기화", "초기 범위에서는 비활성화합니다."]
        ].map(([cardTitle, description]) => (
          <article
            key={cardTitle}
            className="rounded-md border border-border bg-white px-4 py-4 shadow-workspace"
          >
            <div className="text-[14px] font-semibold text-ink">{cardTitle}</div>
            <p className="mt-2 text-[13px] leading-6 text-muted">{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
