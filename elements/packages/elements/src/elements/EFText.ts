import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import { durationConverter } from "./durationConverter.js";
import { EFTemporal } from "./EFTemporal.js";
import { evaluateEasing } from "./easingUtils.js";
import type { EFTextSegment } from "./EFTextSegment.js";
import { updateAnimations } from "./updateAnimations.js";

export type SplitMode = "line" | "word" | "char";

@customElement("ef-text")
export class EFText extends EFTemporal(LitElement) {
  static styles = [
    css`
      :host {
        display: inline-flex;
        white-space: normal;
        line-height: 1;
        gap: 0;
      }
      :host([split="char"]) {
        white-space: pre;
      }
      :host([split="line"]) {
        display: flex;
        flex-direction: column;
      }
      ::slotted(*) {
        display: inline-block;
        margin: 0;
        padding: 0;
      }
    `,
  ];

  @property({ type: String, reflect: true })
  split: SplitMode = "word";

  private validateSplit(value: string): SplitMode {
    if (value === "line" || value === "word" || value === "char") {
      return value as SplitMode;
    }
    console.warn(
      `Invalid split value "${value}". Must be "line", "word", or "char". Defaulting to "word".`,
    );
    return "word";
  }

  @property({
    type: Number,
    attribute: "stagger",
    converter: durationConverter,
  })
  staggerMs?: number;

  private validateStagger(value: number | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (value < 0) {
      console.warn(`Invalid stagger value ${value}ms. Must be >= 0. Using 0.`);
      return 0;
    }
    return value;
  }

  @property({ type: String, reflect: true })
  easing = "linear";

  private mutationObserver?: MutationObserver;
  private lastTextContent = "";
  private _textContent: string | null = null; // null means not initialized, "" means explicitly empty
  private _templateElement: HTMLTemplateElement | null = null;
  private _segmentsReadyResolvers: Array<() => void> = [];

  render() {
    return html`<slot></slot>`;
  }

