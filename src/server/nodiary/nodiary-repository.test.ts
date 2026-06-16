import { describe, expect, it, vi } from "vitest";

import { defaultNodiaryState } from "@/features/nodiary/nodiary-model";

import { loadNodiaryState, saveNodiaryState } from "./nodiary-repository";

type RepositoryClientForTest = NonNullable<Parameters<typeof saveNodiaryState>[1]>;

describe("nodiary repository", () => {
  it("persists the document workspace through Prisma repository calls", async () => {
    const client = {
      workspace: {
        upsert: vi.fn()
      },
      page: {
        upsert: vi.fn()
      },
      block: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      aiMemory: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      appPreference: {
        upsert: vi.fn()
      }
    };

    await saveNodiaryState(
      defaultNodiaryState(),
      client as unknown as RepositoryClientForTest
    );

    expect(client.workspace.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "nodiary-local" },
        create: expect.objectContaining({
          title: "Nodiary"
        })
      })
    );
    expect(client.block.deleteMany).toHaveBeenCalledWith({
      where: { pageId: "today" }
    });
    expect(client.block.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: "memo-body",
            type: "PARAGRAPH",
            contentJson: expect.objectContaining({
              text: expect.stringContaining("Notion-like")
            })
          })
        ])
      })
    );
    expect(client.appPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          rightPanelDefault: "open"
        })
      })
    );
  });

  it("wraps destructive block replacement in a Prisma transaction when available", async () => {
    const txClient = {
      workspace: { upsert: vi.fn() },
      page: { upsert: vi.fn() },
      block: { deleteMany: vi.fn(), createMany: vi.fn() },
      aiMemory: { deleteMany: vi.fn(), createMany: vi.fn() },
      appPreference: { upsert: vi.fn() }
    };
    const client = {
      ...txClient,
      $transaction: vi.fn(async (callback) => callback(txClient))
    };

    await saveNodiaryState(
      defaultNodiaryState(),
      client as unknown as RepositoryClientForTest
    );

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(txClient.block.deleteMany).toHaveBeenCalledWith({
      where: { pageId: "today" }
    });
    expect(txClient.block.createMany).toHaveBeenCalled();
  });

  it("hydrates Nodiary state from Prisma records with default fallbacks", async () => {
    const client = {
      workspace: {
        findUnique: vi.fn(async () => ({
          id: "nodiary-local",
          title: "Nodiary",
          subtitle: "DB backed"
        }))
      },
      page: {
        findMany: vi.fn(async () => [
          {
            id: "today",
            parentId: null,
            title: "오늘의 계획",
            sortOrder: 0
          },
          {
            id: "child-note",
            parentId: "today",
            title: "하위 노트",
            sortOrder: 0
          }
        ])
      },
      block: {
        findMany: vi.fn(async () => [
          {
            id: "memo-body",
            type: "PARAGRAPH",
            contentJson: {
              text: "DB에서 온 메모"
            },
            checked: false,
            sortOrder: 0
          }
        ])
      },
      aiMemory: {
        findMany: vi.fn(async () => [
          {
            id: "memory-db",
            content: "DB 메모리를 불러온다.",
            source: "repository",
            confidence: 0.9
          }
        ])
      },
      appPreference: {
        findFirst: vi.fn(async () => ({
          theme: "light",
          accent: "blue",
          density: "compact",
          editorWidth: "wide",
          rightPanelDefault: "closed",
          restoreLastPage: true,
          aiApprovalPolicy: "strict"
        }))
      }
    };

    const state = await loadNodiaryState(client as unknown as RepositoryClientForTest);

    expect(state.workspace.subtitle).toBe("DB backed");
    expect(state.pageTree[0]?.children?.[0]?.title).toBe("하위 노트");
    expect(state.activePage.blocks[0]).toMatchObject({
      id: "memo-body",
      type: "paragraph",
      text: "DB에서 온 메모"
    });
    expect(state.ai.memories[0]).toMatchObject({
      id: "memory-db",
      content: "DB 메모리를 불러온다."
    });
    expect(state.preferences).toMatchObject({
      theme: "light",
      accent: "blue",
      density: "compact",
      documentWidth: "wide",
      rightAiPanel: "closed",
      approvalStrictness: "strict"
    });
  });

  it("loads blocks for the selected fallback page instead of hard-coding today", async () => {
    const client = {
      workspace: {
        findUnique: vi.fn(async () => ({
          id: "nodiary-local",
          title: "Nodiary",
          subtitle: "DB backed"
        }))
      },
      page: {
        findMany: vi.fn(async () => [
          {
            id: "first-db-page",
            parentId: null,
            title: "DB 첫 페이지",
            sortOrder: 0
          }
        ])
      },
      block: {
        findMany: vi.fn(async () => [
          {
            id: "first-page-block",
            type: "PARAGRAPH",
            contentJson: { text: "선택된 페이지의 블록" },
            checked: false,
            sortOrder: 0
          }
        ])
      },
      aiMemory: { findMany: vi.fn(async () => []) },
      appPreference: { findFirst: vi.fn(async () => null) }
    };

    const state = await loadNodiaryState(client as unknown as RepositoryClientForTest);

    expect(client.block.findMany).toHaveBeenCalledWith({
      where: { pageId: "first-db-page" },
      orderBy: { sortOrder: "asc" }
    });
    expect(state.activePage).toMatchObject({
      id: "first-db-page",
      title: "DB 첫 페이지"
    });
    expect(state.activePage.blocks[0]).toMatchObject({
      id: "first-page-block",
      text: "선택된 페이지의 블록"
    });
  });
});
