import { consume } from "@lit/context";
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
import { EFCaptions } from "../../elements/EFCaptions.js";
import { TWMixin } from "../TWMixin.js";
import { renderTrackChildren } from "./tracks/renderTrackChildren.js";
import { phosphorIcon, ICONS } from "../icons.js";
import {
  timelineEditingContext,
  type TimelineEditingContext,
} from "./timelineEditingContext.js";
import { getElementTypeColor } from "../theme.js";
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
@customElement("ef-timeline-row")
export class EFTimelineRow extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: flex;
        min-height: var(--timeline-row-height, 28px);
        border-bottom: 1px solid var(--ef-color-border-subtle);
      }

      /* Root timegroup row with filmstrip - taller to show thumbnails */
      :host(.root-timegroup) {
        min-height: 52px;
        height: 52px;
        /* Sticky at top below ruler (ruler is 24px) */
        position: sticky;
        top: 24px;
        /* Higher z-index than regular row labels (z-index: 8) so everything scrolls underneath */
        z-index: 15;
        background: var(--timeline-bg, var(--ef-color-bg));
        border-bottom: 1px solid var(--ef-color-border);
      }

      /* Root timegroup label needs higher z-index to stay above other labels when scrolling */
      :host(.root-timegroup) .row-label {
        z-index: 16;
      }

      /* Hover state - this row is directly hovered */
      :host(.hovered) {
        background: var(--ef-color-hover);
      }

      /* Ancestor hovered - a descendant of this row is hovered */
      :host(.ancestor-hovered) {
        background: var(--ef-color-selected-subtle);
      }

      /* Descendant hovered - an ancestor of this row is hovered */
      :host(.descendant-hovered) {
        background: var(--ef-color-selected-subtle);
      }

      /* Selected state */
      :host(.selected) {
        background: var(--ef-color-selected);
      }
      
      :host(.selected) .row-label {
        font-weight: 500;
      }

      /* Ancestor has selected descendant */
      :host(.ancestor-selected) {
        background: var(--ef-color-selected-subtle);
      }

      .row-label {
        position: sticky;
        left: 0;
        /* Lower z-index so labels scroll underneath the sticky root timegroup row (z-index: 15) */
        z-index: 8;
        width: var(--timeline-hierarchy-width, 200px);
        flex-shrink: 0;
        background: var(--ef-color-bg-panel);
        border-right: 1px solid var(--ef-color-border-subtle);
        display: flex;
        align-items: center;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--ef-color-text);
        cursor: pointer;
        transition: background-color 0.1s ease;
      }

      /* Hide label column when hierarchy is disabled */
      :host([hide-label]) .row-label {
        display: none;
      }

      .row-label:hover {
        background: color-mix(in srgb, var(--ef-color-bg-panel) 70%, var(--ef-color-hover) 30%);
      }

      :host(.hovered) .row-label {
        background: var(--ef-color-bg-elevated);
        border-left: 3px solid var(--ef-color-primary);
        padding-left: calc(var(--indent, 0px) - 3px);
      }

      :host(.selected) .row-label {
        background: var(--ef-color-bg-elevated);
        border-left: 3px solid var(--ef-color-primary);
        padding-left: calc(var(--indent, 0px) - 3px);
      }

      .row-track {
        flex: 1;
        position: relative;
        min-width: 0;
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

  @property({ type: Boolean, attribute: "hide-label", reflect: true })
  hideLabel = false;

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

  @consume({ context: timelineEditingContext, subscribe: true })
  editingContext?: TimelineEditingContext;

  // Derived interaction states (computed on-demand)
  private get isHovered(): boolean {
    return this.highlightedElement === this.element;
  }

  private get isSelected(): boolean {
    const elementId = (this.element as unknown as HTMLElement)?.id;
    return elementId ? this.selectedIds.has(elementId) : false;
  }

  private get isAncestorSelected(): boolean {
    if (!this.element) return false;
    // Check if this element contains any selected element
    const elementAsHTMLElement = this.element as unknown as HTMLElement;
    for (const selectedId of this.selectedIds) {
      const selectedElement = document.getElementById(selectedId);
      if (
        selectedElement &&
        elementAsHTMLElement.contains(selectedElement) &&
        selectedElement !== elementAsHTMLElement
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
    // Skip hover interactions during active editing operations (scrubbing, trimming, etc.)
    if (this.editingContext && !this.editingContext.canInteract()) {
      return;
    }
    
    this.dispatchEvent(
      new CustomEvent("row-hover", {
        detail: { element: this.element },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleMouseLeave = (): void => {
    // Skip hover interactions during active editing operations (scrubbing, trimming, etc.)
    if (this.editingContext && !this.editingContext.canInteract()) {
      return;
    }
    
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
    const elementId = (this.element as unknown as HTMLElement)?.id;
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
    if (element instanceof EFCaptions) return "captions";
    if (element instanceof EFTimegroup) return "timegroup";
    return "unknown";
  }

  // Use shared type color utility from theme.ts
  // This reads from CSS variables (--ef-color-type-video, etc.) defined in ef-theme.css

  private getElementIcon(type: string): TemplateResult {
    const iconMap: Record<string, TemplateResult> = {
      video: phosphorIcon(ICONS.filmStrip, 14),
      audio: phosphorIcon(ICONS.speakerHigh, 14),
      image: phosphorIcon(ICONS.image, 14),
      text: phosphorIcon(ICONS.textT, 14),
      captions: phosphorIcon(ICONS.subtitles, 14),
      timegroup: phosphorIcon(ICONS.filmSlate, 14),
      unknown: phosphorIcon(ICONS.code, 14),
    };
    return iconMap[type] ?? iconMap.unknown!;
  }

  private getElementLabel(element: Element): string {
    const id = element.id || "";
    const type = this.getElementType(element);
    
    // If element has a meaningful ID (not auto-generated), use it
    if (id && !id.includes("-") && !id.match(/^\d+$/)) {
      return id;
    }
    
    // For auto-generated IDs, create a friendly name based on type
    // Count siblings of same type to generate "Video 1", "Video 2", etc.
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => this.getElementType(child) === type
      );
      const index = siblings.indexOf(element) + 1;
      const typeLabels: Record<string, string> = {
        video: "Video",
        audio: "Audio",
        image: "Image",
        text: "Text",
        captions: "Captions",
        timegroup: "Composition",
        unknown: "Layer",
      };
      const label = typeLabels[type] || "Layer";
      
      // If there's only one of this type, don't add number
      if (siblings.length === 1) {
        return label;
      }
      return `${label} ${index}`;
    }
    
    // Fallback: capitalize the type
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get additional detail text for the label (mode, preview, etc.)
   */
  private getElementDetail(element: Element): string | null {
    if (element instanceof EFTimegroup) {
      const mode = element.mode || "fixed";
      const modeLabels: Record<string, string> = {
        fixed: "Fixed",
        sequence: "Sequence",
        contain: "Container",
      };
      return modeLabels[mode] || mode;
    }
    if (element instanceof EFText) {
      // Get text preview
      const textContent = Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim())
        .filter(Boolean)
        .join(" ");
      if (textContent) {
        return textContent.length > 20 ? textContent.slice(0, 20) + "..." : textContent;
      }
    }
    return null;
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

    const type = this.getElementType(this.element);
    const label = this.getElementLabel(this.element);
    const detail = this.getElementDetail(this.element);
    const typeColor = getElementTypeColor(type, this);
    const icon = this.getElementIcon(type);
    const indentPx = this.depth * INDENT_PX;

    return html`
      <div
        class="row-label"
        part="label"
        style=${styleMap({ 
          paddingLeft: `${indentPx}px`,
          borderLeftColor: typeColor,
          borderLeftWidth: "3px",
          borderLeftStyle: "solid",
        })}
      >
        <span style="color: ${typeColor}; opacity: 0.9; margin-right: 6px; flex-shrink: 0;">
          ${icon}
        </span>
        <span style="flex-shrink: 0;">${label}</span>
        ${detail ? html`
          <span style="margin-left: 6px; opacity: 0.6; font-size: 10px; overflow: hidden; text-overflow: ellipsis;">
            ${detail}
          </span>
        ` : nothing}
      </div>
      <div class="row-track" part="track">${this.renderTrack()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timeline-row": EFTimelineRow;
  }
}

