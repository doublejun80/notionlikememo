# DESIGN.md

## Product Identity

**App name:** MyPlan

MyPlan is a Today-centered personal planning and record app. It combines
calendar, daily journal, tasks, notes, projects, and search into one quiet
workspace.

It should not feel like a corporate BI dashboard, a startup marketing page, or
a colorful productivity toy.

## Product Direction

MyPlan is designed around daily use. The first screen should help the user
understand today, act on the next task, write a quick record, and see related
context without switching tools.

Core principle:

```text
Today is the hub.
Calendar, Journal, Tasks, Notes, and Projects orbit around Today.
```

Primary user questions:

1. 오늘 무엇을 해야 하는가?
2. 오늘 어떤 일정이 있는가?
3. 오늘 무엇을 기록했는가?
4. 지금 하는 일과 연결된 노트/프로젝트는 무엇인가?

## Information Architecture

Primary navigation:

- Today: 매일 여는 기본 화면
- Calendar: 월/주/일 일정 관리
- Journal: 날짜별 개인 기록
- Tasks: 할 일, 마감일, 우선순위, 상태 관리
- Notes: 자유 기록과 지식 저장
- Projects: 장기 목표와 관련 task/note 연결
- Search: 전체 검색
- Settings: 테마, 데이터, 백업, 동기화 설정

Persistent surfaces:

- Left Sidebar: workspace navigation, pinned views, quick module switching
- Top Command/Search Bar: search, command palette, quick capture entry
- Main Canvas: active page workspace
- Right Context Panel: selected day, linked records, upcoming items, quick input

MVP scope:

- App Shell
- Left Sidebar
- Top Command/Search Bar
- Right Context Panel
- Today screen
- Calendar base screen
- Journal base screen
- Tasks base screen
- Notes base screen
- Projects base screen
- Mock data display

Out of initial scope:

- Login
- Mobile app
- Real-time sync
- AI summary
- Google Calendar integration
- Full Notion block editor
- Plugin system
- Real-time collaboration

## Layout Principles

Desktop-first target: 1440px.

The app should use a stable workspace shell:

- Left sidebar: 240px to 280px
- Main canvas: flexible, content-first
- Right context panel: 300px to 360px
- Top command/search: compact, always reachable

Layout should feel like a working desk, not a landing page.

Avoid page sections that look like marketing blocks. Avoid large KPI cards as
the primary metaphor. Use dense lists, editor surfaces, calendar grids, and
relation pills instead.

## Visual Style

Preferred qualities:

- Quiet
- Premium
- Structured
- Precise
- Warm enough for personal writing
- Dense but not cramped

Reference qualities:

- Notion-like structure
- Linear-like precision
- Notion Calendar-like schedule clarity
- Craft-like writing surface
- Things-like task calmness

Do not copy any reference product directly.

## Color Direction

Base palette:

- App background: warm off-white or soft neutral
- Surface background: white or near-white
- Primary text: deep charcoal
- Secondary text: muted gray
- Borders: low-contrast warm gray
- Accent: restrained ink blue, olive, or muted teal
- Status colors: quiet amber, green, red, and blue

Avoid:

- Neon colors
- Heavy gradients
- Purple AI theme
- One-note beige-only palette
- One-note slate-only palette
- Random colorful cards

Suggested tokens:

```text
background: #F7F5F0
surface: #FFFFFF
surface-muted: #F2F0EA
border: #DEDAD1
text-primary: #24211D
text-secondary: #6F6A61
text-tertiary: #9A948A
accent: #2F5D62
accent-soft: #DCE9E7
warning: #B7791F
success: #3F6F4E
danger: #A4493D
```

These values are a starting point, not final implementation tokens.

## Typography

Korean UI must remain readable.

Recommended direction:

- Sans-serif UI font with reliable Korean rendering
- Compact headings
- Comfortable editor body text
- Small but legible metadata
- No negative letter spacing
- No viewport-scaled font sizes

Hierarchy:

