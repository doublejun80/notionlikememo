# Windows Codex 앱 + Open Design 기반 MyPlan 개발 방향성

문서 목적: Windows Codex 앱에서 프로젝트 폴더를 열고, Open Design을 디자인 생성/디자인 시스템 레이어로 붙여 **노션형 일정관리 및 개인기록 앱(MyPlan)**을 만드는 실행 방향을 정리한다.

---

## 1. 기본 판단

MyPlan은 단순 일정 앱도 아니고, 노션 복제 앱도 아니다.

목표는 다음에 가깝다.

```text
오늘의 일정
+ 오늘의 기록
+ 할 일
+ 노트
+ 프로젝트
+ 장기 개인 데이터베이스
```

즉, 핵심 화면은 `Today`이고, Calendar / Journal / Tasks / Notes / Projects가 Today를 중심으로 연결되는 구조다.

Open Design은 **첫 와꾸와 디자인 시스템을 잡는 도구**로 쓰고, Codex는 **구현, 리팩터링, 구조화, 검증**에 쓴다.

```text
Open Design
→ Visual Direction / DESIGN.md / HTML artifact

Codex
→ Next.js 구현 / 데이터 모델 / 컴포넌트 분리 / 테스트 / 확장 구조
```

---

## 2. Windows 기준 작업 원칙

### 2.1 우선 Windows Native로 시작

처음에는 WSL2보다 Windows Native 기준으로 시작한다.

이유는 간단하다.

```text
Windows Codex 앱
→ Windows 파일 시스템의 프로젝트 폴더를 직접 열기 쉬움
→ PowerShell 기반 명령 실행 확인이 쉬움
→ 초반 환경 이슈를 줄이기 좋음
```

권장 폴더 위치:

```text
C:\Users\<사용자명>\Projects\myplan
```

피해야 할 위치:

```text
바탕화면
다운로드 폴더
OneDrive 동기화 폴더
한글/공백/특수문자가 많은 경로
```

권장 예시:

```text
C:\Dev\myplan
C:\Projects\myplan
```

### 2.2 WSL2는 2차 선택지

아래 상황이면 WSL2 전환을 검토한다.

```text
- Windows Native에서 Node/pnpm/빌드 문제가 반복됨
- 리눅스 기반 패키지가 많아짐
- Docker, PostgreSQL, 로컬 백엔드가 복잡해짐
- 나중에 서버 배포 환경과 최대한 맞추고 싶음
```

초기 UI/프론트엔드 MVP는 Windows Native로 충분하다.

---

## 3. 설치 및 준비 항목

### 3.1 필수 도구

```text
- Windows Codex 앱
- Git
- Node.js LTS 또는 최신 안정 버전
- pnpm
- VS Code
- Open Design Windows Desktop App
```

### 3.2 권장 도구

```text
- GitHub CLI
- SQLite Viewer 또는 TablePlus
- Figma 계정
- Chrome 또는 Edge
```

### 3.3 Open Design 적용 방식

처음에는 Open Design Desktop App을 권장한다.

이유:

```text
- Windows에서 GUI로 확인 가능
- 디자인 시스템/템플릿 선택이 쉬움
- 생성 artifact를 눈으로 보고 고르기 좋음
- Codex 연동 전에 디자인 방향을 먼저 잡을 수 있음
```

이후 Codex 앱과 연결한다.

```text
Open Design Desktop
→ Settings
→ MCP Server
→ Codex용 설정 확인
→ Codex 앱의 MCP 설정에 반영
```

연결 후 Codex에서 아래 요청이 먹히는지 확인한다.

```text
Use open-design to list available design systems and dashboard/prototype skills.
```

정상이라면 Codex가 Open Design의 skill, design system, artifact를 참조할 수 있어야 한다.

---

## 4. 프로젝트 폴더 구조

처음부터 확장성을 고려해 아래 구조로 간다.

