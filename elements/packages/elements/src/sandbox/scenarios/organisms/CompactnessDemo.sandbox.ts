import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../atoms/HierarchyPanel.sandbox.js"; // Registers ef-hierarchy-panel
import "../molecules/SliderWithVariables.sandbox.js"; // Registers ef-slider-with-variables

/**
 * Organism: Compactness Demo
 * 
 * Full layout combining HierarchyPanel with SliderWithVariables.
 * The slider controls the CSS variables that affect the hierarchy panel.
 */
@customElement("ef-compactness-demo")
export class EFCompactnessDemo extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .demo-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }

    .scene-title {
      font-size: 48px;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 48px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .demo-content {
      display: flex;
      gap: 60px;
      align-items: flex-start;
    }

    .hierarchy-panel-area {
      width: 380px;
    }

    .controls-area {
      width: 400px;
    }

    /* Hidden demo structure */
    .demo-structure {
      display: none;
    }
  `;

  @property({ type: String })
  title = "CSS Custom Properties";

  @property({ type: Number })
  value = 0;

  @state()
  private targetElement: Element | null = null;

  private handleChange(e: CustomEvent<{ value: number; variables: Array<{ name: string; value: string }> }>) {
    this.value = e.detail.value;
    this.applyVariablesToHierarchy(e.detail.variables);
    
    this.dispatchEvent(new CustomEvent("change", {
      detail: e.detail,
      bubbles: true,
      composed: true,
    }));
  }

  private applyVariablesToHierarchy(variables: Array<{ name: string; value: string }>) {
    const panel = this.shadowRoot?.querySelector("ef-hierarchy-panel") as HTMLElement;
    if (panel) {
      for (const v of variables) {
        // Map generic names to panel-specific custom properties
        const panelVarName = v.name.replace("--hierarchy-", "--panel-");
        panel.style.setProperty(panelVarName, v.value);
      }
    }
  }

  firstUpdated() {
    this.setupDemoStructure();
  }

  private setupDemoStructure() {
    const demoStructure = this.shadowRoot?.querySelector(".demo-structure");
    if (demoStructure) {
      const timegroup = demoStructure.querySelector("ef-timegroup");
      if (timegroup) {
        this.targetElement = timegroup;
      }
    }
  }

  render() {
    return html`
      <div class="demo-container">
        <h2 class="scene-title">${this.title}</h2>
        
        <div class="demo-content">
          <div class="hierarchy-panel-area">
            <ef-hierarchy-panel
              header="LAYERS"
              .targetElement=${this.targetElement}
            ></ef-hierarchy-panel>
          </div>
          
          <div class="controls-area">
            <ef-slider-with-variables
              .value=${this.value}
              @change=${this.handleChange}
            ></ef-slider-with-variables>
          </div>
        </div>
      </div>

      <!-- Hidden demo structure for hierarchy display -->
      <div class="demo-structure">
        <ef-timegroup id="my-video" mode="sequence">
          <ef-video id="intro-clip" src="/assets/bars-n-tone2.mp4"></ef-video>
          <ef-video id="main-content" src="/assets/bars-n-tone2.mp4"></ef-video>
          <ef-timegroup id="lower-third" mode="contain">
            <ef-text id="title-text">Welcome</ef-text>
            <ef-text id="subtitle-text">Subtitle here</ef-text>
          </ef-timegroup>
          <ef-audio id="background-music" src="/assets/bars-n-tone2.mp4"></ef-audio>
        </ef-timegroup>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-compactness-demo": EFCompactnessDemo;
  }
}

