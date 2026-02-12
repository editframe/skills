import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ReactiveController } from "lit";
import type { GetISOBMFFFileTranscriptionResult } from "../../../api/src/index.js";
import {
  type FrameRenderable,
  type FrameState,
  PRIORITY_CAPTIONS,
} from "../preview/FrameController.js";
import { AsyncValue } from "./EFMedia.js";
import { CrossUpdateController } from "./CrossUpdateController.js";
import { EFAudio } from "./EFAudio.js";
import { EFSourceMixin } from "./EFSourceMixin.js";
import { EFTemporal, flushStartTimeMsCache } from "./EFTemporal.js";
import {
  flushSequenceDurationCache,
  EFTimegroup,
} from "./EFTimegroup.js";
import { EFVideo } from "./EFVideo.js";
import { FetchMixin } from "./FetchMixin.js";

export interface WordSegment {
  text: string;
  start: number;
  end: number;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Caption {
  segments: Segment[];
  word_segments: WordSegment[];
}

const stopWords = new Set(["", ".", "!", "?", ","]);

/**
 * Caption active word element - displays the currently spoken word.
 * Uses light DOM for simplicity - parent sets textContent directly.
 */
@customElement("ef-captions-active-word")
export class EFCaptionsActiveWord extends LitElement {
  #wordText = "";
  #wordIndex = 0;
  
  set wordText(text: string) {
    this.#wordText = text;
    // Hide element if no content or only stop words
    if (!text || stopWords.has(text)) {
      this.hidden = true;
      this.textContent = "";
    } else {
      this.hidden = false;
      // Add trailing space to maintain consistent spacing with surrounding words
      this.textContent = text + " ";
    }
  }
  
  get wordText(): string {
    return this.#wordText;
  }
  
  set wordIndex(index: number) {
    this.#wordIndex = index;
    // Set deterministic --ef-word-seed value based on word index
    const seed = (index * 9007) % 233; // Prime numbers for better distribution
    const seedValue = seed / 233; // Normalize to 0-1 range
    this.style.setProperty("--ef-word-seed", seedValue.toString());
  }
  
  get wordIndex(): number {
    return this.#wordIndex;
  }
}

/**
 * Caption segment element - displays a full caption segment.
 * Uses light DOM for simplicity - parent sets textContent directly.
 */
@customElement("ef-captions-segment")
export class EFCaptionsSegment extends LitElement {
  #segmentText = "";
  
  set segmentText(text: string) {
    this.#segmentText = text;
    // Hide element if no content or only stop words
    if (!text || stopWords.has(text)) {
      this.hidden = true;
      this.textContent = "";
    } else {
      this.hidden = false;
      this.textContent = text;
    }
  }
  
