import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import { durationConverter } from "./durationConverter.js";
import { EFTemporal } from "./EFTemporal.js";
import type { EFTimegroup } from "./EFTimegroup.js";
import { evaluateEasing } from "./easingUtils.js";
import type { EFTextSegment } from "./EFTextSegment.js";
import { updateAnimations } from "./updateAnimations.js";
import type { AnimatableElement } from "./updateAnimations.js";

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
      .ef-word-wrapper {
        display: inline-block;
        white-space: nowrap;
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
  #segmentsInitialized = false;

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
      if (this.isConnected) {
        this.emitContentChange("content");
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

    // If segments already initialized and exist, return immediately (no RAF waits)
    if (this.#segmentsInitialized && this.segments.length > 0) {
      await Promise.all(this.segments.map((seg) => seg.updateComplete));
      return this.segments;
    }

    // Check if segments are already in DOM (synchronous check - no RAF)
    let segments = this.segments;
    if (segments.length > 0) {
      // Segments exist, just wait for their Lit updates (no RAF)
      await Promise.all(segments.map((seg) => seg.updateComplete));
      this.#segmentsInitialized = true;
      return segments;
    }

    // Segments don't exist yet - use the promise-based mechanism (no RAF polling)
    // This waits for splitText() to complete and resolve the promise
    return new Promise<EFTextSegment[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove our resolver if we timeout
        const index = this._segmentsReadyResolvers.indexOf(resolveWithSegments);
        if (index > -1) {
          this._segmentsReadyResolvers.splice(index, 1);
        }
        reject(new Error('Timeout waiting for text segments to be created'));
      }, 5000); // 5 second timeout

      const resolveWithSegments = () => {
        clearTimeout(timeout);
        // Wait for segment Lit updates
        const segments = this.segments;
        Promise.all(segments.map((seg) => seg.updateComplete)).then(() => {
          this.#segmentsInitialized = true;
          resolve(segments);
        });
      };

      this._segmentsReadyResolvers.push(resolveWithSegments);
      
      // Trigger splitText if it hasn't run yet
      // This handles the case where segments haven't been created at all
      if (segments.length === 0 && this.isConnected) {
        this.splitText();
      }
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

    // Use RAF to ensure DOM is fully ready before splitting text
    // Callers that need segments immediately (e.g., render clones) should await whenSegmentsReady()
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
      this.emitContentChange("content");
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
    const trimmedText = text.trim();
    const textStartOffset = text.indexOf(trimmedText);
    
    // GUARD: Check if segments are already correct before clearing/recreating
    // This prevents redundant splits from RAF callbacks, updated(), etc.
    if (this.#segmentsInitialized && this.segments.length > 0 && this.lastTextContent === text) {
      return;
    }
    
    if (!text || trimmedText.length === 0) {
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
      // Reset initialization flag when clearing segments
      this.#segmentsInitialized = false;
      return;
    }

    // Reset initialization flag when we're about to create new segments
    this.#segmentsInitialized = false;

    const segments = this.splitTextIntoSegments(text);
    const durationMs = this.durationMs || 1000; // Default 1 second if no duration

    // For character mode, detect word boundaries to wrap characters within words
    let wordBoundaries: Map<number, number> | null = null;
    if (this.split === "char") {
      wordBoundaries = this.detectWordBoundaries(text);
    }

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

    // For character mode with word wrapping, track current word and wrap segments
    let currentWordIndex: number | null = null;
    let currentWordSpan: HTMLSpanElement | null = null;
    let charIndex = 0; // Track position in original text for character mode

    // For word splitting, count only word segments (not whitespace) for stagger calculation
    const wordOnlySegments =
      this.split === "word"
        ? segments.filter((seg) => !/^\s+$/.test(seg))
        : segments;
    const wordSegmentCount = wordOnlySegments.length;

    // Track word index as we iterate (for word mode with duplicate words)
    // This ensures each occurrence of duplicate words gets a unique stagger index
    let wordStaggerIndex = 0;

    // Create new segments in a fragment first
    segments.forEach((segmentText, textIndex) => {
      // Calculate stagger offset if stagger is set
      let staggerOffset: number | undefined;
      if (this.staggerMs !== undefined) {
        // For word splitting, whitespace segments should inherit stagger from preceding word
        const isWhitespace = /^\s+$/.test(segmentText);
        let wordIndexForStagger: number;

        if (this.split === "word" && isWhitespace) {
          // Whitespace inherits from the preceding word's index
          // Use the word stagger index (which is the index of the word before this whitespace)
          wordIndexForStagger = Math.max(0, wordStaggerIndex - 1);
        } else if (this.split === "word") {
          // For word mode, use the current word stagger index (incremented for each word encountered)
          // This ensures duplicate words get unique indices based on their position
          wordIndexForStagger = wordStaggerIndex;
          wordStaggerIndex++;
        } else {
          // For char/line mode, use the actual position in segments array
          wordIndexForStagger = textIndex;
        }

        // Apply easing to the stagger offset
        // Normalize index to 0-1 range (0 for first segment, 1 for last segment)
        const normalizedProgress =
          wordSegmentCount > 1
            ? wordIndexForStagger / (wordSegmentCount - 1)
            : 0;

        // Apply easing function to get eased progress
        const easedProgress = evaluateEasing(this.easing, normalizedProgress);

        // Calculate total stagger duration (last segment gets full stagger)
        const totalStaggerDuration = (wordSegmentCount - 1) * this.staggerMs;

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

          // For character mode with templates, also wrap in word spans
          if (this.split === "char" && wordBoundaries) {
            const originalCharIndex = textStartOffset + charIndex;
            const wordIndex = wordBoundaries.get(originalCharIndex);
            if (wordIndex !== undefined) {
              if (wordIndex !== currentWordIndex) {
                if (currentWordSpan) {
                  fragment.appendChild(currentWordSpan);
                }
                currentWordIndex = wordIndex;
                currentWordSpan = document.createElement("span");
                currentWordSpan.className = "ef-word-wrapper";
              }
              if (currentWordSpan) {
                currentWordSpan.appendChild(segment);
              } else {
                fragment.appendChild(segment);
              }
            } else {
              if (currentWordSpan) {
                fragment.appendChild(currentWordSpan);
                currentWordSpan = null;
                currentWordIndex = null;
              }
              fragment.appendChild(segment);
            }
            charIndex += segmentText.length;
          } else {
            fragment.appendChild(segment);
          }
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

        // For character mode, wrap segments within words to prevent line breaks
        if (this.split === "char" && wordBoundaries) {
          // Map character index in trimmed text to original text position
          const originalCharIndex = textStartOffset + charIndex;
          const wordIndex = wordBoundaries.get(originalCharIndex);
          if (wordIndex !== undefined) {
            // Check if we're starting a new word
            if (wordIndex !== currentWordIndex) {
              // Close previous word span if it exists
              if (currentWordSpan) {
                fragment.appendChild(currentWordSpan);
              }
              // Start new word span
              currentWordIndex = wordIndex;
              currentWordSpan = document.createElement("span");
              currentWordSpan.className = "ef-word-wrapper";
            }
            // Append segment to current word span
            if (currentWordSpan) {
              currentWordSpan.appendChild(segment);
            } else {
              fragment.appendChild(segment);
            }
          } else {
            // Not part of a word (whitespace/punctuation) - append directly
            // Close current word span if it exists
            if (currentWordSpan) {
              fragment.appendChild(currentWordSpan);
              currentWordSpan = null;
              currentWordIndex = null;
            }
            fragment.appendChild(segment);
          }
          // Update character index for next iteration (in trimmed text)
          charIndex += segmentText.length;
        } else {
          // Not character mode or no word boundaries - append directly
          fragment.appendChild(segment);
        }
      }
    });

    // Close any remaining word span
    if (this.split === "char" && currentWordSpan) {
      fragment.appendChild(currentWordSpan);
    }

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
    const segmentElements = this.segments;
    Promise.all(segmentElements.map((seg) => seg.updateComplete)).then(() => {
      const rootTimegroup = this.rootTimegroup || this;
      updateAnimations(rootTimegroup as AnimatableElement);
    });

    this.lastTextContent = text;
    this._textContent = text;
    
    // Mark segments as initialized to prevent redundant splits
    this.#segmentsInitialized = true;

    // Resolve any waiting promises after segments are connected (synchronous)
    this._segmentsReadyResolvers.forEach((resolve) => {
      resolve();
    });
    this._segmentsReadyResolvers = [];
  }

  private detectWordBoundaries(text: string): Map<number, number> {
    // Create a map from character index to word index
    // Characters within the same word will have the same word index
    const boundaries = new Map<number, number>();
    const trimmedText = text.trim();
    if (!trimmedText) {
      return boundaries;
    }

    // Use Intl.Segmenter to detect word boundaries
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "word",
    });
    const segments = Array.from(segmenter.segment(trimmedText));

    // Find the offset of trimmedText within the original text
    const textStart = text.indexOf(trimmedText);

    let wordIndex = 0;
    for (const seg of segments) {
      if (seg.isWordLike) {
        // Map all character positions in this word to the same word index
        for (let i = 0; i < seg.segment.length; i++) {
          const charPos = textStart + seg.index + i;
          boundaries.set(charPos, wordIndex);
        }
        wordIndex++;
      }
    }

    return boundaries;
  }

  private splitTextIntoSegments(text: string): string[] {
    // Trim text before segmenting to remove leading/trailing whitespace
    const trimmedText = text.trim();
    if (!trimmedText) {
      return [];
    }

    switch (this.split) {
      case "line": {
        // Split on newlines and trim each line
        const lines = trimmedText.split(/\r?\n/);
        return lines
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }
      case "word": {
        // Use Intl.Segmenter for locale-aware word segmentation
        const segmenter = new Intl.Segmenter(undefined, {
          granularity: "word",
        });
        const segments = Array.from(segmenter.segment(trimmedText));
        const result: string[] = [];

        for (const seg of segments) {
          if (seg.isWordLike) {
            // Word-like segment - add it
            result.push(seg.segment);
          } else if (/^\s+$/.test(seg.segment)) {
            // Whitespace segment - add it as-is
            result.push(seg.segment);
          } else {
            // Punctuation segment - attach to preceding word if it exists
            if (result.length > 0) {
              const lastItem = result[result.length - 1];
              if (lastItem && !/^\s+$/.test(lastItem)) {
                result[result.length - 1] = lastItem + seg.segment;
              } else {
                result.push(seg.segment);
              }
            } else {
              result.push(seg.segment);
            }
          }
        }

        return result;
      }
      case "char": {
        // Use Intl.Segmenter for grapheme-aware character segmentation
        const segmenter = new Intl.Segmenter(undefined, {
          granularity: "grapheme",
        });
        const segments = Array.from(segmenter.segment(trimmedText));
        return segments.map((seg) => seg.segment);
      }
      default:
        return [trimmedText];
    }
  }

  get intrinsicDurationMs(): number | undefined {
    // If explicit duration is set, use it
    if (this.hasExplicitDuration) {
      return undefined; // Let explicit duration take precedence
    }

    // If we have a parent timegroup that dictates duration (fixed) or inherits it (fit),
    // we should inherit from it instead of using our intrinsic duration.
    // For 'sequence' and 'contain' modes, the parent relies on our intrinsic duration,
    // so we must provide it.
    if (this.parentTimegroup) {
      const mode = this.parentTimegroup.mode;
      if (mode === "fixed" || mode === "fit") {
        return undefined;
      }
    }

    // Otherwise, calculate from content
    // Use _textContent if set, otherwise read from DOM
    const text =
      this._textContent !== null ? this._textContent : this.getTextContent();
    if (!text || text.trim().length === 0) {
      return 0;
    }

    // Use the same splitting logic as splitTextIntoSegments for consistency
    const segments = this.splitTextIntoSegments(text);
    // For word splitting, only count word segments (not whitespace) for intrinsic duration
    const segmentCount =
      this.split === "word"
        ? segments.filter((seg) => !/^\s+$/.test(seg)).length || 1
        : segments.length || 1;

    return segmentCount * 1000;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-text": EFText;
  }
}
