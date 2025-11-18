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
    
    // For ef-video, measure the canvas directly as it has the actual video dimensions
    let contentWidth = 0;
    let contentHeight = 0;
    
    if (this.contentChild.tagName === "EF-VIDEO") {
      const canvas = (this.contentChild as any).canvasElement;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        // Use canvas attributes (video's coded dimensions)
        contentWidth = canvas.width;
        contentHeight = canvas.height;
        
        // ESSENTIAL: Set canvas to explicit pixel dimensions to break 100% circular dependency
        // Canvas default CSS is width:100%, height:100% which would make ef-video collapse to 0x0
        // when ef-video is set to width:auto, height:auto by ElementRenderer
        canvas.style.setProperty("width", `${canvas.width}px`, "important");
        canvas.style.setProperty("height", `${canvas.height}px`, "important");
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
      const scaleInfo = this.scaleInfo;
      const { scale, containerWidth, containerHeight, contentWidth, contentHeight } = scaleInfo;
      
      if (this.contentChild && contentWidth > 0 && contentHeight > 0) {
        // Calculate scaled dimensions using natural size from scaleInfo
        const scaledWidth = contentWidth * scale;
        const scaledHeight = contentHeight * scale;
        const translateX = (containerWidth - scaledWidth) / 2;
        const translateY = (containerHeight - scaledHeight) / 2;

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
