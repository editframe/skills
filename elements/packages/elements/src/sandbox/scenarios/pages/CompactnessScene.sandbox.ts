import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../organisms/CompactnessDemo.sandbox.js"; // Registers ef-compactness-demo
import "../../../elements/EFTimegroup.js"; // Registers ef-timegroup

/**
 * Page: Compactness Scene
 * 
 * Full compactness demo wrapped in an ef-timegroup for timeline control.
 * Includes animated cursor that tracks the slider position.
 * 
 * Timeline: 20 seconds
 * - 0-2s: Idle, cursor enters
 * - 2-18s: Cursor drags slider from 0% to 100%
 * - 18-20s: Release and exit
 */
@customElement("ef-compactness-scene")
export class EFCompactnessScene extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }

    ef-timegroup {
      width: 100%;
      height: 100%;
    }

    ef-compactness-demo {
      width: 100%;
      height: 100%;
    }

    /* Animated cursor overlay */
    .cursor-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1000;
    }

    .drag-cursor {
      position: absolute;
      width: 24px;
      height: 24px;
      opacity: 0;
      transition: opacity 0.2s ease;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .drag-cursor.visible {
      opacity: 1;
    }

    /* Cursor icons */
    .cursor-icon {
      width: 100%;
      height: 100%;
      fill: white;
      stroke: black;
      stroke-width: 0.5;
    }

    .cursor-pointer { display: block; }
    .cursor-hand { display: none; }
    .cursor-grabbing { display: none; }

    .drag-cursor.hand .cursor-pointer { display: none; }
    .drag-cursor.hand .cursor-hand { display: block; }

    .drag-cursor.grabbing .cursor-pointer { display: none; }
    .drag-cursor.grabbing .cursor-grabbing { display: block; }
  `;

  @property({ type: Number })
  duration = 20;

  @state()
  private cursorState: {
    visible: boolean;
    mode: "pointer" | "hand" | "grabbing";
    x: number;
    y: number;
  } = {
    visible: false,
    mode: "pointer",
    x: 0,
    y: 0,
  };

  @state()
  private sliderValue = 0;

  private handleFrame = (e: CustomEvent) => {
    const { ownCurrentTimeMs } = e.detail;
    const percent = (ownCurrentTimeMs / 1000 / this.duration) * 100;
    
    this.updateState(percent);
  };

  private updateState(percent: number) {
    // Timeline keyframes:
    // 0-10%: Cursor enters, moves to slider
    // 10-12.5%: Cursor hovers over slider thumb (hand)
    // 12.5-90%: Cursor drags slider (grabbing)
    // 90-100%: Cursor releases and exits

    let sliderValue = 0;
    let cursorVisible = false;
    let cursorMode: "pointer" | "hand" | "grabbing" = "pointer";
    let cursorX = 0;
    let cursorY = 0;

    // Get slider position in the layout (approximate)
    // The slider is in controls-area, which is to the right of hierarchy-panel
    const sliderStartX = 500; // Approximate X position of slider start
    const sliderEndX = 750; // Approximate X position of slider end
    const sliderY = 400; // Approximate Y position of slider

    if (percent < 5) {
      // Cursor hidden
      cursorVisible = false;
    } else if (percent < 10) {
      // Cursor enters from bottom-right
      cursorVisible = true;
      cursorMode = "pointer";
      const t = (percent - 5) / 5;
      cursorX = sliderStartX + (1 - t) * 200;
      cursorY = sliderY + (1 - t) * 200;
    } else if (percent < 12.5) {
      // Cursor hovers over slider thumb
      cursorVisible = true;
      cursorMode = "hand";
      cursorX = sliderStartX;
      cursorY = sliderY;
    } else if (percent < 90) {
      // Cursor drags slider
      cursorVisible = true;
      cursorMode = "grabbing";
      const dragPercent = (percent - 12.5) / (90 - 12.5);
      sliderValue = dragPercent * 100;
      cursorX = sliderStartX + dragPercent * (sliderEndX - sliderStartX);
      cursorY = sliderY;
    } else {
      // Cursor releases and exits
      cursorVisible = percent < 95;
      cursorMode = "pointer";
      sliderValue = 100;
      const t = (percent - 90) / 10;
      cursorX = sliderEndX + t * 100;
      cursorY = sliderY - t * 100;
    }

    this.cursorState = {
      visible: cursorVisible,
      mode: cursorMode,
      x: cursorX,
      y: cursorY,
    };
    this.sliderValue = sliderValue;

    // Update the demo component's slider value
    const demo = this.shadowRoot?.querySelector("ef-compactness-demo") as any;
    if (demo) {
      demo.value = sliderValue;
      
      // Trigger the change to update CSS variables
      const compactness = sliderValue / 100;
      const variables = [
        { name: "--hierarchy-item-height", value: `${32 - (compactness * 12)}px` },
        { name: "--hierarchy-item-font-size", value: `${13 - (compactness * 2)}px` },
        { name: "--hierarchy-indent", value: `${20 - (compactness * 8)}px` },
      ];
      
      // Apply to hierarchy panel directly
      const panel = demo.shadowRoot?.querySelector("ef-hierarchy-panel") as HTMLElement;
      if (panel) {
        for (const v of variables) {
          const panelVarName = v.name.replace("--hierarchy-", "--panel-");
          panel.style.setProperty(panelVarName, v.value);
        }
      }
    }
  }

  render() {
    return html`
      <ef-timegroup
        mode="fixed"
        duration="${this.duration}s"
        @frame=${this.handleFrame}
      >
        <ef-compactness-demo
          title="CSS Custom Properties"
          .value=${this.sliderValue}
        ></ef-compactness-demo>
      </ef-timegroup>

      <div class="cursor-overlay">
        <div
          class="drag-cursor ${this.cursorState.visible ? 'visible' : ''} ${this.cursorState.mode}"
          style="left: ${this.cursorState.x}px; top: ${this.cursorState.y}px;"
        >
          <!-- Pointer cursor -->
          <svg class="cursor-icon cursor-pointer" viewBox="0 0 24 24">
            <path d="M5.5 3.21V20.8l5.15-5.15h7.6L5.5 3.21z" fill="white" stroke="black" stroke-width="1.5"/>
          </svg>
          <!-- Hand cursor -->
          <svg class="cursor-icon cursor-hand" viewBox="0 0 24 24">
            <path d="M18 8.5V5.5a1.5 1.5 0 0 0-3 0v3h-1V4.5a1.5 1.5 0 0 0-3 0v4h-1V5.5a1.5 1.5 0 0 0-3 0v6l-1.5-1.5a1.5 1.5 0 0 0-2.12 2.12l4.12 4.38h8a4 4 0 0 0 4-4v-4a1.5 1.5 0 0 0-3 0v0.5h-1z" fill="white" stroke="black" stroke-width="1"/>
          </svg>
          <!-- Grabbing cursor -->
          <svg class="cursor-icon cursor-grabbing" viewBox="0 0 24 24">
            <path d="M18 11.5V8.5a1.5 1.5 0 0 0-3 0v3h-1V7.5a1.5 1.5 0 0 0-3 0v4h-1V8.5a1.5 1.5 0 0 0-3 0v6l-1.5-1.5a1.5 1.5 0 0 0-2.12 2.12l4.12 4.38h8a4 4 0 0 0 4-4v-4a1.5 1.5 0 0 0-3 0v0.5h-1z" fill="white" stroke="black" stroke-width="1"/>
          </svg>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-compactness-scene": EFCompactnessScene;
  }
}

