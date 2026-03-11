import { describe, expect, test } from "vitest";

import { version } from "./version.js";

declare const __EF_VERSION__: string;

describe("version", () => {
  test("__EF_VERSION__ is defined at build time", () => {
    expect(__EF_VERSION__).toBeDefined();
    expect(typeof __EF_VERSION__).toBe("string");
    expect(__EF_VERSION__.length).toBeGreaterThan(0);
  });

  test("version export matches __EF_VERSION__", () => {
    expect(version).toBe(__EF_VERSION__);
  });

  test("version is stamped on window.__EF_VERSION__", () => {
    expect((window as any).__EF_VERSION__).toBe(__EF_VERSION__);
  });
});
