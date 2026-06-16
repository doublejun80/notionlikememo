import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React, { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";

import { defaultNodiaryState } from "@/features/nodiary/nodiary-model";

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
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
    expect(within(calendar).getByRole("button", { name: "2026-06-16 선택됨" }));
    expect(screen.getByText("제품 기획서 정리")).toBeInTheDocument();
  });

  it("opens slash menu and inserts a view-switchable project database block", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByLabelText("빈 블록 입력"));
    await user.keyboard("/");
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));

    expect(screen.getByText("고쳐야 할 50개 리스트")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "고쳐야 할 50개 리스트 테이블" }));

    await user.click(screen.getByRole("tab", { name: "보드" }));
    expect(screen.getByText("검토")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "캘린더" }));
    const databaseCalendar = screen.getByRole("grid", {
      name: "고쳐야 할 50개 리스트 캘린더"
    });
    expect(databaseCalendar).toBeInTheDocument();
    expect(within(databaseCalendar).getByText("20")).toBeInTheDocument();
  });

  it("hydrates the workspace from the app API and saves preference changes back", async () => {
    const user = userEvent.setup();
    const serverState = defaultNodiaryState();
    const hydratedState = {
      ...serverState,
      activePage: {
        ...serverState.activePage,
        title: "서버에서 온 오늘 문서"
      },
      pages: {
        ...serverState.pages,
        [serverState.activePage.id]: {
          ...serverState.activePage,
          title: "서버에서 온 오늘 문서"
        }
      }
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        if (String(input) === "/api/nodiary/workspace" && !init) {
          return {
            ok: true,
            json: async () => ({ state: hydratedState })
          };
        }

        return {
          ok: true,
          json: async () => ({ ok: true })
        };
      })
    );

    render(<HomePage />);

    expect(
      await screen.findByRole("heading", { name: "서버에서 온 오늘 문서" })
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "설정 열기" })[0]);
    await user.click(screen.getByRole("button", { name: "조밀하게" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/nodiary/workspace",
        expect.objectContaining({
          method: "PUT"
        })
      );
    });
  });

  it("keeps the initial AI panel closed on narrow screens after API hydrate", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "(min-width: 1280px)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        if (String(input) === "/api/nodiary/workspace" && !init) {
          return {
            ok: true,
            json: async () => ({ state: defaultNodiaryState() })
          };
        }

        return {
          ok: true,
          json: async () => ({ ok: true })
        };
      })
    );

    render(<HomePage />);

    expect(screen.queryByLabelText("AI 명령 입력")).not.toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "오늘의 계획" })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByLabelText("AI 명령 입력")).not.toBeInTheDocument();
    });
  });

  it("does not read stored workspace state during the first hydrated render", async () => {
    const storedState = defaultNodiaryState();
    const storedTitle = "저장된 로컬 문서";
    const realWindow = window;

    window.localStorage.setItem(
      "nodiary.workspace.v2",
      JSON.stringify({
        ...storedState,
        activePage: {
          ...storedState.activePage,
          title: storedTitle
        },
        pages: {
          ...storedState.pages,
          [storedState.activePage.id]: {
            ...storedState.activePage,
            title: storedTitle
          }
        }
      })
    );

    vi.stubGlobal("window", undefined);
    const html = renderToString(<HomePage />);
    vi.stubGlobal("window", realWindow);
    document.body.innerHTML = `<div id="hydrate-root">${html}</div>`;

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.getElementById("hydrate-root");

    expect(container).not.toBeNull();

    let root: ReturnType<typeof hydrateRoot> | undefined;

    await act(async () => {
      root = hydrateRoot(container as HTMLElement, <HomePage />);
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    const errorOutput = consoleError.mock.calls
      .map((call) => call.map(String).join(" "))
      .join("\n");

    root?.unmount();
    consoleError.mockRestore();

    expect(errorOutput).not.toContain("A tree hydrated");
  });

  it("lets the AI operator toggle live context scopes before sending", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const selectedBlockScope = await screen.findByRole("button", {
      name: "선택 블록 컨텍스트 포함"
    });

    expect(selectedBlockScope).toHaveAttribute("aria-pressed", "true");

    await user.click(selectedBlockScope);
    expect(selectedBlockScope).toHaveAttribute("aria-pressed", "false");

    await user.click(selectedBlockScope);
    expect(selectedBlockScope).toHaveAttribute("aria-pressed", "true");
  });

  it("adds and edits database rows from the inserted database block", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByLabelText("빈 블록 입력"));
    await user.keyboard("/");
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));

    await user.click(screen.getByRole("button", { name: "새 행 추가" }));

    const titleInput = await screen.findByLabelText("DB 행 제목: 새 작업");
    expect(titleInput).toBeInTheDocument();

    await user.clear(titleInput);
    await user.type(titleInput, "하네스 수정 확인");

    expect(titleInput).toHaveValue("하네스 수정 확인");
  });

  it("filters, sorts, and edits database field schema from the database block", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByLabelText("빈 블록 입력"));
    await user.keyboard("/");
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));

    await user.selectOptions(screen.getByLabelText("DB 필터 상태"), "doing");

    expect(screen.getByText("문서-first 첫 화면 구현")).toBeInTheDocument();
    expect(screen.queryByText("AI 승인 큐와 undo log 연결")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("DB 필터 상태"), "all");
    await user.selectOptions(screen.getByLabelText("DB 정렬 필드"), "date");
    await user.selectOptions(screen.getByLabelText("DB 정렬 방향"), "desc");

    const table = screen.getByRole("table", { name: "고쳐야 할 50개 리스트 테이블" });
    const rows = within(table).getAllByRole("row");

    expect(rows[1]).toHaveTextContent("패키징/CI 체크리스트");

    await user.click(screen.getByRole("button", { name: "필드 편집" }));
    await user.clear(screen.getByLabelText("필드 이름: 작업"));
    await user.type(screen.getByLabelText("필드 이름: 작업"), "할 일");

    expect(screen.getByRole("columnheader", { name: "할 일" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("필드 유형: 담당"), "text");
    expect(screen.getByLabelText("필드 유형: 담당")).toHaveValue("text");
  });

  it("navigates the sidebar month calendar without clipping the grid", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "다음 달" }));

    const july = screen.getByRole("grid", { name: "2026년 7월" });

    expect(within(july).getAllByRole("button")).toHaveLength(35);
    expect(within(july).getByRole("button", { name: "2026-07-01 선택됨" }));

    await user.click(screen.getByRole("button", { name: "이전 달" }));

    const june = screen.getByRole("grid", { name: "2026년 6월" });

    expect(within(june).getAllByRole("button")).toHaveLength(35);
    expect(within(june).getByRole("button", { name: "2026-06-01 선택됨" }));
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
      await screen.findByLabelText("AI 명령 입력"),
      "이 페이지를 실행 계획으로 정리해줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/operator",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getAllByText("승인 대기").length).toBeGreaterThan(0);
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
      await screen.findByLabelText("AI 명령 입력"),
      "이 페이지를 실행 계획으로 정리해줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(
      await screen.findByText("OpenAI 연결에 실패해 로컬 초안으로 승인 큐를 만들었습니다.")
    ).toBeInTheDocument();
    expect(await screen.findByText("+ AI 실행 계획 callout")).toBeInTheDocument();
  });

  it("turns local AI calendar move fallback into an approval proposal", async () => {
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
      await screen.findByLabelText("AI 명령 입력"),
      "디자인 리뷰 일정을 2026-06-18 16:30로 옮겨줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(await screen.findByText("일정 이동 제안")).toBeInTheDocument();
    expect(
      await screen.findByText(/디자인 리뷰 일정을 2026-06-18 16:30/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "승인" }));

    expect(screen.getByText("16:30")).toBeInTheDocument();
    expect(screen.getByText("높은 위험")).toBeInTheDocument();
  });

  it("saves quick capture items visibly in the sidebar inbox trail", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "QUICK CAPTURE" }));
    await user.type(screen.getByPlaceholderText("떠오른 생각을 Inbox로"), "빠른 생각");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Inbox에 빠른 메모를 저장했습니다.")).toBeInTheDocument();
    expect(screen.getByText("빠른 생각")).toBeInTheDocument();
  });

  it("moves blocks, page nodes, database rows, and calendar events through drag drop", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const blockTransfer = dataTransferStub();
    fireEvent.dragStart(screen.getByLabelText("블록 드래그: 메모 본문"), {
      dataTransfer: blockTransfer
    });
    fireEvent.drop(screen.getByLabelText("블록 드롭 위치: 오늘 해야 할 것"), {
      dataTransfer: blockTransfer
    });

    const documentBlocks = screen.getAllByTestId("document-block");
    expect(documentBlocks[0]).toHaveTextContent("Notion-like의 첫인상");

    const pageTransfer = dataTransferStub();
    fireEvent.dragStart(screen.getByLabelText("페이지 드래그: 고쳐야 할 50개"), {
      dataTransfer: pageTransfer
    });
    fireEvent.drop(screen.getByLabelText("페이지 드롭 위치: 오늘의 계획"), {
      dataTransfer: pageTransfer
    });

    const todayTreeItem = screen.getByLabelText("페이지 드롭 위치: 오늘의 계획");
    expect(todayTreeItem.parentElement).toHaveTextContent("고쳐야 할 50개");

    await user.click(screen.getByLabelText("빈 블록 입력"));
    await user.keyboard("/");
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));
    await user.click(screen.getAllByRole("tab", { name: "보드" }).at(-1)!);

    const rowTransfer = dataTransferStub();
    fireEvent.dragStart(screen.getByLabelText("DB 행 드래그: 캘린더 충돌 처리 정책 정리"), {
      dataTransfer: rowTransfer
    });
    fireEvent.drop(screen.getByLabelText("DB 상태 드롭: 진행"), {
      dataTransfer: rowTransfer
    });

    const doingColumn = screen.getByLabelText("DB 상태 드롭: 진행");
    expect(doingColumn).toHaveTextContent("캘린더 충돌 처리 정책 정리");

    const calendarTransfer = dataTransferStub();
    fireEvent.dragStart(screen.getByLabelText("일정 드래그: 디자인 리뷰"), {
      dataTransfer: calendarTransfer
    });
    fireEvent.drop(screen.getByLabelText("2026-06-18"), {
      dataTransfer: calendarTransfer
    });

    expect(screen.getByText(/디자인 리뷰 일정을/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "승인" }));

    expect(screen.getByText("16:30")).toBeInTheDocument();
    expect(screen.getByText("높은 위험")).toBeInTheDocument();
  });

  it("offers keyboard fallbacks for block drag and database row movement", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const blockHandle = screen.getByLabelText("블록 드래그: 메모 본문");

    blockHandle.focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

    expect(screen.getAllByTestId("document-block")[5]).toHaveTextContent(
      "Notion-like의 첫인상"
    );

    const pageHandle = screen.getByLabelText("페이지 드래그: 고쳐야 할 50개");

    pageHandle.focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");

    const planningTree = screen.getByLabelText("페이지 드롭 위치: 기획 노트");
    const planningText = planningTree.textContent ?? "";

    expect(planningText.indexOf("고쳐야 할 50개")).toBeLessThan(
      planningText.indexOf("NOTION-LIKE 기준")
    );

    await user.click(screen.getByLabelText("빈 블록 입력"));
    await user.keyboard("/");
    await user.click(screen.getByRole("menuitem", { name: "데이터베이스 추가" }));
    await user.click(screen.getAllByRole("tab", { name: "보드" }).at(-1)!);

    const boardCard = screen.getByLabelText("DB 행 드래그: 캘린더 충돌 처리 정책 정리");

    boardCard.focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

    expect(screen.getByLabelText("DB 상태 드롭: 진행")).toHaveTextContent(
      "캘린더 충돌 처리 정책 정리"
    );

    await user.click(screen.getAllByRole("tab", { name: "캘린더" }).at(-1)!);

    const calendarCard = screen.getByLabelText("DB 행 드래그: 패키징/CI 체크리스트");

    calendarCard.focus();
    await user.keyboard("{Alt>}{ArrowLeft}{/Alt}");

    expect(screen.getByRole("gridcell", { name: "2026-06-19" })).toHaveTextContent(
      "패키징/CI 체크리스트"
    );
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

  it("traps settings modal focus, restores focus, and applies dark theme tokens", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const settingsButton = screen.getAllByRole("button", { name: "설정 열기" })[0];

    await user.click(settingsButton);

    const dialog = screen.getByRole("dialog", { name: "개인화 설정" });
    const closeButton = screen.getByRole("button", { name: "설정 닫기" });

    expect(closeButton).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.click(screen.getByRole("button", { name: "dark" }));

    const workspace = screen.getByTestId("nodiary-workspace");

    expect(workspace).toHaveAttribute("data-theme", "dark");
    expect(workspace.style.getPropertyValue("--nodiary-canvas")).toBe("#211f1c");
    expect(workspace.style.getPropertyValue("--nodiary-text-strong")).toBe("#f7f1e8");
    expect(workspace.style.getPropertyValue("--nodiary-hover")).toBe("#34302a");
    expect(workspace.style.getPropertyValue("--nodiary-selected")).toBe("#3a352e");

    await user.click(closeButton);

    await waitFor(() => {
      expect(settingsButton).toHaveFocus();
    });
  });
});

function dataTransferStub() {
  const values = new Map<string, string>();

  return {
    getData: (key: string) => values.get(key) ?? "",
    setData: (key: string, nextValue: string) => {
      values.set(key, nextValue);
    }
  };
}

function getDocumentBlock(label: string) {
  return screen.getAllByTestId("document-block").find((block) =>
    block.getAttribute("aria-label")?.includes(label)
  ) as HTMLElement;
}
