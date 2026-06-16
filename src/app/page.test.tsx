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

  it("reserves vertical sidebar titlebar space for Electron traffic lights", async () => {
    vi.stubGlobal("nodiaryDesktop", { sessionToken: "session-secret" });

    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByTestId("nodiary-sidebar")).toHaveClass("pt-[52px]")
    );
    expect(screen.getByTestId("nodiary-sidebar-drag-strip")).toHaveClass(
      "nodiary-window-drag"
    );
    expect(screen.getByTestId("nodiary-brand-row")).not.toHaveClass("pl-[104px]");
  });

  it("exposes native Electron drag regions without swallowing toolbar controls", () => {
    render(<HomePage />);

    const topbar = screen.getByTestId("nodiary-topbar");

    expect(topbar).toHaveClass("nodiary-window-drag");
    expect(within(topbar).getByRole("button", { name: "댓글" })).toHaveClass(
      "nodiary-window-no-drag"
    );
    expect(within(topbar).getByRole("button", { name: "공유" })).toHaveClass(
      "nodiary-window-no-drag"
    );
    expect(within(topbar).getByRole("button", { name: "설정 열기" })).toHaveClass(
      "nodiary-window-no-drag"
    );
  });

  it("keeps the complete monthly calendar visible in the left sidebar", () => {
    render(<HomePage />);

    const calendar = screen.getByRole("grid", { name: "2026년 6월" });
    const dayButtons = within(calendar).getAllByRole("button");

    expect(dayButtons).toHaveLength(35);
    expect(within(calendar).getByRole("button", { name: "2026-06-16 선택됨" }));
    expect(screen.getByText("제품 기획서 정리")).toBeInTheDocument();
  });

  it("keeps page tree titles aligned by rendering fixed chevron and drag slots", () => {
    render(<HomePage />);

    expect(screen.getByTestId("page-tree-chevron-slot-today")).toBeInTheDocument();
    expect(screen.getByTestId("page-tree-drag-slot-today")).toBeInTheDocument();
    expect(screen.getByTestId("page-tree-chevron-slot-meetings")).toBeInTheDocument();
    expect(screen.getByTestId("page-tree-drag-slot-meetings")).toBeInTheDocument();
    expect(screen.getByTestId("page-tree-title-today")).toHaveAttribute(
      "data-title-slot",
      "page-tree-title"
    );
    expect(screen.getByTestId("page-tree-title-meetings")).toHaveAttribute(
      "data-title-slot",
      "page-tree-title"
    );
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

  it("executes approved OpenAI calendar creation and removes it from the pending queue", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          plan: {
            summary: "내일 업체 미팅 일정을 추가합니다.",
            actions: [
              {
                toolName: "createCalendarEvent",
                argsJson: {
                  title: "업체 미팅",
                  start: "2026-06-17T14:00:00+09:00",
                  end: "2026-06-17T15:00:00+09:00"
                },
                diffJson: {
                  change: "create_calendar_event",
                  humanReadable: "캘린더에 2026-06-17 오후 2:00 업체 미팅을 추가합니다."
                },
                riskLevel: "high",
                undoJson: {
                  title: "업체 미팅"
                }
              }
            ],
            memories: []
          }
        })
      }))
    );

    render(<HomePage />);

    await user.type(
      await screen.findByLabelText("AI 명령 입력"),
      "내일 오후 2시에 업체 미팅 추가해줘"
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));
    await screen.findByText("일정 추가 제안");

    await user.click(screen.getByRole("button", { name: "승인" }));

    expect(screen.getByText("14:00")).toBeInTheDocument();
    expect(screen.getByText("업체 미팅")).toBeInTheDocument();
    expect(screen.queryByText("일정 추가 제안")).not.toBeInTheDocument();
    expect(screen.queryByText("승인됨")).not.toBeInTheDocument();
  });

  it("lets the AI operator drawer scroll when the window is short", () => {
    render(<HomePage />);

    return waitFor(() =>
      expect(screen.getByTestId("ai-operator-panel")).toHaveClass("overflow-y-auto")
    );
  });

  it("renders repeated AI diff lines without duplicate React key warnings", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          plan: {
            summary: "디자인 리뷰 일정을 승인 큐로 이동합니다.",
            actions: [
              {
                toolName: "updateCalendarEvent",
                argsJson: {
                  eventTitle: "디자인 리뷰",
                  date: "2026-06-18",
                  time: "16:30"
                },
                diffJson: {
                  target: "캘린더 이벤트: 디자인 리뷰",
                  changes: [
                    {
                      field: "시작 시간",
                      from: "기존 시작 시간",
                      to: "2026-06-18 16:30"
                    },
                    {
                      field: "종료 시간",
                      from: "기존 종료 시간",
                      to: "기존 소요시간 유지"
                    }
                  ]
                },
                riskLevel: "high",
                undoJson: {
                  eventTitle: "디자인 리뷰"
                }
              }
            ],
            memories: []
          }
        })
      }))
    );

    render(<HomePage />);

    await user.type(
      await screen.findByLabelText("AI 명령 입력"),
      "디자인 리뷰를 6월 18일 오후 4시 30분으로 옮겨줘"
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(await screen.findByText(/2026-06-18 16:30/)).toBeInTheDocument();
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("Encountered two children with the same key")
      )
    ).toBe(false);

    consoleError.mockRestore();
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
    expect(screen.queryByText("일정 이동 제안")).not.toBeInTheDocument();
    expect(screen.queryByText("높은 위험")).not.toBeInTheDocument();
  });

  it("lets todo text edit independently from completion state", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const todoText = screen.getByLabelText(
      "할 일 텍스트: OpenAI 키는 .env.local에 저장했고 화면에 노출하지 않는다."
    );
    const todoToggle = screen.getByRole("button", { name: "할 일 완료됨" });

    await user.click(todoText);

    expect(todoToggle).toHaveAttribute("aria-pressed", "true");
    expect(todoText).not.toHaveClass("line-through");

    await user.clear(todoText);
    await user.type(todoText, "OpenAI 연결은 실제 API 성공 후 승인 큐로 보여준다.");

    expect(todoToggle).toHaveAttribute("aria-pressed", "true");
    expect(todoText).toHaveValue("OpenAI 연결은 실제 API 성공 후 승인 큐로 보여준다.");

    await user.click(todoToggle);

    expect(todoToggle).toHaveAttribute("aria-pressed", "false");
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
    expect(screen.queryByText("높은 위험")).not.toBeInTheDocument();
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
    expect(workspace.style.getPropertyValue("--nodiary-logo-bg")).toBe("#f7f1e8");
    expect(workspace.style.getPropertyValue("--nodiary-logo-fg")).toBe("#24211d");
    expect(screen.getByTestId("nodiary-brand-mark")).toHaveClass(
      "bg-[var(--nodiary-logo-bg)]",
      "text-[var(--nodiary-logo-fg)]"
    );

    await user.click(closeButton);

    await waitFor(() => {
      expect(settingsButton).toHaveFocus();
    });
  });

  it("offers lavender, yellow, and navy workspace theme palettes", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getAllByRole("button", { name: "설정 열기" })[0]);

    expect(screen.getByRole("button", { name: "lavender" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "yellow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "navy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "navy" }));

    const workspace = screen.getByTestId("nodiary-workspace");

    expect(workspace).toHaveAttribute("data-theme", "navy");
    expect(workspace.style.getPropertyValue("--nodiary-app-bg")).toBe("#111827");
    expect(workspace.style.getPropertyValue("--nodiary-sidebar")).toBe("#172033");
    expect(workspace.style.getPropertyValue("--nodiary-logo-bg")).toBe("#eaf2ff");
    expect(workspace.style.getPropertyValue("--nodiary-logo-fg")).toBe("#172033");
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