```text
myplan/
├─ AGENTS.md
├─ DESIGN.md
├─ README.md
├─ package.json
├─ next.config.ts
├─ tsconfig.json
├─ tailwind.config.ts
├─ postcss.config.js
├─ prisma/
│  └─ schema.prisma
├─ docs/
│  ├─ 00_project-direction.md
│  ├─ 01_product-spec.md
│  ├─ 02_information-architecture.md
│  ├─ 03_design-system.md
│  ├─ 04_data-model.md
│  ├─ 05_roadmap.md
│  └─ 06_open-design-prompts.md
└─ src/
   ├─ app/
   │  ├─ page.tsx
   │  ├─ today/
   │  ├─ calendar/
   │  ├─ journal/
   │  ├─ tasks/
   │  ├─ notes/
   │  ├─ projects/
   │  ├─ search/
   │  └─ settings/
   ├─ components/
   │  ├─ layout/
   │  ├─ navigation/
   │  ├─ calendar/
   │  ├─ editor/
   │  ├─ database/
   │  ├─ task/
   │  └─ ui/
   ├─ features/
   │  ├─ today/
   │  ├─ calendar/
   │  ├─ journal/
   │  ├─ task/
   │  ├─ note/
   │  ├─ project/
   │  ├─ search/
   │  ├─ quick-capture/
   │  └─ sync/
   ├─ lib/
   ├─ data/
   └─ styles/
```

핵심은 `AGENTS.md`와 `DESIGN.md`다.

- `AGENTS.md`: Codex가 따라야 할 개발/작업 규칙
- `DESIGN.md`: Open Design과 Codex가 따라야 할 화면/브랜드/디자인 규칙

---

## 5. AGENTS.md 작성 방향

프로젝트 루트에 `AGENTS.md`를 만든다.

```md
# AGENTS.md

## Project

This project is MyPlan, a Notion-style personal planning and record app.

MyPlan combines:
- Today dashboard
- Calendar
- Daily journal
- Tasks
- Notes
- Projects
- Personal database views
- Search
- Future sync and AI-assisted review

## Core product principle

The app is not a generic admin dashboard.
The app is not a Notion clone.
The app is a calm personal operating system for planning, recording, reviewing, and connecting daily life data.

The Today screen is the center of the product.

## Technical stack

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- Prisma
- SQLite for local-first MVP
- PostgreSQL-ready schema for future deployment

Do not introduce heavy dependencies without explaining the reason.

## Architecture

Use feature-based architecture.

Major domains:
- src/features/today
- src/features/calendar
- src/features/journal
- src/features/task
- src/features/note
- src/features/project
- src/features/search
- src/features/quick-capture
- src/features/sync

Keep UI, domain logic, data access, and mock data separated.

Do not hard-code large mock data inside components.

## Design workflow

Before implementing a new major screen:
1. Use Open Design if available.
2. Generate 3 to 5 visual directions or screen options.
3. Compare them against DESIGN.md.
4. Implement only after selecting the preferred direction.
5. Preserve the selected visual language across the app.

## UI direction

The app should feel:
- Calm
- Premium
- Quiet
- Fast
- Keyboard-friendly
- Data-dense but not cluttered

Reference feeling:
- Notion
- Linear
- Notion Calendar
- Craft
- Things
- Cron

Avoid:
- Generic admin dashboard
- Oversized cards
- AI purple gradients
- Toy-like icons
- Cute illustrations
- Empty marketing-page spacing
- Random emoji decoration

## Quality checks

Before finishing a coding task:
- Run typecheck
- Run lint
- Run build
- Review the main screen at 1440px desktop width
- Confirm the layout still works around 1024px width
```

---

## 6. DESIGN.md 작성 방향

`DESIGN.md`는 Open Design과 Codex가 공유하는 디자인 계약서로 쓴다.