- Page title: clear but not oversized
- Section title: compact and scannable
- Body/editor: calm line height
- Metadata: low contrast but readable
- Table/list text: compact and stable

## Component Rules

Required components:

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

Component guidance:

- Use icons only when they clarify recognition.
- Prefer restrained lucide-style line icons after implementation begins.
- Keep cards at 8px radius or less unless the system later proves otherwise.
- Do not nest cards inside cards.
- Use lists and grouped rows for dense daily data.
- Use relation pills for linked projects, notes, and tags.
- Keep empty states useful and quiet.

## Interaction Style

MyPlan should support:

- Keyboard-first navigation
- Quick add
- Inline editing
- Calendar cell selection
- Task status toggle
- Filterable database views
- Search-first movement
- Command palette

Interaction should be fast and low ceremony. Avoid modals for routine editing
unless the task is genuinely contextual.

## Forbidden Style

Do not use:

- Generic admin dashboard UI
- Big KPI cards as the main product metaphor
- Cartoon icons
- Decorative emoji
- Unnecessary gradients
- Overly round cards
- Excessive shadows
- Marketing landing page spacing
- Purple AI aesthetic
- Bokeh/orb backgrounds
- Decorative glass panels

## Open Design Availability

Checked on 2026-06-15 in the current Codex desktop session.

Result:

- Open Design MCP tools were not available through the current tool discovery.
- Figma and Canva MCP tools were available, but they are not the requested Open
  Design integration.
- No Open Design artifact URL was generated.

Until Open Design is connected, the directions below are Codex-authored visual
direction specifications and can be used as Open Design prompts later.

## Visual Direction 1: Quiet Daybook Workspace

Summary:

MyPlan feels like a calm daily work journal with a strong Today canvas. The
layout prioritizes the current day, schedule, tasks, and writing surface.

Layout:

- Left sidebar with compact workspace navigation and pinned views
- Main canvas split into day header, schedule strip, task list, journal area,
  recent notes, and active projects
- Right context panel for quick capture, upcoming items, and linked records

Sidebar:

- Warm neutral surface
- Simple text labels with small line icons
- Today visually selected but not loud
- Secondary section for pinned projects or saved views

Today:

- Date header at top
- Timeline strip for today's calendar
- Primary task group below
- Journal quick entry beside or below tasks depending on width
- Recent notes and active projects as compact rows

Calendar:

- Month/week grid with quiet borders
- Today's column or cell has a restrained accent
- Events are thin blocks, not colorful pills everywhere

Journal/editor:

- Paper-like editor surface
- Date-linked entry
- Minimal toolbar
- Comfortable Korean body text

Task list:

- Things-like calm rows
- Checkbox, title, due hint, project relation, priority marker
- No big status cards

Notes/Projects:

- Extensible through compact cards, relation pills, and saved views

Color:

- Warm off-white, white surfaces, charcoal text, muted teal accent

Typography:

- Quiet sans-serif, compact headings, readable editor text

Density:

- High enough for daily work without feeling crowded

Implementation difficulty:

- Medium-low. Fits standard Next.js/Tailwind components well.

Long-term extensibility:

- High. Today remains central while modules can expand naturally.

## Visual Direction 2: Linear Ledger Workspace

Summary:

MyPlan feels like a precise operational ledger for personal work. It favors
tables, command surfaces, list density, and keyboard-driven workflows.

Layout:

- Narrow left sidebar
- Main canvas dominated by list/table views
- Right panel shows selected item details and relations

Sidebar:

- Linear-like compact navigation
- Minimal icon treatment
- Clear active state

Today:

- Today represented as ordered sections: inbox, scheduled, due, writing, linked
  projects
- More list-like than journal-like

Calendar:

- Agenda-first week view with time columns
- Month view is secondary

Journal/editor:

- Editor appears as a linked detail pane or inline panel
- Less warm, more utility-focused

Task list:

- Excellent for task scanning
- Supports filters, states, and keyboard commands well

