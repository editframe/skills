import type { CSSResult, LitElement } from "lit";
// @ts-expect-error cannot figure out how to declare this module as a string
import twStyle from "./TWMixin.css?inline";

let twSheet: CSSStyleSheet | null = null;
if (typeof window !== "undefined" && typeof CSSStyleSheet !== "undefined") {
  try {
    twSheet = new CSSStyleSheet();
    if (typeof twSheet.replaceSync === "function") {
      twSheet.replaceSync(twStyle);
    }
  } catch (_error) {
    // CSSStyleSheet or replaceSync not supported in this environment
    twSheet = null;
  }
}
export function TWMixin<T extends new (...args: any[]) => LitElement>(Base: T) {
  class TWElement extends Base {
    createRenderRoot() {
      const renderRoot = super.createRenderRoot();
      if (!(renderRoot instanceof ShadowRoot)) {
        throw new Error("TWMixin can only be applied to elements with shadow roots");
      }
      if (!twSheet) {
        throw new Error(
          "twSheet not found. Probable cause: CSSStyleSheet not supported in this environment",
        );
      }

      const constructorStylesheets: CSSStyleSheet[] = [];
      const constructorStyles = (("styles" in this.constructor && this.constructor.styles) || []) as
        | CSSResult
        | CSSResult[];

      if (Array.isArray(constructorStyles)) {
        for (const item of constructorStyles) {
          if (item.styleSheet) {
            constructorStylesheets.push(item.styleSheet);
          }
        }
      } else if (constructorStyles.styleSheet) {
        constructorStylesheets.push(constructorStyles.styleSheet);
      }

      if (renderRoot?.adoptedStyleSheets) {
        renderRoot.adoptedStyleSheets = [
          twSheet,
          ...renderRoot.adoptedStyleSheets,
          ...constructorStylesheets,
        ];
      } else {
        renderRoot.adoptedStyleSheets = [twSheet, ...constructorStylesheets];
      }
      return renderRoot;
    }
  }

  return TWElement as T;
}
