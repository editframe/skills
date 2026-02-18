import { LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef } from "lit/directives/ref.js";

/* ━━ Pure scale calculation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface ScaleInput {
  containerWidth: number;
  containerHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface ScaleOutput {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Compute the scale factor and centering translation needed to fit
 * content of a given size into a container while preserving aspect ratio.
 *
 * Returns `null` when any dimension is zero or negative (cannot compute).
 */
export function computeFitScale(input: ScaleInput): ScaleOutput | null {
  const { containerWidth, containerHeight, contentWidth, contentHeight } =
    input;

  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    contentWidth <= 0 ||
    contentHeight <= 0
  ) {
    return null;
  }

  const containerRatio = containerWidth / containerHeight;
  const contentRatio = contentWidth / contentHeight;

  const scale =
    containerRatio > contentRatio
      ? containerHeight / contentHeight
      : containerWidth / contentWidth;

  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;
  const translateX = (containerWidth - scaledWidth) / 2;
  const translateY = (containerHeight - scaledHeight) / 2;

  return { scale, translateX, translateY };
}

/* ━━ Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

@customElement("ef-fit-scale")
export class EFFitScale extends LitElement {
  containerRef = createRef<HTMLDivElement>();
  contentRef = createRef<HTMLSlotElement>();

  createRenderRoot() {
    Object.assign(this.style, {
      display: "grid",
      width: "100%",
      height: "100%",
      gridTemplateColumns: "100%",
      gridTemplateRows: "100%",
      overflow: "hidden",
      boxSizing: "border-box",
      contain: "layout paint style",
      position: "relative",
    });
    this.id = `${this.uniqueId}`;
    return this;
  }

  uniqueId = Math.random().toString(36).substring(2, 15);



  @property({ type: Boolean })
  paused = false;

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("paused") && !this.paused) {
      // When unpaused, immediately recalculate scale
      this.updateScale();
    }
  }

  private containerResizeObserver?: ResizeObserver;
  private contentResizeObserver?: ResizeObserver;
  private childMutationObserver?: MutationObserver;
  private observedContentChild: HTMLElement | null = null;
  private hasWarnedZeroDimensions = false;

  get contentChild() {
    if (!this.children.length) return null;

    const isNonContentElement = (element: Element): boolean => {
      const tagName = element.tagName.toLowerCase();
      const nonContentTags = [
        "style",
        "script",
        "meta",
        "link",
        "title",
        "noscript",
      ];
      if (nonContentTags.includes(tagName)) return true;

      try {
        const display = window.getComputedStyle(element).display;
        return display === "none" || display === "contents";
      } catch {
        return false;
      }
    };

    const findAllContentElements = (element: Element): HTMLElement[] => {
      const results: HTMLElement[] = [];

      if (element instanceof HTMLSlotElement) {
        const assigned = element.assignedElements()[0];
        if (assigned) {
          results.push(...findAllContentElements(assigned));
        }
        return results;
      }

      if (!isNonContentElement(element)) {
        results.push(element as HTMLElement);
      }

      const children = Array.from(element.children);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child) {
          results.push(...findAllContentElements(child));
        }
      }

      return results;
    };

    const children = Array.from(this.children);
    const allContentElements: HTMLElement[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child) {
        allContentElements.push(...findAllContentElements(child));
      }
    }

    if (allContentElements.length === 0) return null;

    return allContentElements[0] ?? null;
  }

  get scaleInfo() {
    if (!this.contentChild) {
      return {
        scale: 1,
        containerWidth: 0,
        containerHeight: 0,
        contentWidth: 0,
        contentHeight: 0,
      };
    }

    const containerWidth = this.clientWidth;
    const containerHeight = this.clientHeight;

    // Try to get natural dimensions from media elements (ef-video, ef-image)
    let contentWidth = 0;
    let contentHeight = 0;

    if (typeof (this.contentChild as any).getNaturalDimensions === "function") {
      const naturalDimensions = (
        this.contentChild as any
      ).getNaturalDimensions() as { width: number; height: number } | null;
      if (
        naturalDimensions &&
        naturalDimensions.width > 0 &&
        naturalDimensions.height > 0
      ) {
        contentWidth = naturalDimensions.width;
        contentHeight = naturalDimensions.height;

        // ESSENTIAL: For ef-video, set canvas to explicit pixel dimensions to break 100% circular dependency
        // Canvas default CSS is width:100%, height:100% which would make ef-video collapse to 0x0
        // when ef-video is set to width:auto, height:auto by ElementRenderer
        if (this.contentChild.tagName === "EF-VIDEO") {
          const canvas = (this.contentChild as any).canvasElement;
          if (canvas) {
            canvas.style.setProperty("width", `${contentWidth}px`, "important");
            canvas.style.setProperty(
              "height",
              `${contentHeight}px`,
              "important",
            );
          }
        }
      } else {
        // Natural dimensions not available yet, fall back to client dimensions
        contentWidth = this.contentChild.clientWidth;
        contentHeight = this.contentChild.clientHeight;
      }
    } else {
      // For other elements, use clientWidth/Height
      contentWidth = this.contentChild.clientWidth;
      contentHeight = this.contentChild.clientHeight;
    }

    if (contentWidth === 0 || contentHeight === 0) {
      return {
        scale: 1,
        containerWidth,
        containerHeight,
        contentWidth: 0,
        contentHeight: 0,
      };
    }

    const result = computeFitScale({
      containerWidth,
      containerHeight,
      contentWidth,
      contentHeight,
    });

    return {
      scale: result?.scale ?? 1,
      containerWidth,
      containerHeight,
      contentWidth,
      contentHeight,
    };
  }

  scaleLastSetOn: HTMLElement | null = null;

  private updateScale = (): void => {
    if (!this.isConnected || this.paused) return;

    const { containerWidth, containerHeight, contentWidth, contentHeight } =
      this.scaleInfo;

    // Warn on zero container dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      if (!this.hasWarnedZeroDimensions) {
        this.hasWarnedZeroDimensions = true;
        console.warn(
          `[ef-fit-scale] Container has zero dimensions (${containerWidth}×${containerHeight}). ` +
            `Content will be invisible. Ensure all ancestors have resolved height.`,
          this,
        );
      }
      return;
    }

    // Reset warning flag when dimensions become valid
    this.hasWarnedZeroDimensions = false;

    if (this.contentChild && contentWidth > 0 && contentHeight > 0) {
      const result = computeFitScale({
        containerWidth,
        containerHeight,
        contentWidth,
        contentHeight,
      });

      if (!result) return;

      // In the rare event that the content child is changed, we need to remove the scale
      // because we don't want to have a scale on the old content child that is somewhere else in the DOM
      if (this.scaleLastSetOn !== this.contentChild) {
        this.removeScale();
      }
      // Use toFixed to avoid floating point precision issues
      // this will update every frame with sub-pixel changes if we don't pin it down
      Object.assign(this.contentChild.style, {
        width: `${contentWidth}px`,
        height: `${contentHeight}px`,
        transform: `translate(${result.translateX.toFixed(4)}px, ${result.translateY.toFixed(4)}px) scale(${result.scale.toFixed(4)})`,
        transformOrigin: "top left",
      });
      this.scaleLastSetOn = this.contentChild;
    }
  };

  private observeContentChild(): void {
    const child = this.contentChild;
    if (child === this.observedContentChild) return;

    // Stop observing old child
    this.contentResizeObserver?.disconnect();

    // Observe new child
    if (child) {
      this.contentResizeObserver = new ResizeObserver(() => {
        this.updateScale();
      });
      this.contentResizeObserver.observe(child);
    }
    this.observedContentChild = child;
  }

  removeScale = () => {
    if (this.scaleLastSetOn) {
      Object.assign(this.scaleLastSetOn.style, {
        width: "",
        height: "",
        transform: "",
        transformOrigin: "",
      });
      this.scaleLastSetOn = null;
    }
  };

  connectedCallback(): void {
    super.connectedCallback();

    this.hasWarnedZeroDimensions = false;

    // Observe self for container size changes
    this.containerResizeObserver = new ResizeObserver(() => {
      this.updateScale();
    });
    this.containerResizeObserver.observe(this);

    // Observe child list for content child changes
    this.childMutationObserver = new MutationObserver(() => {
      this.observeContentChild();
      this.updateScale();
    });
    this.childMutationObserver.observe(this, { childList: true });

    // Initial content child observation
    this.observeContentChild();

    // Initial scale calculation (deferred to allow layout to settle)
    requestAnimationFrame(() => this.updateScale());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeScale();
    this.containerResizeObserver?.disconnect();
    this.contentResizeObserver?.disconnect();
    this.childMutationObserver?.disconnect();
    this.observedContentChild = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-fit-scale": EFFitScale;
  }
}
