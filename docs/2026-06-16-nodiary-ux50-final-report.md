# Nodiary UX50 Final Harness Report

작성일: 2026-06-16

## 범위

- 사용자 하네스 4명: desktop power user, 1024px tablet/laptop, 390px mobile, AI-heavy planner.
- 개발자 하네스 3명: 상태/편집, 보안/API, 반응형/a11y.
- 기획자 하네스 3명 관점: 문서-first 신뢰, AI operator 신뢰, sidebar/calendar/quick capture discovery.
- Browser plugin은 현재 사용할 수 없어 일반 Playwright Chromium으로 검증했다.

## 이번 커밋에서 고친 핵심

- 오늘 기준을 2026-06-16으로 정정했다.
- 페이지별 `pages` cache를 추가해 페이지 이동 후 편집 내용이 템플릿으로 사라지지 않게 했다.
- paragraph, heading, todo, AI 승인 변경, DB view 변경, DB row drag, block drag가 active page cache에 반영되게 했다.
- 화면 state와 Quick Capture를 localStorage에 저장해 reload 후에도 로컬 사용 흐름이 유지되게 했다.
- 빈 블록 placeholder를 실제 editable text에서 제거하고, 첫 글자 입력은 paragraph 생성, `/`는 slash menu open으로 분리했다.
- slash menu에 Arrow/Enter/Escape 키보드 조작과 focus 처리를 추가했다.
- Quick Capture가 입력 삭제만 하지 않고 최근 Inbox trail과 저장 확인 메시지를 남기게 했다.
- sidebar 검색/Inbox/Quick Capture/AI 글쓰기/새 페이지 버튼이 실제 UI state를 변경하게 했다.
- 모바일 sidebar에 명시적 설정/닫기 버튼을 추가하고 footer를 항상 접근 가능하게 했다.
- 앱 root를 `h-dvh overflow-hidden` 구조로 바꿔 1024px에서 body scroll이 생기지 않게 했다.
- topbar 버튼을 lucide icon 기반 44px급 hit target으로 정리하고 inert action에는 상태 메시지/command palette를 연결했다.
- AI operator 실패 시 silent fallback 대신 "OpenAI 연결 실패, 로컬 초안" 안내를 보여준다.
- AI approval card의 tool/risk/status 라벨을 사용자용 한국어 문구로 바꿨다.
- settings modal을 최상위 z-index와 내부 scroll 구조로 바꿔 AI drawer 뒤에 가려지지 않게 했다.
- `/settings` route가 오래된 MyPlan shell을 열지 않고 Nodiary shell을 사용하게 했다.
- `electron:dev`가 Next dev server와 Electron에 동일한 `NODIARY_SESSION_TOKEN`을 넘기도록 고쳐 local API guard가 꺼지지 않게 했다.

## 후속 수정: 남은 핵심 문제 처리

- 첫 화면 state를 `/api/nodiary/workspace` GET으로 hydrate하고, 변경 후 debounce된 PUT으로 repository에 저장하게 연결했다.
- localStorage는 API 실패/오프라인 fallback으로 유지하되, API payload는 최소 shape 검증 후 병합한다.
- `DATABASE_URL`이 없는 dev 환경에서는 workspace API가 Prisma를 호출해 500/log spam을 내지 않고 default fallback을 반환하게 했다.
- DB block에 `새 행` 버튼을 추가하고, table row title/status/owner/date를 인라인 편집 가능하게 했다.
- 모바일 DB table은 카드형 편집 UI를 추가해 고정 폭 overflow 의존도를 낮췄다.
- DB calendar view를 단순 리스트에서 7열 월간 grid로 바꾸고, row를 날짜 셀에 drop하면 date가 바뀌게 했다.
- AI context chips를 `aria-pressed` 토글 버튼으로 바꾸고, page/selected block/calendar/memory scope가 AI request payload에 반영되게 했다.
- theme/accent 설정을 root CSS variable로 내려 selected date, checkbox, AI button, settings active state 등에 반영했다.
- AI operator의 `createDatabaseRow` tool proposal이 실제 DB row 생성 모델 함수로 실행되게 했다.

## 2026-06-16 추가 마감 패스

