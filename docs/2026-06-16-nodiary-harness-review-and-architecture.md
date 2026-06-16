# Nodiary Harness Review And Architecture

작성일: 2026-06-16

## 최신 정정

이 문서는 1차 보안/UI/상태/패키징 하네스 결과와 당시 수정 내역을 기록한다. 이후 사용자 하네스 4명, 개발자 하네스 3명, 기획자 하네스 3명 관점으로 추가 UX50 검수를 수행했고, 이 문서의 일부 "수정 완료" 항목 중 실제 사용자 흐름에서 미흡한 부분을 다시 수정했다.

최신 50개 불편점 목록, 이번 커밋에서 고친 항목, 남은 문제, Playwright 증거는 다음 문서를 기준으로 본다.

- `docs/2026-06-16-nodiary-ux50-final-report.md`

2026-06-16 후속 수정에서 추가로 반영된 사항:

- 첫 화면 workspace hydrate/save를 `/api/nodiary/workspace` GET/PUT에 연결했다.
- `DATABASE_URL`이 없는 dev 환경에서는 workspace API가 default fallback으로 응답해 500을 피한다.
- DB block row add/inline edit와 real calendar grid view를 추가했다.
- AI context chips를 실제 토글로 바꾸고 request payload scope에 반영했다.
- theme/accent의 주요 UI token 적용 범위를 넓혔다.
- Playwright Chromium과 Playwright Electron으로 후속 시각 QA를 수행했다.

## 요약

Nodiary는 기존 MyPlan 중심 MVP에서 문서 우선 Notion Core Clone-lite 방향으로 재구성되었다. 첫 화면은 프로젝트 대시보드가 아니라 `오늘의 계획` 문서 편집 화면이며, 좌측에는 전체 월간 달력과 page tree, 중앙에는 Notion-like document canvas, 우측에는 쓰기 가능한 AI Operator panel이 배치된다.

이번 작업은 4개 하네스 관점으로 보안, UI/UX, 상태 모델, DB/패키징을 검토한 뒤 발견된 문제를 수정하고 검증했다.

## 현재 구성

### Desktop Shell

