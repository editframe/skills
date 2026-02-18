import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";
import "./EFThumbnailStrip.js";

/**
 * Check if a timegroup is a root timegroup (has no parent timegroup)
 * Uses the timegroup's own isRootTimegroup property for reliability
 */
function isRootTimegroup(element: Element | null | undefined): boolean {
  // Handle null/undefined
  if (!element) {
    return false;
  }

  // Check if element has the isRootTimegroup property (most reliable)
  // EFTimegroup instances have this property that checks parentTimegroup
  const elem = element as any;
  if (typeof elem.isRootTimegroup === "boolean") {
    return elem.isRootTimegroup;
  }

  // Alternative: check parentTimegroup property directly (EFTimegroup has this)
  if (elem.parentTimegroup !== undefined) {
    return !elem.parentTimegroup; // Root if no parent timegroup
  }

  // Fallback: check DOM parent tree (less reliable after DOM moves)
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === "ef-timegroup") {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

/** Height for root timegroup filmstrip row */
const FILMSTRIP_ROW_HEIGHT = 48;

@customElement("ef-timegroup-track")
export class EFTimegroupTrack extends TrackItem {
  static styles = [
    ...TrackItem.styles,
    css`
      .trim-container {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--ef-color-type-timegroup) 10%, transparent) 0%,
          color-mix(in srgb, var(--ef-color-type-timegroup) 5%, transparent) 100%
        ) !important;
      }
      
      :host(:hover) .trim-container {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--ef-color-type-timegroup) 15%, transparent) 0%,
          color-mix(in srgb, var(--ef-color-type-timegroup) 8%, transparent) 100%
        ) !important;
      }
    `,
  ];

  /**
   * When true, children are not rendered (used in unified row architecture
   * where children get their own rows).
   */
  @property({ type: Boolean, attribute: "skip-children" })
  skipChildren = false;

  /**
   * When true, show filmstrip thumbnails for root timegroups
   * TODO: Re-enable when thumbnail strip performance is improved
   */
  @property({ type: Boolean, attribute: "show-filmstrip" })
  showFilmstrip = false;

  /**
   * Check if this track should show a filmstrip
   */
  private get shouldShowFilmstrip(): boolean {
    const skipChildren = this.skipChildren;
    const showFilmstrip = this.showFilmstrip;
    const hasId = !!this.element?.id;
    const isRoot = isRootTimegroup(this.element);

    return skipChildren && showFilmstrip && hasId && isRoot;
  }

  /**
   * Override trimPortionStyles to use taller height for filmstrip rows
   */
  override get trimPortionStyles() {
    const baseStyles = super.trimPortionStyles;
    if (this.shouldShowFilmstrip) {
      return {
        ...baseStyles,
        height: `${FILMSTRIP_ROW_HEIGHT}px`,
      };
    }
    return baseStyles;
  }

  private get modeLabel(): string {
    const mode = (this.element as any).mode || "fixed";
    const labels: Record<string, string> = {
      fixed: "Fixed",
      sequence: "Sequence",
      contain: "Container",
      fit: "Fit",
    };
    return labels[mode] || mode;
  }

  contents() {
    // Show filmstrip only for ROOT timegroups (no parent timegroup)
    const shouldShow = this.shouldShowFilmstrip;

    if (shouldShow) {
      return html`<ef-thumbnail-strip
        .targetElement=${this.element}
        thumbnail-height=${FILMSTRIP_ROW_HEIGHT}
        thumbnail-spacing-px="96"
        pixels-per-ms=${this.pixelsPerMs}
      ></ef-thumbnail-strip>`;
    }

    if (this.skipChildren) {
      return html`<span style="
        font-size: 9px;
        opacity: 0.5;
        padding-left: 4px;
        line-height: 14px;
        pointer-events: none;
        white-space: nowrap;
      ">${this.modeLabel}</span>`;
    }
    // Wrap children in a fragment for consistent return type
    // Note: This hierarchical rendering path is only used in tests/sandboxes.
    // Production code always uses skipChildren=true with flat row architecture.
    return html`${renderTrackChildren(
      Array.from(this.element.children || []),
      this.pixelsPerMs,
      this.hideSelectors,
      this.showSelectors,
      false,
      this.enableTrim,
    )}`;
  }

  /**
   * Override render to use taller height for filmstrip rows
   */
  override render() {
    const trackHeight = this.shouldShowFilmstrip
      ? `${FILMSTRIP_ROW_HEIGHT}px`
      : "var(--timeline-track-height, 22px)";

    return html`<div style=${styleMap(this.gutterStyles)}>
      <div
        style="background-color: var(--filmstrip-bg);"
        ?data-focused=${this.isFocused}
        @mouseenter=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = this.element;
          }
        }}
        @mouseleave=${() => {
          if (this.focusContext) {
            this.focusContext.focusedElement = null;
          }
        }}
      >
        <div
          ?data-focused=${this.isFocused}
          class="trim-container relative mb-0 block text-nowrap border text-sm"
          style=${styleMap({
            ...this.trimPortionStyles,
            height: trackHeight,
            backgroundColor: this.isFocused
              ? "var(--filmstrip-item-focused)"
              : "var(--filmstrip-item-bg)",
            borderColor: this.shouldShowFilmstrip
              ? "transparent"
              : "var(--filmstrip-border)",
          })}
        >
          ${this.animations()}
          ${this.contents()}
        </div>
      </div>
      ${this.renderChildren()}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timegroup-track": EFTimegroupTrack;
  }
}