- Workspace API validation을 activePage 중심에서 `pageTree`, 전체 `pages`, nested database field/filter/sort/row schema 검증으로 확장했다.
- DB block에 상태/검색 filter, field sort, field name/type schema edit UI를 추가했다.
- sidebar calendar month navigation을 추가하고 전체 월간 grid가 35 cells로 유지되는지 검증했다.
- AI local fallback이 `디자인 리뷰를 6월 18일 오후 4시 30분으로 옮겨줘` 같은 한국어 calendar move 명령을 `updateCalendarEvent` 승인 proposal로 만든다.
- modal focus trap/restore, block/page tree/DB board/DB calendar keyboard move fallback을 추가했다.
- theme/dark mode neutral token을 주요 shell, editor, database, AI, settings surfaces에 확대 적용했다.
- SSR hydration mismatch를 막기 위해 client 첫 render에서 localStorage workspace를 읽지 않고, API 실패 fallback은 mount 이후 적용하도록 바꿨다.
- Google/Apple calendar sync는 실제 provider 연결 전 단계로 mocked `previewCalendarSync` adapter와 integration tests를 추가했다.

## 2026-06-16 OpenAI/Titlebar/Todo 핫픽스

- OpenAI Responses API strict structured output에서 reject되던 `argsJson`/`diffJson`/`undoJson` schema를 JSON string contract로 바꾸고, 서버 파서가 JSON string과 기존 object payload를 모두 안전하게 읽도록 수정했다.
- 실제 `.env.local` 값은 출력하지 않고, Electron/Next local session token 경유로 `/api/ai/operator`가 OpenAI plan을 200으로 반환하는지 확인했다.
- Electron macOS titlebar를 앱 메인 배경색 계열 `#F4F2EE`로 맞추고, `hiddenInset` traffic light와 Nodiary 로고가 겹치지 않도록 Electron shell에서만 sidebar brand safe area를 적용했다.
- Todo block은 체크 토글 버튼과 텍스트 input을 분리했다. 텍스트를 클릭해 편집해도 완료 상태가 바뀌지 않고, 편집 중에는 취소선이 적용되지 않는다.
- AI approval diff 렌더링에서 반복 JSON line이 React duplicate key 경고를 만들지 않도록 line index 기반 key로 변경했다.

## 2026-06-16 Approval/Page Tree/AI Panel 핫픽스

- 승인된 AI action은 더 이상 `승인 대기` 큐에 남지 않고, pending action만 승인 큐에 렌더링한다.
- OpenAI `createCalendarEvent` action 승인 시 sidebar calendar에 새 Nodiary 일정을 즉시 추가하고, undo는 승인 전 calendar snapshot으로 복원한다.
- Page tree row는 자식 유무와 관계없이 chevron slot과 drag slot을 항상 렌더링해 같은 depth의 제목 축이 어긋나지 않게 했다.
- Electron titlebar 회피는 Nodiary 로고를 오른쪽으로 밀지 않고, sidebar 상단 safe area를 둬 macOS traffic light 아래에 브랜드가 놓이게 바꿨다.
- 오른쪽 AI operator panel은 `overflow-y-auto` scroll container로 바꿔 짧은 창에서도 승인 카드 하단을 스크롤로 볼 수 있게 했다.

## UX50 리스트와 처리 상태

