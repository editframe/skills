import { createContext } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { provide } from "@lit/context";

/**
 * Context key for preview mode.
 * Elements can consume this to check if they're in a preview context.
 */
export const previewContext = createContext<boolean>(Symbol("ef-preview-context"));

/**
 * Preview context element.
 *
 * Wraps content that should render in "preview mode" - timegroups inside
 * this context will not create workbenches and can be freely manipulated
 * for thumbnail/preview rendering.
 *
 * Usage:
 * ```html
 * <ef-preview-context>
 *   <ef-timegroup>...</ef-timegroup>
 * </ef-preview-context>
 * ```
 */
@customElement("ef-preview-context")
export class EFPreviewContext extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `;

  @provide({ context: previewContext })
  // @ts-ignore
  private _isPreview = true;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-preview-context": EFPreviewContext;
  }
}
