import { consume } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
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

import { TWMixin } from "../TWMixin.js";
import { phosphorIcon, ICONS } from "../icons.js";
import { type HierarchyContext, hierarchyContext } from "./hierarchyContext.js";
import { getElementTypeColor } from "../theme.js";

const DEFAULT_HIDDEN_TAGS = new Set([
  "SPAN",
  "STYLE",
  "SCRIPT",
  "LINK",
  "META",
  "SLOT",
  "TEMPLATE",
  "EF-WORKBENCH",
  "EF-FILMSTRIP",
  "EF-CONTROLS",
  "EF-SCRUBBER",
  "EF-TIMELINE-RULER",
  "EF-TRIM-HANDLES",
  "EF-TEXT-SEGMENT",
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
    if (!skipRootFiltering && !shouldRenderElement(child, hideSelectors, showSelectors)) {
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
    // Skip text segments - they're shown within the parent text element
    if (child instanceof EFTextSegment) {
      return nothing;
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
export class EFHierarchyItem<ElementType extends HTMLElement = HTMLElement> extends TWMixin(
  LitElement,
) {
  static styles = [
    css`
      :host {
        display: block;
      }
      .item-row {
        display: flex;
        align-items: center;
        height: var(--hierarchy-item-height, 1.5rem);
        padding-left: var(--hierarchy-item-padding-left, 0.5rem);
        padding-right: var(--hierarchy-item-padding-right, 0.5rem);
        padding-top: var(--hierarchy-item-padding-top, 0);
        padding-bottom: var(--hierarchy-item-padding-bottom, 0);
        font-size: var(--hierarchy-item-font-size, 0.75rem);
        font-family: system-ui, -apple-system, sans-serif;
        cursor: pointer;
        user-select: none;
        border-left: 3px solid transparent;
        transition: background-color 0.1s ease;
      }
      .item-row:hover {
        background: var(--ef-color-hover);
      }
      .item-row[data-selected] {
        background: var(--ef-color-selected);
        border-left-color: var(--ef-color-primary);
      }
      .item-row[data-ancestor-selected] {
        background: var(--ef-color-selected-subtle);
      }
      .item-row[data-focused] {
        background: var(--ef-color-focused);
        border-left-color: var(--ef-color-primary);
      }
      .item-row[data-dragging] {
        opacity: 0.5;
      }
      .expand-icon {
        width: var(--hierarchy-expand-icon-size, 1rem);
        height: var(--hierarchy-expand-icon-size, 1rem);
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
        margin-right: var(--hierarchy-icon-gap, 0.25rem);
        flex-shrink: 0;
      }
      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .children {
        padding-left: var(--hierarchy-indent, 0.75rem);
      }
      .children[data-collapsed] {
        display: none;
      }
      .drop-indicator {
        height: 2px;
        background: var(--hierarchy-drop-indicator, #3b82f6);
        margin-left: var(--hierarchy-indent, 0.75rem);
      }
      .drop-inside {
        outline: 2px solid var(--hierarchy-drop-indicator, #3b82f6);
        outline-offset: -2px;
      }
    `,
  ];

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
    return phosphorIcon(ICONS.code);
  }

  get typeColor(): string {
    return getElementTypeColor("timegroup", this);
  }

  get isFocused(): boolean {
    const highlightedElement = this.hierarchyContext?.getHighlightedElement?.();
    return this.element && highlightedElement === this.element;
  }

  get isSelected(): boolean {
    // Try to get selection context from hierarchy parent (which can access canvas)
    const selectionCtx =
      this.canvasSelectionContext || this.hierarchyContext?.getCanvasSelectionContext?.();

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
      this.canvasSelectionContext || this.hierarchyContext?.getCanvasSelectionContext?.();

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
    // Also set highlight on click for visual feedback
    this.hierarchyContext?.setHighlightedElement?.(this.element);
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
      this.hierarchyContext.actions.reorder(sourceId, this.elementId, this.dropPosition);
    }
    this.hierarchyContext.actions.endDrag();
  }

  private handleMouseEnter(): void {
    // Update canvas highlight (source of truth)
    this.hierarchyContext?.setHighlightedElement?.(this.element);
  }

  private handleMouseLeave(): void {
    // Clear canvas highlight (source of truth)
    const currentHighlight = this.hierarchyContext?.getHighlightedElement?.();
    if (currentHighlight === this.element) {
      this.hierarchyContext?.setHighlightedElement?.(null);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setupSelectionListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeSelectionListener();
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    // Set up listener if context becomes available or context changed
    if (!this.selectionChangeHandler || changedProperties.has("hierarchyContext")) {
      // Remove old listener if context changed
      if (changedProperties.has("hierarchyContext") && this.selectionChangeHandler) {
        this.removeSelectionListener();
        this.selectionChangeHandler = undefined;
      }
      this.setupSelectionListener();
    }
  }

  private setupSelectionListener(): void {
    // Don't set up if already set up
    if (this.selectionChangeHandler) {
      return;
    }

    const selectionCtx =
      this.canvasSelectionContext || this.hierarchyContext?.getCanvasSelectionContext?.();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => {
        this.requestUpdate(); // Trigger re-render to update selected state
      };
      (selectionCtx as any).addEventListener("selectionchange", this.selectionChangeHandler);
    }
  }

  private removeSelectionListener(): void {
    const selectionCtx =
      this.canvasSelectionContext || this.hierarchyContext?.getCanvasSelectionContext?.();
    if (selectionCtx && "removeEventListener" in selectionCtx && this.selectionChangeHandler) {
      (selectionCtx as any).removeEventListener("selectionchange", this.selectionChangeHandler);
      this.selectionChangeHandler = undefined;
    }
  }

  render() {
    const expanded = this.isExpanded;

    return html`
      ${this.dropPosition === "before" ? html`<div class="drop-indicator"></div>` : nothing}
      <div
        class="item-row ${this.dropPosition === "inside" ? "drop-inside" : ""}"
        part="row"
        style=${styleMap({ borderLeftColor: this.typeColor })}
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
        <span class="icon" part="icon">${this.icon}</span>
        <span class="label" part="label">${this.displayLabel()}</span>
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

/**
 * Generate a friendly label for an element based on its type and siblings
 */
function getFriendlyLabel(element: HTMLElement, typeLabel: string): string {
  // If element has a meaningful ID (not auto-generated), use it
  const id = element.id || "";
  if (id && !id.includes("-") && !id.match(/^\d+$/)) {
    return id;
  }

  // Count siblings of same type to generate "Video 1", "Video 2", etc.
  const parent = element.parentElement;
  if (parent) {
    const tagName = element.tagName;
    const siblings = Array.from(parent.children).filter((child) => child.tagName === tagName);
    const index = siblings.indexOf(element) + 1;

    // If there's only one of this type, don't add number
    if (siblings.length === 1) {
      return typeLabel;
    }
    return `${typeLabel} ${index}`;
  }

  return typeLabel;
}

@customElement("ef-timegroup-hierarchy-item")
export class EFTimegroupHierarchyItem extends EFHierarchyItem<EFTimegroup> {
  get icon() {
    return phosphorIcon(ICONS.filmSlate);
  }

  get typeColor(): string {
    return getElementTypeColor("timegroup", this);
  }

  displayLabel(): string | TemplateResult<1> | typeof nothing {
    const label = getFriendlyLabel(this.element, "Composition");
    const mode = this.element.mode || "fixed";
    const modeLabels: Record<string, string> = {
      fixed: "Fixed",
      sequence: "Sequence",
      contain: "Container",
      fit: "Fit",
    };
    const modeLabel = modeLabels[mode] || mode;
    return html`${label} <span style="opacity: 0.5; font-size: 0.65rem;">${modeLabel}</span>`;
  }
}

@customElement("ef-audio-hierarchy-item")
export class EFAudioHierarchyItem extends EFHierarchyItem<EFAudio> {
  get icon() {
    return phosphorIcon(ICONS.speakerHigh);
  }

  get typeColor(): string {
    return "rgb(34, 197, 94)"; // Green for audio
  }

  displayLabel() {
    return getFriendlyLabel(this.element, "Audio");
  }
}

@customElement("ef-video-hierarchy-item")
export class EFVideoHierarchyItem extends EFHierarchyItem<EFVideo> {
  get icon() {
    return phosphorIcon(ICONS.filmStrip);
  }

  get typeColor(): string {
    return "rgb(59, 130, 246)"; // Blue for video
  }

  displayLabel() {
    return getFriendlyLabel(this.element, "Video");
  }
}

@customElement("ef-captions-hierarchy-item")
export class EFCaptionsHierarchyItem extends EFHierarchyItem {
  get icon() {
    return phosphorIcon(ICONS.subtitles);
  }

  get typeColor(): string {
    return "rgb(34, 197, 94)"; // Green
  }

  displayLabel() {
    return getFriendlyLabel(this.element as HTMLElement, "Captions");
  }
}

@customElement("ef-captions-active-word-hierarchy-item")
export class EFCaptionsActiveWordHierarchyItem extends EFHierarchyItem {
  get icon() {
    return phosphorIcon(ICONS.microphone);
  }

  get typeColor(): string {
    return "rgb(34, 197, 94)"; // Green
  }

  displayLabel() {
    return "Active Word";
  }
}

@customElement("ef-text-hierarchy-item")
export class EFTextHierarchyItem extends EFHierarchyItem {
  get icon() {
    return phosphorIcon(ICONS.textT);
  }

  get typeColor(): string {
    return "rgb(249, 115, 22)"; // Orange for text
  }

  get hasChildren(): boolean {
    return false; // Text segments are internal, not shown as children
  }

  displayLabel() {
    return getFriendlyLabel(this.element as HTMLElement, "Text");
  }

  renderChildren(): typeof nothing {
    return nothing;
  }
}

@customElement("ef-text-segment-hierarchy-item")
export class EFTextSegmentHierarchyItem extends EFHierarchyItem {
  get icon() {
    return phosphorIcon(ICONS.textT);
  }

  get typeColor(): string {
    return "rgb(249, 115, 22)"; // Orange
  }

  displayLabel() {
    return "Segment";
  }
}

@customElement("ef-waveform-hierarchy-item")
export class EFWaveformHierarchyItem extends EFHierarchyItem {
  get icon() {
    return phosphorIcon(ICONS.waveform);
  }

  get typeColor(): string {
    return "rgb(34, 197, 94)"; // Green
  }

  renderChildren(): typeof nothing {
    return nothing;
  }
}

@customElement("ef-image-hierarchy-item")
export class EFImageHierarchyItem extends EFHierarchyItem<EFImage> {
  get icon() {
    return phosphorIcon(ICONS.image);
  }

  get typeColor(): string {
    return "rgb(168, 85, 247)"; // Purple for images
  }

  displayLabel() {
    return getFriendlyLabel(this.element, "Image");
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
