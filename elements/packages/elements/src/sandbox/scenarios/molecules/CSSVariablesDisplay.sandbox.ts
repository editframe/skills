import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../atoms/CSSVariableLine.sandbox.js"; // Registers ef-css-variable-line

/**
 * Molecule: CSS Variables Display
 * 
 * Displays a group of CSS variables with a header.
 * Combines multiple CSSVariableLine atoms into a cohesive display.
 */
@customElement("ef-css-variables-display")
export class EFCSSVariablesDisplay extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--display-bg, rgba(0, 0, 0, 0.6));
      border: 1px solid var(--display-border, rgba(148, 163, 184, 0.2));
      border-radius: 12px;
      padding: 20px;
    }

    .header {
      font-size: 11px;
      font-weight: 600;
      color: var(--display-header-color, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      font-family: system-ui, -apple-system, sans-serif;
    }

    .variables {
      display: flex;
      flex-direction: column;
    }
  `;

  @property({ type: String })
  header = "CSS Variables";

  @property({ type: Array, attribute: false })
  variables: Array<{ name: string; value: string }> = [];

  render() {
    return html`
      <div class="header">${this.header}</div>
      <div class="variables">
        ${this.variables.map(
          (v) => html`
            <ef-css-variable-line
              var-name=${v.name}
              .value=${v.value}
            ></ef-css-variable-line>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-css-variables-display": EFCSSVariablesDisplay;
  }
}

export default defineSandbox({
  name: "CSSVariablesDisplay",
  description: "Molecule: Group of CSS variables with header",
  category: "panels",

  render: () => html`
    <div style="width: 400px; padding: 20px; background: #0f172a;">
      <ef-css-variables-display
        header="CSS Variables"
        .variables=${[
          { name: "--hierarchy-item-height", value: "32px" },
          { name: "--hierarchy-item-font-size", value: "13px" },
          { name: "--hierarchy-indent", value: "20px" },
        ]}
      ></ef-css-variables-display>
    </div>
  `,

  scenarios: {
    async "renders with header and variables"(ctx) {
      const container = ctx.getContainer();
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "CSS Variables";
      display.variables = [
        { name: "--hierarchy-item-height", value: "32px" },
        { name: "--hierarchy-item-font-size", value: "13px" },
        { name: "--hierarchy-indent", value: "20px" },
      ];
      container.appendChild(display);
      await ctx.frame();

      ctx.expect(display).toBeDefined();
      ctx.expect(display.header).toBe("CSS Variables");
      ctx.expect(display.variables.length).toBe(3);
    },

    async "renders all variable lines"(ctx) {
      const container = ctx.getContainer();
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "CSS Variables";
      display.variables = [
        { name: "--hierarchy-item-height", value: "32px" },
        { name: "--hierarchy-item-font-size", value: "13px" },
        { name: "--hierarchy-indent", value: "20px" },
      ];
      container.appendChild(display);
      await ctx.frame();

      const lines = display.shadowRoot?.querySelectorAll("ef-css-variable-line");
      ctx.expect(lines?.length).toBe(3);
    },

    async "updates variables dynamically"(ctx) {
      const container = ctx.getContainer();
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "CSS Variables";
      display.variables = [
        { name: "--hierarchy-item-height", value: "32px" },
        { name: "--hierarchy-item-font-size", value: "13px" },
        { name: "--hierarchy-indent", value: "20px" },
      ];
      container.appendChild(display);
      await ctx.frame();

      // Update all values (simulating compactness change)
      display.variables = [
        { name: "--hierarchy-item-height", value: "24px" },
        { name: "--hierarchy-item-font-size", value: "11px" },
        { name: "--hierarchy-indent", value: "12px" },
      ];
      await ctx.frame();

      const lines = display.shadowRoot?.querySelectorAll("ef-css-variable-line");
      ctx.expect(lines?.length).toBe(3);
      
      // Verify first line has updated value
      const firstLine = lines?.[0];
      ctx.expect(firstLine?.getAttribute("value") || (firstLine as any)?.value).toBe("24px");
    },

    async "renders empty when no variables"(ctx) {
      const container = ctx.getContainer();
      container.innerHTML = "";
      
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "Empty Display";
      display.variables = [];
      container.appendChild(display);
      await ctx.frame();

      const lines = display.shadowRoot?.querySelectorAll("ef-css-variable-line");
      ctx.expect(lines?.length).toBe(0);
    },

    async "animates value transitions"(ctx) {
      const container = ctx.getContainer();
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "CSS Variables";
      display.variables = [
        { name: "--hierarchy-item-height", value: "32px" },
        { name: "--hierarchy-item-font-size", value: "13px" },
        { name: "--hierarchy-indent", value: "20px" },
      ];
      container.appendChild(display);
      await ctx.frame();

      // Simulate animation from 0% to 100% compactness
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const heightPx = 32 - (t * 12);
        const fontSizePx = 13 - (t * 2);
        const indentPx = 20 - (t * 8);

        display.variables = [
          { name: "--hierarchy-item-height", value: `${heightPx.toFixed(0)}px` },
          { name: "--hierarchy-item-font-size", value: `${fontSizePx.toFixed(1)}px` },
          { name: "--hierarchy-indent", value: `${indentPx.toFixed(0)}px` },
        ];
        await ctx.frame();
      }

      // Final state
      ctx.expect(display.variables[0].value).toBe("20px");
      ctx.expect(display.variables[2].value).toBe("12px");
    },

    async "supports custom header"(ctx) {
      const container = ctx.getContainer();
      container.innerHTML = "";
      
      const display = document.createElement("ef-css-variables-display") as EFCSSVariablesDisplay;
      display.header = "Custom Properties";
      display.variables = [{ name: "--custom-var", value: "test" }];
      container.appendChild(display);
      await ctx.frame();

      const header = display.shadowRoot?.querySelector(".header");
      ctx.expect(header?.textContent).toBe("Custom Properties");
    },
  },
});