| # | 출처 | 발견 내용 | 처리 |
|---:|---|---|---|
| 1 | U1/U2 | 페이지 이동 시 오늘 문서가 generic template으로 바뀜 | 수정 |
| 2 | U2/U4 | paragraph 편집이 canonical state에 저장되지 않음 | 수정 |
| 3 | U2/U4 | todo checkbox/text가 local component state라 리셋됨 | 수정 |
| 4 | U1 | H1 입력이 IME에서 꼬일 수 있음 | 부분 수정: blur commit으로 안정화 |
| 5 | U1/U3 | 빈 블록 placeholder가 실제 텍스트처럼 입력됨 | 수정 |
| 6 | U1/U4 | 기존 빈 paragraph에서 slash intent가 약함 | 부분 수정: 빈 TipTap block에서 `/` open |
| 7 | U1/U2/U4 | slash menu Arrow/Enter/Escape 미지원 | 수정 |
| 8 | U1 | slash menu 검색/필터 없음 | 남음 |
| 9 | U1/U2 | DB calendar view가 진짜 calendar grid가 아님 | 수정 |
| 10 | U1/U4 | DB row/cell add/edit flow 없음 | 수정 |
| 11 | U1/U2/U3 | Pages `+` 버튼이 inert | 수정 |
| 12 | U1/U2/U3/U4 | sidebar 검색/Inbox/Quick Capture/AI 글쓰기 inert | 수정 |
| 13 | U1/U2/U3/U4 | Quick Capture submit이 텍스트를 버리는 것처럼 보임 | 수정 |
| 14 | U1/U3 | 선택한 빈 calendar day에 empty state 없음 | 수정 |
| 15 | U1/U4 | AI API 실패가 성공처럼 조용히 local fallback | 수정 |
| 16 | U4 | AI가 calendar move command를 local fallback에서 이해하지 못함 | 수정 |
| 17 | U1/U4 | approval card가 `updateBlock`, `high`, `pending` 등 내부 라벨 노출 | 수정 |
| 18 | U4 | AI context chips가 토글처럼 보이지만 static | 수정 |
| 19 | U4 | sidebar AI 글쓰기 row가 panel을 열지 않음 | 수정 |
| 20 | U4 | AI drawer backdrop/Escape close 부족 | 수정 |
| 21 | U4 | AI drawer focus가 input으로 가지 않음 | 부분 남음 |
| 22 | U4 | settings 변경이 reload 후 reset | 부분 수정: localStorage 보존 |
| 23 | U4 | theme/accent 선택이 실제 visual token에 충분히 적용되지 않음 | 수정: dark/light neutral token 확대 |
| 24 | U3 | 모바일 topbar hit target 32px | 수정 |
| 25 | U3 | topbar 댓글/공유/더보기 inert | 부분 수정: 안내/command palette 연결 |
| 26 | U3 | 모바일 sidebar에 명시적 close 없음 | 수정 |
| 27 | U3 | 모바일 calendar date/event tap target 작음 | 부분 수정: event/footer 개선, date 32px 유지 |
| 28 | U3 | page tree handle/row가 모바일에서 작고 fussy | 부분 수정: row/footer 구조 개선, full keyboard fallback 남음 |
| 29 | U3/U4 | Quick Capture input이 drawer 아래에 숨어 있음 | 수정: footer 고정 |
| 30 | U3 | document topbar가 scroll away | 수정: body overflow 제거, main 내부 scroll |
| 31 | U3 | todo checkbox hit area 작음 | 수정 |
| 32 | U3/U2 | mobile DB table min-width overflow | 수정: 모바일 카드형 DB 편집 추가 |
| 33 | U3 | settings에서 AI panel open이 modal 뒤에 생김 | 수정 |
| 34 | U2 | 1024px에서 body/page scroll 발생 | 수정 |
| 35 | U2 | 1024/1023 sidebar breakpoint 전환 급격 | 남음 |
| 36 | U2/U4 | quick capture/footer가 first viewport 아래로 밀림 | 수정 |
| 37 | U2 | command/search `Cmd+K` 없음 | 수정: command palette 추가 |
| 38 | U2 | table 620px가 1024 content보다 큼 | 수정: table-fixed + 모바일 카드형 전환 |
| 39 | U2 | board가 좁은 폭에서 4 columns로 답답 | 남음 |
| 40 | U1 | calendar month가 June 2026 고정 | 수정 |
| 41 | 기획 | 오늘 날짜가 현재 날짜와 맞지 않음 | 수정: 2026-06-16 |
| 42 | 개발 | localStorage persistence가 테스트를 오염시킴 | 수정: tests clear storage |
| 43 | 개발 | `/settings`가 old MyPlan shell | 수정 |
| 44 | 개발 | Electron dev Next server에 session token 미전달 | 수정 |
| 45 | 개발 | Workspace API validation이 activePage 중심 | 수정 |
| 46 | 개발 | 실제 Prisma-backed UI hydrate/save 미연결 | 수정 |
| 47 | 개발 | modal focus trap/restore 미완성 | 수정 |
| 48 | 개발 | drag-only 기능 keyboard fallback 부족 | 수정: block/page/DB keyboard fallback 추가 |
| 49 | 개발 | DB row inline edit/filter/sort 없음 | 수정 |
| 50 | 개발 | Google/Apple calendar real two-way sync adapter 없음 | 부분 수정: mocked preview adapter/test 추가, 실제 provider auth/write는 남음 |

## 검증 결과

- `npm test`: 13 files, 74 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.

## Playwright QA 증거

결과 JSON:

- `docs/qa-artifacts/ux50/final-ux-scan.json`

스크린샷:

- `docs/qa-artifacts/ux50/final-desktop-home.png`
- `docs/qa-artifacts/ux50/final-tablet-1024.png`
- `docs/qa-artifacts/ux50/final-mobile-sidebar.png`
- `docs/qa-artifacts/ux50/final-slash-keyboard.png`
- `docs/qa-artifacts/ux50/final-ai-fallback.png`
- `docs/qa-artifacts/ux50/2026-06-16-after-fixes-home.png`
- `docs/qa-artifacts/ux50/2026-06-16-after-fixes-mobile.png`
- `docs/qa-artifacts/ux50/2026-06-16-after-fixes-db-calendar.png`
- `docs/qa-artifacts/ux50/2026-06-16-after-fixes-ai-settings.png`
- `docs/qa-artifacts/ux50/2026-06-16-after-fixes-electron.png`

확인된 주요 값:

