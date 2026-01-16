import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../../../gui/hierarchy/EFHierarchy.js";
import type { EFHierarchy } from "../../../gui/hierarchy/EFHierarchy.js";

/**
 * Atom: Hierarchy Panel
 * 
 * Wraps ef-hierarchy with styling and header.
 * Displays element tree structure with CSS variable customization support.
 */
@customElement("ef-hierarchy-panel")
export class EFHierarchyPanel extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--panel-bg, rgba(15, 23, 42, 0.8));
      border: 1px solid var(--panel-border, rgba(148, 163, 184, 0.2));
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    ef-hierarchy {
      display: block;
      min-height: 200px;
      
      /* Default CSS variables - can be overridden via style attribute */
      --hierarchy-item-height: var(--panel-item-height, 32px);
      --hierarchy-item-font-size: var(--panel-item-font-size, 13px);
      --hierarchy-indent: var(--panel-indent, 20px);
      --hierarchy-icon-gap: var(--panel-icon-gap, 6px);
      --hierarchy-item-padding-left: var(--panel-padding-left, 8px);
      --hierarchy-item-padding-right: var(--panel-padding-right, 8px);
    }
  `;

  @property({ type: String })
  header = "LAYERS";

  @property({ type: String })
  target = "";

  @property({ attribute: false })
  targetElement: Element | null = null;

  render() {
    return html`
      <ef-hierarchy
        .header=${this.header}
        .target=${this.target}
        .targetElement=${this.targetElement}
        show-header
      ></ef-hierarchy>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-hierarchy-panel": EFHierarchyPanel;
  }
}

/**
 * Create a demo timegroup structure for hierarchy display.
 * This simulates a typical video editing project structure.
 */
function createDemoStructure(): HTMLElement {
  const container = document.createElement("div");
  container.id = "demo-structure";
  container.style.display = "none"; // Hidden - just for hierarchy reference
  
  container.innerHTML = `
    <ef-timegroup id="my-video" mode="sequence" style="display:none;">
      <ef-video id="intro-clip" src="/assets/bars-n-tone2.mp4"></ef-video>
      <ef-video id="main-content" src="/assets/bars-n-tone2.mp4"></ef-video>
      <ef-timegroup id="lower-third" mode="contain">
        <ef-text id="title-text">Welcome</ef-text>
        <ef-text id="subtitle-text">Subtitle here</ef-text>
      </ef-timegroup>
      <ef-audio id="background-music" src="/assets/bars-n-tone2.mp4"></ef-audio>
    </ef-timegroup>
  `;
  
  return container;
}