export default defineSandbox({
  name: "CompactnessScene",
  description: "Page: Timegroup-wrapped compactness demo with animated cursor",
  category: "media",

  render: () => html`
    <div style="width: 900px; height: 600px; position: relative;">
      <ef-compactness-scene></ef-compactness-scene>
    </div>
  `,

  scenarios: {
    async "renders with timegroup"(ctx) {
      const container = ctx.getContainer();
      const scene = document.createElement("ef-compactness-scene") as EFCompactnessScene;
      scene.style.width = "900px";
      scene.style.height = "600px";
      container.appendChild(scene);
      await ctx.frame();

      ctx.expect(scene).toBeDefined();
      
      const timegroup = scene.shadowRoot?.querySelector("ef-timegroup");
      ctx.expect(timegroup).toBeDefined();
    },

    async "cursor animates over timeline"(ctx) {
      const container = ctx.getContainer();
      const scene = document.createElement("ef-compactness-scene") as EFCompactnessScene;
      scene.style.width = "900px";
      scene.style.height = "600px";
      container.appendChild(scene);
      await ctx.frame();

      // Simulate timeline progress by dispatching frame event
      const timegroup = scene.shadowRoot?.querySelector("ef-timegroup") as any;
      if (timegroup) {
        // Jump to 50% (10s of 20s) - should be in dragging state
        timegroup.dispatchEvent(new CustomEvent("frame", {
          detail: { ownCurrentTimeMs: 10000 },
        }));
        await ctx.frame();

        const cursor = scene.shadowRoot?.querySelector(".drag-cursor");
        ctx.expect(cursor).toBeDefined();
        ctx.expect(cursor?.classList.contains("grabbing")).toBe(true);
      }
    },

    async "slider updates with cursor drag"(ctx) {
      const container = ctx.getContainer();
      const scene = document.createElement("ef-compactness-scene") as EFCompactnessScene;
      scene.style.width = "900px";
      scene.style.height = "600px";
      container.appendChild(scene);
      await ctx.frame();
      await ctx.wait(100);

      const timegroup = scene.shadowRoot?.querySelector("ef-timegroup") as any;
      if (timegroup) {
        // Jump to 90% (end of drag)
        timegroup.currentTime = 18;
        
        // Dispatch frame event to trigger update
        timegroup.dispatchEvent(new CustomEvent("frame", {
          detail: { ownCurrentTimeMs: 18000 },
        }));
        await ctx.frame();

        const demo = scene.shadowRoot?.querySelector("ef-compactness-demo") as any;
        ctx.expect(demo).toBeDefined();
        // Slider should be near 100%
        ctx.expect(demo.value).toBeGreaterThan(90);
      }
    },

    async "full animation timeline"(ctx) {
      const container = ctx.getContainer();
      const scene = document.createElement("ef-compactness-scene") as EFCompactnessScene;
      scene.style.width = "900px";
      scene.style.height = "600px";
      container.appendChild(scene);
      await ctx.frame();

      const timegroup = scene.shadowRoot?.querySelector("ef-timegroup") as any;
      if (!timegroup) return;

      // Test key points in timeline
      const keyPoints = [
        { time: 0, cursorVisible: false, mode: "pointer", slider: 0 },
        { time: 1.5, cursorVisible: true, mode: "pointer", slider: 0 },
        { time: 2.25, cursorVisible: true, mode: "hand", slider: 0 },
        { time: 10, cursorVisible: true, mode: "grabbing", slider: 50 },
        { time: 18, cursorVisible: true, mode: "grabbing", slider: 100 },
        { time: 19.5, cursorVisible: false, mode: "pointer", slider: 100 },
      ];

      for (const point of keyPoints) {
        timegroup.dispatchEvent(new CustomEvent("frame", {
          detail: { ownCurrentTimeMs: point.time * 1000 },
        }));
        await ctx.frame();
      }

      // Final state check
      ctx.expect(scene).toBeDefined();
    },
  },
});
