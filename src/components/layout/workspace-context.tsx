"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

export type DetailItem = {
  type: string;
  title: string;
  description?: string;
  meta?: string[];
};

type WorkspaceSettings = {
  title: string;
  subtitle: string;
};

type CreatedItem = {
  id: string;
  title: string;
  type: string;
};

type WorkspaceContextValue = {
  settings: WorkspaceSettings;
  updateSettings: (settings: WorkspaceSettings) => void;
  activeDetail: DetailItem;
  inspectItem: (detail: DetailItem) => void;
  isNewItemOpen: boolean;
  openNewItem: () => void;
  closeNewItem: () => void;
  createItem: (item: Omit<CreatedItem, "id">) => void;
  createdItems: CreatedItem[];
};

const defaultSettings: WorkspaceSettings = {
  title: "MyPlan",
  subtitle: "개인 작업공간"
};

const defaultDetail: DetailItem = {
  type: "안내",
  title: "선택 항목",
  description: "일정, 작업, 노트, 프로젝트를 누르면 이곳에서 세부 내용을 확인합니다.",
  meta: ["mock data", "상세 미리보기"]
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }

    const saved = window.localStorage.getItem("myplan.workspace-settings");

    if (!saved) {
      return defaultSettings;
    }

    try {
      const parsed = JSON.parse(saved) as WorkspaceSettings;

      return {
        title: parsed.title?.trim() || defaultSettings.title,
        subtitle: parsed.subtitle?.trim() || defaultSettings.subtitle
      };
    } catch {
      window.localStorage.removeItem("myplan.workspace-settings");
      return defaultSettings;
    }
  });
  const [activeDetail, setActiveDetail] = useState(defaultDetail);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([]);

  const updateSettings = useCallback((nextSettings: WorkspaceSettings) => {
    const cleanSettings = {
      title: nextSettings.title.trim() || defaultSettings.title,
      subtitle: nextSettings.subtitle.trim() || defaultSettings.subtitle
    };

    setSettings(cleanSettings);
    window.localStorage.setItem(
      "myplan.workspace-settings",
      JSON.stringify(cleanSettings)
    );
  }, []);

  const inspectItem = useCallback((detail: DetailItem) => {
    setActiveDetail(detail);
  }, []);

  const createItem = useCallback(
    (item: Omit<CreatedItem, "id">) => {
      const createdItem = {
        ...item,
        id: `created-${Date.now()}`
      };

      setCreatedItems((items) => [createdItem, ...items]);
      setActiveDetail({
        type: item.type,
        title: item.title,
        description: "방금 추가된 mock 항목입니다. 실제 저장은 DB 연결 단계에서 붙입니다.",
        meta: ["방금 추가됨", "로컬 미리보기"]
      });
      setIsNewItemOpen(false);
    },
    []
  );

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      activeDetail,
      inspectItem,
      isNewItemOpen,
      openNewItem: () => setIsNewItemOpen(true),
      closeNewItem: () => setIsNewItemOpen(false),
      createItem,
      createdItems
    }),
    [
      settings,
      updateSettings,
      activeDetail,
      inspectItem,
      isNewItemOpen,
      createItem,
      createdItems
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
