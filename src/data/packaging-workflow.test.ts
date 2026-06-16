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

  it("uses the top-layer NotebookPen mark for the favicon and app icon", () => {
    const topLayerNotebookPenPath =
      "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4";
    const faviconPath = join(process.cwd(), "src", "app", "icon.svg");
    const desktopIconPath = join(process.cwd(), "build", "icon.svg");
    const layoutPath = join(process.cwd(), "src", "app", "layout.tsx");

    expect(existsSync(faviconPath)).toBe(true);

    if (!existsSync(faviconPath)) {
      return;
    }

    const favicon = readFileSync(faviconPath, "utf8");
    const desktopIcon = readFileSync(desktopIconPath, "utf8");
    const layout = readFileSync(layoutPath, "utf8");

    expect(favicon).toContain(topLayerNotebookPenPath);
    expect(desktopIcon).toContain(topLayerNotebookPenPath);
    expect(favicon).toContain('fill="#24211d"');
    expect(favicon).toContain('stroke="#fbfaf7"');
    expect(layout).toContain("icons:");
    expect(layout).toContain('/icon.svg');
  });
});
