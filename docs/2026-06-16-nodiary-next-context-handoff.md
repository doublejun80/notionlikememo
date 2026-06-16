# Nodiary Next Context Handoff

작성일: 2026-06-16

## 현재 상태

- repo: `/Volumes/mac_dock/github/notionlikememo`
- branch: `main`
- latest pushed commit: `c18f47a Fix Nodiary workspace remaining UX issues`
- 이전 주요 commit: `958124d Build Nodiary workspace UX harness fixes`
- `.env.local`은 ignored 상태이며 출력/커밋하지 않았음.
- product direction: Nodiary, Notion Core Clone-lite, Electron 유지.
- first screen rule: 프로젝트 대시보드가 아니라 `오늘의 계획` 문서 편집 화면.

## 최신 핫픽스

- OpenAI operator 연결 실패의 실제 원인은 Responses API strict schema가 object형 `argsJson`/`diffJson`/`undoJson`을 거부한 것이었다. 해당 필드를 JSON string contract로 바꾸고, 서버 파서에서 JSON string을 다시 record로 복원하게 수정했다.
- Electron/Next dev server를 `.env.local`과 동일 session token으로 재시작해 `/api/ai/operator`가 실제 OpenAI plan을 200으로 반환하는지 확인했다. 키 값은 출력하지 않았다.
- macOS Electron titlebar는 light theme + `#F4F2EE` 배경 + `hiddenInset`으로 앱 메인 색과 맞췄다. Electron shell에서만 sidebar brand row에 traffic-light safe area를 적용해 로고 겹침과 hydration mismatch를 동시에 피했다.
- Todo block은 checkbox button과 text input을 분리했고, 텍스트 편집 중에는 완료 상태의 취소선이 보이지 않게 했다.
- AI approval diff의 반복 JSON line 렌더링에서 duplicate React key warning을 제거했다.

## 최신 핫픽스 2

- AI approval UI는 이제 pending action만 `승인 대기`에 보여준다. 승인한 action은 즉시 실행되고 큐에서 빠진다.
- OpenAI `createCalendarEvent` action을 실제 sidebar calendar event 생성으로 연결했다. 승인하면 선택 날짜가 새 일정 날짜로 이동하고, undo는 이전 calendar snapshot으로 되돌린다.
- Page tree는 chevron slot과 drag slot을 모든 row에 고정 렌더링해 자식이 있는 page와 없는 page의 제목 시작 축이 같게 유지된다.
- Electron sidebar titlebar safe area는 수평 padding이 아니라 상단 padding으로 적용한다. Nodiary 로고가 macOS traffic light 오른쪽으로 밀리지 않고 버튼 아래에 놓인다.
- AI operator panel은 `overflow-y-auto` scroll container가 되어 낮은 window height에서도 승인 카드 하단을 볼 수 있다.

## 이번 추가 패스에서 고친 것

- Workspace API validation을 `pageTree`, 전체 `pages`, nested database field/filter/sort/row schema까지 확장.
- DB block에 filter/sort controls와 field name/type schema edit UI 추가.
- sidebar calendar 이전/다음 달 navigation 추가.
- AI local fallback이 한국어 calendar move 명령을 `updateCalendarEvent` approval proposal로 파싱.
- block drag, page tree drag, DB board/card, DB calendar row 이동에 keyboard fallback 추가.
- settings modal focus trap/restore 확인 및 hydration mismatch regression test 추가.
- 전체 neutral theme/dark mode token을 sidebar, editor, DB, AI, settings 주요 surface에 확대 적용.
- Google/Apple Calendar 실제 연결 전 단계로 mocked `previewCalendarSync` adapter와 tests 추가.
- SSR hydration mismatch 방지를 위해 client 첫 render에서 localStorage workspace를 읽지 않도록 변경.

## 이번에 고친 것

- `/api/nodiary/workspace` GET/PUT로 workspace hydrate/save 연결.
- localStorage는 API 실패/오프라인 fallback으로 유지.
- `DATABASE_URL` 없는 dev 환경에서 workspace API가 Prisma 500/log spam을 내지 않고 default fallback 응답.
- DB block에 `새 행` 버튼 추가.
- DB table row title/status/owner/date 인라인 편집 추가.
- 모바일 DB table은 카드형 편집 UI로 전환.
- DB calendar view를 단순 리스트에서 7열 월간 grid로 변경.
- DB row를 calendar date cell에 drop하면 row date가 변경됨.
- AI context chips를 정적 span에서 `aria-pressed` 토글 버튼으로 변경.
- AI request payload에 current page, selected block, calendar, memory scope 반영.
- theme/accent 설정을 CSS variable로 내려 주요 UI(selected date, checkbox, AI button, settings active state 등)에 적용.
- AI operator `createDatabaseRow` proposal을 실제 DB row 생성 모델 함수로 연결.
- UX50 final report와 architecture 문서를 최신 상태로 갱신.
- Playwright Chromium + Playwright Electron 시각 QA 스크린샷 추가.

