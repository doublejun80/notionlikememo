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
    const desktopPngIconPath = join(process.cwd(), "build", "icon.png");
    const layoutPath = join(process.cwd(), "src", "app", "layout.tsx");

    expect(existsSync(faviconPath)).toBe(true);
    expect(existsSync(desktopPngIconPath)).toBe(true);

    if (!existsSync(faviconPath) || !existsSync(desktopPngIconPath)) {
      return;
    }

    const favicon = readFileSync(faviconPath, "utf8");
    const desktopIcon = readFileSync(desktopIconPath, "utf8");
    const desktopPngIcon = readFileSync(desktopPngIconPath);
    const layout = readFileSync(layoutPath, "utf8");

    expect(favicon).toContain(topLayerNotebookPenPath);
    expect(desktopIcon).toContain(topLayerNotebookPenPath);
    expect(desktopIcon).toContain('viewBox="0 0 1024 1024"');
    expect(desktopIcon).toContain('x="100"');
    expect(desktopIcon).toContain('y="100"');
    expect(desktopIcon).toContain('width="824"');
    expect(desktopIcon).toContain('height="824"');
    expect(desktopIcon).toContain('macosIconShadow');
    expect(desktopIcon).toContain('feGaussianBlur');
    expect(desktopIcon).toContain(
      '<rect x="100" y="100" width="824" height="824" rx="180" fill="url(#nodiaryIconSurface)"/>'
    );
    expect(desktopPngIcon.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
    expect(favicon).toContain('stop-color="#302c26"');
    expect(favicon).toContain('stop-color="#1f1d1a"');
    expect(favicon).toContain('stroke="#fbfaf7"');
    expect(layout).toContain("icons:");
    expect(layout).toContain('/icon.svg');
  });

  it("sets the Nodiary runtime icon and app name for Electron dev launches", () => {
    const electronMainPath = join(process.cwd(), "electron", "main.cjs");
    const electronMain = readFileSync(electronMainPath, "utf8");

    expect(electronMain).toContain("nativeImage");
    expect(electronMain).toContain('app.setName("Nodiary")');
    expect(electronMain).toContain("configureAppIcon()");
    expect(electronMain).toContain("app.dock.setIcon");
    expect(electronMain).toContain("icon: resolveRuntimeIconPath()");
  });

  it("launches the macOS dev server with a named Nodiary app bundle", () => {
    const devScriptPath = join(process.cwd(), "scripts", "dev-electron.mjs");
    const devScript = readFileSync(devScriptPath, "utf8");

    expect(devScript).toContain("Nodiary.app");
    expect(devScript).toContain("CFBundleDisplayName");
    expect(devScript).toContain("CFBundleExecutable");
    expect(devScript).toContain("CFBundleName");
    expect(devScript).toContain("CFBundleIconFile");
    expect(devScript).toContain("Nodiary Helper");
    expect(devScript).toContain('build", "icon.icns"');
    expect(devScript).toContain("electronExecutablePath");
  });
});
