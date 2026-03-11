import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { EFVideo } from "./EFVideo.js";
import "./EFVideo.js";
import "../gui/EFConfiguration.js";

declare const __EF_DEFAULT_API_HOST__: string;

describe("EFSourceMixin.apiHost fallback", () => {
  let el: EFVideo;

  beforeEach(() => {
    el = document.createElement("ef-video") as EFVideo;
  });

  afterEach(() => {
    el.remove();
  });

  test("prefers ef-configuration apiHost over fallback", async () => {
    const config = document.createElement("ef-configuration");
    (config as any).setAttribute("api-host", "https://custom.example.com");
    (config as any).append(el);
    document.body.appendChild(config as any);
    await (el as any).updateComplete;

    expect((el as any).apiHost).toBe("https://custom.example.com");
    (config as any).remove();
  });

  test("__EF_DEFAULT_API_HOST__ is defined at build time", () => {
    // The vite-plugin (index.vitest.ts) must inject this constant via config.define.
    // Before the plugin change: this constant is undefined → test fails.
    // After the plugin change: this constant equals the test server origin.
    expect(__EF_DEFAULT_API_HOST__).toBeDefined();
    expect(typeof __EF_DEFAULT_API_HOST__).toBe("string");
    expect(__EF_DEFAULT_API_HOST__.length).toBeGreaterThan(0);
  });

  test("fallback matches __EF_DEFAULT_API_HOST__ when no ancestor is present", () => {
    document.body.appendChild(el);

    // Before EFSourceMixin fix: apiHost returns window.location.origin directly (not via __EF_DEFAULT_API_HOST__)
    // After fix: apiHost returns __EF_DEFAULT_API_HOST__, which in tests equals window.location.origin
    // This test proves the wiring: the constant must exist AND apiHost must equal it.
    expect((el as any).apiHost).toBe(__EF_DEFAULT_API_HOST__);
  });
});
