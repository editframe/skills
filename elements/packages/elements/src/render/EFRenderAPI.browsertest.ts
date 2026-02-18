/**
 * Browser test for EFRenderAPI (window.EF_RENDER).
 *
 * Tests programmatic rendering via Playwright-style API with:
 * - Streaming render with custom data injection
 * - Buffer render
 * - Render info extraction
 */

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../elements/EFTimegroup.js";
import "../elements/EFImage.js";
import "../gui/EFConfiguration.js";
import "../gui/EFWorkbench.js";
import "../render/EFRenderAPI.js";
import { getRenderData } from "./getRenderData.js";

beforeAll(async () => {
  await customElements.whenDefined("ef-timegroup");
  await customElements.whenDefined("ef-image");
  await customElements.whenDefined("ef-configuration");
  await customElements.whenDefined("ef-workbench");
});

beforeEach(() => {
  localStorage.clear();
  // Clear window APIs
  if (typeof window !== "undefined") {
    delete (window as any).EF_RENDER_DATA;
    delete (window as any).onRenderChunk;
    delete (window as any).onRenderProgress;
  }
});

describe("EFRenderAPI", () => {
  it("should expose window.EF_RENDER API", () => {
    expect(window.EF_RENDER).toBeDefined();
    expect(window.EF_RENDER?.isReady).toBeDefined();
    expect(window.EF_RENDER?.render).toBeDefined();
    expect(window.EF_RENDER?.renderStreaming).toBeDefined();
    expect(window.EF_RENDER?.getRenderInfo).toBeDefined();
  });

  it("should return false for isReady when no timegroup exists", () => {
    // Clear any existing timegroups
    document.body.innerHTML = "";
    expect(window.EF_RENDER?.isReady()).toBe(false);
  });

  it("should return true for isReady when timegroup exists", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="1s" style="width: 100px; height: 100px; background: red;">
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const wb = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await wb.updateComplete;

    expect(window.EF_RENDER?.isReady()).toBe(true);
  });

  it("should render to buffer", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="0.1s" style="width: 100px; height: 100px; background: blue;">
            <ef-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='red'/%3E%3C/svg%3E" style="width: 100px; height: 100px;"></ef-image>
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const wb = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await wb.updateComplete;
    await tg.waitForMediaDurations();

    const buffer = await window.EF_RENDER!.render({
      fps: 30,
      scale: 0.5,
      includeAudio: false,
      returnBuffer: true,
    });

    expect(buffer).toBeDefined();
    expect(buffer!.length).toBeGreaterThan(0);
    expect(buffer instanceof Uint8Array).toBe(true);
  });

  it("should stream render chunks via window.onRenderChunk", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="0.1s" style="width: 100px; height: 100px; background: green;">
            <ef-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='yellow'/%3E%3C/svg%3E" style="width: 100px; height: 100px;"></ef-image>
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const wb = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await wb.updateComplete;
    await tg.waitForMediaDurations();

    const chunks: unknown[] = [];
    let chunkCount = 0;

    // Set up chunk handler (simulating Playwright exposeFunction)
    window.onRenderChunk = (chunk: Uint8Array) => {
      chunks.push(chunk);
      chunkCount++;
    };

    await window.EF_RENDER!.renderStreaming({
      fps: 30,
      scale: 0.5,
      includeAudio: false,
    });

    // Should have received at least one chunk
    expect(chunkCount).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);

    // Chunks are StreamTargetChunk objects: { type: 'write', data: Uint8Array, position: number }
    for (const chunk of chunks) {
      const c = chunk as {
        type: string;
        data: { byteLength: number };
        position: number;
      };
      expect(c.type).toBe("write");
      expect(c.data.byteLength).toBeGreaterThan(0);
      expect(typeof c.position).toBe("number");
    }
  });

  it("should throw error when renderStreaming called without onRenderChunk", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="0.1s" style="width: 100px; height: 100px;">
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const wb = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await wb.updateComplete;

    // Clear onRenderChunk
    delete (window as any).onRenderChunk;

    await expect(
      window.EF_RENDER!.renderStreaming({
        fps: 30,
        includeAudio: false,
      }),
    ).rejects.toThrow("window.onRenderChunk is not set");
  });

  it("should get render info", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="2s" style="width: 200px; height: 150px;">
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const wb = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await wb.updateComplete;

    const info = await window.EF_RENDER!.getRenderInfo();

    expect(info.width).toBe(200);
    expect(info.height).toBe(150);
    expect(info.durationMs).toBe(2000);
    expect(info.fps).toBe(30);
    expect(info.assets).toBeDefined();
  });

  it("should hide workbench UI during render", async () => {
    document.body.innerHTML = `
      <ef-configuration media-engine="local">
        <ef-workbench>
          <ef-timegroup mode="fixed" duration="0.1s" style="width: 100px; height: 100px;">
          </ef-timegroup>
        </ef-workbench>
      </ef-configuration>
    `;

    const tg = document.querySelector("ef-timegroup") as any;
    const workbench = document.querySelector("ef-workbench") as any;
    await tg.updateComplete;
    await workbench.updateComplete;
    expect(workbench.rendering).toBe(false);

    window.onRenderChunk = () => {};

    await window.EF_RENDER!.renderStreaming({
      fps: 30,
      includeAudio: false,
    });

    // After render, rendering should be false again
    expect(workbench.rendering).toBe(false);
  });
});

describe("getRenderData", () => {
  it("should return undefined when no data is set", () => {
    delete (window as any).EF_RENDER_DATA;
    const data = getRenderData();
    expect(data).toBeUndefined();
  });

  it("should return runtime data from window.EF_RENDER_DATA", () => {
    const testData = { userName: "John", theme: "dark" };
    window.EF_RENDER_DATA = testData;

    const data = getRenderData<typeof testData>();
    expect(data).toEqual(testData);
    expect(data?.userName).toBe("John");
    expect(data?.theme).toBe("dark");
  });

  it("should prioritize runtime data over build-time data", () => {
    // Simulate build-time data (would be set via Vite define)
    (globalThis as any).RENDER_DATA = { userName: "BuildTime", theme: "light" };

    // Set runtime data
    window.EF_RENDER_DATA = { userName: "Runtime", theme: "dark" };

    const data = getRenderData<{ userName: string; theme: string }>();
    expect(data?.userName).toBe("Runtime"); // Runtime should win
    expect(data?.theme).toBe("dark");

    // Cleanup
    delete (window as any).EF_RENDER_DATA;
    delete (globalThis as any).RENDER_DATA;
  });
});
