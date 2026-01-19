import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFTransformHandles, TransformBounds } from "./EFTransformHandles.js";
import "./EFTransformHandles.js";

export default defineSandbox({
  name: "EFTransformHandles",
  description: "Drag, resize, and rotate handles for transforming elements",
  category: "gui",
  subcategory: "transform",

  render: () => html`
    <div style="position: relative; width: 500px; height: 400px; background: #1a1a1a;">
      <ef-transform-handles
        .bounds=${{ x: 50, y: 50, width: 200, height: 150, rotation: 0 }}
        enable-rotation
        enable-resize
        enable-drag
      ></ef-transform-handles>
    </div>
  `,

  scenarios: {
    async "renders with provided bounds"(ctx) {
      const handles = ctx.querySelector<EFTransformHandles>("ef-transform-handles")!;
      await ctx.frame();

      ctx.expect(handles).toBeDefined();
      ctx.expect(handles.bounds.x).toBe(50);
      ctx.expect(handles.bounds.y).toBe(50);
      ctx.expect(handles.bounds.width).toBe(200);
      ctx.expect(handles.bounds.height).toBe(150);
    },

    async "renders resize handles"(ctx) {
      const handles = ctx.querySelector<EFTransformHandles>("ef-transform-handles")!;
      await ctx.frame();

      const shadowRoot = handles.shadowRoot!;
      const resizeHandles = shadowRoot.querySelectorAll(".handle");
      ctx.expect(resizeHandles.length).toBe(8);
    },

    async "renders corners only when enabled"(ctx) {
      const container = ctx.getContainer();
      const handles = document.createElement("ef-transform-handles") as EFTransformHandles;
      handles.bounds = { x: 0, y: 0, width: 100, height: 100 };
      handles.cornersOnly = true;
      container.appendChild(handles);
      await ctx.frame();

      const shadowRoot = handles.shadowRoot!;
      const resizeHandles = shadowRoot.querySelectorAll(".handle");
      ctx.expect(resizeHandles.length).toBe(4);
    },

    async "renders rotation handle when enabled"(ctx) {
      const handles = ctx.querySelector<EFTransformHandles>("ef-transform-handles")!;
      await ctx.frame();

      const shadowRoot = handles.shadowRoot!;
      const rotateHandle = shadowRoot.querySelector(".rotate-handle");
      ctx.expect(rotateHandle).toBeDefined();
    },

    async "hides rotation handle when disabled"(ctx) {
      const container = ctx.getContainer();
      const handles = document.createElement("ef-transform-handles") as EFTransformHandles;
      handles.bounds = { x: 0, y: 0, width: 100, height: 100 };
      handles.enableRotation = false;
      container.appendChild(handles);
      await ctx.frame();

      const shadowRoot = handles.shadowRoot!;
      const rotateHandle = shadowRoot.querySelector(".rotate-handle");
      ctx.expect(rotateHandle).toBeUndefined();
    },

    async "dispatches bounds-change on drag"(ctx) {
      const handles = ctx.querySelector<EFTransformHandles>("ef-transform-handles")!;
      await ctx.frame();

      let newBounds: TransformBounds | undefined;
      handles.addEventListener("bounds-change", (e: Event) => {
        newBounds = (e as CustomEvent<{ bounds: TransformBounds }>).detail.bounds;
      });

      const shadowRoot = handles.shadowRoot!;
      const dragArea = shadowRoot.querySelector(".drag-area") as HTMLElement;

      const mousedown = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      dragArea.dispatchEvent(mousedown);

      const mousemove = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 150,
        clientY: 120,
      });
      document.dispatchEvent(mousemove);

      const mouseup = new MouseEvent("mouseup", { bubbles: true });
      document.dispatchEvent(mouseup);

      await ctx.frame();

      ctx.expect(newBounds).toBeDefined();
    },

    async "applies rotation to overlay"(ctx) {
      const container = ctx.getContainer();
      const handles = document.createElement("ef-transform-handles") as EFTransformHandles;
      handles.bounds = { x: 50, y: 50, width: 100, height: 100, rotation: 45 };
      handles.enableRotation = true;
      container.appendChild(handles);
      await ctx.frame();

      const shadowRoot = handles.shadowRoot!;
      const overlay = shadowRoot.querySelector(".overlay") as HTMLElement;
      ctx.expect(overlay.style.transform).toContain("rotate(45deg)");
    },
  },
});