Notes/Projects:

- Strong database-style expansion
- Risks feeling too much like an issue tracker

Color:

- Neutral gray/white with restrained blue-gray accent

Typography:

- Crisp, small, system-like

Density:

- Very high

Implementation difficulty:

- Medium. Tables and keyboard workflows need care.

Long-term extensibility:

- High for structured data, medium for personal writing.

## Visual Direction 3: Calendar-Centered Desk

Summary:

MyPlan starts from schedule clarity. Today and Calendar are tightly connected,
with the day timeline as the dominant object.

Layout:

- Left sidebar
- Main canvas centered on day/week calendar
- Right panel for tasks, journal, and quick capture

Sidebar:

- Similar to a calendar app workspace
- Calendar and Today are dominant

Today:

- Timeline first
- Tasks and journal sit around schedule context
- Strong for time blocking

Calendar:

- Best direction for month/week/day schedule clarity
- Event density can remain readable

Journal/editor:

- Journal is tied to selected date
- Writing may feel secondary to schedule

Task list:

- Task rows can be grouped by scheduled, due, and unscheduled

Notes/Projects:

- Expandable but may feel less central

Color:

- Off-white/white with subtle event category colors

Typography:

- Calendar labels and time text need precise hierarchy

Density:

- Medium-high, especially in week view

Implementation difficulty:

- Medium-high. Calendar interactions and responsive behavior are harder.

Long-term extensibility:

- High for scheduling, medium for notes/projects.

## Visual Direction 4: Craft-Like Writing Studio

Summary:

MyPlan feels like a refined personal writing space. Journal and Notes receive
the strongest visual treatment, while tasks and calendar remain connected but
quiet.

Layout:

- Left sidebar
- Main canvas as a document/editor surface
- Right panel for date, backlinks, tasks, and project context

Sidebar:

- Document/workspace style
- Notes and Journal are prominent

Today:

- Today appears as a daily note
- Schedule and tasks are embedded into the writing flow

Calendar:

- Calendar is a supporting date picker and agenda surface
- Less dominant than in other directions

Journal/editor:

- Strongest editor experience
- Excellent for daily reflection and long-form notes

Task list:

- Tasks may feel embedded rather than operational

Notes/Projects:

- Very strong for knowledge and writing expansion

Color:

- Warm paper tones with charcoal text and a subtle green/teal accent

Typography:

- Editor-first hierarchy with comfortable body text

Density:

- Medium. More breathing room for writing.

Implementation difficulty:

- Medium. Editor polish matters, but MVP can stay simple.

Long-term extensibility:

- High for notes/journal, medium for task-heavy workflows.

## Visual Direction 5: Project Atlas Workspace

Summary:

MyPlan emphasizes long-running projects and linked records. Today is a command
center that shows active project context, related notes, deadlines, and tasks.

Layout:

- Left sidebar with project groups
- Main canvas shows Today plus active project lanes
- Right panel shows relations and backlinks

Sidebar:

- Projects are prominent
- Navigation can include pinned areas and saved views

Today:

- Today is organized by project context
- Good for users managing several long-term efforts

Calendar:

- Calendar appears as deadline and milestone context
- Less natural for everyday schedule-first users

Journal/editor:

- Journal can link to projects and notes
- Personal daily writing may feel secondary

Task list:

- Strong when grouped by project
- Less direct for pure day planning

Notes/Projects:

- Best direction for relation-heavy expansion

Color:

- Neutral base with slightly stronger accent colors for project identity

Typography:

- Needs strong hierarchy to avoid project clutter

Density:

- High, but risks becoming visually busy

Implementation difficulty:

- Medium-high. Relations, grouping, and project views add complexity.

Long-term extensibility:

- High, but only after the Today habit is established.

## Direction Comparison

