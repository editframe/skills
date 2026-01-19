import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFOverlayItem, OverlayItemPosition } from "./EFOverlayItem.js";
import "./EFOverlayItem.js";
import "./EFOverlayLayer.js";

export default defineSandbox({
  name: "EFOverlayItem",
  description: "Individual overlay item that tracks and positions over a target element",
  category: "gui",
  subcategory: "overlay",

  render: () => html`
    <div style="position: relative; width: 500px; height: 400px; background: #1a1a1a;">
      <div 
        id="target-element" 
        data-element-id="test-target"
        style="position: absolute; top: 80px; left: 100px; width: 200px; height: 120px; background: #3b82f6;"
      >
        Target Element
      </div>
      
      <ef-overlay-layer>
        <ef-overlay-item element-id="test-target">
          <div style="border: 3px dashed #10b981; width: 100%; height: 100%; box-sizing: border-box;"></div>
        </ef-overlay-item>
      </ef-overlay-layer>
    </div>
  `,

  scenarios: {
    async "renders overlay item"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await ctx.frame();

      ctx.expect(item).toBeDefined();
    },

    async "accepts element-id attribute"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await ctx.frame();

      ctx.expect(item.elementId).toBe("test-target");
    },

    async "positions over target element"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await item.updateComplete;
      await ctx.frame();

      // Wait for position to be set by the overlay layer's RAF loop
      await new Promise<void>((resolve) => {
        item.addEventListener("position-changed", () => resolve(), { once: true });
        // Give RAF loop a chance to start and update position
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // If position already set, resolve immediately
            const computed = window.getComputedStyle(item);
            if (computed.position === "absolute" && computed.left !== "auto") {
              resolve();
            }
          });
        });
      });
      await ctx.frame();

      const computed = window.getComputedStyle(item);
      ctx.expect(computed.position).toBe("absolute");
    },

    async "dispatches position-changed event"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await item.updateComplete;
      await ctx.frame();

      // Wait for initial positioning by overlay layer's RAF loop
      await new Promise<void>((resolve) => {
        item.addEventListener("position-changed", () => resolve(), { once: true });
        // Give RAF loop a chance to start
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Check if already positioned
            const computed = window.getComputedStyle(item);
            if (computed.left !== "auto" && computed.top !== "auto") {
              resolve();
            }
          });
        });
      });
      await ctx.frame();

      // Wait for position-changed event when updatePosition is called
      const positionEventPromise = new Promise<OverlayItemPosition>((resolve) => {
        item.addEventListener("position-changed", (e: Event) => {
          resolve((e as CustomEvent<OverlayItemPosition>).detail);
        }, { once: true });
      });

      // Force a position update by moving the target element slightly
      const targetElement = ctx.querySelector("#target-element")!;
      const originalLeft = targetElement.style.left;
      targetElement.style.left = `${parseInt(originalLeft || "100") + 1}px`;
      
      item.updatePosition();
      await ctx.frame();

      const positionEvent = await positionEventPromise;

      ctx.expect(positionEvent).toBeDefined();
      if (positionEvent) {
        ctx.expect(typeof positionEvent.x).toBe("number");
        ctx.expect(typeof positionEvent.y).toBe("number");
        ctx.expect(typeof positionEvent.width).toBe("number");
        ctx.expect(typeof positionEvent.height).toBe("number");
      }
    },

    async "accepts target as string selector"(ctx) {
      const container = ctx.getContainer();

      const targetDiv = document.createElement("div");
      targetDiv.id = "selector-target";
      targetDiv.style.cssText = "position: absolute; top: 20px; left: 20px; width: 50px; height: 50px;";
      container.appendChild(targetDiv);

      const layer = document.createElement("ef-overlay-layer");
      const item = document.createElement("ef-overlay-item") as EFOverlayItem;
      item.target = "#selector-target";
      layer.appendChild(item);
      container.appendChild(layer);
      await ctx.frame();

      ctx.expect(item.target).toBe("#selector-target");
    },

    async "accepts target as HTMLElement"(ctx) {
      const container = ctx.getContainer();

      const targetDiv = document.createElement("div");
      targetDiv.style.cssText = "position: absolute; top: 30px; left: 30px; width: 60px; height: 60px;";
      container.appendChild(targetDiv);

      const layer = document.createElement("ef-overlay-layer");
      const item = document.createElement("ef-overlay-item") as EFOverlayItem;
      item.target = targetDiv;
      layer.appendChild(item);
      container.appendChild(layer);
      await ctx.frame();

      ctx.expect(item.target).toBe(targetDiv);
    },

    async "renders slotted content"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await ctx.frame();

      const slottedDiv = item.querySelector("div");
      ctx.expect(slottedDiv).toBeDefined();
    },

    async "has pointer-events auto"(ctx) {
      const item = ctx.querySelector<EFOverlayItem>("ef-overlay-item")!;
      await ctx.frame();

      const computed = window.getComputedStyle(item);
      ctx.expect(computed.pointerEvents).toBe("auto");
    },
  },
});
