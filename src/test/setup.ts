import "@testing-library/jest-dom/vitest";

(globalThis as { __NODIARY_TODAY_ISO_DATE__?: string }).__NODIARY_TODAY_ISO_DATE__ =
  "2026-06-16";