- `electron/main.cjs`
  - Electron BrowserWindow를 생성한다.
  - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`를 유지한다.
  - 외부 navigation/window open을 same-origin 기준으로 제한한다.
  - Electron preload로 local session token을 전달한다.
  - packaged app에서는 `userData/nodiary.db`를 `DATABASE_URL`로 설정한다.
  - packaged app에서 Prisma schema push를 best-effort로 시도한다.

- `electron/preload.cjs`
  - `window.nodiaryDesktop.sessionToken`을 노출한다.
  - 기존 호환용으로 `window.myplanDesktop`도 유지한다.

### Next App

- `src/app/page.tsx`
  - 첫 화면은 `NodiaryWorkspace`만 렌더링한다.

- `src/features/nodiary/nodiary-workspace.tsx`
  - 좌측 sidebar: Nodiary nav, 전체 월간 mini calendar, schedule, page tree, quick capture, settings.
  - 중앙 canvas: 큰 H1, properties, TipTap rich text blocks, todo/callout/heading/database blocks, slash menu.
  - 우측 AI panel: 직접 명령 입력, context scope chips, approval queue, undo, long-term memory.
  - responsive: 1024px에서는 sidebar는 유지하고 AI는 토글 drawer, mobile은 sidebar drawer.

- `src/features/nodiary/nodiary-model.ts`
  - UI state, block insertion, page selection, page tree drag, database view switching, DB row drag, calendar event move, AI approval/undo를 순수 함수로 관리한다.
  - high-risk calendar move는 바로 적용하지 않고 승인 큐로 보낸다.
  - AI undo는 block뿐 아니라 DB row/calendar/sidebar calendar 상태까지 되돌릴 수 있다.

### AI Operator

- `src/app/api/ai/operator/route.ts`
  - OpenAI Operator API endpoint.
  - optional `NODIARY_SESSION_TOKEN`이 있으면 `x-nodiary-session`을 요구한다.
  - JSON parse 실패, 잘못된 payload, oversized command/context를 거부한다.
  - response contract는 `{ plan }` envelope이다.

- `src/server/ai/openai-operator.ts`
  - OpenAI structured output을 생성한다.
  - timeout을 적용한다.
  - action/memory 개수, field length, allowed tool/risk를 검증한다.
  - 모델 JSON이 깨지거나 schema를 벗어나면 safe empty plan으로 떨어진다.

### Persistence

- `prisma/schema.prisma`
  - Workspace/Page/Block/Database/DatabaseRow/DatabaseView.
  - External calendar account/link.
  - AiMemory/AiRun/AiProposedAction/AiExecutionLog.
  - AppPreference.

- `src/server/nodiary/nodiary-repository.ts`
  - Prisma repository boundary.
  - UI presentational component에서 Prisma를 직접 호출하지 않는다.
  - 저장은 transaction 안에서 destructive replacement를 수행한다.
  - page 선택 후 해당 active page block을 읽는다.

- `prisma/bootstrap-sqlite.ts`
  - `npm run db:init`용 SQLite bootstrap.
  - Prisma schema engine이 실패하면 `node:sqlite` fallback으로 Nodiary schema를 직접 만든다.
  - seed workspace는 `nodiary-local`/`Nodiary` 기준으로 통일했다.

### Packaging And CI

- `package.json`
  - Electron productName/appId는 Nodiary.
  - Prisma schema와 engines를 packaged files에 포함한다.
  - macOS `.icns`, Windows `.ico` 아이콘을 연결한다.
  - Vitest는 audit-clean 버전으로 업그레이드했다.

- `.github/workflows/package.yml`
  - `npm ci`
  - Prisma generate/validate
  - test/typecheck/lint/build
  - Electron package for macOS and Windows

### Security Headers

- `next.config.ts`
  - production CSP, referrer policy, content-type nosniff를 적용한다.
  - development에서는 React/Next HMR을 위해 `unsafe-eval`과 local websocket을 dev-only로 허용한다.
  - dev indicator는 QA 스크린샷을 가리지 않도록 비활성화했다.

## 4명 하네스 검토 결과와 수정

### 1. 보안/API/Electron 하네스

발견:

- Local API가 같은 머신의 다른 프로세스에서 호출될 수 있었다.
- AI route payload size/shape validation이 부족했다.
- AI route response contract가 route/client 사이에서 어긋날 수 있었다.
- OpenAI 응답 JSON을 schema 검증 없이 신뢰했다.
- Electron navigation/window open 제한이 부족했다.
- CSP가 없었다.
- dev/prod dependency audit에서 취약점이 있었다.

수정:

- `NODIARY_SESSION_TOKEN` 기반 local session guard를 AI/workspace API에 추가했다.
- command, selectedText, pageTitle, memory 길이 제한과 malformed JSON 처리를 추가했다.
- AI route 응답을 `{ plan }`으로 고정했다.
- OpenAI plan parser에 allowed tool/risk, action/memory cap, string length cap, timeout을 추가했다.
- Electron same-origin navigation guard와 external URL allowlist를 추가했다.
- CSP/security headers를 추가하고 dev-only HMR 예외를 분리했다.
- `npm audit` 전체 0 vulnerabilities가 되도록 Vitest를 4.1.9로 업그레이드했다.

### 2. UI/UX Playwright 하네스

발견:

- Page tree 클릭 후 H1이 바뀌지 않는 문제가 있었다.
- 1024px에서 AI panel toggle이 panel에 가려질 수 있었다.
- contentEditable title 변경이 canonical state에 반영되지 않았다.
- slash menu가 하단에서 잘릴 수 있었다.
- `/` 키로 slash menu를 여는 흐름이 불안정했다.
- page tree chevron과 drag handle 역할이 섞여 있었다.
- mobile sidebar scroll과 AI drawer UX가 불편했다.
- mini calendar 접근성 role/aria가 부족했다.
- DB table/board/calendar drag affordance가 부족했다.
- dev CSP가 React HMR/eval을 막아 Playwright에서 hydration/interaction 문제가 생겼다.

수정:

- `selectPage`를 실제 active page state에 연결하고 Playwright로 H1 변경을 확인했다.
- AI panel은 작은 화면에서 초기 닫힘으로 전환하고 panel 내부 닫기 버튼을 추가했다.
- H1 `onInput`에서 `updatePageTitle`을 호출하도록 연결했다.
- slash menu를 위쪽 배치 및 scrollable menu로 조정했다.
- empty block을 clickable/contentEditable textbox로 만들고 `/` 키 open을 고정했다.
- page tree disclosure와 drag handle을 분리했다.
- sidebar에 overflow scroll을 부여했다.
- mini calendar `grid/gridcell`, `aria-selected`, `aria-current`를 정리했다.
- DB row/card/calendar drag data를 실제 drag/drop flow에 연결했다.
- dev CSP와 Next allowed dev origins를 조정하고 hydration mismatch를 제거했다.

### 3. 상태 모델/AI Undo 하네스

발견:

- AI undo가 block 일부만 되돌리고 DB row/calendar event 변경은 되돌리지 못했다.
- calendar event move 후 선택 날짜를 바꾸면 static schedule 때문에 이동 상태가 사라질 수 있었다.
- slash database block ID가 고정되어 중복될 수 있었다.
- high-risk calendar move가 바로 적용될 수 있었다.
- AI approval 전에 만들어진 undo snapshot이 승인 시점 사용자 변경을 덮을 수 있었다.
- AiRun status가 completed로 바뀌지 않는 케이스가 있었다.
- reject action에 pending guard가 없었다.
- truthy check 때문에 빈 문자열/clear 동작이 막힐 수 있었다.

수정:

- undo payload에 active page blocks와 sidebar calendar snapshot을 포함했다.
- calendar movedEvents state를 추가해 날짜 변경 후에도 이동 상태를 유지한다.
- slash insert block/database ID를 unique ID 생성으로 교체했다.
- high-risk calendar move는 `updateCalendarEvent` pending action으로 큐에 올린다.
- approval 시점에 runtime undo snapshot을 붙인다.
- 모든 pending action이 끝나면 run status를 `completed`로 갱신한다.
- reject는 pending action만 처리한다.
- update patch는 `!== undefined` 기준으로 처리한다.

### 4. DB/패키징 하네스

발견:

- `db:init` bootstrap이 오래된 MyPlan table 중심이라 Nodiary 모델을 만들지 못했다.
- workspace PUT validation이 부족했다.
- repository 저장이 transaction 없이 delete/create를 수행할 수 있었다.
- packaged Electron DB path/schema bootstrap이 불명확했다.
- Prisma Client stale generation으로 typecheck가 Nodiary 모델을 모를 수 있었다.
- seed workspace id가 repository workspace id와 달랐다.
- CI에 Prisma validate/generate가 없었다.
- package files에 Prisma schema/engines가 빠져 있었다.
- README가 오래된 MyPlan/AI 제외 방향을 설명했다.

수정:

- bootstrap을 Prisma schema 기반으로 바꾸고, engine 실패 시 direct SQLite fallback을 추가했다.
- workspace PUT에 state shape/id/type/database row validation을 추가했다.
- save repository를 `$transaction`으로 감쌌다.
- packaged Electron app에서 userData DB URL과 best-effort schema push를 수행한다.
- `npm run db:generate`를 실행하고 CI에도 추가했다.
- seed workspace를 `nodiary-local`/`Nodiary`로 맞췄다.
- GitHub Actions에 Prisma generate/validate를 추가했다.
- package files/asarUnpack에 `prisma/**/*`, Prisma client/engine을 포함했다.
- README를 Nodiary 기준으로 다시 작성했다.

## 추가로 실제 QA 중 발견해서 수정한 것

- Development CSP가 React hydration/dev HMR을 막아 Playwright click handler가 동작하지 않던 문제.
- AI panel initial responsive state가 hydration mismatch를 만들던 문제.
- 1024px AI drawer가 topbar toggle을 가려 닫을 수 없던 문제.
- `release/` packaged output을 TypeScript가 다시 읽던 문제.
- Electron pack을 build와 병렬 실행하면 `.next/lock` 경합으로 실패할 수 있던 점. 최종 검증에서는 build 후 pack을 단독 실행했다.
- macOS/Windows app icon이 없어 기본 Electron icon으로 떨어지던 점.

## 검증 결과

실행한 검증:

- `npm test`: 12 files, 48 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `DATABASE_URL='file:./prisma/ci.db' npx prisma validate`: passed.
- `npm run db:generate`: passed.
- `npm run db:init`: passed via direct SQLite fallback after local Prisma schema engine failure.
- `npm run build`: passed.
- `CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:pack`: passed.
- `npm audit`: 0 vulnerabilities.

Playwright visual QA:

- 1440 desktop: document-first screen, full left calendar 35 cells, right AI input visible.
- 1024 tablet: document-first screen, full left calendar 35 cells, AI panel initially closed and toggle works.
- 390 mobile: document canvas visible by default, sidebar opens as drawer, calendar 35 cells visible inside drawer.
- Page tree click: `고쳐야 할 50개` opens as active H1.
- Slash menu: opens from empty block.
- Database block: inserted from slash menu and table view appears.
- AI drawer: opens and closes at 1024px.

스크린샷:

- `docs/qa-artifacts/nodiary-desktop-1440.png`
- `docs/qa-artifacts/nodiary-tablet-1024.png`
- `docs/qa-artifacts/nodiary-mobile-390.png`
- `docs/qa-artifacts/nodiary-mobile-sidebar-open.png`
- `docs/qa-artifacts/nodiary-interactions-1440.png`
- `docs/qa-artifacts/nodiary-tablet-ai-toggle.png`

## 남은 외부 조건

- 이 로컬 환경에서는 `prisma db push`가 `Schema engine error`로 실패한다. `db:init`은 direct SQLite fallback으로 성공하도록 고쳤지만, Prisma engine 자체 실패 원인은 환경/엔진 레벨이다.
- Electron macOS code signing은 인증서가 없어 `CSC_IDENTITY_AUTO_DISCOVERY=false`로 패키징만 검증했다.
- Windows installer는 GitHub Actions matrix에서 검증되도록 설정되어 있다. 로컬 머신은 macOS라 Windows 실제 installer 실행 QA는 수행하지 않았다.
- Google/Apple Calendar 실제 two-way sync provider 연결은 schema/계획 기반이며, 실제 OAuth/provider adapter는 별도 구현 단계다.
