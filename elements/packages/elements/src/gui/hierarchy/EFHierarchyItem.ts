import { consume } from "@lit/context";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

import { EFAudio } from "../../elements/EFAudio.js";
import { EFCaptions, EFCaptionsActiveWord } from "../../elements/EFCaptions.js";
import { EFImage } from "../../elements/EFImage.js";
import { EFText } from "../../elements/EFText.js";
import { EFTextSegment } from "../../elements/EFTextSegment.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
import { EFVideo } from "../../elements/EFVideo.js";
import { EFWaveform } from "../../elements/EFWaveform.js";
import { selectionContext } from "../../canvas/selection/selectionContext.js";
import { findRootTemporal } from "../../elements/findRootTemporal.js";
import { isEFTemporal } from "../../elements/EFTemporal.js";
import { type FocusContext, focusContext } from "../focusContext.js";
import { focusedElementContext } from "../focusedElementContext.js";
import { TWMixin } from "../TWMixin.js";
import { type HierarchyContext, hierarchyContext } from "./hierarchyContext.js";

const DEFAULT_HIDDEN_TAGS = new Set([
  "SPAN",
  "STYLE",
  "SCRIPT",
  "LINK",
  "META",
  "SLOT",
  "EF-WORKBENCH",
  "EF-FILMSTRIP",
  "EF-CONTROLS",
  "EF-SCRUBBER",
  "EF-TIMELINE-RULER",
  "EF-TRIM-HANDLES",
]);