```md
# DESIGN.md

## Product identity

App name: MyPlan

MyPlan is a Notion-style personal planning and record app.

It combines calendar, daily journal, tasks, notes, projects, and personal records into one quiet workspace.

It should not feel like a corporate BI dashboard.
It should not feel like a startup marketing page.
It should not feel like a colorful productivity toy.

## Primary user experience

The user opens MyPlan to answer four questions:

1. What do I need to do today?
2. What is scheduled today?
3. What did I record today?
4. What is connected to my current work or life context?

## Main surfaces

The app has three persistent surfaces:

1. Left workspace sidebar
   - Today
   - Calendar
   - Journal
   - Tasks
   - Notes
   - Projects
   - Search
   - Archive
   - Settings

2. Main canvas
   - Current page title
   - Context actions
   - Primary working area
   - Editor, calendar, table, board, or timeline view

3. Right context panel
   - Selected day summary
   - Quick capture
   - Upcoming items
   - Related notes
   - Linked projects
   - Review prompts

## Visual style

Use a quiet premium productivity style.

Preferred feeling:
- Notion-like structure
- Linear-like precision
- Craft-like writing surface
- Notion Calendar-like clarity
- Things-like task calmness

## Color

Use:
- Warm off-white or neutral background
- Deep charcoal text
- Subtle gray borders
- One restrained accent color
- Calm status colors for task state and priority

Avoid:
- Neon colors
- Heavy gradients
- Purple AI theme
- Glassmorphism unless extremely subtle
- Random colorful cards

## Typography

Use a clean sans-serif font.
Korean text must remain readable.

Hierarchy:
- Page title: clear but not oversized
- Section title: compact
- Metadata: small and low contrast
- Body/editor text: comfortable line height
- Table text: compact but readable

## Density

Desktop-first.
Target width: 1440px.

The UI should be dense enough for real daily use.
Avoid large empty hero sections.
Avoid oversized cards that reduce information value.

## Required components

- Workspace sidebar
- Top command/search bar
- Today overview
- Calendar grid
- Daily timeline
- Task list
- Journal editor
- Note card
- Project card
- Database table
- Tag chip
- Relation pill
- Empty state
- Quick capture modal
- Right context panel
- Command palette

## Interaction style

The app should support:
- Keyboard-first navigation
- Quick add
- Inline editing
- Calendar cell selection
- Task status toggle
- Filterable database views
- Search-first movement
- Command palette

## Forbidden style

Do not use:
- Generic admin dashboard UI
- Big KPI cards as the main product metaphor
- Cartoon icons
- Decorative emoji
- Unnecessary gradients
- Overly round cards
- Excessive shadows
- Marketing landing page spacing
```

---

## 7. 제품 정보구조

### 7.1 1차 화면

| 화면 | 목적 | 첫 버전 범위 |
|---|---|---|
| Today | 매일 여는 기본 화면 | 일정, 할 일, 기록, 빠른 입력 |
| Calendar | 일정 확인 | 월간 보기 중심 |
| Journal | 하루 기록 | 날짜별 에디터 |
| Tasks | 할 일 관리 | 상태, 마감일, 우선순위 |
| Notes | 자유 기록 | 노트 목록, 상세 보기 |
| Projects | 장기 항목 관리 | 프로젝트 목록, 연결 task |
| Search | 전체 검색 | 제목/본문/태그 검색 |
| Settings | 설정 | 테마, 데이터, 백업 자리 |

### 7.2 핵심 화면 구조

```text
Today
├─ 오늘 날짜 / 요일 / 짧은 상태
├─ 오늘 일정
├─ 오늘 할 일
├─ 오늘 기록
├─ 빠른 입력
├─ 최근 노트
└─ 진행 중 프로젝트
```

Today는 대시보드처럼 보이되, KPI 카드 중심이면 안 된다.

좋은 구조:

```text
작업 큐 + 시간표 + 기록 표면 + 연결 정보
```

나쁜 구조:

```text
총 할 일 12개 / 완료율 43% / 노트 8개 / 프로젝트 5개
```

개인 기록 앱에서 핵심은 숫자가 아니라 **오늘 무엇을 해야 하고 무엇을 남겼는가**다.

---

## 8. 데이터 모델 방향

처음부터 Notion처럼 모든 것을 Page/Block으로만 만들면 일정과 할 일 쿼리가 지저분해진다.

반대로 모든 것을 고정 컬럼으로 만들면 Notion형 확장성이 죽는다.

따라서 하이브리드로 간다.

```text
명확한 도메인
- Event
- Task
- JournalEntry
- Project

확장 가능한 기록
- Page
- Block
- Note
- Property
- Relation
```

### 8.1 Prisma 모델 초안

