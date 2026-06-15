import { prisma } from "@/server/db";
import {
  defaultNodiaryState,
  type AppPreference,
  type DatabaseBlock,
  type NodiaryBlock,
  type NodiaryState,
  type PageNode
} from "@/features/nodiary/nodiary-model";

export const NODIARY_WORKSPACE_ID = "nodiary-local";
const PREFERENCE_ID = "nodiary-local-preferences";

type RepositoryClient = {
  workspace: {
    findUnique?: (args: unknown) => Promise<WorkspaceRecord | null>;
    upsert?: (args: unknown) => Promise<unknown>;
  };
  page: {
    findMany?: (args: unknown) => Promise<PageRecord[]>;
    upsert?: (args: unknown) => Promise<unknown>;
  };
  block: {
    findMany?: (args: unknown) => Promise<BlockRecord[]>;
    deleteMany?: (args: unknown) => Promise<unknown>;
    createMany?: (args: unknown) => Promise<unknown>;
  };
  aiMemory: {
    findMany?: (args: unknown) => Promise<AiMemoryRecord[]>;
    deleteMany?: (args: unknown) => Promise<unknown>;
    createMany?: (args: unknown) => Promise<unknown>;
  };
  appPreference: {
    findFirst?: (args: unknown) => Promise<PreferenceRecord | null>;
    upsert?: (args: unknown) => Promise<unknown>;
  };
};

type WorkspaceRecord = {
  id: string;
  title: string;
  subtitle: string;
};

type PageRecord = {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
};

type BlockRecord = {
  id: string;
  type: string;
  contentJson: unknown;
  checked?: boolean;
  sortOrder: number;
};

type AiMemoryRecord = {
  id: string;
  content: string;
  source: string;
  confidence: number;
};

type PreferenceRecord = {
  theme: string;
  accent: string;
  density: string;
  editorWidth: string;
  rightPanelDefault: string;
  restoreLastPage: boolean;
  aiApprovalPolicy: string;
};

