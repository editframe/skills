import { provide } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { isEFTemporal } from "../elements/EFTemporal.js";
import { EFTargetable } from "../elements/TargetController.js";
import { ContextMixin } from "./ContextMixin.js";
import { focusedElementContext } from "./focusedElementContext.js";
import { TWMixin } from "./TWMixin.js";

@customElement("ef-preview")
export class EFPreview extends EFTargetable(ContextMixin(TWMixin(LitElement))) {
  static styles = [
    css`
      :host {
        position: relative;
        display: block;
        cursor: crosshair;
      }
    `,
  ];

  @provide({ context: focusedElementContext })
  focusedElement?: HTMLElement;

  /**
   * Find the closest temporal element (timegroup, video, audio, etc.)
   */
  private findClosestTemporal(element: HTMLElement | null): HTMLElement | null {
    let current = element;
    while (current && current !== this) {
      if (isEFTemporal(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  constructor() {
    super();
    this.addEventListener("pointerover", (e) => {
      const target = e.target as HTMLElement;
      const temporal = this.findClosestTemporal(target);
      if (target !== this && temporal) {
        this.focusedElement = target;
      }
    });
    this.addEventListener("pointerout", (e) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      const targetingTemporal = this.findClosestTemporal(relatedTarget);
      // Clear focus if:
      // 1. Moving outside the preview entirely, or
      // 2. Moving to the preview itself, or
      // 3. Moving to an element that's not within a temporal
      if (
        !this.contains(relatedTarget) ||
        relatedTarget === this ||
        !targetingTemporal
      ) {
        this.focusedElement = undefined;
      }
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-preview": EFPreview;
  }
}