## 수정/추가된 핵심 파일

- `src/features/nodiary/nodiary-workspace.tsx`
  - API hydrate/save, AI scope toggle, DB add/edit/filter/sort/schema edit, DB calendar grid/month nav/keyboard controls, dark token 적용.
- `src/features/nodiary/nodiary-model.ts`
  - `addDatabaseRow` 추가.
  - `createDatabaseRow` AI operation, Korean calendar move fallback, page tree keyboard move 처리 추가.
- `src/app/api/nodiary/workspace/route.ts`
  - persistence fallback 처리.
  - DB URL 없는 환경에서 default workspace 반환.
  - `pageTree`, 전체 `pages`, database schema/filter/sort validation 강화.
- `src/app/api/nodiary/workspace/route.test.ts`
  - fallback GET/PUT와 전체 state validation 테스트 추가.
- `src/app/page.test.tsx`
  - API hydrate/save, AI scope toggle, DB add/edit/filter/sort/schema edit, month nav, keyboard fallback, modal focus, hydration regression 테스트 추가.
- `src/features/nodiary/nodiary-model.test.ts`
  - DB row add, calendar move fallback, page tree keyboard move 테스트 추가.
- `src/server/calendar/calendar-sync-adapter.ts`
  - Google/Apple mocked sync preview adapter 추가.
- `src/server/calendar/calendar-sync-adapter.test.ts`
  - external newer proposal와 provider blocked preview 테스트 추가.
- `docs/2026-06-16-nodiary-ux50-final-report.md`
  - 남은 문제 처리 결과와 QA 증거 갱신.
- `docs/2026-06-16-nodiary-harness-review-and-architecture.md`
  - 최신 후속 수정 요약 추가.

## 검증 완료

- `npm test`: 13 files, 83 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Playwright Chromium QA:
  - home title visible.
  - DB calendar grid visible.
  - edited DB row visible in calendar.
  - AI selected-block scope toggle works.
  - mobile menu visible.
- Playwright Electron QA:
  - Electron shell opens Nodiary.
  - `오늘의 계획` title visible.
  - AI input panel visible.
  - project DB is not on first screen.
  - no React hydration mismatch console error.
  - sidebar calendar cells: 35.
  - OpenAI calendar move command returns an approval proposal without local fallback.
  - Todo text edit does not toggle completion and does not show line-through while focused.
  - Electron titlebar background is `#F4F2EE`, and the traffic lights no longer overlap the Nodiary logo.
  - Electron console errors/warnings: 0.
  - Approved `createCalendarEvent` proposal disappears from pending queue and immediately appears in the sidebar calendar.
  - Page tree same-depth title left delta: `0`.
  - Short AI panel state: `overflow-y=auto`, `scrollHeight > clientHeight`.

## QA 증거 파일

- Previous committed QA artifacts:
  - `docs/qa-artifacts/ux50/2026-06-16-after-fixes-home.png`
  - `docs/qa-artifacts/ux50/2026-06-16-after-fixes-mobile.png`
  - `docs/qa-artifacts/ux50/2026-06-16-after-fixes-db-calendar.png`
  - `docs/qa-artifacts/ux50/2026-06-16-after-fixes-ai-settings.png`
  - `docs/qa-artifacts/ux50/2026-06-16-after-fixes-electron.png`
- Latest local QA screenshots/results were generated outside the repo at:
  - `/tmp/nodiary-qa-2026-06-16/desktop-home.png`
  - `/tmp/nodiary-qa-2026-06-16/desktop-db-calendar-keyboard.png`
  - `/tmp/nodiary-qa-2026-06-16/desktop-ai-calendar-fallback.png`
  - `/tmp/nodiary-qa-2026-06-16/desktop-dark-settings.png`
  - `/tmp/nodiary-qa-2026-06-16/tablet-1024.png`
  - `/tmp/nodiary-qa-2026-06-16/mobile-sidebar-calendar.png`
  - `/tmp/nodiary-qa-2026-06-16/electron-home.png`
  - `/tmp/nodiary-qa-2026-06-16/qa-results.json`
  - `/tmp/nodiary-qa-2026-06-16/electron-results.json`
- Latest hotfix QA artifacts outside the repo:
  - `/tmp/nodiary-fix-qa/electron-final-verified.png`
  - `/tmp/nodiary-fix-qa/electron-native-titlebar-strip-front.png`
- Latest approval/tree/scroll QA artifacts outside the repo:
  - `/tmp/nodiary-bugfix-qa/electron-approval-tree-titlebar.png`
  - `/tmp/nodiary-bugfix-qa/electron-ai-panel-short-scroll.png`
  - `/tmp/nodiary-bugfix-qa/electron-native-titlebar-vertical-safe-area.png`
- Latest Dock/drag/theme QA artifacts outside the repo:
  - `/tmp/nodiary-theme-qa/nodiary-dev-window-front.png`
  - `/tmp/nodiary-theme-qa/nodiary-app-playwright-navy-clean.png`

