import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * Atom: Compactness Slider
 * 
 * A range input slider with "Spacious" and "Compact" labels.
 * Emits 'change' events when the value changes.
 */
@customElement("ef-compactness-slider")
export class EFCompactnessSlider extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .slider-section {
      background: var(--slider-bg, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--slider-border, rgba(148, 163, 184, 0.2));
      border-radius: 12px;
      padding: 24px;
    }

    .slider-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--slider-label-color, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .slider-min,
    .slider-max {
      font-size: 12px;
      color: var(--slider-label-color, #64748b);
      white-space: nowrap;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .slider-track-wrapper {
      position: relative;
      flex: 1;
      display: flex;
    }

    input[type="range"] {
      width: 100%;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--slider-track-bg, rgba(71, 85, 105, 0.5));
      border-radius: 4px;
      outline: none;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: 3px solid #e2e8f0;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      cursor: grab;
    }

    input[type="range"]::-webkit-slider-thumb:active {
      cursor: grabbing;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.6);
    }

    input[type="range"]::-moz-range-thumb {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: 3px solid #e2e8f0;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      cursor: grab;
    }

    input[type="range"]::-moz-range-track {
      background: var(--slider-track-bg, rgba(71, 85, 105, 0.5));
      border-radius: 4px;
      height: 8px;
    }
  `;

  @property({ type: Number })
  value = 0;

  @property({ type: String })
  label = "Compactness";

  @property({ type: String, attribute: "min-label" })
  minLabel = "Spacious";

  @property({ type: String, attribute: "max-label" })
  maxLabel = "Compact";

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
    
    this.dispatchEvent(new CustomEvent("change", {
      detail: { value: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="slider-section">
        <label class="slider-label">${this.label}</label>
        <div class="slider-container">
          <span class="slider-min">${this.minLabel}</span>
          <div class="slider-track-wrapper">
            <input
              type="range"
              min="0"
              max="100"
              .value=${String(this.value)}
              @input=${this.handleInput}
            />
          </div>
          <span class="slider-max">${this.maxLabel}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-compactness-slider": EFCompactnessSlider;
  }
}

export default defineSandbox({
  name: "CompactnessSlider",
  description: "Atom: Range slider with Spacious/Compact labels",
  category: "controls",

  render: () => html`
    <div style="width: 400px; padding: 20px;">
      <ef-compactness-slider value="50"></ef-compactness-slider>
    </div>
  `,

  scenarios: {
    async "renders with default values"(ctx) {
      const container = ctx.getContainer();
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      container.appendChild(slider);
      await ctx.frame();

      ctx.expect(slider).toBeDefined();
      ctx.expect(slider.value).toBe(0);
      ctx.expect(slider.label).toBe("Compactness");
      ctx.expect(slider.minLabel).toBe("Spacious");
      ctx.expect(slider.maxLabel).toBe("Compact");
    },

    async "renders with provided value"(ctx) {
      const container = ctx.getContainer();
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      slider.value = 50;
      container.appendChild(slider);
      await ctx.frame();

      ctx.expect(slider.value).toBe(50);
    },

    async "updates value programmatically"(ctx) {
      const container = ctx.getContainer();
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      slider.value = 50;
      container.appendChild(slider);
      await ctx.frame();

      slider.value = 75;
      await ctx.frame();

      ctx.expect(slider.value).toBe(75);
      
      const input = slider.shadowRoot?.querySelector("input[type='range']") as HTMLInputElement;
      ctx.expect(Number(input.value)).toBe(75);
    },

    async "emits change event on input"(ctx) {
      const container = ctx.getContainer();
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      slider.value = 50;
      container.appendChild(slider);
      await ctx.frame();

      let emittedValue: number | undefined;
      slider.addEventListener("change", (e) => {
        emittedValue = (e as CustomEvent<{ value: number }>).detail.value;
      });

      // Simulate input change
      const input = slider.shadowRoot?.querySelector("input[type='range']") as HTMLInputElement;
      input.value = "80";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await ctx.frame();

      ctx.expect(emittedValue).toBe(80);
      ctx.expect(slider.value).toBe(80);
    },

    async "supports custom labels"(ctx) {
      const container = ctx.getContainer();
      container.innerHTML = "";
      
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      slider.label = "Density";
      slider.minLabel = "Loose";
      slider.maxLabel = "Tight";
      container.appendChild(slider);
      await ctx.frame();

      const label = slider.shadowRoot?.querySelector(".slider-label");
      const minLabel = slider.shadowRoot?.querySelector(".slider-min");
      const maxLabel = slider.shadowRoot?.querySelector(".slider-max");

      ctx.expect(label?.textContent).toBe("Density");
      ctx.expect(minLabel?.textContent).toBe("Loose");
      ctx.expect(maxLabel?.textContent).toBe("Tight");
    },

    async "slider drag interaction"(ctx) {
      const container = ctx.getContainer();
      const slider = document.createElement("ef-compactness-slider") as EFCompactnessSlider;
      slider.value = 50;
      container.appendChild(slider);
      await ctx.frame();

      let changeCount = 0;
      slider.addEventListener("change", () => {
        changeCount++;
      });

      const input = slider.shadowRoot?.querySelector("input[type='range']") as HTMLInputElement;
      
      // Simulate dragging from 50 to 100
      for (let v = 50; v <= 100; v += 10) {
        input.value = String(v);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await ctx.frame();
      }

      ctx.expect(slider.value).toBe(100);
      ctx.expect(changeCount).toBeGreaterThan(0);
    },
  },
});