  get segmentText(): string {
    return this.#segmentText;
  }
}

/**
 * Caption before-active-word element - displays words before the current word.
 * Uses light DOM for simplicity - parent sets textContent directly.
 */
@customElement("ef-captions-before-active-word")
export class EFCaptionsBeforeActiveWord extends EFCaptionsSegment {
  set segmentText(text: string) {
    // Check if there's an active word by looking for sibling active word element
    const activeWord = this.closest("ef-captions")?.querySelector(
      "ef-captions-active-word",
    ) as EFCaptionsActiveWord;
    const hasActiveWord = activeWord?.wordText;
    
    // Add trailing space if there's an active word coming after us
    const finalText = text && hasActiveWord ? text + " " : text;
    
    // Hide element if no content or only stop words
    if (!finalText || stopWords.has(finalText)) {
      this.hidden = true;
      this.textContent = "";
    } else {
      this.hidden = false;
      this.textContent = finalText;
    }
  }
}

/**
 * Caption after-active-word element - displays words after the current word.
 * Uses light DOM for simplicity - parent sets textContent directly.
 */
@customElement("ef-captions-after-active-word")
export class EFCaptionsAfterActiveWord extends EFCaptionsSegment {
  set segmentText(text: string) {
    // No leading space - active word will add trailing space
    const finalText = text;
    
    // Hide element if no content or only stop words
    if (!finalText || stopWords.has(finalText)) {
      this.hidden = true;
      this.textContent = "";
    } else {
      this.hidden = false;
      this.textContent = finalText;
    }
  }
}

@customElement("ef-captions")
export class EFCaptions extends EFSourceMixin(
  EFTemporal(FetchMixin(LitElement)),
  { assetType: "caption_files" },
) implements FrameRenderable {
  static styles = [
    css`
      :host {
        display: block;
        white-space: normal;
        line-height: 1;
        gap: 0;
      }
      ::slotted(*) {
        display: inline;
        margin: 0;
        padding: 0;
      }
    `,
  ];

  @property({ type: String, attribute: "target", reflect: true })
  targetSelector = "";

  set target(value: string) {
    this.targetSelector = value;
  }

  @property({ attribute: "word-style" })
  wordStyle = "";

  /**
   * URL or path to a JSON file containing custom captions data.
   * The JSON should conform to the Caption interface with 'segments' and 'word_segments' arrays.
   */
  @property({ type: String, attribute: "captions-src", reflect: true })
  captionsSrc = "";

  /**
   * Direct captions data object. Takes priority over captions-src and captions-script.
   * Should conform to the Caption interface with 'segments' and 'word_segments' arrays.
   */
  @property({ type: Object, attribute: false })
  captionsData: Caption | null = null;

  /**
   * ID of a <script> element containing JSON captions data.
   * The script's textContent should be valid JSON conforming to the Caption interface.
   */
  @property({ type: String, attribute: "captions-script", reflect: true })
  captionsScript = "";

  activeWordContainers = this.getElementsByTagName("ef-captions-active-word");
  segmentContainers = this.getElementsByTagName("ef-captions-segment");
  beforeActiveWordContainers = this.getElementsByTagName(
    "ef-captions-before-active-word",
  );
  afterActiveWordContainers = this.getElementsByTagName(
    "ef-captions-after-active-word",
  );

  // Cache for intrinsicDurationMs to avoid expensive O(n) recalculation every frame
  #cachedIntrinsicDurationMs: number | undefined | null = null; // null = not computed, undefined = no duration

  render() {
    return html`<slot></slot>`;
  }

  transcriptionsPath() {
    if (!this.targetElement) {
      return null;
    }
    const fileId = this.targetElement.fileId ?? this.targetElement.assetId;
    if (fileId) {
      return `${this.apiHost}/api/v1/files/${fileId}/transcription`;
    }
    return null;
  }

  captionsPath() {
    if (!this.targetElement) {
      return null;
    }
    const fileId = this.targetElement.fileId ?? this.targetElement.assetId;
    if (fileId) {
      return `${this.apiHost}/api/v1/files/${fileId}`;
    }
    const targetSrc = this.targetElement.src;
    // Normalize the path: remove leading slash and any double slashes
    let normalizedSrc = targetSrc.startsWith("/")
      ? targetSrc.slice(1)
      : targetSrc;
    normalizedSrc = normalizedSrc.replace(/^\/+/, "");
    // Use production API format for local files
    return `/api/v1/assets/local/captions?src=${encodeURIComponent(normalizedSrc)}`;
  }

  // ============================================================================
  // Captions Data Loading - async methods instead of Tasks
  // ============================================================================

  #captionsDataLoaded = false;
  #captionsDataPromise: Promise<Caption | null> | null = null;
  #captionsDataValue: Caption | null = null;
  #transcriptionData: GetISOBMFFFileTranscriptionResult | null = null;

  /**
   * AsyncValue wrapper for backwards compatibility
   */
  unifiedCaptionsDataTask = new AsyncValue<Caption | null>();

  override shouldAutoReady(): boolean {
    return false;
  }

  /**
   * Load captions data from all possible sources
   */
  async loadCaptionsData(signal?: AbortSignal): Promise<Caption | null> {
    // Return cached if already loaded
    if (this.#captionsDataLoaded && this.#captionsDataValue) {
      this.setContentReadyState("ready");
      return this.#captionsDataValue;
    }

    // Return in-flight promise
    if (this.#captionsDataPromise) {
      return this.#captionsDataPromise;
    }

    this.unifiedCaptionsDataTask.startPending();
    this.setContentReadyState("loading");
    this.#captionsDataPromise = this.#doLoadCaptionsData(signal);

    try {
      this.#captionsDataValue = await this.#captionsDataPromise;
      this.#captionsDataLoaded = true;
      if (this.#captionsDataValue) {
        this.unifiedCaptionsDataTask.setValue(this.#captionsDataValue);
      }
      this.setContentReadyState("ready");
      return this.#captionsDataValue;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      console.error("Failed to load captions data:", error);
      this.setContentReadyState("error");
      return null;
    } finally {
      this.#captionsDataPromise = null;
    }
  }

  async #doLoadCaptionsData(signal?: AbortSignal): Promise<Caption | null> {
    // Priority 1: Direct captionsData property
    if (this.captionsData) {
      return this.captionsData;
    }

    // Priority 2: Script element reference
    if (this.captionsScript) {
      const scriptElement = this.#findElementById(this.captionsScript);
      if (scriptElement?.textContent) {
        try {
          return JSON.parse(scriptElement.textContent) as Caption;
        } catch (error) {
          console.error(`Failed to parse captions from script #${this.captionsScript}:`, error);
        }
      }
    }

    // Priority 3: External captions file
    if (this.captionsSrc) {
      try {
        const response = await this.fetch(this.captionsSrc, { signal });
        return await response.json() as Caption;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        console.error(`Failed to load captions from ${this.captionsSrc}:`, error);
      }
    }

    // Priority 4: Transcription from target element
    if (this.targetElement && !this.hasCustomCaptionsData) {
      const transcriptionPath = this.transcriptionsPath();
      if (transcriptionPath) {
        try {
          const response = await this.fetch(transcriptionPath, { signal });
          this.#transcriptionData = await response.json() as GetISOBMFFFileTranscriptionResult;
          signal?.throwIfAborted();

          // Load fragment for current time
          if (this.#transcriptionData) {
            return this.#loadTranscriptionFragment(signal);
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          // Transcription not available - not an error
        }
      }
    }

    return null;
  }

  async #loadTranscriptionFragment(signal?: AbortSignal): Promise<Caption | null> {
    if (!this.#transcriptionData) return null;

    const fragmentIndex = Math.floor(this.ownCurrentTimeMs / this.#transcriptionData.work_slice_ms);
    const fragmentPath = `${this.apiHost}/api/v1/transcriptions/${this.#transcriptionData.id}/fragments/${fragmentIndex}`;

    try {
      const response = await this.fetch(fragmentPath, { signal });
      return await response.json() as Caption;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      console.error("Failed to load transcription fragment:", error);
      return null;
    }
  }

  // ============================================================================
  // FrameRenderable Implementation
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Check if captions data is loaded
    const hasData = this.#captionsDataLoaded && this.#captionsDataValue !== null;

    return {
      needsPreparation: !hasData,
      isReady: hasData,
      priority: PRIORITY_CAPTIONS,
    };
  }

  /**
   * Async preparation - waits for captions data to load.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    await this.loadCaptionsData(signal);
    signal.throwIfAborted();
  }

  /**
   * Synchronous render - updates caption text containers.
   * Sets textContent directly on child elements (light DOM).
   * @implements FrameRenderable
   */
  renderFrame(_timeMs: number): void {
    // Update text containers by setting properties
    // Child elements update their textContent directly (light DOM)
    this.updateTextContainers();
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

  #rootTimegroupUpdateController?: ReactiveController;

  connectedCallback() {
    super.connectedCallback();

    // Start loading captions data
    this.loadCaptionsData().catch(() => {});

    // Try to get target element safely
    const target = this.targetSelector
      ? this.#findElementById(this.targetSelector)
      : null;
    if (target && (target instanceof EFAudio || target instanceof EFVideo)) {
      new CrossUpdateController(target, this);
    }
    // For standalone captions with custom data, ensure proper timeline sync
    else if (this.hasCustomCaptionsData && this.rootTimegroup) {
      new CrossUpdateController(this.rootTimegroup, this);
    }

    // Ensure captions update when root timegroup's currentTimeMs changes
    if (this.rootTimegroup) {
      this.#rootTimegroupUpdateController = {
        hostUpdated: () => {
          Promise.resolve().then(() => {
            this.updateTextContainers();
          });
        },
        hostDisconnected: () => {
          this.#rootTimegroupUpdateController = undefined;
        },
      };
      this.rootTimegroup.addController(this.#rootTimegroupUpdateController);
    }

    // Prevent display:none from being set on the parent caption element.
    // IMPORTANT: This only applies to the parent <ef-captions> element, NOT to
    // caption child elements (<ef-captions-segment>, <ef-captions-active-word>, etc.).
    // Child elements MUST respect display:none for proper temporal visibility
    // in video rendering. Video export relies on display:none to hide elements
    // outside their time range.
    const observer = new MutationObserver(() => {
      if (this.style.display === "none") {
        this.style.removeProperty("display");
        this.style.opacity = "0";
        this.style.pointerEvents = "none";
      } else if (!this.style.display || this.style.display === "") {
        this.style.removeProperty("opacity");
        this.style.removeProperty("pointer-events");
      }
    });
    observer.observe(this, { attributes: true, attributeFilter: ["style"] });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#rootTimegroupUpdateController && this.rootTimegroup) {
      this.rootTimegroup.removeController(this.#rootTimegroupUpdateController);
      this.#rootTimegroupUpdateController = undefined;
    }
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    // Set up root timegroup controller if rootTimegroup is now available
    if (this.rootTimegroup && !this.#rootTimegroupUpdateController) {
      this.#rootTimegroupUpdateController = {
        hostUpdated: () => {
          Promise.resolve().then(() => {
            this.updateTextContainers();
          });
        },
        hostDisconnected: () => {
          this.#rootTimegroupUpdateController = undefined;
        },
      };
      this.rootTimegroup.addController(this.#rootTimegroupUpdateController);
    }

    // Clean up controller if rootTimegroup changed
    if (
      changedProperties.has("rootTimegroup") &&
      this.#rootTimegroupUpdateController
    ) {
      const oldRootTimegroup = changedProperties.get("rootTimegroup") as
        | EFTimegroup
        | undefined;
      if (oldRootTimegroup && oldRootTimegroup !== this.rootTimegroup) {
        oldRootTimegroup.removeController(this.#rootTimegroupUpdateController);
        this.#rootTimegroupUpdateController = undefined;
      }
    }

    this.updateTextContainers();

    // Force duration recalculation when custom captions data changes
    if (
      changedProperties.has("captionsData") ||
      changedProperties.has("captionsSrc") ||
      changedProperties.has("captionsScript")
    ) {
      this.emitContentChange("source");
      this.#cachedIntrinsicDurationMs = null;
      this.#captionsDataLoaded = false;
      this.#captionsDataValue = null;
      this.loadCaptionsData().catch(() => {});

      this.requestUpdate("intrinsicDurationMs");

      flushSequenceDurationCache();
      flushStartTimeMsCache();

      if (this.parentTimegroup) {
        this.parentTimegroup.requestUpdate("durationMs");
        this.parentTimegroup.requestUpdate("currentTime");
      }
    }

    // Update captions when timeline position changes
    if (changedProperties.has("ownCurrentTimeMs")) {
      this.updateTextContainers();
    }
  }

  updateTextContainers() {
    const captionsData = this.#captionsDataValue;
    if (!captionsData) {
      return;
    }

    // For captions with custom data, try to use the video's source time
    let currentTimeMs = this.ownCurrentTimeMs;
    if (this.hasCustomCaptionsData && this.parentTimegroup) {
      const videoElement = Array.from(this.parentTimegroup.children).find(
        (child): child is EFVideo => child instanceof EFVideo,
      );
      if (videoElement) {
        const sourceInMs = videoElement.sourceInMs ?? 0;
        currentTimeMs = videoElement.currentSourceTimeMs - sourceInMs;
        currentTimeMs = Math.max(0, Math.min(currentTimeMs, this.durationMs));
      }
    }

    const currentTimeSec = currentTimeMs / 1000;

    // Find the current word from word_segments
    const currentWord = captionsData.word_segments.find(
      (word) => currentTimeSec >= word.start && currentTimeSec < word.end,
    );

    // Find the current segment
    const currentSegment = captionsData.segments.find(
      (segment) =>
        currentTimeSec >= segment.start && currentTimeSec < segment.end,
    );

    for (const wordContainer of this.activeWordContainers) {
      if (currentWord) {
        const wordIndex = captionsData.word_segments.findIndex(
          (w) =>
            w.start === currentWord.start &&
            w.end === currentWord.end &&
            w.text === currentWord.text,
        );
        wordContainer.wordIndex = wordIndex >= 0 ? wordIndex : 0;
        wordContainer.wordText = currentWord.text; // Sets textContent directly
      } else {
        wordContainer.wordText = ""; // Hides element
      }
    }

    for (const segmentContainer of this.segmentContainers) {
      if (currentSegment) {
        segmentContainer.segmentText = currentSegment.text; // Sets textContent directly
      } else {
        segmentContainer.segmentText = ""; // Hides element
      }
    }

    // Process context for both word and segment cases
    if (currentWord && currentSegment) {
      const segmentWords = captionsData.word_segments.filter(
        (word) =>
          word.start >= currentSegment.start && word.end <= currentSegment.end,
      );

      const currentWordIndex = segmentWords.findIndex(
        (word) =>
          word.start === currentWord.start && word.end === currentWord.end,
      );

      if (currentWordIndex !== -1) {
        const beforeWords = segmentWords
          .slice(0, currentWordIndex)
          .map((w) => w.text.trim())
          .join(" ");

        const afterWords = segmentWords
          .slice(currentWordIndex + 1)
          .map((w) => w.text.trim())
          .join(" ");

        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = beforeWords; // Sets textContent directly
        }

        for (const container of this.afterActiveWordContainers) {
          container.segmentText = afterWords; // Sets textContent directly
        }
      }
    } else if (currentSegment) {
      const segmentWords = captionsData.word_segments.filter(
        (word) =>
          word.start >= currentSegment.start && word.end <= currentSegment.end,
      );

      const firstWord = segmentWords[0];
      const isBeforeFirstWord = firstWord && currentTimeSec < firstWord.start;

      if (isBeforeFirstWord) {
        const allWords = segmentWords.map((w) => w.text.trim()).join(" ");

        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = ""; // Hides element
        }

        for (const container of this.afterActiveWordContainers) {
          container.segmentText = allWords; // Sets textContent directly
        }
      } else {
        const allCompletedWords = segmentWords
          .map((w) => w.text.trim())
          .join(" ");

        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = allCompletedWords; // Sets textContent directly
        }

        for (const container of this.afterActiveWordContainers) {
          container.segmentText = ""; // Hides element
        }
      }
    } else {
      for (const container of this.beforeActiveWordContainers) {
        container.segmentText = ""; // Hides element
      }

      for (const container of this.afterActiveWordContainers) {
        container.segmentText = ""; // Hides element
      }
    }
  }

  get targetElement() {
    const target = this.targetSelector ? this.#findElementById(this.targetSelector) : null;
    if (target instanceof EFAudio || target instanceof EFVideo) {
      return target;
    }
    if (this.hasCustomCaptionsData) {
      return null;
    }
    return null;
  }

  get hasCustomCaptionsData(): boolean {
    return !!(this.captionsData || this.captionsSrc || this.captionsScript);
  }

  /**
   * Find element by ID, searching within clone scope first to avoid cross-boundary references.
   * @private
   */
  #findElementById(id: string): Element | null {
    // Search within nearest timegroup or configuration container first
    const container = this.closest('ef-timegroup, ef-configuration');
    if (container) {
      const result = container.querySelector(`#${CSS.escape(id)}`);
      if (result) return result;
    }
    
    // Fall back to document-wide search
    return document.getElementById(id);
  }

