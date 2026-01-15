import { defineSandbox } from "../sandbox/index.js";
import { html } from "lit";
import type { EFDial } from "./EFDial.js";
import "./EFDial.js";

export default defineSandbox({
  name: "EFDial",
  description: "Rotation dial control for adjusting angles",
  
  render: () => html`
    <ef-dial .value=${45} style="width: 200px; height: 200px;"></ef-dial>
  `,
  
  scenarios: {
    async "renders with default value"(ctx) {
      // Create a new dial without a value to test default
      const container = ctx.getContainer();
      const dial = document.createElement("ef-dial") as EFDial;
      dial.style.width = "200px";
      dial.style.height = "200px";
      container.appendChild(dial);
      await ctx.frame();
      
      ctx.expect(dial).toBeDefined();
      ctx.expect(dial.value).toBe(0);
    },
    
    async "renders with provided value"(ctx) {
      const dial = ctx.querySelector<EFDial>("ef-dial")!;
      await ctx.frame();
      
      ctx.expect(dial.value).toBe(45);
    },
    
    async "normalizes values above 360"(ctx) {
      const dial = ctx.querySelector<EFDial>("ef-dial")!;
      
      dial.value = 370;
      await ctx.frame();
      
      ctx.expect(dial.value).toBeCloseTo(10, 0.1);
    },
    
    async "normalizes negative values"(ctx) {
      const dial = ctx.querySelector<EFDial>("ef-dial")!;
      
      dial.value = -10;
      await ctx.frame();
      
      ctx.expect(dial.value).toBeCloseTo(350, 0.1);
    },
    
    async "emits change event on drag"(ctx) {
      const dial = ctx.querySelector<EFDial>("ef-dial")!;
      await ctx.frame(); // Ensure dial is rendered
      
      let changeValue: number | undefined;
      
      dial.addEventListener("change", (e) => {
        changeValue = (e as CustomEvent<{ value: number }>).detail.value;
      });
      
      // Find the dial-container inside the shadow DOM
      const shadowRoot = dial.shadowRoot;
      if (!shadowRoot) {
        throw new Error("EFDial shadow root not found");
      }
      const container = shadowRoot.querySelector(".dial-container") as HTMLElement;
      if (!container) {
        throw new Error("dial-container not found in shadow DOM");
      }
      
      // Get container bounds for relative coordinates
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Drag from top-center to bottom-right
      await ctx.drag(container, { 
        from: [centerX, centerY - 50], 
        to: [centerX + 50, centerY + 50] 
      });
      await ctx.wait(100); // Wait for event to fire
      
      ctx.expect(changeValue).toBeDefined();
      if (changeValue !== undefined) {
        ctx.expect(changeValue).toBeGreaterThan(0);
        ctx.expect(changeValue).toBeLessThan(360);
      }
    },
    
    async "rotates through full circle"(ctx) {
      const dial = ctx.querySelector<EFDial>("ef-dial")!;
      
      for (let i = 0; i <= 360; i += 10) {
        dial.value = i;
        await ctx.frame();
      }
      
      ctx.expect(dial.value).toBeCloseTo(0, 0.1);
    },
  },
});
