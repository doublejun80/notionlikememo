import { render, screen, within } from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the Korean MyPlan workspace shell with Today as the center", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("navigation", { name: "워크스페이스" })
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", {
      name: "워크스페이스"
    });

    for (const label of [
      "오늘",
      "캘린더",
      "저널",
      "작업",
      "노트",
      "프로젝트",
      "검색",
      "설정"
    ]) {
      expect(within(navigation).getByText(label)).toBeInTheDocument();
    }

    expect(
      screen.getByRole("heading", { name: "오늘의 계획" })
    ).toBeInTheDocument();
    expect(screen.getByText("오늘 일정")).toBeInTheDocument();
    expect(screen.getByText("오늘 작업")).toBeInTheDocument();
    expect(screen.getByText("오늘 기록")).toBeInTheDocument();
    expect(screen.getByText("최근 노트")).toBeInTheDocument();
    expect(screen.getByText("진행 중인 프로젝트")).toBeInTheDocument();
  });

  it("opens mobile category navigation, new item dialog, and item details", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "카테고리 열기" }));
    expect(
      screen.getByRole("navigation", { name: "모바일 워크스페이스" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "새 항목" }));
    expect(screen.getByRole("dialog", { name: "새 항목 추가" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("제목"), "테스트 기록");
    await user.click(screen.getByRole("button", { name: "추가" }));
    expect(screen.getAllByText("테스트 기록").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "일정 상세: 주간 계획 정리" }));
    expect(screen.getAllByText("선택 항목").length).toBeGreaterThan(0);
    expect(screen.getAllByText("주간 계획 정리").length).toBeGreaterThan(1);
  });
});
