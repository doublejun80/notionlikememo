import { render, screen } from "@testing-library/react";
import React from "react";

import SettingsPage from "./page";

describe("SettingsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("uses the Nodiary product shell instead of the old MyPlan settings shell", () => {
    render(<SettingsPage />);

    expect(screen.getByText("NODIARY")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "오늘의 계획" })).toBeInTheDocument();
    expect(screen.queryByLabelText("앱 이름")).not.toBeInTheDocument();
  });
});
