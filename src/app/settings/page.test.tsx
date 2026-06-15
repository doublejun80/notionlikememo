import { render, screen } from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";

import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("updates the workspace title and subtitle from settings", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    const titleInput = screen.getByLabelText("앱 이름");
    const subtitleInput = screen.getByLabelText("작업공간 부제");

    await user.clear(titleInput);
    await user.type(titleInput, "My Daily Plan");
    await user.clear(subtitleInput);
    await user.type(subtitleInput, "매일 쓰는 기록장");
    await user.click(screen.getByRole("button", { name: "설정 저장" }));

    expect(screen.getByText("My Daily Plan")).toBeInTheDocument();
    expect(screen.getByText("매일 쓰는 기록장")).toBeInTheDocument();
    expect(screen.getByText("설정이 저장되었습니다.")).toBeInTheDocument();
  });
});