  // Store text content so we can use it even after DOM is cleared
  set textContent(value: string | null) {
    const newValue = value || "";
    // Only update if value actually changed
    if (this._textContent !== newValue) {
      this._textContent = newValue;

      // Find template element if not already stored
      if (!this._templateElement && this.isConnected) {
        this._templateElement = this.querySelector("template");
      }

      // Clear any existing text nodes
      const textNodes: ChildNode[] = [];
      for (const node of Array.from(this.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node as ChildNode);
        }
      }
      for (const node of textNodes) {
        node.remove();
      }
      // Add new text node if value is not empty
      if (newValue) {
        const textNode = document.createTextNode(newValue);
        this.appendChild(textNode);
      }
      // Trigger re-split
      if (this.isConnected) {
        this.splitText();
      }
    }
  }

  get textContent(): string {
    // If _textContent is null, it hasn't been initialized - read from DOM
    if (this._textContent === null) {
      return this.getTextContent();
    }
    // Otherwise use stored value (even if empty string)
    return this._textContent;
  }

  /**
   * Get all ef-text-segment elements directly
   * @public
   */
  get segments(): EFTextSegment[] {
    return Array.from(
      this.querySelectorAll("ef-text-segment[data-segment-created]"),
    ) as EFTextSegment[];
  }

  /**
   * Returns a promise that resolves when segments are ready (created and connected)
   * Use this to wait for segments after setting textContent or other properties
   * @public
   */
  async whenSegmentsReady(): Promise<EFTextSegment[]> {
    // Wait for text element to be updated first
    await this.updateComplete;

    // If no text content, segments will be empty - return immediately
    // Use same logic as splitText to read text content
    const text =
      this._textContent !== null ? this._textContent : this.getTextContent();
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Wait a frame for splitText to run
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // If segments already exist and are connected, wait for updates
    let segments = this.segments;
    if (segments.length > 0) {
      // Wait for all segments to be updated
      await Promise.all(segments.map((seg) => seg.updateComplete));
      // Wait one more frame to ensure connectedCallback has run and properties are set
      await new Promise((resolve) => requestAnimationFrame(resolve));
      // Wait one more frame to ensure properties are fully processed
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return this.segments;
    }

    // Otherwise, wait for segments to be created (with timeout)
    return new Promise<EFTextSegment[]>((resolve) => {
      let attempts = 0;
      const maxAttempts = 100; // 100 frames = ~1.6 seconds at 60fps

      const checkSegments = () => {
        segments = this.segments;
        if (segments.length > 0) {
          // Wait for all segments to be updated
          Promise.all(segments.map((seg) => seg.updateComplete)).then(() => {
            // Wait frames to ensure connectedCallback has run and properties are set
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(this.segments);
              });
            });
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          requestAnimationFrame(checkSegments);
        } else {
          // Timeout - return empty array (might be empty text)
          resolve([]);
        }
      };
      checkSegments();
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // Find and store template element before any modifications
    this._templateElement = this.querySelector("template");

    // Initialize _textContent from DOM if not already set (for declarative usage)
    if (this._textContent === null) {
      this._textContent = this.getTextContent();
      this.lastTextContent = this._textContent;
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.setupMutationObserver();
      this.splitText();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mutationObserver?.disconnect();
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (
      changedProperties.has("split") ||
      changedProperties.has("staggerMs") ||
      changedProperties.has("easing") ||
      changedProperties.has("durationMs")
    ) {
      this.splitText();
    }
  }

  private setupMutationObserver() {
    this.mutationObserver = new MutationObserver(() => {
      // Only react to changes that aren't from our own segment creation
      const currentText = this._textContent || this.getTextContent();
      if (currentText !== this.lastTextContent) {
        this._textContent = currentText;
        this.lastTextContent = currentText;
        this.splitText();
      }
    });

    this.mutationObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  private getTextContent(): string {
    // Get text content, handling both text nodes and HTML content
    let text = "";
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        // Skip ef-text-segment elements (they're created by us)
        if (element.tagName === "EF-TEXT-SEGMENT") {
          continue;
        }
        // Skip template elements (they're templates, not content)
        if (element.tagName === "TEMPLATE") {
          continue;
        }
        text += element.textContent || "";
      }
    }
    return text;
  }

  private splitText() {
    // Validate split mode
    const validatedSplit = this.validateSplit(this.split);
    if (validatedSplit !== this.split) {
      this.split = validatedSplit;
      return; // Will trigger updated() which calls splitText() again
    }

    // Validate stagger
    const validatedStagger = this.validateStagger(this.staggerMs);
    if (validatedStagger !== this.staggerMs) {
      this.staggerMs = validatedStagger;
      return; // Will trigger updated() which calls splitText() again
    }

    // Read text content - use stored _textContent if set, otherwise read from DOM
    const text =
      this._textContent !== null ? this._textContent : this.getTextContent();
    if (!text || text.trim().length === 0) {
      // Clear segments if no text
      const existingSegments = Array.from(
        this.querySelectorAll("ef-text-segment"),
      );
      for (const segment of existingSegments) {
        segment.remove();
      }
      // Clear text nodes
      const textNodes: ChildNode[] = [];
      for (const node of Array.from(this.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node as ChildNode);
        }
      }
      for (const node of textNodes) {
        node.remove();
      }
      this.lastTextContent = "";
      // Resolve any waiting promises
      this._segmentsReadyResolvers.forEach((resolve) => {
        resolve();
      });
      this._segmentsReadyResolvers = [];
      return;
    }

    const segments = this.splitTextIntoSegments(text);
    const durationMs = this.durationMs || 1000; // Default 1 second if no duration

    // Clear ALL child nodes (text nodes and segments) by replacing innerHTML
    // This ensures we don't have any leftover text nodes
    const fragment = document.createDocumentFragment();

    // Find template element if not already stored
    if (!this._templateElement) {
      this._templateElement = this.querySelector("template");
    }

    // Get template content structure
    // If template exists, clone it; otherwise create default ef-text-segment
    const templateContent = this._templateElement?.content;
    const templateSegments = templateContent
      ? Array.from(templateContent.querySelectorAll("ef-text-segment"))
      : [];

    // If no template segments found, we'll create a default one
    const useTemplate = templateSegments.length > 0;
    const segmentsPerTextSegment = useTemplate ? templateSegments.length : 1;

    // Create new segments in a fragment first
    segments.forEach((segmentText, textIndex) => {
      // Calculate stagger offset if stagger is set
      let staggerOffset: number | undefined;
      if (this.staggerMs !== undefined) {
        // Apply easing to the stagger offset
        // Normalize index to 0-1 range (0 for first segment, 1 for last segment)
        const totalSegments = segments.length;
        const normalizedProgress =
          totalSegments > 1 ? textIndex / (totalSegments - 1) : 0;

        // Apply easing function to get eased progress
        const easedProgress = evaluateEasing(this.easing, normalizedProgress);

        // Calculate total stagger duration (last segment gets full stagger)
        const totalStaggerDuration = (totalSegments - 1) * this.staggerMs;

        // Apply eased progress to total stagger duration
        staggerOffset = easedProgress * totalStaggerDuration;
      }

      if (useTemplate && templateContent) {
        // Clone template content for each text segment
        // This allows multiple ef-text-segment elements per character/word/line
        const clonedContent = templateContent.cloneNode(
          true,
        ) as DocumentFragment;
        const clonedSegments = Array.from(
          clonedContent.querySelectorAll("ef-text-segment"),
        ) as EFTextSegment[];

        clonedSegments.forEach((segment, templateIndex) => {
          // Set properties - Lit will process these when element is connected
          segment.segmentText = segmentText;
          // Calculate segment index accounting for multiple segments per text segment
          segment.segmentIndex =
            textIndex * segmentsPerTextSegment + templateIndex;
          segment.segmentStartMs = 0;
          segment.segmentEndMs = durationMs;
          segment.staggerOffsetMs = staggerOffset ?? 0;

          // Set data attribute for line mode to enable block display
          if (this.split === "line") {
            segment.setAttribute("data-line-segment", "true");
          }

          // Mark as created to avoid being picked up as template
          segment.setAttribute("data-segment-created", "true");

          fragment.appendChild(segment);
        });
      } else {
        // No template - create default ef-text-segment
        const segment = document.createElement(
          "ef-text-segment",
        ) as EFTextSegment;

        segment.segmentText = segmentText;
        segment.segmentIndex = textIndex;
        segment.segmentStartMs = 0;
        segment.segmentEndMs = durationMs;
        segment.staggerOffsetMs = staggerOffset ?? 0;

        // Set data attribute for line mode to enable block display
        if (this.split === "line") {
          segment.setAttribute("data-line-segment", "true");
        }

        // Mark as created to avoid being picked up as template
        segment.setAttribute("data-segment-created", "true");

        fragment.appendChild(segment);
      }
    });

    // Ensure segments are connected to DOM before checking for animations
    // Append fragment first, then trigger updates

    // Replace all children with the fragment (this clears text nodes and old segments)
    // But preserve the template element if it exists
    const templateToPreserve = this._templateElement;
    while (this.firstChild) {
      const child = this.firstChild;
      // Don't remove the template element
      if (child === templateToPreserve) {
        // Skip template, but we need to move it after the fragment
        // So we'll remove it temporarily and re-add it after
        this.removeChild(child);
        continue;
      }
      this.removeChild(child);
    }
    this.appendChild(fragment);
    // Re-add template element if it existed
    if (templateToPreserve) {
      this.appendChild(templateToPreserve);
    }

    // Segments will pause their own animations in connectedCallback
    // Lit will automatically update them when they're connected to the DOM
    // Ensure segments are updated after being connected
    requestAnimationFrame(() => {
      const segmentElements = this.segments;
      Promise.all(segmentElements.map((seg) => seg.updateComplete)).then(() => {
        // Wait an additional frame to ensure animations are paused in connectedCallback
        // Then trigger updateAnimations to set correct state
        // This ensures animations are positioned correctly on first load
        requestAnimationFrame(() => {
          const rootTimegroup = this.rootTimegroup;
          if (rootTimegroup) {
            updateAnimations(rootTimegroup);
          } else {
            updateAnimations(this);
          }
        });
      });
    });

    this.lastTextContent = text;
    this._textContent = text;

    // Resolve any waiting promises after segments are connected
    requestAnimationFrame(() => {
      this._segmentsReadyResolvers.forEach((resolve) => {
        resolve();
      });
      this._segmentsReadyResolvers = [];
    });
  }

  private splitTextIntoSegments(text: string): string[] {
    switch (this.split) {
      case "line": {
        // Split on newlines
        const lines = text.split(/\r?\n/);
        // Filter out empty lines but keep the structure
        return lines.filter((line) => line.length > 0);
      }
      case "word": {
        // Split on whitespace boundaries, preserving spaces after words
        const words: string[] = [];
        // Split by word boundaries, but keep spaces after words
        const parts = text.split(/(\S+)/);
        for (const part of parts) {
          if (part.trim().length > 0) {
            // This is a word - check if there's a space after it in the original text
            words.push(part);
          } else if (part.length > 0) {
            // This is whitespace - attach it to the previous word if exists, otherwise skip
            if (words.length > 0) {
              words[words.length - 1] += part;
            }
          }
        }
        // If no words found, return original text
        return words.length > 0 ? words : [text];
      }
      case "char": {
        // Split every character, preserving whitespace
        return Array.from(text);
      }
      default:
        return [text];
    }
  }

  get intrinsicDurationMs(): number | undefined {
    // If explicit duration is set, use it
    if (this.hasExplicitDuration) {
      return undefined; // Let explicit duration take precedence
    }

    // Otherwise, calculate from content
    // Use _textContent if set, otherwise read from DOM
    const text =
      this._textContent !== null ? this._textContent : this.getTextContent();
    if (!text || text.trim().length === 0) {
      return 0;
    }

    // Default to 1 second per segment (can be overridden with explicit duration)
    // Use the same splitting logic as splitTextIntoSegments
    let segmentCount = 1;
    switch (this.split) {
      case "line": {
        const lines = text
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0);
        segmentCount = lines.length || 1;
        break;
      }
      case "word": {
        // Use same logic as splitTextIntoSegments for consistency
        const words: string[] = [];
        const parts = text.split(/(\S+)/);
        for (const part of parts) {
          if (part.trim().length > 0) {
            words.push(part);
          } else if (part.length > 0) {
            if (words.length > 0) {
              words[words.length - 1] += part;
            }
          }
        }
        segmentCount = words.length > 0 ? words.length : 1;
        break;
      }
      case "char": {
        segmentCount = text.length || 1;
        break;
      }
    }

    return segmentCount * 1000;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-text": EFText;
  }
}