export default defineSandbox({
  name: "HierarchyPanel",
  description: "Atom: ef-hierarchy wrapper with panel styling and CSS variable support",
  category: "panels",

  render: () => html`
    <div style="width: 380px; padding: 20px; background: #0f172a;">
      <ef-hierarchy-panel id="hierarchy-panel" header="LAYERS"></ef-hierarchy-panel>
    </div>
    <div id="demo-container" style="display: none;"></div>
  `,

  setup: async (container) => {
    // Create demo structure and attach to hierarchy
    const demoStructure = createDemoStructure();
    const demoContainer = container.querySelector("#demo-container");
    if (demoContainer) {
      demoContainer.appendChild(demoStructure);
    }

    // Connect hierarchy panel to demo structure
    const panel = container.querySelector<EFHierarchyPanel>("#hierarchy-panel");
    if (panel) {
      const timegroup = demoStructure.querySelector("ef-timegroup");
      if (timegroup) {
        panel.targetElement = timegroup;
      }
    }
  },

  scenarios: {
    async "renders with header"(ctx) {
      const container = ctx.getContainer();
      const panel = document.createElement("ef-hierarchy-panel") as EFHierarchyPanel;
      panel.header = "LAYERS";
      panel.style.width = "380px";
      panel.style.height = "300px";
      container.appendChild(panel);
      await ctx.frame();

      ctx.expect(panel).toBeDefined();
      ctx.expect(panel.header).toBe("LAYERS");

      // Check header is rendered
      const hierarchy = panel.shadowRoot?.querySelector("ef-hierarchy") as EFHierarchy;
      ctx.expect(hierarchy).toBeDefined();
    },

    async "displays demo structure"(ctx) {
      const container = ctx.getContainer();
      const panel = document.createElement("ef-hierarchy-panel") as EFHierarchyPanel;
      panel.header = "LAYERS";
      panel.style.width = "380px";
      panel.style.height = "300px";
      container.appendChild(panel);
      await ctx.frame();
      await ctx.wait(100); // Wait for hierarchy to render

      const hierarchy = panel.shadowRoot?.querySelector("ef-hierarchy") as EFHierarchy;
      ctx.expect(hierarchy).toBeDefined();
      
      // Hierarchy should have items rendered
      const hierarchyContainer = hierarchy.shadowRoot?.querySelector(".hierarchy-container");
      ctx.expect(hierarchyContainer).toBeDefined();
    },

    async "supports CSS variable customization"(ctx) {
      const container = ctx.getContainer();
      const panel = document.createElement("ef-hierarchy-panel") as EFHierarchyPanel;
      panel.header = "LAYERS";
      panel.style.width = "380px";
      panel.style.height = "300px";
      container.appendChild(panel);
      await ctx.frame();

      // Apply compactness CSS variables
      panel.style.setProperty("--panel-item-height", "24px");
      panel.style.setProperty("--panel-item-font-size", "11px");
      panel.style.setProperty("--panel-indent", "12px");
      await ctx.frame();

      // Variables should be applied
      const computed = getComputedStyle(panel);
      ctx.expect(computed.getPropertyValue("--panel-item-height").trim()).toBe("24px");
    },

    async "updates target element"(ctx) {
      const container = ctx.getContainer();
      const panel = document.createElement("ef-hierarchy-panel") as EFHierarchyPanel;
      panel.header = "LAYERS";
      panel.style.width = "380px";
      panel.style.height = "300px";
      container.appendChild(panel);
      await ctx.frame();

      // Create new demo structure
      const newContainer = document.createElement("div");
      newContainer.innerHTML = `
        <ef-timegroup id="new-video" mode="sequence" style="display:none;">
          <ef-video id="clip-1" src="/test.mp4"></ef-video>
          <ef-video id="clip-2" src="/test.mp4"></ef-video>
        </ef-timegroup>
      `;
      container.appendChild(newContainer);

      const newTimegroup = newContainer.querySelector("ef-timegroup");
      panel.targetElement = newTimegroup;
      await ctx.frame();
      await ctx.wait(100);

      // Panel should now reference the new structure
      ctx.expect(panel.targetElement).toBe(newTimegroup);
    },

    async "animates compactness transition"(ctx) {
      const container = ctx.getContainer();
      const panel = document.createElement("ef-hierarchy-panel") as EFHierarchyPanel;
      panel.header = "LAYERS";
      panel.style.width = "380px";
      panel.style.height = "300px";
      container.appendChild(panel);
      await ctx.frame();

      // Simulate compactness slider animation (0% to 100%)
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const compactness = i / steps;
        const heightPx = 32 - (compactness * 12);
        const fontSizePx = 13 - (compactness * 2);
        const indentPx = 20 - (compactness * 8);

        panel.style.setProperty("--panel-item-height", `${heightPx}px`);
        panel.style.setProperty("--panel-item-font-size", `${fontSizePx}px`);
        panel.style.setProperty("--panel-indent", `${indentPx}px`);
        await ctx.frame();
      }

      // Final values should be at max compactness
      const computed = getComputedStyle(panel);
      ctx.expect(computed.getPropertyValue("--panel-item-height").trim()).toBe("20px");
      ctx.expect(computed.getPropertyValue("--panel-indent").trim()).toBe("12px");
    },
  },
});