  get intrinsicDurationMs(): number | undefined {
    if (this.#cachedIntrinsicDurationMs !== null) {
      return this.#cachedIntrinsicDurationMs;
    }

    let captionsData: Caption | null = null;

    if (this.captionsData) {
      captionsData = this.captionsData;
    } else if (this.captionsScript) {
      const scriptElement = this.#findElementById(this.captionsScript);
      if (scriptElement?.textContent) {
        try {
          captionsData = JSON.parse(scriptElement.textContent) as Caption;
        } catch {
          // Invalid JSON
        }
      }
    } else if (this.#captionsDataValue) {
      captionsData = this.#captionsDataValue;
    }

    if (!captionsData) {
      if (!this.captionsData && !this.captionsScript && !this.captionsSrc) {
        this.#cachedIntrinsicDurationMs = undefined;
      }
      return undefined;
    }

    let result: number;
    if (
      captionsData.segments.length === 0 &&
      captionsData.word_segments.length === 0
    ) {
      result = 0;
    } else {
      const maxSegmentEnd =
        captionsData.segments.length > 0
          ? captionsData.segments.reduce(
              (max, s) => (s.end > max ? s.end : max),
              0,
            )
          : 0;
      const maxWordEnd =
        captionsData.word_segments.length > 0
          ? captionsData.word_segments.reduce(
              (max, w) => (w.end > max ? w.end : max),
              0,
            )
          : 0;

      result = Math.max(maxSegmentEnd, maxWordEnd) * 1000;
    }

    this.#cachedIntrinsicDurationMs = result;
    return result;
  }

  get hasOwnDuration(): boolean {
    return !!(
      this.captionsData ||
      this.captionsScript ||
      this.#captionsDataValue
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-captions": EFCaptions;
    "ef-captions-active-word": EFCaptionsActiveWord;
    "ef-captions-segment": EFCaptionsSegment;
    "ef-captions-before-active-word": EFCaptionsBeforeActiveWord;
    "ef-captions-after-active-word": EFCaptionsAfterActiveWord;
  }
}