```prisma
model Space {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  pages     Page[]
  tasks     Task[]
  events    Event[]
  journals  JournalEntry[]
  projects  Project[]
  tags      Tag[]
}

model Page {
  id         String   @id @default(cuid())
  spaceId    String
  type       String   // note, project_page, database_page
  title      String
  content    Json?
  properties Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Event {
  id        String   @id @default(cuid())
  spaceId   String
  title     String
  startsAt  DateTime
  endsAt    DateTime?
  allDay    Boolean  @default(false)
  note      String?
  source    String?  // manual, google_calendar, import
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model JournalEntry {
  id        String   @id @default(cuid())
  spaceId   String
  date      DateTime
  title     String?
  content   Json?
  mood      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id        String   @id @default(cuid())
  spaceId   String
  title     String
  status    String   // todo, doing, done, archived
  dueDate   DateTime?
  priority  String?
  projectId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id        String   @id @default(cuid())
  spaceId   String
  name      String
  status    String
  summary   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Tag {
  id        String   @id @default(cuid())
  spaceId   String
  name      String
  color     String?
}
```

---

## 9. MVP 범위

### 9.1 MVP 0.1: 디자인/목업

목표:

```text
눈으로 봤을 때 앱 방향성이 맞는지 확인
```

범위:

```text
- Open Design visual direction 5개
- Today 화면 artifact
- Calendar 화면 artifact
- Journal 화면 artifact
- Tasks 화면 artifact
- Notes 화면 artifact
```

이 단계에서는 DB 연결하지 않는다.

### 9.2 MVP 0.2: 기본 앱 뼈대

목표:

```text
Next.js 앱으로 화면 이동과 mock data 표시
```

범위:

```text
- Next.js 프로젝트 생성
- 공통 레이아웃
- 좌측 사이드바
- Top command/search bar
- Right context panel
- Today mock 화면
- Calendar mock 화면
- Journal mock 화면
- Tasks mock 화면
```

### 9.3 MVP 0.3: 로컬 저장

목표:

```text
개인 앱으로 실제 사용 가능한 최소 저장 기능
```

범위:

```text
- Prisma + SQLite
- Task CRUD
- Journal CRUD
- Event CRUD
- Note CRUD
- Quick Capture 저장
```

### 9.4 MVP 0.4: 검색/연결

목표:

```text
기록 앱으로 의미가 생기는 단계
```

범위:

```text
- 전체 검색
- 태그
- 프로젝트와 task 연결
- journal과 note 연결
- 날짜별 기록 보기
```

### 9.5 MVP 0.5: 확장 준비

목표:

```text
나중에 모바일/동기화/AI 기능을 붙일 수 있는 구조
```

범위:

```text
- Sync adapter 인터페이스
- AI summary slot
- Import/export
- 백업
- 테마 설정
```

---

## 10. Codex 첫 실행 프롬프트

Windows Codex 앱에서 `C:\Projects\myplan` 폴더를 열고 아래 프롬프트로 시작한다.

```text
이 폴더를 MyPlan 프로젝트로 시작한다.

목표는 Notion형 일정관리 및 개인 기록 앱이다.
단순 노션 복제가 아니라 Today 중심으로 Calendar, Journal, Tasks, Notes, Projects가 연결되는 개인 생산성 앱으로 설계한다.

먼저 아래 순서로 진행해줘.

1. 현재 폴더 구조 확인
2. Windows Native 환경 기준으로 Node, package manager, Git 사용 가능 여부 확인
3. 아직 프로젝트가 없으면 Next.js + TypeScript + Tailwind 기반으로 초기화할 계획을 세움
4. 바로 구현하지 말고 AGENTS.md와 DESIGN.md를 먼저 생성
5. Open Design MCP 또는 Open Design 연동 가능 여부 확인
6. Open Design을 사용할 수 있으면 visual direction 5개를 먼저 생성
7. 각 direction을 아래 기준으로 비교
   - 화면 구조
   - 사이드바 방식
   - Today 화면 구성
   - Calendar/Journal/Tasks 표현력
   - 색상/타이포/밀도감
   - 확장성
8. 추천 direction 1개를 제안
9. 추천 direction을 DESIGN.md에 반영할 수정안을 작성

중요:
- 아직 기능 구현하지 마
- 먼저 와꾸와 정보구조를 잡아
- Generic admin dashboard처럼 만들지 마
- Notion, Linear, Notion Calendar, Craft, Things 느낌을 참고하되 그대로 복제하지 마
- 결과는 한국어로 설명해
```

