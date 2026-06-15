import { render, screen, within } from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";

import HomePage from "./page";

describe("HomePage", () => {
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

    render(<HomePage />);

    await user.type(
      screen.getByLabelText("AI 명령 입력"),
      "이 페이지를 실행 계획으로 정리해줘."
    );
    await user.click(screen.getByRole("button", { name: "AI에게 보내기" }));

    expect(screen.getByText("승인 대기")).toBeInTheDocument();
    expect(screen.getByText("+ AI 실행 계획 callout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "승인" }));
    expect(screen.getByText(/AI가 제안한 실행 계획/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(screen.queryByText(/AI가 제안한 실행 계획/)).not.toBeInTheDocument();
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
