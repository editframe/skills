import { defineSandbox } from "../../defineSandbox.js";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * Atom: CSS Variable Line
 * 
 * Displays a single CSS custom property with its name and value.
 * Format: --variable-name: value
 */
@customElement("ef-css-variable-line")
export class EFCSSVariableLine extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 6px 0;
      color: var(--css-line-color, #e2e8f0);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      font-size: var(--css-line-font-size, 13px);
    }

    .var-name {
      color: var(--css-var-color, #22c55e);
    }

    .colon {
      color: var(--css-colon-color, #64748b);
      margin: 0 8px;
    }

    .value {
      color: var(--css-value-color, #f97316);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      min-width: 50px;
    }
  `;

  @property({ type: String, attribute: "var-name" })
  varName = "--example-var";

  @property({ type: String })
  value = "0";

  render() {
    return html`
      <span class="var-name">${this.varName}</span>
      <span class="colon">:</span>
      <span class="value">${this.value}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-css-variable-line": EFCSSVariableLine;
  }
}

export default defineSandbox({
  name: "CSSVariableLine",
  description: "Atom: Single CSS custom property display (--var-name: value)",
  category: "demos",
  subcategory: "compactness",

  render: () => html`
    <div style="background: rgba(0,0,0,0.6); padding: 20px; border-radius: 8px;">
      <ef-css-variable-line
        var-name="--hierarchy-item-height"
        value="32px"
      ></ef-css-variable-line>
    </div>
  `,

  scenarios: {
    async "renders with default values"(ctx) {
      const container = ctx.getContainer();
      const line = document.createElement("ef-css-variable-line") as EFCSSVariableLine;
      container.appendChild(line);
      await ctx.frame();

      ctx.expect(line).toBeDefined();
      ctx.expect(line.varName).toBe("--example-var");
      ctx.expect(line.value).toBe("0");
    },

    async "renders with custom variable name and value"(ctx) {
      const container = ctx.getContainer();
      const line = document.createElement("ef-css-variable-line") as EFCSSVariableLine;
      line.varName = "--hierarchy-item-height";
      line.value = "32px";
      container.appendChild(line);
      await ctx.frame();

      ctx.expect(line.varName).toBe("--hierarchy-item-height");
      ctx.expect(line.value).toBe("32px");
    },

    async "updates value dynamically"(ctx) {
      const container = ctx.getContainer();
      const line = document.createElement("ef-css-variable-line") as EFCSSVariableLine;
      line.varName = "--hierarchy-item-height";
      line.value = "32px";
      container.appendChild(line);
      await ctx.frame();

      line.value = "24px";
      await ctx.frame();

      ctx.expect(line.value).toBe("24px");
      
      // Verify the value is rendered in the DOM
      const valueSpan = line.shadowRoot?.querySelector(".value");
      ctx.expect(valueSpan?.textContent).toBe("24px");
    },

    async "updates variable name dynamically"(ctx) {
      const container = ctx.getContainer();
      const line = document.createElement("ef-css-variable-line") as EFCSSVariableLine;
      line.varName = "--hierarchy-item-height";
      line.value = "32px";
      container.appendChild(line);
      await ctx.frame();

      line.varName = "--hierarchy-indent";
      await ctx.frame();

      ctx.expect(line.varName).toBe("--hierarchy-indent");
      
      const nameSpan = line.shadowRoot?.querySelector(".var-name");
      ctx.expect(nameSpan?.textContent).toBe("--hierarchy-indent");
    },

    async "renders multiple lines"(ctx) {
      const container = ctx.getContainer();
      const variables = [
        { name: "--hierarchy-item-height", value: "32px" },
        { name: "--hierarchy-item-font-size", value: "13px" },
        { name: "--hierarchy-indent", value: "20px" },
      ];

      for (const v of variables) {
        const line = document.createElement("ef-css-variable-line") as EFCSSVariableLine;
        line.varName = v.name;
        line.value = v.value;
        container.appendChild(line);
      }

      await ctx.frame();

      const lines = container.querySelectorAll("ef-css-variable-line");
      // 1 from render() + 3 created in this test = 4 total
      ctx.expect(lines.length).toBe(4);
    },
  },
});
