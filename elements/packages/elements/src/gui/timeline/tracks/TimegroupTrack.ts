import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
// TrackItem must be pre-loaded before this module is imported
// See preloadTracks.ts for the initialization sequence
import { TrackItem } from "./TrackItem.js";
import { renderTrackChildren } from "./renderTrackChildren.js";
import "../../../elements/EFThumbnailStrip.js";

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
          rgba(148, 163, 184, 0.1) 0%,
          rgba(148, 163, 184, 0.05) 100%
        ) !important;
      }
      
      :host(:hover) .trim-container {
        background: linear-gradient(
          135deg,
          rgba(148, 163, 184, 0.15) 0%,
          rgba(148, 163, 184, 0.08) 100%
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
    return this.skipChildren && this.showFilmstrip && !!this.element?.id && isRootTimegroup(this.element);
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

  contents() {
    // Show filmstrip only for ROOT timegroups (no parent timegroup)
    if (this.shouldShowFilmstrip) {
      return html`
        <ef-thumbnail-strip
          target="${this.element.id}"
          start-time-ms="0"
          end-time-ms="${this.element.durationMs ?? 0}"
          pixels-per-ms="${this.pixelsPerMs}"
        ></ef-thumbnail-strip>
      `;
    }

    // Show composition mode indicator
    const mode = (this.element as any).mode || "fixed";
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

    // Fallback: show label and children
    return html`
      <span style="font-size: 10px; opacity: 0.7; margin-left: 20px;">${modeLabel}</span>
      ${this.skipChildren
        ? nothing
        : renderTrackChildren(
            Array.from(this.element.children || []),
            this.pixelsPerMs,
            this.hideSelectors,
            this.showSelectors,
            false,
            this.enableTrim,
          )}
    `;
  }

  /**
   * Override render to use taller height for filmstrip rows
   */
  override render() {
    // Use custom height for filmstrip, standard height otherwise
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
            borderColor: this.shouldShowFilmstrip ? "transparent" : "var(--filmstrip-border)",
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

