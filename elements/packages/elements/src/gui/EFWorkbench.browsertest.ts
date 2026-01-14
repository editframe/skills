import { html, render } from "lit";
import { afterEach, beforeEach, describe, test } from "vitest";
import type { EFWorkbench } from "./EFWorkbench.js";
import "./EFWorkbench.js";
import "../elements/EFTimegroup.js";
import type { VideoRenderOptions } from "@editframe/assets";

describe("EFWorkbench", () => {
  let container: HTMLDivElement;
  let workbench: EFWorkbench;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    render(
      html`
        <ef-workbench style="width: 800px; height: 600px;">
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-timegroup mode="fixed" duration="2s" style="width: 100%; height: 100%;">
              <div>Test content</div>
            </ef-timegroup>
          </ef-pan-zoom>
        </ef-workbench>
      `,
      container,
    );

    workbench = document.querySelector("ef-workbench") as EFWorkbench;
  });

  afterEach(() => {
    // Clean up global state
    delete (window as any).FRAMEGEN_BRIDGE;
    delete (window as any).EF_FRAMEGEN;
    delete (window as any).EF_RENDERING;
    container.remove();
  });

  test("rendering state is correctly tracked when framegen bridge is active", async ({ expect }) => {
    // Mock FRAMEGEN_BRIDGE
    const mockBridge = {
      onInitialize: () => {},
      initialized: () => {},
      onBeginFrame: () => {},
      onTriggerCanvas: () => {},
      frameReady: () => {},
      error: () => {},
      syncLog: () => {},
    };

    (window as any).FRAMEGEN_BRIDGE = mockBridge;

    // Import EF_FRAMEGEN to trigger constructor
    await import("../EF_FRAMEGEN.js");

    // Wait for workbench to be ready
    await workbench.updateComplete;

    // Initially, rendering should be false
    expect(workbench.rendering).toBe(false);

    // Simulate framegen initialization (this is what EF_FRAMEGEN.initialize does)
    const renderOptions: VideoRenderOptions = {
      encoderOptions: {
        video: { width: 1920, height: 1080, framerate: 30 },
        audio: { sampleRate: 48000, channels: 2 },
        fromMs: 0,
        toMs: 2000,
        alignedFromUs: 0,
        alignedToUs: 2_000_000,
      },
    };

    // Simulate what EF_FRAMEGEN.initialize does
    workbench.rendering = true;
    await workbench.updateComplete;

    // Verify rendering state is true
    expect(workbench.rendering).toBe(true);

    // Verify workbench renders canvas-only view when rendering
    const shadowRoot = workbench.shadowRoot;
    expect(shadowRoot).toBeTruthy();
    const canvasSlot = shadowRoot?.querySelector('slot[name="canvas"]');
    expect(canvasSlot).toBeTruthy();

    // Simulate rendering completion
    workbench.rendering = false;
    await workbench.updateComplete;

    // Verify rendering state is false
    expect(workbench.rendering).toBe(false);

    // Verify workbench renders full UI when not rendering
    const toolbar = shadowRoot?.querySelector(".toolbar");
    expect(toolbar).toBeTruthy();
  });

  test("workbench shows canvas-only view only when rendering=true, not based on FRAMEGEN_BRIDGE existence", async ({ expect }) => {
    // Mock FRAMEGEN_BRIDGE to simulate bridge being set up
    const mockBridge = {
      onInitialize: () => {},
      initialized: () => {},
      onBeginFrame: () => {},
      onTriggerCanvas: () => {},
      frameReady: () => {},
      error: () => {},
      syncLog: () => {},
    };

    (window as any).FRAMEGEN_BRIDGE = mockBridge;

    // Import EF_FRAMEGEN to trigger constructor
    await import("../EF_FRAMEGEN.js");

    await workbench.updateComplete;

    // Initially, rendering should be false
    expect(workbench.rendering).toBe(false);

    // Even though FRAMEGEN_BRIDGE exists, workbench should show full UI
    // because rendering=false (after fix, the hack is removed)
    const shadowRoot = workbench.shadowRoot;
    const toolbar = shadowRoot?.querySelector(".toolbar");
    
    // After fix: Should show full UI when rendering=false
    expect(toolbar).toBeTruthy();
    
    // When rendering=false, the canvas slot should be inside the grid layout,
    // not the only element rendered. Check that the grid container exists.
    const gridContainer = shadowRoot?.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
    
    // Canvas slot exists but should be inside the grid, not as the root
    const canvasSlot = shadowRoot?.querySelector('slot[name="canvas"]');
    expect(canvasSlot).toBeTruthy();
    expect(canvasSlot?.parentElement?.classList.contains('canvas-container')).toBe(true);

    // Now set rendering=true (simulating active rendering)
    workbench.rendering = true;
    await workbench.updateComplete;

    // Verify rendering state is true
    expect(workbench.rendering).toBe(true);

    // Now it should show canvas-only view (only the canvas slot, no grid/toolbar)
    const canvasSlotWhenRendering = shadowRoot?.querySelector('slot[name="canvas"]');
    expect(canvasSlotWhenRendering).toBeTruthy();
    
    // When rendering=true, canvas slot should be a direct child of shadowRoot
    // (parentNode works in shadow DOM, parentElement doesn't)
    expect(canvasSlotWhenRendering?.parentNode).toBe(shadowRoot);
    
    // Toolbar should not exist when rendering
    const toolbarWhenRendering = shadowRoot?.querySelector(".toolbar");
    expect(toolbarWhenRendering).toBeNull();
    
    // Grid container should not exist when rendering
    const gridContainerWhenRendering = shadowRoot?.querySelector('.grid');
    expect(gridContainerWhenRendering).toBeNull();

    // Simulate rendering completion
    workbench.rendering = false;
    await workbench.updateComplete;

    // After rendering completes: Should show full UI again
    const toolbarAfterRendering = shadowRoot?.querySelector(".toolbar");
    expect(toolbarAfterRendering).toBeTruthy();
    
    // Grid container should exist again
    const gridContainerAfterRendering = shadowRoot?.querySelector('.grid');
    expect(gridContainerAfterRendering).toBeTruthy();
    
    // Canvas slot should be inside the grid container again
    const canvasSlotAfterRendering = shadowRoot?.querySelector('slot[name="canvas"]');
    expect(canvasSlotAfterRendering).toBeTruthy();
    expect(canvasSlotAfterRendering?.parentElement?.classList.contains('canvas-container')).toBe(true);
  });
});

