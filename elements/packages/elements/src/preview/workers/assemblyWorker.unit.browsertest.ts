import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getAssemblyWorkerUrl } from "./assemblyWorkerInline.js";

function waitForWorkerMessage(worker: Worker, timeout: number = 5000): Promise<MessageEvent> {
  return new Promise<MessageEvent>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for worker message after ${timeout}ms`));
    }, timeout);

    const handler = (event: MessageEvent) => {
      clearTimeout(timer);
      worker.removeEventListener("message", handler);
      resolve(event);
    };

    worker.addEventListener("message", handler);
  });
}

describe("assemblyWorker", () => {
  let worker: Worker;

  beforeEach(() => {
    const url = getAssemblyWorkerUrl();
    worker = new Worker(url, { type: "module" });
  });

  afterEach(() => {
    worker?.terminate();
  });

  test("sends startup message on load", async () => {
    const event = await waitForWorkerMessage(worker, 1000);
    expect(event.data).toBe("assemblyWorker-loaded");
  });

  test("assembles SVG data URI from parts", async () => {
    await waitForWorkerMessage(worker, 1000);

    const parts = [
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:100px;height:100px;">',
      "<p>Hello</p>",
      "</div>",
    ];

    worker.postMessage({
      taskId: "test-1",
      parts,
      outputWidth: 100,
      outputHeight: 100,
    });

    const response = await waitForWorkerMessage(worker, 5000);
    expect(response.data.taskId).toBe("test-1");
    expect(response.data.error).toBeUndefined();
    expect(response.data.buffer).toBeInstanceOf(ArrayBuffer);

    const dataUri = new TextDecoder().decode(response.data.buffer);
    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

    // Decode and verify SVG structure
    const base64 = dataUri.replace("data:image/svg+xml;base64,", "");
    const svg = atob(base64);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<foreignObject");
    expect(svg).toContain("<p>Hello</p>");
  });

  test("returns result via ArrayBuffer transfer (zero-copy)", async () => {
    await waitForWorkerMessage(worker, 1000);

    worker.postMessage({
      taskId: "transfer-test",
      parts: ["<div>test</div>"],
      outputWidth: 50,
      outputHeight: 50,
    });

    const response = await waitForWorkerMessage(worker, 5000);
    const buffer = response.data.buffer as ArrayBuffer;

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const decoded = new TextDecoder().decode(buffer);
    expect(decoded).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  test("handles large parts arrays", async () => {
    await waitForWorkerMessage(worker, 1000);

    const parts: string[] = ['<div xmlns="http://www.w3.org/1999/xhtml">'];
    for (let i = 0; i < 500; i++) {
      parts.push(`<span style="color:red;">Item ${i}</span>`);
    }
    parts.push("</div>");

    worker.postMessage({
      taskId: "large-test",
      parts,
      outputWidth: 1920,
      outputHeight: 1080,
    });

    const response = await waitForWorkerMessage(worker, 10000);
    expect(response.data.taskId).toBe("large-test");
    expect(response.data.error).toBeUndefined();

    const dataUri = new TextDecoder().decode(response.data.buffer);
    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  test("SVG data URI loads as valid image", async () => {
    await waitForWorkerMessage(worker, 1000);

    const parts = [
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:200px;height:100px;background:red;">',
      "<p>Visible</p>",
      "</div>",
    ];

    worker.postMessage({
      taskId: "img-test",
      parts,
      outputWidth: 200,
      outputHeight: 100,
    });

    const response = await waitForWorkerMessage(worker, 5000);
    const dataUri = new TextDecoder().decode(response.data.buffer);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUri;
    });

    expect(img.width).toBe(200);
    expect(img.height).toBe(100);
  });

  test("handles sequential requests with correct taskId routing", async () => {
    await waitForWorkerMessage(worker, 1000);

    for (let i = 0; i < 3; i++) {
      const taskId = `seq-${i}`;
      worker.postMessage({
        taskId,
        parts: [`<div>Frame ${i}</div>`],
        outputWidth: 100,
        outputHeight: 100,
      });

      const response = await waitForWorkerMessage(worker, 5000);
      expect(response.data.taskId).toBe(taskId);
      expect(response.data.error).toBeUndefined();
    }
  });

  test("handles empty parts array", async () => {
    await waitForWorkerMessage(worker, 1000);

    worker.postMessage({
      taskId: "empty-test",
      parts: [],
      outputWidth: 100,
      outputHeight: 100,
    });

    const response = await waitForWorkerMessage(worker, 5000);
    expect(response.data.taskId).toBe("empty-test");

    const dataUri = new TextDecoder().decode(response.data.buffer);
    expect(dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

    const svg = atob(dataUri.replace("data:image/svg+xml;base64,", ""));
    expect(svg).toContain("<foreignObject");
  });
});
