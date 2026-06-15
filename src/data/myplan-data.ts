export type EventItem = {
  id: string;
  title: string;
  time: string;
  duration: string;
  location?: string;
  projectId?: string;
  tone: "accent" | "neutral" | "warning";
};

export type TaskItem = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  due: string;
  priority: "낮음" | "보통" | "높음";
  projectId?: string;
  noteId?: string;
};

export type NoteItem = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  tags: string[];
  projectId?: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  status: "계획" | "진행" | "정리";
  summary: string;
  nextStep: string;
  progress: number;
};

export type JournalEntry = {
  date: string;
  prompt: string;
  draft: string;
  mood: string;
};

export const myplanData = {
  today: {
    dateLabel: "2026년 6월 15일 월요일",
    headline: "오늘의 계획",
    focus: "조용히 정리하고, 꼭 필요한 일부터 끝내기",
    weather: "흐림 24도",
    dayPhase: "오전 작업 블록"
  },
  events: [
    {
      id: "evt-1",
      title: "주간 계획 정리",
      time: "09:30",
      duration: "30분",
      location: "작업실",
      projectId: "proj-myplan",
      tone: "accent"
    },
    {
      id: "evt-2",
      title: "제품 방향 검토",
      time: "11:00",
      duration: "45분",
      projectId: "proj-myplan",
      tone: "neutral"
    },
    {
      id: "evt-3",
      title: "개인 기록 백업",
      time: "16:00",
      duration: "20분",
      tone: "warning"
    },
    {
      id: "evt-4",
      title: "하루 마감 리뷰",
      time: "21:30",
      duration: "15분",
      tone: "neutral"
    }
  ] satisfies EventItem[],
  tasks: [
    {
      id: "task-1",
      title: "MyPlan Today 화면 초안 확인",
      status: "doing",
      due: "오늘",
      priority: "높음",
      projectId: "proj-myplan"
    },
    {
      id: "task-2",
      title: "캘린더 주간 보기 기준 정리",
      status: "todo",
      due: "오늘",
      priority: "보통",
      projectId: "proj-myplan",
      noteId: "note-calendar"
    },
    {
      id: "task-3",
      title: "저널 질문 세트 3개 고르기",
      status: "todo",
      due: "오늘",
      priority: "보통",
      noteId: "note-journal"
    },
    {
      id: "task-4",
      title: "오래된 임시 메모 정리",
      status: "todo",
      due: "이번 주",
      priority: "낮음",
      projectId: "proj-archive"
    },
    {
      id: "task-5",
      title: "로컬 백업 폴더 규칙 작성",
      status: "done",
      due: "어제",
      priority: "보통",
      projectId: "proj-life"
    }
  ] satisfies TaskItem[],
  journal: {
    date: "2026-06-15",
    prompt: "오늘 가장 먼저 정리해야 할 것은 무엇인가?",
    draft:
      "Today 화면은 단순한 대시보드가 아니라 하루의 문맥을 여는 곳이어야 한다. 일정, 작업, 기록이 한 화면에서 자연스럽게 이어져야 한다.",
    mood: "차분함"
  } satisfies JournalEntry,
  notes: [
    {
      id: "note-calendar",
      title: "Calendar 표현 원칙",
      excerpt: "일정은 색보다 시간 구조가 먼저 보이게 한다. 이벤트는 얇고 조용하게.",
      updatedAt: "오늘 10:15",
      tags: ["calendar", "design"],
      projectId: "proj-myplan"
    },
    {
      id: "note-journal",
      title: "저널 질문 후보",
      excerpt: "오늘의 초점, 남긴 기록, 내일로 넘길 일, 마음 상태를 짧게 묻는다.",
      updatedAt: "오늘 08:40",
      tags: ["journal", "writing"]
    },
    {
      id: "note-task",
      title: "작업 목록 밀도",
      excerpt: "체크박스, 제목, 마감, 연결 프로젝트만 우선 표시한다.",
      updatedAt: "어제",
      tags: ["task", "density"],
      projectId: "proj-myplan"
    },
    {
      id: "note-backup",
      title: "개인 데이터 백업 메모",
      excerpt: "초기에는 SQLite 파일 백업과 export 경로만 고려한다.",
      updatedAt: "월요일",
      tags: ["data", "local-first"],
      projectId: "proj-life"
    }
  ] satisfies NoteItem[],
  projects: [
    {
      id: "proj-myplan",
      name: "MyPlan MVP",
      status: "진행",
      summary: "Today 중심 개인 생산성/기록 앱 초안",
      nextStep: "화면 밀도와 정보 구조 검토",
      progress: 36
    },
    {
      id: "proj-life",
      name: "개인 기록 정리",
      status: "계획",
      summary: "노트, 저널, 백업 규칙을 하나로 정리",
      nextStep: "최근 노트 분류 기준 만들기",
      progress: 18
    },
    {
      id: "proj-archive",
      name: "메모 아카이브",
      status: "정리",
      summary: "흩어진 임시 메모를 검색 가능한 구조로 이동",
      nextStep: "중복 태그 정리",
      progress: 62
    }
  ] satisfies ProjectItem[],
  inbox: [
    "저녁에 내일 첫 작업 하나만 정하기",
    "노트 템플릿 이름을 짧게 줄이기",
    "Projects 화면에서 task 연결 방식 확인"
  ],
  weekDays: [
    { label: "월", date: "15", items: 4, active: true },
    { label: "화", date: "16", items: 2, active: false },
    { label: "수", date: "17", items: 3, active: false },
    { label: "목", date: "18", items: 1, active: false },
    { label: "금", date: "19", items: 2, active: false },
    { label: "토", date: "20", items: 0, active: false },
    { label: "일", date: "21", items: 1, active: false }
  ]
};

export function getProjectName(projectId?: string) {
  if (!projectId) {
    return undefined;
  }

  return myplanData.projects.find((project) => project.id === projectId)?.name;
}

