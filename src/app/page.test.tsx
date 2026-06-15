import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";

import HomePage from "./page";

describe("HomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Nodiary as a document-first workspace instead of a project dashboard", () => {
    render(<HomePage />);

    expect(screen.getByText("NODIARY")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "페이지 트리" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "오늘의 계획" })).toBeInTheDocument();
    expect(screen.getByText("상태")).toBeInTheDocument();
    expect(screen.getByText("진행중")).toBeInTheDocument();
    expect(screen.getByText("오늘 해야 할 것")).toBeInTheDocument();
    expect(screen.getAllByText("AI 글쓰기").length).toBeGreaterThan(0);
    expect(screen.queryByText("진행 중인 프로젝트")).not.toBeInTheDocument();
  });

  it("keeps the complete monthly calendar visible in the left sidebar", () => {
    render(<HomePage />);

    const calendar = screen.getByRole("grid", { name: "2026년 6월" });
    const dayButtons = within(calendar).getAllByRole("button");

    expect(dayButtons).toHaveLength(35);
    expect(within(calendar).getByRole("button", { name: "2026-06-15 선택됨" }));
    expect(screen.getByText("제품 기획서 정리")).toBeInTheDocument();
  });

  it("opens slash menu and inserts a view-switchable project database block", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "slash 메뉴 열기" }));
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));

    expect(screen.getByText("고쳐야 할 50개 리스트")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "고쳐야 할 50개 리스트 테이블" }));

    await user.click(screen.getByRole("tab", { name: "보드" }));
    expect(screen.getByText("검토")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "캘린더" }));
    expect(screen.getByText("2026-06-20")).toBeInTheDocument();
  });

  it("uses the AI operator panel for approval-gated changes and undo", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          plan: {
            summary: "문서를 승인 가능한 실행 계획으로 정리합니다.",
            actions: [
              {
                toolName: "updateBlock",
                argsJson: {
                  blockId: "memo-body",
                  text: "AI가 승인 후 반영한 문장"
                },
                diffJson: {
                  before: "Notion-like의 첫인상",
                  after: "AI가 승인 후 반영한 문장"
                },
                riskLevel: "medium",
                undoJson: {
                  blockId: "memo-body"
                }
              }
            ],
            memories: ["OpenAI operator 응답을 승인 큐로 바꾼다."]
          }
        })
      }))
    );

    render(<HomePage />);

    await user.type(
      screen.getByLabelText("AI 명령 입력"),
      "이 페이지를 실행 계획으로 정리해줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/operator",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByText("승인 대기")).toBeInTheDocument();
    expect(
      await screen.findByText(/AI가 승인 후 반영한 문장/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "승인" }));
    expect(getDocumentBlock("메모 본문")).toHaveTextContent(
      "AI가 승인 후 반영한 문장"
    );

    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(getDocumentBlock("메모 본문")).toHaveTextContent("Notion-like의 첫인상");
  });

  it("falls back to a local approval queue when the AI operator route fails", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "missing_openai_key" })
      }))
    );

    render(<HomePage />);

    await user.type(
      screen.getByLabelText("AI 명령 입력"),
      "이 페이지를 실행 계획으로 정리해줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(await screen.findByText("+ AI 실행 계획 callout")).toBeInTheDocument();
  });

  it("moves blocks, page nodes, database rows, and calendar events through drag drop", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    fireEvent.dragStart(screen.getByLabelText("블록 드래그: 메모 본문"), {
      dataTransfer: dataTransferStub()
    });
    fireEvent.drop(screen.getByLabelText("블록 드롭 위치: 오늘 해야 할 것"), {
      dataTransfer: dataTransferStub("memo-body")
    });

    const documentBlocks = screen.getAllByTestId("document-block");
    expect(documentBlocks[0]).toHaveTextContent("Notion-like의 첫인상");

    fireEvent.dragStart(screen.getByLabelText("페이지 드래그: 고쳐야 할 50개"), {
      dataTransfer: dataTransferStub()
    });
    fireEvent.drop(screen.getByLabelText("페이지 드롭 위치: 오늘의 계획"), {
      dataTransfer: dataTransferStub("fix-list")
    });

    const todayTreeItem = screen.getByLabelText("페이지 드롭 위치: 오늘의 계획");
    expect(todayTreeItem.parentElement).toHaveTextContent("고쳐야 할 50개");

    await user.click(screen.getByRole("button", { name: "slash 메뉴 열기" }));
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));
    await user.click(screen.getByRole("tab", { name: "보드" }));

    fireEvent.dragStart(screen.getByLabelText("DB 행 드래그: 캘린더 충돌 처리 정책 정리"), {
      dataTransfer: dataTransferStub()
    });
    fireEvent.drop(screen.getByLabelText("DB 상태 드롭: 진행"), {
      dataTransfer: dataTransferStub("row-3")
    });

    const doingColumn = screen.getByLabelText("DB 상태 드롭: 진행");
    expect(doingColumn).toHaveTextContent("캘린더 충돌 처리 정책 정리");

    fireEvent.dragStart(screen.getByLabelText("일정 드래그: 디자인 리뷰"), {
      dataTransfer: dataTransferStub()
    });
    fireEvent.drop(screen.getByLabelText("2026-06-18"), {
      dataTransfer: dataTransferStub("schedule-2")
    });

    expect(screen.getByText("16:30")).toBeInTheDocument();
    expect(screen.getByText("high risk")).toBeInTheDocument();
  });

  it("opens settings and updates personalization controls", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getAllByRole("button", { name: "설정 열기" })[0]);
    expect(screen.getByRole("dialog", { name: "개인화 설정" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "조밀하게" }));
    await user.click(screen.getByRole("button", { name: "AI 패널 닫힘" }));

    expect(screen.getByText("density: compact")).toBeInTheDocument();
    expect(screen.getByText("right panel: closed")).toBeInTheDocument();
  });
});

function dataTransferStub(initialValue = "") {
  let value = initialValue;

  return {
    getData: () => value,
    setData: (_key: string, nextValue: string) => {
      value = nextValue;
    }
  };
}

function getDocumentBlock(label: string) {
  return screen.getAllByTestId("document-block").find((block) =>
    block.getAttribute("aria-label")?.includes(label)
  ) as HTMLElement;
}
