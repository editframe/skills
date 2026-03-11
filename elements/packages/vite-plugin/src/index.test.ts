import { describe, expect, test } from "vitest";
import { vitePluginEditframe } from "./index.js";

describe("vitePluginEditframe define injection", () => {
  const plugin = vitePluginEditframe({ root: "/tmp", cacheRoot: "/tmp" });

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
});