- desktop body overflow: `0`
- tablet body overflow: `0`
- sidebar calendar cells: `35`
- selected date: `2026-06-16 선택됨`
- quick capture saved: `true`
- command palette visible: `true`
- slash keyboard insertion: `true`
- AI fallback notice: `true`
- mobile sidebar settings/close visible: `true`
- follow-up DB calendar grid visible: `true`
- follow-up edited DB row visible in calendar: `true`
- follow-up AI selected-block scope toggled off: `aria-pressed=false`
- follow-up Electron shell title/AI panel visible: `true`
- follow-up Electron first-screen DB block: `false`
- final Chromium QA:
  - Browser plugin unavailable, regular Playwright Chromium used.
  - desktop 1440 first-screen project DB block: `false`
  - sidebar calendar June cells: `35`
  - July month navigation cells: `35`
  - DB field type edit value: `text`
  - DB calendar keyboard move to 2026-06-19: `true`
  - Korean AI fallback calendar proposal shown/approved: `true`
  - settings initial focus: `설정 닫기`
  - modal focus remains inside dialog after Shift+Tab: `true`
  - dark tokens applied: `#211f1c`, `#f7f1e8`, `#34302a`
  - desktop/tablet/mobile framework overlay: `false`
  - Chromium console errors/warnings: `0`
- final Electron QA:
  - title: `Nodiary`
  - `오늘의 계획` visible: `true`
  - AI input visible: `true`
  - first-screen project DB block: `false`
  - sidebar calendar cells: `35`
  - body overflow: `0`
  - Electron console errors/warnings: `0`

## 남은 문제

- Slash menu 검색/필터는 아직 남아 있다.
- AI drawer 자체의 focus trap은 아직 modal처럼 강제하지 않았다. settings modal focus trap/restore는 완료했다.
- 1024/1023 sidebar breakpoint 전환과 좁은 board view 4-column UX는 추가 패스가 필요하다.
- Google/Apple Calendar는 mocked preview adapter/test만 있으며 실제 provider auth, write, conflict resolver UI는 남아 있다.
- Calendar data는 여전히 fixture 기반이며, provider-backed event source는 후속 작업이다.

## 2026-06-16 Dock, Drag, Theme Hotfix

추가 수정:

- macOS 개발 실행에서 Dock/프로세스 이름이 `Electron`으로 남는 문제를 수정했다.
  - `scripts/dev-electron.mjs`가 `.nodiary-electron/Nodiary.app` 개발 번들을 생성한다.
  - `ditto`로 Electron.app 번들 symlink를 보존한다.
  - 메인 실행 파일과 Helper 앱/실행 파일을 `Nodiary`/`Nodiary Helper`로 맞춘다.
  - `build/icon.icns`를 개발 번들 아이콘으로 연결한다.
- Electron 런타임에서 `build/icon.png`/`build/icon.icns`를 찾아 Dock icon과 BrowserWindow icon에 적용한다.
- hidden titlebar 위 웹 UI에 drag/no-drag 영역을 추가했다.
  - topbar와 sidebar titlebar safe area는 drag.
  - toolbar buttons는 no-drag.
- 다크모드에서 Nodiary 로고 아이콘이 흰색으로 묻히던 문제를 해결했다.
  - 로고 전용 `--nodiary-logo-bg`, `--nodiary-logo-fg` 토큰 추가.
- Theme 옵션을 `system`, `light`, `dark`, `lavender`, `yellow`, `navy`로 확장했다.
  - 새 theme 값은 UI, 타입, repository preference hydrate validation에 모두 반영했다.

추가 검증:

- `npm test`: 13 files, 88 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.

추가 화면 QA:

- 개발 실행 프로세스 확인:
  - visible process: `Nodiary`
  - main executable: `.nodiary-electron/Nodiary.app/Contents/MacOS/Nodiary`
  - helper executable: `.nodiary-electron/Nodiary.app/Contents/Frameworks/Nodiary Helper.app/...`
  - bundle icon: `.nodiary-electron/Nodiary.app/Contents/Resources/nodiary.icns`
- 실제 macOS drag 검증:
  - Nodiary window position changed from `-1671,113` to `-1581,168`.
- Playwright Electron QA with `Nodiary.app` executable:
  - app name/title: `Nodiary`
  - first heading: `오늘의 계획`
  - topbar `-webkit-app-region`: `drag`
  - settings button `-webkit-app-region`: `no-drag`
  - theme buttons visible: `lavender`, `yellow`, `navy`
  - dark logo tokens: `#f7f1e8` / `#24211d`
  - navy tokens: app bg `#111827`, sidebar `#172033`
  - console errors/relevant warnings: `0`
- Latest QA screenshots outside the repo:
  - `/tmp/nodiary-theme-qa/nodiary-dev-window-front.png`
  - `/tmp/nodiary-theme-qa/nodiary-app-playwright-navy-clean.png`