---

## 11. Open Design 전용 프롬프트

Open Design이 연결된 상태에서 Codex에 아래처럼 요청한다.

```text
Use open-design to generate 5 visual directions for MyPlan.

Artifact type:
- Desktop web app workspace shell
- Notion-style planning and personal record app

Product context:
- App name: MyPlan
- Main concept: Today-centered personal operating system
- Core modules: Today, Calendar, Journal, Tasks, Notes, Projects, Search, Settings
- User workflow: plan the day, manage schedule, write daily records, track tasks, connect notes and projects

Design taste:
- Calm premium productivity workspace
- Inspired by Notion, Linear, Notion Calendar, Craft, Things
- Korean UI-ready
- Dense but readable
- Desktop-first at 1440px
- Not a generic admin dashboard
- Not a marketing landing page
- No AI purple gradient
- No toy-like icons

Output:
- 5 distinct visual directions
- Each direction must include:
  - layout structure
  - sidebar style
  - main canvas style
  - right context panel style
  - Today screen composition
  - Calendar surface
  - Journal/editor surface
  - task list style
  - color palette
  - typography
  - strengths
  - weaknesses
  - expansion risk
```

---

## 12. 화면 생성 프롬프트

Visual direction을 선택한 뒤 사용한다.

```text
Use the selected Open Design visual direction to create the first MyPlan Today screen.

Screen:
- Today

Required layout:
- Left workspace sidebar
- Top command/search bar
- Main Today canvas
- Right context panel

Main Today canvas must include:
- Today header with date
- Today's schedule
- Today's tasks
- Daily journal quick entry
- Recent notes
- Active projects

Right context panel must include:
- Quick capture
- Upcoming items
- Overdue tasks
- Related notes
- Review prompt

Design requirements:
- Calm premium workspace
- Dense but not cluttered
- Korean UI copy
- Desktop 1440px first
- No generic admin dashboard KPI cards
- No excessive gradients
- No cartoon icons

Output:
- Self-contained HTML artifact first
- Do not implement React yet
```

---

## 13. 구현 전환 프롬프트

Open Design artifact가 마음에 들 때 Codex에 입력한다.

```text
선택된 Open Design Today 화면 artifact를 기준으로 실제 Next.js 앱으로 구현해줘.

구현 조건:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- Feature-based folder structure
- Mock data 분리
- DESIGN.md 유지
- AGENTS.md 규칙 준수

구현 범위:
1. App shell
2. LeftSidebar
3. TopCommandBar
4. MainCanvas
5. RightContextPanel
6. Today page
7. Calendar page placeholder
8. Journal page placeholder
9. Tasks page placeholder
10. Notes page placeholder
11. Projects page placeholder
12. Settings page placeholder

중요:
- Open Design artifact의 시각 방향을 최대한 유지해
- 컴포넌트를 잘게 분리해
- mock data는 src/data 아래로 분리해
- 아직 DB 연결하지 마
- 먼저 화면이 제대로 보이게 만들어
- 구현 후 npm run build 또는 가능한 검증 명령을 실행해
```

---

## 14. 개발 단계별 Codex 스레드 운영

Windows Codex 앱에서는 스레드를 목적별로 나누는 것이 좋다.

```text
Thread 1: Project Setup
- 폴더 구조
- AGENTS.md
- DESIGN.md
- Next.js 초기화

Thread 2: Open Design Direction
- visual direction
- Today 화면
- Calendar/Journal/Tasks 화면 artifact

Thread 3: UI Implementation
- React 컴포넌트화
- 라우팅
- Tailwind 정리

Thread 4: Data Model
- Prisma schema
- SQLite 연결
- CRUD

Thread 5: Review & Refactor
- 빌드 오류
- UI 보정
- 컴포넌트 정리
```

한 스레드에서 모든 것을 시키면 방향이 흐려진다.

특히 디자인과 구현은 분리한다.