| Criteria | 1. Quiet Daybook | 2. Linear Ledger | 3. Calendar Desk | 4. Writing Studio | 5. Project Atlas |
|---|---|---|---|---|---|
| Overall layout | Balanced Today workspace | Dense list/table shell | Schedule-first workspace | Editor-first workspace | Project-context workspace |
| Left sidebar | Calm workspace nav | Compact command nav | Calendar-forward nav | Document-style nav | Project-grouped nav |
| Today screen | Strongest balance | Efficient but utilitarian | Strong if schedule-heavy | Strong for writing | Strong for project context |
| Calendar | Clear supporting surface | Agenda/list oriented | Strongest calendar model | Supporting role | Milestone oriented |
| Journal/editor | Warm daily entry | Detail-panel style | Date-linked entry | Strongest writing feel | Project-linked writing |
| Task list | Calm, practical rows | Strongest task operations | Time/due grouped | Embedded tasks | Project grouped |
| Notes/Projects | Natural expansion | Database expansion | Secondary expansion | Strong notes | Strongest projects |
| Color | Warm neutral + muted teal | Neutral gray + blue-gray | Neutral + event colors | Warm paper + green | Neutral + project accents |
| Typography | Balanced UI/editor | Compact system style | Precise calendar hierarchy | Best body writing | Strong hierarchy needed |
| Screen density | High but calm | Very high | Medium-high | Medium | High |
| Implementation difficulty | Medium-low | Medium | Medium-high | Medium | Medium-high |
| Long-term expansion | High | High for structured data | High for scheduling | High for writing | High for relations |

## Selected Direction

Selected: **Visual Direction 1, Quiet Daybook Workspace**.

Reason:

This direction best matches MyPlan's central idea: Today as the daily hub that
connects calendar, tasks, journal, notes, and projects. It avoids generic
dashboard metaphors, preserves enough density for real daily use, supports
Korean UI, and is practical to implement with Next.js, Tailwind, shadcn/ui, and
mock data first.

It also leaves room for later improvements:

- Calendar can grow from a compact Today strip into full month/week/day views.
- Journal can evolve from quick entry into a richer editor.
- Tasks can gain filters, statuses, and project relations.
- Notes and Projects can expand through relation pills and linked records.
- Right context panel can later host sync, review, and AI slots without changing
  the core shell.

## Implementation-Facing Direction Rules

Direction 1 is the current implementation baseline. Apply these rules:

- Use a three-surface desktop shell: left sidebar, main Today canvas, right
  context panel.
- Make Today the default route and the strongest visual surface.
- Use warm neutral backgrounds with white editor/list surfaces.
- Use one restrained accent color, preferably muted teal.
- Represent daily work through lists, timelines, editor surfaces, relation
  pills, and compact grouped rows.
- Avoid KPI cards, analytics widgets, marketing sections, and decorative
  visuals.
- Treat Calendar, Journal, Tasks, Notes, and Projects as connected surfaces
  rather than independent dashboard modules.

## Open Design Prompt

Use this prompt once Open Design MCP is connected:

```text
Use open-design to generate 5 visual directions for MyPlan.

Artifact type:
- Desktop web app workspace shell
- Today-centered personal planning and record app

Product context:
- App name: MyPlan
- Korean-first UI
- Main concept: Today-centered personal operating system
- Core modules: Today, Calendar, Journal, Tasks, Notes, Projects, Search, Settings
- User workflow: plan the day, manage schedule, write daily records, track tasks,
  connect notes and projects

Design taste:
- Calm premium productivity workspace
- Inspired by Notion, Linear, Notion Calendar, Craft, Things
- Dense but readable
- Desktop-first at 1440px
- Not a generic admin dashboard
- Not a marketing landing page
- No AI purple gradient
- No toy-like icons
- No decorative emoji
- No large KPI card metaphor

Output:
- 5 distinct visual directions
- Each direction must include layout structure, sidebar style, main canvas style,
  right context panel style, Today composition, Calendar surface, Journal/editor
  surface, task list style, color palette, typography, strengths, weaknesses,
  expansion risk, implementation difficulty, and long-term extensibility.
```
