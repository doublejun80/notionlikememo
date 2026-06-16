import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("desktop packaging workflow", () => {
  it("defines a GitHub Actions matrix for macOS and Windows Electron builds", () => {
    const workflowPath = join(
      process.cwd(),
      ".github",
      "workflows",
      "package.yml"
    );

    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("macos-latest");
    expect(workflow).toContain("windows-latest");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run electron:pack");
  });

  it("uses the Nodiary surface color for the macOS Electron titlebar", () => {
    const electronMainPath = join(process.cwd(), "electron", "main.cjs");
    const electronMain = readFileSync(electronMainPath, "utf8");

    expect(electronMain).toContain('titleBarStyle: "hiddenInset"');
    expect(electronMain).toContain('backgroundColor: "#f4f2ee"');
    expect(electronMain).toContain("trafficLightPosition");
  });
});
