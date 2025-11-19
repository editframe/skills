import React from "react";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { OverlayUpdateLoop } from "./OverlayUpdateLoop";
import type { MotionDesignerState } from "~/lib/motion-designer/types";

function createState(overrides: Partial<MotionDesignerState> = {}): MotionDesignerState {
  return {
    composition: {
      elements: {
        "element-1": {
          id: "element-1",
          type: "div",
          props: { position: { x: 100, y: 200 } },
          animations: [],
          childIds: [],
        },
        "element-2": {
          id: "element-2",
          type: "div",
          props: { position: { x: 300, y: 400 } },
          animations: [{ id: "anim-1", property: "opacity", fromValue: "0", toValue: "1", duration: 1000, delay: 0, easing: "linear", fillMode: "both", name: "Fade" }],
          childIds: [],
        },
      },
      rootTimegroupIds: ["element-1", "element-2"],
    },
    ui: {
      selectedElementId: null,
      selectedAnimationId: null,
      selectedElementAnimationId: null,
      activeRootTimegroupId: null,
      currentTime: 0,
      placementMode: null,
      canvasTransform: { x: 0, y: 0, scale: 1 },
      ...overrides.ui,
    },
    ...overrides,
  };
}

describe("OverlayUpdateLoop", () => {
  let mockOverlayLayer: HTMLElement;
  let mockElement1: HTMLElement;
  let mockElement2: HTMLElement;

  beforeEach(() => {
    // Create mock overlay layer
    mockOverlayLayer = document.createElement("div");
    mockOverlayLayer.setAttribute("data-overlay-layer", "true");
    mockOverlayLayer.style.position = "absolute";
    mockOverlayLayer.style.left = "0px";
    mockOverlayLayer.style.top = "0px";
    document.body.appendChild(mockOverlayLayer);

    // Create mock content elements
    mockElement1 = document.createElement("div");
    mockElement1.setAttribute("data-element-id", "element-1");
    mockElement1.style.position = "absolute";
    mockElement1.style.left = "100px";
    mockElement1.style.top = "200px";
    mockElement1.style.width = "300px";
    mockElement1.style.height = "400px";
    document.body.appendChild(mockElement1);

    mockElement2 = document.createElement("div");
    mockElement2.setAttribute("data-element-id", "element-2");
    mockElement2.style.position = "absolute";
    mockElement2.style.left = "300px";
    mockElement2.style.top = "400px";
    mockElement2.style.width = "200px";
    mockElement2.style.height = "300px";
    document.body.appendChild(mockElement2);

    // Create mock overlay elements
    const overlay1 = document.createElement("div");
    overlay1.setAttribute("data-overlay-id", "element-1");
    mockOverlayLayer.appendChild(overlay1);

    const overlay2 = document.createElement("div");
    overlay2.setAttribute("data-overlay-id", "element-2");
    mockOverlayLayer.appendChild(overlay2);
  });

  afterEach(() => {
    mockOverlayLayer.remove();
    mockElement1.remove();
    mockElement2.remove();
  });

  test("renders without crashing", () => {
    const state = createState();

    const { container } = render(
      <OverlayUpdateLoop
        state={state}
        canvasTransform={{ x: 0, y: 0, scale: 1 }}
        overlayLayerRef={{ current: mockOverlayLayer }}
      />
    );

    // Component doesn't render anything visible
    expect(container.firstChild).toBeNull();
  });

  test("updates all overlay positions every frame", async () => {
    const state = createState();

    render(
      <OverlayUpdateLoop
        state={state}
        canvasTransform={{ x: 0, y: 0, scale: 1 }}
        overlayLayerRef={{ current: mockOverlayLayer }}
      />
    );

    // Wait for RAF to process updates
    await waitFor(() => {
      const overlay1 = mockOverlayLayer.querySelector('[data-overlay-id="element-1"]') as HTMLElement;
      const overlay2 = mockOverlayLayer.querySelector('[data-overlay-id="element-2"]') as HTMLElement;
      expect(overlay1).toBeTruthy();
      expect(overlay2).toBeTruthy();
      // Positions should be updated (exact values depend on getBoundingClientRect)
      expect(overlay1.style.left).toBeTruthy();
      expect(overlay1.style.top).toBeTruthy();
      expect(overlay2.style.left).toBeTruthy();
      expect(overlay2.style.top).toBeTruthy();
    }, { timeout: 100 });
  });

  test("updates overlay positions when canvas transform changes", async () => {
    const state = createState();

    render(
      <OverlayUpdateLoop
        state={state}
        canvasTransform={{ x: 10, y: 20, scale: 1.5 }}
        overlayLayerRef={{ current: mockOverlayLayer }}
      />
    );

    // Wait for RAF to process updates
    await waitFor(() => {
      const overlay1 = mockOverlayLayer.querySelector('[data-overlay-id="element-1"]') as HTMLElement;
      expect(overlay1).toBeTruthy();
      // Position should be updated (exact values depend on getBoundingClientRect)
      expect(overlay1.style.left).toBeTruthy();
      expect(overlay1.style.top).toBeTruthy();
    }, { timeout: 100 });
  });

  test("handles missing overlay layer gracefully", () => {
    const state = createState();

    // Should not throw when overlay layer is null
    render(
      <OverlayUpdateLoop
        state={state}
        canvasTransform={{ x: 0, y: 0, scale: 1 }}
        overlayLayerRef={{ current: null }}
      />
    );
  });

  test("applies transform and rotation to overlay elements", async () => {
    // Set rotation on element
    mockElement1.style.transform = "rotate(45deg)";

    const state = createState();

    render(
      <OverlayUpdateLoop
        state={state}
        canvasTransform={{ x: 0, y: 0, scale: 1 }}
        overlayLayerRef={{ current: mockOverlayLayer }}
      />
    );

    await waitFor(() => {
      const overlay1 = mockOverlayLayer.querySelector('[data-overlay-id="element-1"]') as HTMLElement;
      expect(overlay1).toBeTruthy();
      // Rotation should be applied
      expect(overlay1.style.transform).toContain("rotate");
    }, { timeout: 100 });
  });
});

