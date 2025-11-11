import { LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createRef } from "lit/directives/ref.js";

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
      contain: "strict",
      position: "relative",
    });
    this.id = `${this.uniqueId}`;
    return this;
  }

  uniqueId = Math.random().toString(36).substring(2, 15);

  @state()
  private scale = 1;

  private animationFrameId?: number;

  get contentChild() {
    if (!this.children.length) return null;

    const isNonContentElement = (element: Element): boolean => {
      const tagName = element.tagName.toLowerCase();
      const nonContentTags = ["style", "script", "meta", "link", "title", "noscript"];
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
        results.push(...findAllContentElements(children[i]!));
      }

      return results;
    };

    const children = Array.from(this.children);
    const allContentElements: HTMLElement[] = [];
    for (let i = 0; i < children.length; i++) {
      allContentElements.push(...findAllContentElements(children[i]!));
    }

    if (allContentElements.length === 0) return null;

    return allContentElements[0]!;
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
    const contentWidth = this.contentChild.clientWidth;
    const contentHeight = this.contentChild.clientHeight;

    const containerRatio = containerWidth / containerHeight;
    const contentRatio = contentWidth / contentHeight;

    const scale =
      containerRatio > contentRatio
        ? containerHeight / contentHeight
        : containerWidth / contentWidth;

    return {
      scale,
      containerWidth,
      containerHeight,
      contentWidth,
      contentHeight,
    };
  }

  scaleLastSetOn: HTMLElement | null = null;

  setScale = () => {
    if (this.isConnected) {
      const { scale } = this.scaleInfo;
      if (this.contentChild) {
        const containerRect = this.getBoundingClientRect();
        const contentRect = this.contentChild.getBoundingClientRect();

        const unscaledWidth = contentRect.width / this.scale;
        const unscaledHeight = contentRect.height / this.scale;
        const scaledWidth = unscaledWidth * scale;
        const scaledHeight = unscaledHeight * scale;
        const translateX = (containerRect.width - scaledWidth) / 2;
        const translateY = (containerRect.height - scaledHeight) / 2;

        // In the rare event that the content child is changed, we need to remove the scale
        // because we don't want to have a scale on the old content child that is somewhere else in the DOM
        if (this.scaleLastSetOn !== this.contentChild) {
          this.removeScale();
        }
        // Use toFixed to avoid floating point precision issues
        // this will update every frame with sub-pixel changes if we don't pin it down
        Object.assign(this.contentChild.style, {
          transform: `translate(${translateX.toFixed(4)}px, ${translateY.toFixed(4)}px) scale(${scale.toFixed(4)})`,
          transformOrigin: "top left",
        });
        this.scale = scale;
        this.scaleLastSetOn = this.contentChild;
      }
      this.animationFrameId = requestAnimationFrame(this.setScale);
    }
  };

  removeScale = () => {
    if (this.scaleLastSetOn) {
      Object.assign(this.scaleLastSetOn.style, {
        transform: "",
        transformOrigin: "",
      });
      this.scaleLastSetOn = null;
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.animationFrameId = requestAnimationFrame(this.setScale);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeScale();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-fit-scale": EFFitScale;
  }
}