## 2026-06-16 Dock/Drag/Theme Hotfix 상태

- `npm run electron:dev`는 macOS에서 `.nodiary-electron/Nodiary.app` 개발 번들을 만든 뒤 실행한다.
  - 단순 `app.setName()`만으로는 Dock 툴팁/프로세스 이름이 `Electron`에서 바뀌지 않는다.
  - `scripts/dev-electron.mjs`가 `ditto`로 Electron.app을 복사해 framework symlink를 보존한다.
  - 메인 executable은 `Nodiary`, helper executable은 `Nodiary Helper*`로 rename한다.
  - `.nodiary-electron/`은 generated dev bundle이라 git ignore 대상이다.
- `build/icon.png`는 런타임 Dock icon용으로 추가됐고 git에 포함해야 한다.
- 실제 실행 확인:
  - visible process: `Nodiary`
  - process path: `.nodiary-electron/Nodiary.app/Contents/MacOS/Nodiary`
  - Helper path: `.nodiary-electron/Nodiary.app/Contents/Frameworks/Nodiary Helper.app/...`
  - actual native drag moved window from `-1671,113` to `-1581,168`.
- Theme 옵션:
  - `system`, `light`, `dark`, `lavender`, `yellow`, `navy`.
  - dark mode logo contrast is controlled by `--nodiary-logo-bg` / `--nodiary-logo-fg`.
- Latest verification:
  - `npm test`: 13 files, 88 tests passed.
  - `npm run typecheck`: passed.
  - `npm run lint`: passed.
  - `npm run build`: passed.
  - `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
  - `npm audit --audit-level=moderate`: 0 vulnerabilities.

## 2026-06-16 macOS Icon Optical-Size Hotfix 상태

- Dock에서 Nodiary 아이콘이 다른 macOS 앱 아이콘보다 크게 보이던 문제를 수정했다.
- `build/icon.svg`와 `src/app/icon.svg`는 이제 1024 canvas 안에 824px 중심 artwork를 둔다.
  - main surface: `x=100`, `y=100`, `width=824`, `height=824`, `rx=180`.
  - shadow는 main rect filter가 아니라 별도 rect + `feGaussianBlur`로 렌더한다.
  - main surface는 직접 gradient fill을 사용한다.
- 같은 원본에서 재생성한 파일:
  - `build/icon.png`
  - `build/icon.icns`
  - `build/icon.ico`
- 실제 dev bundle 확인:
  - `.nodiary-electron/Nodiary.app/Contents/Resources/nodiary.icns`와 `build/icon.icns`가 byte-for-byte match.
- Latest icon QA screenshots outside the repo:
  - `/tmp/nodiary-icon-hig-preview.png`
  - `/tmp/nodiary-icon-dock-wide.png`
  - `/tmp/nodiary-icon-electron-qa.png`
- Latest verification:
  - `npm test`: 13 files, 88 tests passed.
  - `npm run typecheck`: passed.
  - `npm run lint`: passed.
  - `npm run build`: passed.
  - `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
  - `npm audit --audit-level=moderate`: 0 vulnerabilities.

## 아직 남은 이슈

- Slash menu 검색/필터 미구현.
- AI drawer open 시 input auto-focus/focus trap/restore는 별도 drawer a11y 패스로 남음.
- board view 좁은 폭 UX 개선 남음.
- 1024/1023 sidebar breakpoint 전환 급격함 남음.
- Calendar data는 fixture 기반이며 real provider-backed source는 남음.
- Google Calendar + Apple Calendar 실제 auth/write/conflict resolver UI는 남음. Mocked preview adapter/test만 있음.

## 다음 작업 추천 순서

1. Slash menu 검색/필터 추가.
2. AI drawer focus management/autofocus/focus restore를 별도 패스로 정리.
3. 좁은 board view와 1024/1023 sidebar breakpoint UX 개선.
4. Calendar provider-backed source abstraction을 UI/state에 연결.
5. Google/Apple Calendar real auth/write/conflict resolver는 mocked adapter 위에 단계적으로 구현.

## 다음 컨텍스트 시작 시 주의

- 먼저 다음 파일을 읽을 것:
  - `AGENTS.md`
  - `docs/superpowers/specs/2026-06-15-nodiary-development-handoff.md`
  - `docs/superpowers/specs/2026-06-15-nodiary-harness-detail-design.md`
  - `docs/superpowers/specs/2026-06-15-notion-ai-operator-redesign.md`
  - `docs/2026-06-16-nodiary-ux50-final-report.md`
  - `docs/2026-06-16-nodiary-next-context-handoff.md`
- `.env.local` 출력/커밋 금지.
- 첫 화면을 프로젝트 DB로 바꾸지 말 것.
- Electron 유지, Tauri 전환 금지.
- icons/handles는 lucide-react 기반 유지.
- 화면 QA 없이 완료 주장 금지.
