import { afterEach, describe, expect, test } from "vitest";
import { vitePluginEditframe } from "./index.js";

describe("vitePluginEditframe define injection", () => {
  const plugin = vitePluginEditframe({ root: "/tmp", cacheRoot: "/tmp" });

  afterEach(() => {
    delete process.env.EF_NO_TELEMETRY;
  });

  test("config hook returns __EF_DEFAULT_API_HOST__ define in serve mode", () => {
    const result = (plugin as any).config({}, { command: "serve" });
    expect(result).toBeDefined();
    expect(result.define).toBeDefined();
    expect(result.define["__EF_DEFAULT_API_HOST__"]).toBeDefined();
  });

  test("config hook does not inject __EF_DEFAULT_API_HOST__ in build mode", () => {
    const result = (plugin as any).config({}, { command: "build" });
    const defined = result?.define?.["__EF_DEFAULT_API_HOST__"];
    expect(defined).toBeUndefined();
  });

  test("configResolved patches __EF_DEFAULT_API_HOST__ with actual resolved port", () => {
    const mockConfig: any = {
      define: {},
      server: { port: 9999 },
    };
    (plugin as any).configResolved(mockConfig);
    expect(mockConfig.define["__EF_DEFAULT_API_HOST__"]).toBe(
      JSON.stringify("http://localhost:9999"),
    );
  });

  test("__EF_TELEMETRY_ENABLED__ is true in serve mode by default", () => {
    const result = (plugin as any).config({}, { command: "serve" });
    expect(result.define["__EF_TELEMETRY_ENABLED__"]).toBe(JSON.stringify(true));
  });

  test("__EF_TELEMETRY_ENABLED__ is false in serve mode when EF_NO_TELEMETRY is set", () => {
    for (const value of ["1", "true", "yes", "anything"]) {
      process.env.EF_NO_TELEMETRY = value;
      const result = (plugin as any).config({}, { command: "serve" });
      expect(
        result.define["__EF_TELEMETRY_ENABLED__"],
        `expected false when EF_NO_TELEMETRY="${value}"`,
      ).toBe(JSON.stringify(false));
    }
  });

  test("__EF_TELEMETRY_ENABLED__ is not injected in build mode", () => {
    const result = (plugin as any).config({}, { command: "build" });
    expect(result?.define?.["__EF_TELEMETRY_ENABLED__"]).toBeUndefined();
  });
});