export const shouldRenderElement = (
  element: Element,
  hideSelectors?: string[],
  showSelectors?: string[],
): boolean => {
  if (element instanceof HTMLElement && element.dataset?.efHidden) {
    return false;
  }

  // Skip default hidden tags (but allow them if explicitly shown)
  if (DEFAULT_HIDDEN_TAGS.has(element.tagName)) {
    // Still check show selectors - if explicitly shown, allow it
    if (showSelectors && showSelectors.length > 0) {
      return showSelectors.some((selector) => {
        try {
          return element.matches(selector);
        } catch {
          return false;
        }
      });
    }
    return false;
  }

  if (showSelectors && showSelectors.length > 0) {
    return showSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  if (hideSelectors && hideSelectors.length > 0) {
    return !hideSelectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  return true;
};

export function renderHierarchyChildren(
  children: Element[],
  hideSelectors?: string[],
  showSelectors?: string[],
  skipRootFiltering = false,
  temporalOnly = false,
): Array<TemplateResult<1> | typeof nothing> {
  return children.flatMap((child) => {
    if (
      !skipRootFiltering &&
      !shouldRenderElement(child, hideSelectors, showSelectors)
    ) {
      return nothing;
    }

    if (child instanceof EFTimegroup) {
      return html`<ef-timegroup-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-timegroup-hierarchy-item>`;
    }
    if (child instanceof EFImage) {
      return html`<ef-image-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-image-hierarchy-item>`;
    }
    if (child instanceof EFAudio) {
      return html`<ef-audio-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-audio-hierarchy-item>`;
    }
    if (child instanceof EFVideo) {
      return html`<ef-video-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-video-hierarchy-item>`;
    }
    if (child instanceof EFCaptions) {
      return html`<ef-captions-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-captions-hierarchy-item>`;
    }
    if (child instanceof EFCaptionsActiveWord) {
      return html`<ef-captions-active-word-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-captions-active-word-hierarchy-item>`;
    }
    if (child instanceof EFText) {
      return html`<ef-text-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-text-hierarchy-item>`;
    }
    if (child instanceof EFTextSegment) {
      return html`<ef-text-segment-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-text-segment-hierarchy-item>`;
    }
    if (child instanceof EFWaveform) {
      return html`<ef-waveform-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
        .temporalOnly=${temporalOnly}
      ></ef-waveform-hierarchy-item>`;
    }

    // Skip non-temporal HTML elements when temporalOnly is true
    if (temporalOnly) {
      return nothing;
    }

    // Handle all other HTML elements (plain DOM nodes, custom elements, etc.)
    if (child instanceof HTMLElement) {
      return html`<ef-html-hierarchy-item
        .element=${child}
        .hideSelectors=${hideSelectors}
        .showSelectors=${showSelectors}
      ></ef-html-hierarchy-item>`;
    }

    // Skip non-HTML elements
    return nothing;
  });
}

@customElement("ef-hierarchy-item")
export class EFHierarchyItem<
  ElementType extends HTMLElement = HTMLElement,
> extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
      }
      .item-row {
        display: flex;
        align-items: center;
        height: 1.5rem;
        padding-left: 0.5rem;
        font-size: 0.75rem;
        font-family: monospace;
        cursor: pointer;
        user-select: none;
      }
      .item-row:hover {
        background: var(--hierarchy-hover-bg, rgba(148, 163, 184, 0.2));
      }
      .item-row[data-selected] {
        background: var(--hierarchy-selected-bg, rgba(59, 130, 246, 0.3));
      }
      .item-row[data-ancestor-selected] {
        background: var(--hierarchy-ancestor-selected-bg, rgba(59, 130, 246, 0.15));
      }
      .item-row[data-focused] {
        background: var(--hierarchy-focused-bg, var(--filmstrip-timegroup-focused, rgba(148, 163, 184, 0.4)));
      }
      .item-row[data-dragging] {
        opacity: 0.5;
      }
      .expand-icon {
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .expand-icon svg {
        width: 0.75rem;
        height: 0.75rem;
        transition: transform 0.15s ease;
      }
      .expand-icon[data-expanded] svg {
        transform: rotate(90deg);
      }
      .icon {
        margin-right: 0.25rem;
        flex-shrink: 0;
      }
      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .children {
        padding-left: 1rem;
      }
      .children[data-collapsed] {
        display: none;
      }
      .drop-indicator {
        height: 2px;
        background: var(--hierarchy-drop-indicator, #3b82f6);
        margin-left: 1rem;
      }
      .drop-inside {
        outline: 2px solid var(--hierarchy-drop-indicator, #3b82f6);
        outline-offset: -2px;
      }
    `,
  ];

  @consume({ context: focusContext })
  focusContext?: FocusContext;

  @consume({ context: focusedElementContext, subscribe: true })
  focusedElement?: HTMLElement | null;

  @consume({ context: hierarchyContext, subscribe: true })
  hierarchyContext?: HierarchyContext;

  @consume({ context: selectionContext, subscribe: true })
  canvasSelectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

  @property({ type: Object, attribute: false })
  element: ElementType = new EFTimegroup() as unknown as ElementType;

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  @property({ type: Boolean, attribute: false })
  temporalOnly = false;

  @state()
  private localExpanded = true;

  private selectionChangeHandler?: (event: CustomEvent) => void;

  get elementId(): string {
    return this.element?.id || "";
  }

  get icon(): TemplateResult<1> | string {
    return "📄";
  }

  get isFocused(): boolean {
    return this.element && this.focusContext?.focusedElement === this.element;
  }

  get isSelected(): boolean {
    // Try to get selection context from hierarchy parent (which can access canvas)
    const selectionCtx =
      this.canvasSelectionContext ||
      this.hierarchyContext?.getCanvasSelectionContext?.();

    if (selectionCtx && this.elementId) {
      // Check if this element's ID is in the selected IDs
      return selectionCtx.selectedIds.has(this.elementId);
    }
    // Fall back to hierarchy's own selection state
    if (!this.hierarchyContext) return false;
    return this.hierarchyContext.state.selectedElementId === this.elementId;
  }

  get isAncestorSelected(): boolean {
    // Check if this element contains any selected element
    const selectionCtx =
      this.canvasSelectionContext ||
      this.hierarchyContext?.getCanvasSelectionContext?.();

    if (selectionCtx && this.element) {
      for (const selectedId of selectionCtx.selectedIds) {
        const selectedElement = document.getElementById(selectedId);
        if (
          selectedElement &&
          this.element.contains(selectedElement) &&
          selectedElement !== this.element
        ) {
          return true;
        }
      }
    }
    return false;
  }

  get isExpanded(): boolean {
    if (!this.hierarchyContext || !this.elementId) return this.localExpanded;
    return this.hierarchyContext.state.expandedIds.has(this.elementId);
  }

  get isDragging(): boolean {
    if (!this.hierarchyContext) return false;
    return this.hierarchyContext.state.draggedElementId === this.elementId;
  }

  get isDropTarget(): boolean {
    if (!this.hierarchyContext) return false;
    return this.hierarchyContext.state.dropTargetId === this.elementId;
  }

  get dropPosition(): "before" | "after" | "inside" | null {
    if (!this.isDropTarget || !this.hierarchyContext) return null;
    return this.hierarchyContext.state.dropPosition;
  }

  get hasChildren(): boolean {
    return this.element.children.length > 0;
  }

  displayLabel(): TemplateResult<1> | string | typeof nothing {
    return this.elementId || "(unnamed)";
  }

  private handleClick(e: Event): void {
    e.stopPropagation();
    if (this.hierarchyContext && this.elementId) {
      this.hierarchyContext.actions.select(this.elementId);
    }
    if (this.focusContext) {
      this.focusContext.focusedElement = this.element;
    }
  }

  private handleExpandClick(e: Event): void {
    e.stopPropagation();
    if (this.hierarchyContext && this.elementId) {
      this.hierarchyContext.actions.toggleExpanded(this.elementId);
    } else {
      this.localExpanded = !this.localExpanded;
    }
  }

  private handleDragStart(e: DragEvent): void {
    if (!this.hierarchyContext || !this.elementId) return;
    e.dataTransfer?.setData("text/plain", this.elementId);
    this.hierarchyContext.actions.startDrag(this.elementId);
  }

  private handleDragEnd(): void {
    if (this.hierarchyContext) {
      this.hierarchyContext.actions.endDrag();
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.hierarchyContext || !this.elementId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: "before" | "after" | "inside";
    if (y < height * 0.25) {
      position = "before";
    } else if (y > height * 0.75) {
      position = "after";
    } else {
      position = "inside";
    }

    this.hierarchyContext.actions.updateDropTarget(this.elementId, position);
  }

  private handleDragLeave(): void {
    if (this.hierarchyContext && this.isDropTarget) {
      this.hierarchyContext.actions.updateDropTarget(null, null);
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (!this.hierarchyContext || !this.elementId) return;

    const sourceId = e.dataTransfer?.getData("text/plain");
    if (sourceId && this.dropPosition) {
      this.hierarchyContext.actions.reorder(
        sourceId,
        this.elementId,
        this.dropPosition,
      );
    }
    this.hierarchyContext.actions.endDrag();
  }

  private handleMouseEnter(): void {
    if (this.focusContext) {
      this.focusContext.focusedElement = this.element;
    }
    // Dispatch event for cross-view hover sync
    this.dispatchEvent(
      new CustomEvent("hierarchy-hover", {
        detail: { element: this.element },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleMouseLeave(): void {
    if (this.focusContext) {
      this.focusContext.focusedElement = null;
    }
    // Dispatch event for cross-view hover sync
    this.dispatchEvent(
      new CustomEvent("hierarchy-hover", {
        detail: { element: null },
        bubbles: true,
        composed: true,
      }),
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setupSelectionListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeSelectionListener();
  }

  protected willUpdate(): void {
    // Set up listener if context becomes available
    if (!this.selectionChangeHandler) {
      this.setupSelectionListener();
    }
  }

  private setupSelectionListener(): void {
    // Don't set up if already set up
    if (this.selectionChangeHandler) {
      return;
    }

    const selectionCtx =
      this.canvasSelectionContext ||
      this.hierarchyContext?.getCanvasSelectionContext?.();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => {
        this.requestUpdate(); // Trigger re-render to update selected state
      };
      (selectionCtx as any).addEventListener(
        "selectionchange",
        this.selectionChangeHandler,
      );
    }
  }

  private removeSelectionListener(): void {
    const selectionCtx =
      this.canvasSelectionContext ||
      this.hierarchyContext?.getCanvasSelectionContext?.();
    if (
      selectionCtx &&
      "removeEventListener" in selectionCtx &&
      this.selectionChangeHandler
    ) {
      (selectionCtx as any).removeEventListener(
        "selectionchange",
        this.selectionChangeHandler,
      );
      this.selectionChangeHandler = undefined;
    }
  }

  render() {
    const expanded = this.isExpanded;

    return html`
      ${this.dropPosition === "before" ? html`<div class="drop-indicator"></div>` : nothing}
      <div
        class="item-row ${this.dropPosition === "inside" ? "drop-inside" : ""}"
        ?data-focused=${this.isFocused}
        ?data-selected=${this.isSelected}
        ?data-ancestor-selected=${this.isAncestorSelected}
        ?data-dragging=${this.isDragging}
        draggable="true"
        @click=${this.handleClick}
        @dragstart=${this.handleDragStart}
        @dragend=${this.handleDragEnd}
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        ${
          this.hasChildren
            ? html`
              <span
                class="expand-icon"
                ?data-expanded=${expanded}
                @click=${this.handleExpandClick}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            `
            : html`<span class="expand-icon"></span>`
        }
        <span class="icon">${this.icon}</span>
        <span class="label">${this.displayLabel()}</span>
      </div>
      ${
        this.hasChildren
          ? html`
            <div class="children" ?data-collapsed=${!expanded}>
              ${this.renderChildren()}
            </div>
          `
          : nothing
      }
      ${this.dropPosition === "after" ? html`<div class="drop-indicator"></div>` : nothing}
    `;
  }

  renderChildren(): Array<TemplateResult<1> | typeof nothing> | typeof nothing {
    return renderHierarchyChildren(
      Array.from(this.element.children),
      this.hideSelectors,
      this.showSelectors,
      false,
      this.temporalOnly,
    );
  }
}

@customElement("ef-timegroup-hierarchy-item")
export class EFTimegroupHierarchyItem extends EFHierarchyItem<EFTimegroup> {
  get icon() {
    return "🕒";
  }

  displayLabel(): string | TemplateResult<1> | typeof nothing {
    return this.element.mode ?? "(no mode)";
  }
}

@customElement("ef-audio-hierarchy-item")
export class EFAudioHierarchyItem extends EFHierarchyItem<EFAudio> {
  get icon() {
    return "🔊";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-video-hierarchy-item")
export class EFVideoHierarchyItem extends EFHierarchyItem<EFVideo> {
  get icon() {
    return "📼";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-captions-hierarchy-item")
export class EFCaptionsHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "📝";
  }

  displayLabel() {
    return "Captions";
  }
}

@customElement("ef-captions-active-word-hierarchy-item")
export class EFCaptionsActiveWordHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "🗣️";
  }

  displayLabel() {
    return "Active Word";
  }
}

@customElement("ef-text-hierarchy-item")
export class EFTextHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "📄";
  }

  displayLabel() {
    return "Text";
  }
}

@customElement("ef-text-segment-hierarchy-item")
export class EFTextSegmentHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "📄";
  }

  displayLabel() {
    return "Segment";
  }
}

@customElement("ef-waveform-hierarchy-item")
export class EFWaveformHierarchyItem extends EFHierarchyItem {
  get icon() {
    return "🌊";
  }

  renderChildren(): typeof nothing {
    return nothing;
  }
}

@customElement("ef-image-hierarchy-item")
export class EFImageHierarchyItem extends EFHierarchyItem<EFImage> {
  get icon() {
    return "🖼️";
  }

  displayLabel() {
    return this.element.src ?? "(no src)";
  }
}

@customElement("ef-html-hierarchy-item")
export class EFHTMLHierarchyItem extends EFHierarchyItem {
  get icon() {
    return html`<code>${`<${this.element.tagName.toLowerCase()}>`}</code>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-hierarchy-item": EFHierarchyItem;
    "ef-timegroup-hierarchy-item": EFTimegroupHierarchyItem;
    "ef-audio-hierarchy-item": EFAudioHierarchyItem;
    "ef-video-hierarchy-item": EFVideoHierarchyItem;
    "ef-captions-hierarchy-item": EFCaptionsHierarchyItem;
    "ef-captions-active-word-hierarchy-item": EFCaptionsActiveWordHierarchyItem;
    "ef-text-hierarchy-item": EFTextHierarchyItem;
    "ef-text-segment-hierarchy-item": EFTextSegmentHierarchyItem;
    "ef-waveform-hierarchy-item": EFWaveformHierarchyItem;
    "ef-image-hierarchy-item": EFImageHierarchyItem;
    "ef-html-hierarchy-item": EFHTMLHierarchyItem;
  }
}