export default defineSandbox({
  name: "CompactnessDemo",
  description: "Organism: Full compactness demo with hierarchy panel and slider controls",
  category: "demos",
  subcategory: "compactness",

  render: () => html`
    <div style="width: 900px; height: 600px;">
      <ef-compactness-demo value="0"></ef-compactness-demo>
    </div>
  `,

  scenarios: {
    async "renders full layout"(ctx) {
      const container = ctx.getContainer();
      const demo = document.createElement("ef-compactness-demo") as EFCompactnessDemo;
      demo.style.width = "900px";
      demo.style.height = "600px";
      container.appendChild(demo);
      await ctx.frame();

      ctx.expect(demo).toBeDefined();
      
      const title = demo.shadowRoot?.querySelector(".scene-title");
      const panel = demo.shadowRoot?.querySelector("ef-hierarchy-panel");
      const controls = demo.shadowRoot?.querySelector("ef-slider-with-variables");
      
      ctx.expect(title?.textContent).toBe("CSS Custom Properties");
      ctx.expect(panel).toBeDefined();
      ctx.expect(controls).toBeDefined();
    },

    async "slider controls hierarchy panel CSS variables"(ctx) {
      const container = ctx.getContainer();
      const demo = document.createElement("ef-compactness-demo") as EFCompactnessDemo;
      demo.style.width = "900px";
      demo.style.height = "600px";
      container.appendChild(demo);
      await demo.updateComplete;
      await ctx.frame();

      // Set compactness to 100%
      demo.value = 100;
      await ctx.frame();

      // Trigger change manually for initial value
      const slider = demo.shadowRoot?.querySelector("ef-slider-with-variables");
      if (slider) {
        (slider as any).value = 100;
        (slider as any).dispatchEvent(new CustomEvent("change", {
          detail: {
            value: 100,
            variables: [
              { name: "--hierarchy-item-height", value: "20px" },
              { name: "--hierarchy-item-font-size", value: "11.0px" },
              { name: "--hierarchy-indent", value: "12px" },
            ],
          },
        }));
      }
      await ctx.frame();

      const panel = demo.shadowRoot?.querySelector("ef-hierarchy-panel") as HTMLElement;
      ctx.expect(panel).toBeDefined();
      
      // Check CSS variables were applied
      const heightVar = panel.style.getPropertyValue("--panel-item-height");
      ctx.expect(heightVar).toBe("20px");
    },

    async "emits change events"(ctx) {
      const container = ctx.getContainer();
      const demo = document.createElement("ef-compactness-demo") as EFCompactnessDemo;
      demo.style.width = "900px";
      demo.style.height = "600px";
      container.appendChild(demo);
      await ctx.frame();

      let emittedValue: number | undefined;
      demo.addEventListener("change", (e) => {
        emittedValue = (e as CustomEvent).detail.value;
      });

      demo.value = 75;
      const slider = demo.shadowRoot?.querySelector("ef-slider-with-variables");
      if (slider) {
        (slider as any).dispatchEvent(new CustomEvent("change", {
          detail: { value: 75, variables: [] },
          bubbles: true,
        }));
      }
      await ctx.frame();

      ctx.expect(emittedValue).toBe(75);
    },

    async "animates full compactness range"(ctx) {
      const container = ctx.getContainer();
      const demo = document.createElement("ef-compactness-demo") as EFCompactnessDemo;
      demo.style.width = "900px";
      demo.style.height = "600px";
      container.appendChild(demo);
      await demo.updateComplete;
      await ctx.frame();

      // Animate from spacious (0) to compact (100)
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const value = (i / steps) * 100;
        demo.value = value;
        
        // Simulate the change event with computed variables
        const compactness = value / 100;
        const variables = [
          { name: "--hierarchy-item-height", value: `${32 - (compactness * 12)}px` },
          { name: "--hierarchy-item-font-size", value: `${13 - (compactness * 2)}px` },
          { name: "--hierarchy-indent", value: `${20 - (compactness * 8)}px` },
        ];
        
        const slider = demo.shadowRoot?.querySelector("ef-slider-with-variables");
        if (slider) {
          (slider as any).dispatchEvent(new CustomEvent("change", {
            detail: { value, variables },
            bubbles: true,
          }));
        }
        await ctx.frame();
      }

      // Final state should be max compactness
      ctx.expect(demo.value).toBe(100);
    },

    async "supports custom title"(ctx) {
      const container = ctx.getContainer();
      const demo = document.createElement("ef-compactness-demo") as EFCompactnessDemo;
      demo.title = "Custom Demo Title";
      demo.style.width = "900px";
      demo.style.height = "600px";
      container.appendChild(demo);
      await ctx.frame();

      const title = demo.shadowRoot?.querySelector(".scene-title");
      ctx.expect(title?.textContent).toBe("Custom Demo Title");
    },
  },
});