export async function loadNodiaryState(
  client: RepositoryClient = prisma as unknown as RepositoryClient,
  workspaceId = NODIARY_WORKSPACE_ID
): Promise<NodiaryState> {
  const base = defaultNodiaryState();
  const [workspace, pages, blocks, memories, preferences] = await Promise.all([
    client.workspace.findUnique?.({
      where: { id: workspaceId }
    }),
    client.page.findMany?.({
      where: { workspaceId, archived: false },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }]
    }),
    client.block.findMany?.({
      where: { pageId: base.activePage.id },
      orderBy: { sortOrder: "asc" }
    }),
    client.aiMemory.findMany?.({
      where: { workspaceId, archivedAt: null },
      orderBy: { updatedAt: "desc" }
    }),
    client.appPreference.findFirst?.({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  if (!workspace) {
    return base;
  }

  const activePage = pages?.find((page) => page.id === base.activePage.id) ?? pages?.[0];

  return {
    ...base,
    workspace: {
      name: workspace.title,
      subtitle: workspace.subtitle
    },
    pageTree: pages?.length ? buildPageTree(pages) : base.pageTree,
    activePage: {
      ...base.activePage,
      id: activePage?.id ?? base.activePage.id,
      title: activePage?.title ?? base.activePage.title,
      blocks: blocks?.length ? blocks.map(deserializeBlock) : base.activePage.blocks
    },
    ai: {
      ...base.ai,
      memories: memories?.length
        ? memories.map((memory) => ({
            id: memory.id,
            content: memory.content,
            source: memory.source,
            confidence: memory.confidence
          }))
        : base.ai.memories
    },
    preferences: preferences
      ? deserializePreferences(preferences, base.preferences)
      : base.preferences
  };
}

export async function saveNodiaryState(
  state: NodiaryState,
  client: RepositoryClient = prisma as unknown as RepositoryClient,
  workspaceId = NODIARY_WORKSPACE_ID
) {
  await client.workspace.upsert?.({
    where: { id: workspaceId },
    update: {
      title: state.workspace.name,
      subtitle: state.workspace.subtitle
    },
    create: {
      id: workspaceId,
      title: state.workspace.name,
      subtitle: state.workspace.subtitle,
      locale: "ko-KR",
      timezone: "Asia/Seoul"
    }
  });

  await client.page.upsert?.({
    where: { id: state.activePage.id },
    update: {
      title: state.activePage.title,
      sortOrder: 0
    },
    create: {
      id: state.activePage.id,
      workspaceId,
      parentId: null,
      title: state.activePage.title,
      sortOrder: 0
    }
  });

  await client.block.deleteMany?.({
    where: { pageId: state.activePage.id }
  });
  await client.block.createMany?.({
    data: state.activePage.blocks.map((block, index) => ({
      id: block.id,
      pageId: state.activePage.id,
      parentBlockId: null,
      type: serializeBlockType(block.type),
      contentJson: serializeBlockContent(block),
      metadataJson: block.database ? { databaseId: block.database.id } : null,
      checked: Boolean(block.checked),
      sortOrder: index
    }))
  });

  await client.aiMemory.deleteMany?.({
    where: { workspaceId }
  });
  await client.aiMemory.createMany?.({
    data: state.ai.memories.map((memory) => ({
      id: memory.id,
      workspaceId,
      type: "long-term",
      content: memory.content,
      source: memory.source,
      confidence: memory.confidence
    }))
  });

  await client.appPreference.upsert?.({
    where: { id: PREFERENCE_ID },
    update: serializePreferences(state.preferences),
    create: {
      id: PREFERENCE_ID,
      workspaceId,
      ...serializePreferences(state.preferences)
    }
  });
}

function serializeBlockContent(block: NodiaryBlock) {
  return {
    title: block.title ?? null,
    text: block.text ?? null,
    database: block.database ?? null
  };
}

function deserializeBlock(record: BlockRecord): NodiaryBlock {
  const content = asRecord(record.contentJson);
  const database = content.database as DatabaseBlock | null | undefined;

  return {
    id: record.id,
    type: deserializeBlockType(record.type),
    title: readString(content.title),
    text: readString(content.text),
    checked: Boolean(record.checked),
    database: database ?? undefined
  };
}

function serializeBlockType(type: NodiaryBlock["type"]) {
  const map: Record<NodiaryBlock["type"], string> = {
    paragraph: "PARAGRAPH",
    heading: "HEADING",
    todo: "TODO",
    callout: "CALLOUT",
    divider: "DIVIDER",
    database: "DATABASE",
    ai: "AI_REQUEST"
  };

  return map[type];
}

function deserializeBlockType(type: string): NodiaryBlock["type"] {
  const map: Record<string, NodiaryBlock["type"]> = {
    PARAGRAPH: "paragraph",
    HEADING: "heading",
    TODO: "todo",
    CALLOUT: "callout",
    DIVIDER: "divider",
    DATABASE: "database",
    AI_REQUEST: "ai"
  };

  return map[type] ?? "paragraph";
}

function buildPageTree(pages: PageRecord[]): PageNode[] {
  const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);
  const byParent = new Map<string | null, PageRecord[]>();

  for (const page of sortedPages) {
    const siblings = byParent.get(page.parentId) ?? [];
    siblings.push(page);
    byParent.set(page.parentId, siblings);
  }

  function build(parentId: string | null): PageNode[] {
    return (byParent.get(parentId) ?? []).map((page) => {
      const children = build(page.id);

      return {
        id: page.id,
        title: page.title,
        expanded: children.length > 0,
        children: children.length ? children : undefined
      };
    });
  }

  return build(null);
}

function serializePreferences(preferences: AppPreference) {
  return {
    theme: preferences.theme,
    accent: preferences.accent,
    density: preferences.density,
    editorWidth: preferences.documentWidth,
    rightPanelDefault: preferences.rightAiPanel,
    restoreLastPage: preferences.startupPage === "last",
    aiApprovalPolicy: preferences.approvalStrictness
  };
}

function deserializePreferences(
  record: PreferenceRecord,
  fallback: AppPreference
): AppPreference {
  return {
    theme: oneOf(record.theme, ["system", "light", "dark"], fallback.theme),
    accent: oneOf(record.accent, ["teal", "slate", "blue"], fallback.accent),
    density: oneOf(
      record.density,
      ["comfortable", "compact"],
      fallback.density
    ),
    documentWidth: oneOf(
      record.editorWidth,
      ["standard", "wide"],
      fallback.documentWidth
    ),
    rightAiPanel: oneOf(
      record.rightPanelDefault,
      ["open", "closed"],
      fallback.rightAiPanel
    ),
    startupPage: record.restoreLastPage ? "last" : "today",
    approvalStrictness: oneOf(
      record.aiApprovalPolicy,
      ["balanced", "strict"],
      fallback.approvalStrictness
    )
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function oneOf<const T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
