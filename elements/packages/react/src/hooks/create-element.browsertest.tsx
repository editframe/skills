import { EFPanZoom } from "@editframe/elements";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, test, expect, vi, afterEach } from "vitest";
import { createComponent } from "./create-element";

const PanZoom = createComponent({
  tagName: "ef-pan-zoom",
  elementClass: EFPanZoom,
  react: React,
  displayName: "PanZoom",
  events: {
    onTransformChanged: "transform-changed",
  },
});

describe("createComponent", () => {
  let container: HTMLElement;
  let root: Root;

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  test("element-specific camelCase props are set as properties, not leaked as DOM attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    root.render(<PanZoom autoFit={true} scale={2} />);

    const el = await vi.waitUntil(
      () => container.querySelector("ef-pan-zoom") as EFPanZoom | null,
      { timeout: 3000 },
    );

    // Property is set correctly via imperative path
    expect(el!.autoFit).toBe(true);
    expect(el!.scale).toBe(2);

    // camelCase prop must NOT appear as a lowercased junk attribute
    expect(el!.getAttribute("autofit")).toBeNull();
  });

  test("standard HTML attributes still pass through to the element", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    root.render(<PanZoom className="test-class" data-testid="pan-zoom" aria-label="pan zoom" />);

    const el = await vi.waitUntil(
      () => container.querySelector("ef-pan-zoom") as EFPanZoom | null,
      { timeout: 3000 },
    );

    expect(el!.getAttribute("class")).toBe("test-class");
    expect(el!.getAttribute("data-testid")).toBe("pan-zoom");
    expect(el!.getAttribute("aria-label")).toBe("pan zoom");
  });

  test("event props are not leaked as DOM attributes", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const handler = vi.fn();
    root.render(<PanZoom onTransformChanged={handler} />);

    const el = await vi.waitUntil(
      () => container.querySelector("ef-pan-zoom") as EFPanZoom | null,
      { timeout: 3000 },
    );

    expect(el!.getAttribute("ontransformchanged")).toBeNull();
  });
});
