import { type FC, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, test, assert } from "vitest";
import { useRenderData } from "./useRenderData.js";

afterEach(() => {
  document.body.innerHTML = "";
  delete (window as any).EF_RENDER_DATA;
});

describe("useRenderData", () => {
  test("returns undefined when no render data is present", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let captured: unknown = "not-set";

    const Component: FC = () => {
      const data = useRenderData();
      useEffect(() => {
        captured = data;
      });
      return null;
    };

    const root = createRoot(container);
    root.render(<Component />);
    await new Promise((r) => setTimeout(r, 20));

    assert.isUndefined(captured);

    root.unmount();
    container.remove();
  });

  test("reads data from window.EF_RENDER_DATA", async () => {
    (window as any).EF_RENDER_DATA = { userName: "Alice", theme: "dark" };

    const container = document.createElement("div");
    document.body.appendChild(container);

    let captured: unknown;

    const Component: FC = () => {
      const data = useRenderData<{ userName: string; theme: string }>();
      useEffect(() => {
        captured = data;
      });
      return null;
    };

    const root = createRoot(container);
    root.render(<Component />);
    await new Promise((r) => setTimeout(r, 20));

    assert.deepEqual(captured, { userName: "Alice", theme: "dark" });

    root.unmount();
    container.remove();
  });

  test("returns a stable reference across re-renders", async () => {
    (window as any).EF_RENDER_DATA = { id: 42 };

    const container = document.createElement("div");
    document.body.appendChild(container);

    const captured: unknown[] = [];

    const Component: FC<{ tick: number }> = ({ tick: _tick }) => {
      const data = useRenderData();
      useEffect(() => {
        captured.push(data);
      });
      return null;
    };

    const root = createRoot(container);
    root.render(<Component tick={0} />);
    await new Promise((r) => setTimeout(r, 20));
    root.render(<Component tick={1} />);
    await new Promise((r) => setTimeout(r, 20));
    root.render(<Component tick={2} />);
    await new Promise((r) => setTimeout(r, 20));

    assert.isAtLeast(captured.length, 2);
    for (const val of captured) {
      assert.strictEqual(val, captured[0], "reference should be stable");
    }

    root.unmount();
    container.remove();
  });

  test("accepts a generic type parameter", async () => {
    interface RenderPayload {
      videoId: string;
      startMs: number;
    }

    (window as any).EF_RENDER_DATA = { videoId: "abc123", startMs: 5000 };

    const container = document.createElement("div");
    document.body.appendChild(container);

    let captured: RenderPayload | undefined;

    const Component: FC = () => {
      const data = useRenderData<RenderPayload>();
      useEffect(() => {
        captured = data;
      });
      return null;
    };

    const root = createRoot(container);
    root.render(<Component />);
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(captured?.videoId, "abc123");
    assert.equal(captured?.startMs, 5000);

    root.unmount();
    container.remove();
  });
});
