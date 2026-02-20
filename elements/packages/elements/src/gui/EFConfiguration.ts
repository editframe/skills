import { createContext, provide } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

export const efConfigurationContext = createContext<EFConfiguration | null>(
  Symbol("efConfigurationContext"),
);

@customElement("ef-configuration")
export class EFConfiguration extends LitElement {
  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
  ];

  @provide({ context: efConfigurationContext })
  efConfiguration = this;

  @property({ type: String, attribute: "api-host" })
  apiHost?: string;

  @property({ type: String, attribute: "signing-url" })
  signingURL = "/@ef-sign-url";

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-configuration": EFConfiguration;
  }
}
