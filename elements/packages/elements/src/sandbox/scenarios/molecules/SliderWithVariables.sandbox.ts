import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../atoms/CompactnessSlider.sandbox.js"; // Registers ef-compactness-slider
import "./CSSVariablesDisplay.sandbox.js"; // Registers ef-css-variables-display

/**
 * Molecule: Slider With Variables
 * 
 * Combines CompactnessSlider with CSSVariablesDisplay.
 * The slider controls the CSS variable values in real-time.
 */
@customElement("ef-slider-with-variables")
export class EFSliderWithVariables extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
  `;

  @property({ type: Number })
  value = 0;

  @state()
  private computedVariables: Array<{ name: string; value: string }> = [];

  connectedCallback() {
    super.connectedCallback();
    this.updateComputedVariables();
  }

  private handleSliderChange(e: CustomEvent<{ value: number }>) {
    this.value = e.detail.value;
    this.updateComputedVariables();
    
    this.dispatchEvent(new CustomEvent("change", {
      detail: { 
        value: this.value,
        variables: this.computedVariables,
      },
      bubbles: true,
      composed: true,
    }));
  }

  private updateComputedVariables() {
    const compactness = this.value / 100;
    const heightPx = 32 - (compactness * 12);
    const fontSizePx = 13 - (compactness * 2);
    const indentPx = 20 - (compactness * 8);

    this.computedVariables = [
      { name: "--hierarchy-item-height", value: `${heightPx.toFixed(0)}px` },
      { name: "--hierarchy-item-font-size", value: `${fontSizePx.toFixed(1)}px` },
      { name: "--hierarchy-indent", value: `${indentPx.toFixed(0)}px` },
    ];
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value")) {
      this.updateComputedVariables();
    }
  }

  render() {
    return html`
      <ef-compactness-slider
        .value=${this.value}
        @change=${this.handleSliderChange}
      ></ef-compactness-slider>
      
      <ef-css-variables-display
        header="CSS Variables"
        .variables=${this.computedVariables}
      ></ef-css-variables-display>
    `;
  }

  /**
   * Get the current computed CSS variables.
   */
  getVariables(): Array<{ name: string; value: string }> {
    return this.computedVariables;
  }

  /**
   * Get a specific variable value by name.
   */
  getVariableValue(name: string): string | undefined {
    return this.computedVariables.find(v => v.name === name)?.value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-slider-with-variables": EFSliderWithVariables;
  }
}

export default defineSandbox({
  name: "SliderWithVariables",
  description: "Molecule: Compactness slider controlling CSS variable values",
  category: "demos",
  subcategory: "compactness",

  render: () => html`
    <div style="width: 400px; padding: 20px; background: #0f172a;">
      <ef-slider-with-variables value="50"></ef-slider-with-variables>
    </div>
  `,

  scenarios: {
    async "renders slider and variables display"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 50;
      container.appendChild(component);
      await ctx.frame();

      ctx.expect(component).toBeDefined();
      
      const slider = component.shadowRoot?.querySelector("ef-compactness-slider");
      const display = component.shadowRoot?.querySelector("ef-css-variables-display");
      
      ctx.expect(slider).toBeDefined();
      ctx.expect(display).toBeDefined();
    },

    async "computes initial variable values at 50%"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 50;
      container.appendChild(component);
      await ctx.frame();

      const vars = component.getVariables();
      ctx.expect(vars.length).toBe(3);
      
      // At 50% compactness:
      // height: 32 - (0.5 * 12) = 26
      // font: 13 - (0.5 * 2) = 12
      // indent: 20 - (0.5 * 8) = 16
      ctx.expect(component.getVariableValue("--hierarchy-item-height")).toBe("26px");
      ctx.expect(component.getVariableValue("--hierarchy-indent")).toBe("16px");
    },

    async "updates variables when slider changes"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 50;
      container.appendChild(component);
      await ctx.frame();

      component.value = 0;
      await ctx.frame();

      // At 0% compactness (spacious)
      ctx.expect(component.getVariableValue("--hierarchy-item-height")).toBe("32px");
      ctx.expect(component.getVariableValue("--hierarchy-indent")).toBe("20px");

      component.value = 100;
      await ctx.frame();

      // At 100% compactness
      ctx.expect(component.getVariableValue("--hierarchy-item-height")).toBe("20px");
      ctx.expect(component.getVariableValue("--hierarchy-indent")).toBe("12px");
    },

    async "emits change event with variables"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 50;
      container.appendChild(component);
      await ctx.frame();

      let emittedValue: number | undefined;
      let emittedVariables: Array<{ name: string; value: string }> | undefined;
      
      component.addEventListener("change", (e) => {
        const detail = (e as CustomEvent).detail;
        emittedValue = detail.value;
        emittedVariables = detail.variables;
      });

      // Directly call the component's internal handler to simulate a slider change
      // This tests the change event emission logic without relying on shadow DOM event bubbling
      (component as any).handleSliderChange({ detail: { value: 75 } });
      await ctx.frame();

      ctx.expect(emittedValue).toBe(75);
      ctx.expect(emittedVariables).toBeDefined();
      ctx.expect(emittedVariables!.length).toBe(3);
    },

    async "animates full range"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 0;
      container.appendChild(component);
      await ctx.frame();

      // Test animation from 0 to 100
      const values: number[] = [];
      for (let i = 0; i <= 100; i += 10) {
        component.value = i;
        await ctx.frame();
        values.push(component.value);
      }

      ctx.expect(values.length).toBe(11);
      ctx.expect(values[0]).toBe(0);
      ctx.expect(values[10]).toBe(100);

      // Final state should be max compactness
      ctx.expect(component.getVariableValue("--hierarchy-item-height")).toBe("20px");
    },

    async "variables display updates in sync"(ctx) {
      const container = ctx.getContainer();
      const component = document.createElement("ef-slider-with-variables") as EFSliderWithVariables;
      component.value = 100;
      container.appendChild(component);
      await ctx.frame();

      const display = component.shadowRoot?.querySelector("ef-css-variables-display");
      const lines = (display as any)?.shadowRoot?.querySelectorAll("ef-css-variable-line");
      
      ctx.expect(lines?.length).toBe(3);
    },
  },
});
