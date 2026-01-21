import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../../elements/EFTemporal.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
import { EFVideo } from "../../elements/EFVideo.js";
import { EFAudio } from "../../elements/EFAudio.js";
import { EFImage } from "../../elements/EFImage.js";
import { EFText } from "../../elements/EFText.js";
import { TWMixin } from "../TWMixin.js";
import { renderTrackChildren } from "./tracks/renderTrackChildren.js";
// NOTE: Track components (ef-timegroup-track, etc.) are NOT imported here
// to avoid circular dependencies with TrackItem. They must be registered before
// EFTimelineRow is used. See preloadTracks.ts for the registration sequence.

const INDENT_PX = 16;

/**
 * EFTimelineRow - A unified timeline row containing both label and track
 *
 * This component renders a single row in the timeline with:
 * - A sticky label on the left (stays fixed during horizontal scroll)
 * - Track content on the right (scrolls horizontally with the timeline)
 *
 * Heights are determined by content, not hardcoded.
 */
/**
 * Check if a timegroup is a root timegroup (has no parent timegroup)
 */
function isRootTimegroup(element: Element): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === "ef-timegroup") {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

@customElement("ef-timeline-row")
export class EFTimelineRow extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: flex;
        min-height: var(--timeline-row-height, 28px);
        border-bottom: 1px solid var(--timeline-border, rgb(71 85 105));
      }

      /* Root timegroup row with filmstrip - taller to show thumbnails */
      :host(.root-timegroup) {
        min-height: 52px;
        height: 52px;
        /* Sticky at top below ruler (ruler is 24px) */
        position: sticky;
        top: 24px;
        z-index: 9;
        background: var(--timeline-bg, rgb(30 41 59));
      }

      /* Root timegroup label needs higher z-index to stay above other labels when scrolling */
      :host(.root-timegroup) .row-label {
        z-index: 11;
      }

      /* Hover state - this row is directly hovered */
      :host(.hovered) {
        background: var(--timeline-row-hover, rgba(59, 130, 246, 0.15));
      }

      /* Ancestor hovered - a descendant of this row is hovered */
      :host(.ancestor-hovered) {
        background: var(--timeline-row-ancestor-hover, rgba(59, 130, 246, 0.08));
      }

      /* Descendant hovered - an ancestor of this row is hovered */
      :host(.descendant-hovered) {
        background: var(
          --timeline-row-descendant-hover,
          rgba(59, 130, 246, 0.05)
        );
      }

      /* Selected state */
      :host(.selected) {
        background: var(--timeline-row-selected, rgba(59, 130, 246, 0.3));
      }
      
      :host(.selected) .row-label {
        font-weight: 600;
      }

      /* Ancestor has selected descendant */
      :host(.ancestor-selected) {
        background: var(--timeline-row-ancestor-selected, rgba(59, 130, 246, 0.15));
      }

      .row-label {
        position: sticky;
        left: 0;
        z-index: 10;
        width: var(--timeline-hierarchy-width, 200px);
        flex-shrink: 0;
        background: var(--timeline-header-bg, rgb(51 65 85));
        border-right: 1px solid var(--timeline-border, rgb(71 85 105));
        display: flex;
        align-items: center;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--timeline-text, rgb(226 232 240));
        cursor: pointer;
      }

      .row-label:hover {
        background: var(--timeline-label-hover, rgb(71 85 105));
      }

      :host(.hovered) .row-label {
        background: var(--timeline-label-active, rgb(59 130 246));
        color: white;
      }

      :host(.selected) .row-label {
        background: var(--timeline-label-selected, rgb(37 99 235));
        color: white;
      }

      .row-track {
        flex: 1;
        position: relative;
        min-width: 0;
      }
      
      /* Visual connector for parent-child relationships */
      .row-track::before {
        content: "";
        position: absolute;
        left: -8px;
        top: 50%;
        width: 8px;
        height: 1px;
        background: var(--timeline-border, rgb(71 85 105));
        opacity: 0.3;
        z-index: 1;
      }
      
      :host(:first-child) .row-track::before {
        display: none;
      }
      
      /* Grouping indicator for nested elements */
      .row-track::after {
        content: "";
        position: absolute;
        left: -12px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--timeline-border, rgb(71 85 105));
        opacity: 0.2;
        z-index: 0;
      }
      
      :host(:first-child) .row-track::after {
        display: none;
      }
    `,
  ];

  @property({ type: Object, attribute: false })
  element!: TemporalMixinInterface & Element;

  @property({ type: Number })
  depth = 0;

  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = 0.04;

  @property({ type: Boolean, attribute: "enable-trim" })
  enableTrim = false;

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  /**
   * The currently highlighted element from canvas (source of truth).
   * Passed from parent timeline which reads it from canvas.
   */
  @property({ type: Object, attribute: false })
  highlightedElement: Element | null = null;

  @property({ type: Object, attribute: false })
  selectedIds: ReadonlySet<string> = new Set();

  // Derived interaction states (computed on-demand)
  private get isHovered(): boolean {
    return this.highlightedElement === this.element;
  }

  private get isSelected(): boolean {
    const elementId = (this.element as HTMLElement)?.id;
    return elementId ? this.selectedIds.has(elementId) : false;
  }

  private get isAncestorSelected(): boolean {
    if (!this.element) return false;
    // Check if this element contains any selected element
    for (const selectedId of this.selectedIds) {
      const selectedElement = document.getElementById(selectedId);
      if (
        selectedElement &&
        this.element.contains(selectedElement) &&
        selectedElement !== this.element
      ) {
        return true;
      }
    }
    return false;
  }

  private get isAncestorHovered(): boolean {
    if (!this.highlightedElement || !this.element) return false;
    // This row's element contains the highlighted element (highlighted is a descendant)
    return (
      this.element !== this.highlightedElement &&
      this.element.contains(this.highlightedElement)
    );
  }

  private get isDescendantHovered(): boolean {
    if (!this.highlightedElement || !this.element) return false;
    // The highlighted element contains this row's element (highlighted is an ancestor)
    return (
      this.element !== this.highlightedElement &&
      this.highlightedElement.contains(this.element)
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // Update host classes based on interaction state
    if (
      changedProperties.has("highlightedElement") ||
      changedProperties.has("element")
    ) {
      this.classList.toggle("hovered", this.isHovered);
      this.classList.toggle("ancestor-hovered", this.isAncestorHovered);
      this.classList.toggle("descendant-hovered", this.isDescendantHovered);
    }

    // Update selection classes
    if (
      changedProperties.has("selectedIds") ||
      changedProperties.has("element")
    ) {
      this.classList.toggle("selected", this.isSelected);
      this.classList.toggle("ancestor-selected", this.isAncestorSelected);
    }

    // Update root timegroup class for filmstrip rows
    if (changedProperties.has("element")) {
      const isRoot = this.element instanceof EFTimegroup && this.element.isRootTimegroup;
      this.classList.toggle("root-timegroup", isRoot);
    }
  }

  private handleMouseEnter = (): void => {
    this.dispatchEvent(
      new CustomEvent("row-hover", {
        detail: { element: this.element },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleMouseLeave = (): void => {
    this.dispatchEvent(
      new CustomEvent("row-hover", {
        detail: { element: null },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleClick = (e: Event): void => {
    e.stopPropagation();
    const elementId = (this.element as HTMLElement)?.id;
    if (elementId) {
      this.dispatchEvent(
        new CustomEvent("row-select", {
          detail: { elementId, element: this.element },
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  private getElementType(element: Element): string {
    if (element instanceof EFVideo) return "video";
    if (element instanceof EFAudio) return "audio";
    if (element instanceof EFImage) return "image";
    if (element instanceof EFText) return "text";
    if (element instanceof EFTimegroup) return "timegroup";
    return "unknown";
  }

  private getElementLabel(element: Element): string {
    const id = element.id || "";
    const type = this.getElementType(element);
    return id || type;
  }

  private renderTrack(): TemplateResult | typeof nothing {
    if (!this.element || !isEFTemporal(this.element)) return nothing;

    // For timegroups, use skip-children since children get their own rows
    if (this.element instanceof EFTimegroup) {
      // Show filmstrip for root timegroups (no parent timegroup)
      // Use the timegroup's own isRootTimegroup property for reliability
      const showFilmstrip = this.element.isRootTimegroup;
      return html`<ef-timegroup-track
        .element=${this.element}
        pixels-per-ms=${this.pixelsPerMs}
        ?enable-trim=${this.enableTrim}
        ?skip-children=${true}
        ?show-filmstrip=${showFilmstrip}
        .hideSelectors=${this.hideSelectors}
        .showSelectors=${this.showSelectors}
      ></ef-timegroup-track>`;
    }

    return html`${renderTrackChildren(
      [this.element as unknown as Element],
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
      true, // skipRootFiltering - the row itself handles filtering
      this.enableTrim,
      true, // useAbsolutePosition - flat row architecture needs absolute positioning
    )}`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("mouseenter", this.handleMouseEnter);
    this.addEventListener("mouseleave", this.handleMouseLeave);
    this.addEventListener("click", this.handleClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("mouseenter", this.handleMouseEnter);
    this.removeEventListener("mouseleave", this.handleMouseLeave);
    this.removeEventListener("click", this.handleClick);
  }

  render() {
    if (!this.element) return nothing;

    const label = this.getElementLabel(this.element);
    const indentPx = this.depth * INDENT_PX;

    return html`
      <div
        class="row-label"
        style=${styleMap({ paddingLeft: `${indentPx}px` })}
      >
        ${label}
      </div>
      <div class="row-track">${this.renderTrack()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timeline-row": EFTimelineRow;
  }
}

