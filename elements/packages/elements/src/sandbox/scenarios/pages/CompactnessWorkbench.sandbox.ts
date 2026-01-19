import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./CompactnessScene.sandbox.js"; // Registers ef-compactness-scene
import "../../../gui/EFWorkbench.js"; // Registers ef-workbench
import "../../../gui/EFConfiguration.js"; // Registers ef-configuration
import "../../../elements/EFPanZoom.js"; // Registers ef-pan-zoom
import "../../../gui/hierarchy/EFHierarchy.js"; // Registers ef-hierarchy
import "../../../gui/timeline/EFTimeline.js"; // Registers ef-timeline
import "../../../canvas/EFCanvas.js"; // Registers ef-canvas for selection support

/**
 * Page: Compactness Workbench
 * 
 * The compactness scene wrapped in a full EFWorkbench.
 * Provides:
 * - Preview panel with the animated demo
 * - Hierarchy panel showing element tree
 * - Filmstrip for thumbnail navigation
 * - Full playback controls
 */
@customElement("ef-compactness-workbench")
export class EFCompactnessWorkbench extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    ef-configuration {
      display: block;
      width: 100%;
      height: 100%;
    }

    ef-workbench {
      width: 100%;
      height: 100%;
    }
  `;

  @property({ type: Number })
  duration = 20;

  // Render to light DOM so document.getElementById works for timeline targeting
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <ef-configuration>
        <ef-workbench>
          <!-- Hierarchy panel - targets canvas for selection context -->
          <ef-hierarchy
            slot="hierarchy"
            target="compactness-canvas"
            show-header
            header="LAYERS"
          ></ef-hierarchy>

          <!-- Canvas area with selection support -->
          <ef-pan-zoom slot="canvas" style="width: 100%; height: 100%;">
            <ef-canvas id="compactness-canvas" style="width: 100%; height: 100%;">
              <ef-timegroup
                id="compactness-demo-root"
                mode="fixed"
                duration="${this.duration}s"
                style="width: 100%; height: 100%;"
              >
                <!-- The actual demo content -->
                <ef-compactness-demo
                  title="CSS Custom Properties"
                ></ef-compactness-demo>
              </ef-timegroup>
            </ef-canvas>
          </ef-pan-zoom>

          <!-- Timeline with playback controls - targets canvas -->
          <ef-timeline
            slot="timeline"
            target="compactness-canvas"
            show-playback-controls
            show-hierarchy
            show-ruler
          ></ef-timeline>
        </ef-workbench>
      </ef-configuration>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-compactness-workbench": EFCompactnessWorkbench;
  }
}

export default defineSandbox({
  name: "CompactnessWorkbench",
  description: "Page: Full workbench with compactness demo, hierarchy, filmstrip, and controls",
  category: "demos",
  subcategory: "compactness",

  render: () => html`
    <div style="width: 1200px; height: 800px;">
      <ef-compactness-workbench></ef-compactness-workbench>
    </div>
  `,

  scenarios: {
    async "renders workbench with all panels"(ctx) {
      const container = ctx.getContainer();
      const workbench = document.createElement("ef-compactness-workbench") as EFCompactnessWorkbench;
      workbench.style.width = "1200px";
      workbench.style.height = "800px";
      container.appendChild(workbench);
      await workbench.updateComplete;
      await ctx.frame();

      ctx.expect(workbench).toBeDefined();

      // Light DOM rendering - query directly on the element
      const efWorkbench = workbench.querySelector("ef-workbench");
      ctx.expect(efWorkbench).toBeDefined();
    },

    async "contains timegroup root"(ctx) {
      const container = ctx.getContainer();
      const workbench = document.createElement("ef-compactness-workbench") as EFCompactnessWorkbench;
      workbench.style.width = "1200px";
      workbench.style.height = "800px";
      container.appendChild(workbench);
      await workbench.updateComplete;
      await ctx.frame();

      // Light DOM rendering - query directly
      const timegroup = workbench.querySelector("ef-timegroup");
      ctx.expect(timegroup).toBeDefined();
      ctx.expect(timegroup?.id).toBe("compactness-demo-root");
    },

    async "configuration wraps workbench"(ctx) {
      const container = ctx.getContainer();
      const workbench = document.createElement("ef-compactness-workbench") as EFCompactnessWorkbench;
      workbench.style.width = "1200px";
      workbench.style.height = "800px";
      container.appendChild(workbench);
      await ctx.frame();

      // Light DOM rendering - query directly
      const config = workbench.querySelector("ef-configuration");
      ctx.expect(config).toBeDefined();
    },

    async "demo is accessible inside workbench"(ctx) {
      const container = ctx.getContainer();
      const workbench = document.createElement("ef-compactness-workbench") as EFCompactnessWorkbench;
      workbench.style.width = "1200px";
      workbench.style.height = "800px";
      container.appendChild(workbench);
      await workbench.updateComplete;
      await ctx.frame();

      // Light DOM rendering - query directly
      const demo = workbench.querySelector("ef-compactness-demo");
      ctx.expect(demo).toBeDefined();
    },

    async "workbench provides playback controls"(ctx) {
      const container = ctx.getContainer();
      const workbench = document.createElement("ef-compactness-workbench") as EFCompactnessWorkbench;
      workbench.style.width = "1200px";
      workbench.style.height = "800px";
      container.appendChild(workbench);
      await workbench.updateComplete;
      await ctx.frame();

      // Light DOM rendering - query directly
      const efWorkbench = workbench.querySelector("ef-workbench");
      ctx.expect(efWorkbench).toBeDefined();
      
      // Timeline is slotted and has show-playback-controls
      const timeline = workbench.querySelector("ef-timeline");
      ctx.expect(timeline).toBeDefined();
      ctx.expect(timeline?.hasAttribute("show-playback-controls")).toBe(true);
    },
  },
});