```text
좋은 방식:
Open Design 방향 확정 → 구현

나쁜 방식:
디자인도 하고 DB도 붙이고 로그인도 붙이고 배포도 해줘
```

---

## 15. 확장성 설계 원칙

### 15.1 기능 단위 분리

각 기능은 `features` 아래에 분리한다.

```text
src/features/calendar
src/features/journal
src/features/task
src/features/note
src/features/project
src/features/search
src/features/sync
```

### 15.2 데이터 접근 분리

컴포넌트에서 DB를 직접 호출하지 않는다.

```text
UI Component
→ feature service
→ repository/data access
→ database
```

### 15.3 Sync는 처음부터 직접 구현하지 않음

초기에는 로컬 SQLite만 쓴다.

나중에 아래 중 하나로 확장한다.

```text
- Supabase
- PostgreSQL 서버
- Local-first sync
- iCloud/Dropbox export
- Google Calendar sync
```

### 15.4 AI 기능은 자리만 만든다

처음부터 AI 요약을 구현하지 않는다.

먼저 자리를 만든다.

```text
- Daily summary slot
- Weekly review slot
- Task extraction slot
- Related note suggestion slot
```

AI는 3차 이후에 붙인다.

---

## 16. 디자인 검수 기준

Open Design 결과물이나 Codex 구현물을 볼 때 아래 기준으로 판단한다.

| 기준 | 통과 조건 |
|---|---|
| 첫인상 | 노션형이지만 복제품처럼 보이지 않을 것 |
| 밀도 | 실제 매일 쓸 수 있을 정도로 조밀할 것 |
| 가독성 | 한국어 텍스트가 답답하지 않을 것 |
| Today 중심성 | 첫 화면에서 오늘 할 일과 기록이 바로 보일 것 |
| 확장성 | Calendar/Journal/Tasks/Notes가 자연스럽게 추가될 것 |
| 절제감 | 그라데이션, 그림자, 큰 카드 남발이 없을 것 |
| 구현성 | React/Tailwind로 무리 없이 구현 가능할 것 |

---

## 17. 처음 만들 화면 우선순위

1. App Shell
2. Today
3. Calendar
4. Journal
5. Tasks
6. Notes
7. Projects
8. Search
9. Settings

가장 먼저 완성해야 하는 것은 Today다.

Today가 약하면 앱 전체 방향이 흔들린다.

---

## 18. 1차 완료 기준

1차 완료는 “기능 많은 앱”이 아니라 “방향이 맞는 앱”이다.

완료 기준:

```text
- Windows Codex 앱에서 프로젝트 폴더가 정상 열림
- AGENTS.md 존재
- DESIGN.md 존재
- Open Design visual direction 5개 검토 완료
- 선택한 visual direction이 DESIGN.md에 반영됨
- Today 화면이 HTML artifact로 존재
- Today 화면이 Next.js 앱에 구현됨
- 좌측 사이드바/상단 검색/우측 패널 구조가 잡힘
- mock data로 화면이 자연스럽게 보임
- npm run build 통과
```

---

## 19. 하지 말아야 할 것

초기에는 아래를 하지 않는다.

```text
- 로그인 구현
- 모바일 앱 구현
- 동기화 구현
- AI 요약 구현
- 플러그인 시스템 구현
- 완전한 Notion block editor 구현
- Google Calendar 연동
- 실시간 협업
```

이것들은 방향 확정 후 단계적으로 붙인다.

---

## 20. 최종 방향

MyPlan은 아래 순서로 만든다.

```text
1. Open Design으로 예쁜 방향을 먼저 잡는다.
2. DESIGN.md로 디자인 규칙을 고정한다.
3. Codex로 Next.js 앱을 구현한다.
4. Today 화면부터 완성한다.
5. Calendar / Journal / Tasks / Notes를 붙인다.
6. SQLite로 로컬 저장을 붙인다.
7. 검색과 연결 관계를 추가한다.
8. 나중에 동기화와 AI 기능을 붙인다.
```

한 줄로 말하면:

```text
Open Design은 감각과 화면 방향을 잡는 데 쓰고,
Codex는 그 방향을 실제 앱 구조로 만드는 데 쓴다.
```
