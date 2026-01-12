import { Task, TaskStatus } from "@lit/task";
import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ReactiveController } from "lit";
import type { GetISOBMFFFileTranscriptionResult } from "../../../api/src/index.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
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

@customElement("ef-captions-active-word")
export class EFCaptionsActiveWord extends EFTemporal(LitElement) {
  static styles = [
    css`
      :host {
        display: inline-block;
        white-space: normal;
        line-height: 1;
      }
      :host([hidden]) {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  render() {
    if (stopWords.has(this.wordText)) {
      this.hidden = true;
      return undefined;
    }
    this.hidden = false;

    // Set deterministic --ef-word-seed value based on word index
    const seed = (this.wordIndex * 9007) % 233; // Prime numbers for better distribution
    const seedValue = seed / 233; // Normalize to 0-1 range
    this.style.setProperty("--ef-word-seed", seedValue.toString());

    return html`${this.wordText}`;
  }

  @property({ type: Number, attribute: false })
  wordStartMs = 0;

  @property({ type: Number, attribute: false })
  wordEndMs = 0;

  @property({ type: String, attribute: false })
  wordText = "";

  @property({ type: Number, attribute: false })
  wordIndex = 0;

  @property({ type: Boolean, reflect: true })
  hidden = false;

  get startTimeMs() {
    // Get parent captions element's absolute start time, then add our local offset
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.wordStartMs || 0);
  }

  get endTimeMs() {
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.wordEndMs || 0);
  }

  get durationMs(): number {
    return this.wordEndMs - this.wordStartMs;
  }
}

@customElement("ef-captions-segment")
export class EFCaptionsSegment extends EFTemporal(LitElement) {
  static styles = [
    css`
      :host {
        display: inline-block;
        white-space: normal;
        line-height: 1;
      }
    `,
  ];

  render() {
    if (stopWords.has(this.segmentText)) {
      this.hidden = true;
      return undefined;
    }
    this.hidden = false;
    return html`${this.segmentText}`;
  }

  @property({ type: Number, attribute: false })
  segmentStartMs = 0;

  @property({ type: Number, attribute: false })
  segmentEndMs = 0;

  @property({ type: String, attribute: false })
  segmentText = "";

  @property({ type: Boolean, reflect: true })
  hidden = false;

  get startTimeMs() {
    // Get parent captions element's absolute start time, then add our local offset
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentStartMs || 0);
  }

  get endTimeMs() {
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentEndMs || 0);
  }

  get durationMs(): number {
    return this.segmentEndMs - this.segmentStartMs;
  }
}

@customElement("ef-captions-before-active-word")
export class EFCaptionsBeforeActiveWord extends EFCaptionsSegment {
  static styles = [
    css`
      :host {
        display: inline-block;
        white-space: pre;
        line-height: 1;
      }
      :host([hidden]) {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  render() {
    if (stopWords.has(this.segmentText)) {
      this.hidden = true;
      return undefined;
    }
    this.hidden = false;

    // Check if there's an active word by looking for sibling active word element
    const activeWord = this.closest("ef-captions")?.querySelector(
      "ef-captions-active-word",
    );
    const hasActiveWord = activeWord?.wordText && !activeWord.hidden;

    return html`${this.segmentText}${hasActiveWord ? " " : ""}`;
  }

  @property({ type: Boolean, reflect: true })
  hidden = false;

  @property({ type: String, attribute: false })
  segmentText = "";

  @property({ type: Number, attribute: false })
  segmentStartMs = 0;

  @property({ type: Number, attribute: false })
  segmentEndMs = 0;

  get startTimeMs() {
    // Get parent captions element's absolute start time, then add our local offset
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentStartMs || 0);
  }

  get endTimeMs() {
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentEndMs || 0);
  }

  get durationMs(): number {
    return this.segmentEndMs - this.segmentStartMs;
  }
}

@customElement("ef-captions-after-active-word")
export class EFCaptionsAfterActiveWord extends EFCaptionsSegment {
  static styles = [
    css`
      :host {
        display: inline-block;
        white-space: pre;
        line-height: 1;
      }
      :host([hidden]) {
        opacity: 0;
        pointer-events: none;
      }
    `,
  ];

  render() {
    if (stopWords.has(this.segmentText)) {
      this.hidden = true;
      return undefined;
    }
    this.hidden = false;

    // Check if there's an active word by looking for sibling active word element
    const activeWord = this.closest("ef-captions")?.querySelector(
      "ef-captions-active-word",
    );
    const hasActiveWord = activeWord?.wordText && !activeWord.hidden;

    return html`${hasActiveWord ? " " : ""}${this.segmentText}`;
  }

  @property({ type: Boolean, reflect: true })
  hidden = false;

  @property({ type: String, attribute: false })
  segmentText = "";

  @property({ type: Number, attribute: false })
  segmentStartMs = 0;

  @property({ type: Number, attribute: false })
  segmentEndMs = 0;

  get startTimeMs() {
    // Get parent captions element's absolute start time, then add our local offset
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentStartMs || 0);
  }

  get endTimeMs() {
    const parentCaptions = this.closest("ef-captions") as EFCaptions;
    const parentStartTime = parentCaptions?.startTimeMs || 0;
    return parentStartTime + (this.segmentEndMs || 0);
  }

  get durationMs(): number {
    return this.segmentEndMs - this.segmentStartMs;
  }
}

@customElement("ef-captions")
export class EFCaptions extends EFSourceMixin(
  EFTemporal(FetchMixin(LitElement)),
  { assetType: "caption_files" },
) {
  static styles = [
    css`
      :host {
        display: inline-flex;
        white-space: normal;
        line-height: 1;
        gap: 0;
      }
      ::slotted(*) {
        display: inline-block;
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
    if (this.targetElement.assetId) {
      return `${this.apiHost}/api/v1/isobmff_files/${this.targetElement.assetId}/transcription`;
    }
    return null;
  }

  captionsPath() {
    if (!this.targetElement) {
      return null;
    }
    if (this.targetElement.assetId) {
      return `${this.apiHost}/api/v1/caption_files/${this.targetElement.assetId}`;
    }
    const targetSrc = this.targetElement.src;
    return `/@ef-captions/${targetSrc}`;
  }

  protected md5SumLoader = new Task(this, {
    autoRun: false,
    args: () => [this.target, this.fetch] as const,
    task: async ([_target, fetch], { signal }) => {
      if (!this.targetElement) {
        return null;
      }
      const md5Path = `/@ef-asset/${this.targetElement.src ?? ""}`;
      const response = await fetch(md5Path, { method: "HEAD", signal });
      return response.headers.get("etag") ?? undefined;
    },
  });

  private transcriptionDataTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.transcriptionsPath(),
        this.fetch,
        this.hasCustomCaptionsData,
      ] as const,
    task: async ([transcriptionsPath, fetch, hasCustomData], { signal }) => {
      // Skip transcription if we have custom captions data
      if (hasCustomData || !transcriptionsPath) {
        return null;
      }
      const response = await fetch(transcriptionsPath, { signal });
      return response.json() as any as GetISOBMFFFileTranscriptionResult;
    },
  });

  private transcriptionFragmentPath(
    transcriptionId: string,
    fragmentIndex: number,
  ) {
    return `${this.apiHost}/api/v1/transcriptions/${transcriptionId}/fragments/${fragmentIndex}`;
  }

  private fragmentIndexTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [this.transcriptionDataTask.value, this.ownCurrentTimeMs] as const,
    task: async ([transcription, ownCurrentTimeMs]) => {
      if (!transcription) {
        return null;
      }
      const fragmentIndex = Math.floor(
        ownCurrentTimeMs / transcription.work_slice_ms,
      );
      return fragmentIndex;
    },
  });

  private customCaptionsDataTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.captionsSrc,
        this.captionsData,
        this.captionsScript,
        this.fetch,
      ] as const,
    task: async (
      [captionsSrc, captionsData, captionsScript, fetch],
      { signal },
    ) => {
      // Priority: direct data > script reference > URL source
      if (captionsData) {
        return captionsData;
      }

      if (captionsScript) {
        const scriptElement = document.getElementById(captionsScript);
        if (scriptElement?.textContent) {
          try {
            return JSON.parse(scriptElement.textContent) as Caption;
          } catch (error) {
            console.error(
              `Failed to parse captions from script #${captionsScript}:`,
              error,
            );
            return null;
          }
        }
      }

      if (captionsSrc) {
        try {
          const response = await fetch(captionsSrc, { signal });
          return (await response.json()) as Caption;
        } catch (error) {
          console.error(`Failed to load captions from ${captionsSrc}:`, error);
          return null;
        }
      }

      return null;
    },
  });

  private transcriptionFragmentDataTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.transcriptionDataTask.value,
        this.fragmentIndexTask.value,
        this.fetch,
      ] as const,
    task: async ([transcription, fragmentIndex, fetch], { signal }) => {
      if (
        transcription === null ||
        transcription === undefined ||
        fragmentIndex === null ||
        fragmentIndex === undefined
      ) {
        return null;
      }
      const fragmentPath = this.transcriptionFragmentPath(
        transcription.id,
        fragmentIndex,
      );
      const response = await fetch(fragmentPath, { signal });
      return response.json() as any as Caption;
    },
  });

  unifiedCaptionsDataTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.customCaptionsDataTask.value,
        this.transcriptionFragmentDataTask.value,
      ] as const,
    task: async ([_customData, _transcriptionData]) => {
      if (this.customCaptionsDataTask.status === TaskStatus.PENDING) {
        await this.customCaptionsDataTask.taskComplete;
      }
      if (this.transcriptionFragmentDataTask.status === TaskStatus.PENDING) {
        await this.transcriptionFragmentDataTask.taskComplete;
      }
      return (
        this.customCaptionsDataTask.value ||
        this.transcriptionFragmentDataTask.value
      );
    },
  });

  frameTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () => [this.unifiedCaptionsDataTask.status, this.ownCurrentTimeMs],
    task: async () => {
      await this.unifiedCaptionsDataTask.taskComplete;
      // Trigger updateTextContainers when data is ready or time changes
      this.updateTextContainers();
    },
  });

  #rootTimegroupUpdateController?: ReactiveController;

  connectedCallback() {
    super.connectedCallback();

    // Try to get target element safely
    const target = this.targetSelector
      ? document.getElementById(this.targetSelector)
      : null;
    if (target && (target instanceof EFAudio || target instanceof EFVideo)) {
      new CrossUpdateController(target, this);
    }
    // For standalone captions with custom data, ensure proper timeline sync
    else if (this.hasCustomCaptionsData && this.rootTimegroup) {
      new CrossUpdateController(this.rootTimegroup, this);
    }

    // Ensure captions update when root timegroup's currentTimeMs changes
    // This is critical for sequence mode where timegroups become inactive
    // and then active again when scrubbing
    if (this.rootTimegroup) {
      this.#rootTimegroupUpdateController = {
        hostUpdated: () => {
          // Always update captions when root timegroup updates
          // ownCurrentTimeMs is a getter that reads rootTimegroup.currentTimeMs,
          // so it will always read the latest value when updateTextContainers() is called
          // This ensures captions update even when ownCurrentTimeMs appears
          // unchanged due to clamping in inactive timegroups
          // Use microtask to ensure root timegroup's update completes first
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

    // Prevent display:none from being set on caption elements
    // This maintains constant width in the parent flex container
    const observer = new MutationObserver(() => {
      if (this.style.display === "none") {
        // Remove the display:none and use opacity instead
        this.style.removeProperty("display");
        this.style.opacity = "0";
        this.style.pointerEvents = "none";
      } else if (!this.style.display || this.style.display === "") {
        // When display is removed (element becomes visible), reset opacity
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
    // (it might not have been available in connectedCallback)
    if (this.rootTimegroup && !this.#rootTimegroupUpdateController) {
      this.#rootTimegroupUpdateController = {
        hostUpdated: () => {
          // Always update captions when root timegroup updates
          // ownCurrentTimeMs is a getter that reads rootTimegroup.currentTimeMs,
          // so it will always read the latest value when updateTextContainers() is called
          // This ensures captions update even when ownCurrentTimeMs appears
          // unchanged due to clamping in inactive timegroups
          // Use microtask to ensure root timegroup's update completes first
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
      // Invalidate the intrinsicDurationMs cache
      this.#cachedIntrinsicDurationMs = null;
      this.requestUpdate("intrinsicDurationMs");

      // Flush sequence duration cache and notify parent timegroups that child duration has changed
      flushSequenceDurationCache();
      flushStartTimeMsCache();

      // Notify parent timegroup to recalculate its duration
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
    const captionsData = this.unifiedCaptionsDataTask.value as Caption;
    if (!captionsData) {
      return;
    }

    // For captions with custom data, try to use the video's source time
    // This ensures correct timing when clips don't start at the beginning of the source video
    let currentTimeMs = this.ownCurrentTimeMs;
    if (this.hasCustomCaptionsData && this.parentTimegroup) {
      // Find video element in the same parent timegroup
      const videoElement = Array.from(this.parentTimegroup.children).find(
        (child): child is EFVideo => child instanceof EFVideo,
      );
      if (videoElement) {
        const sourceInMs = videoElement.sourceInMs ?? 0;
        // Use video's source time minus sourceIn to get time relative to clip start
        // This matches the adjusted captions data timestamps (which are relative to clip.start)
        currentTimeMs = videoElement.currentSourceTimeMs - sourceInMs;
        // Clamp to valid range
        currentTimeMs = Math.max(0, Math.min(currentTimeMs, this.durationMs));
      }
    }

    const currentTimeSec = currentTimeMs / 1000;

    // Find the current word from word_segments
    // Use exclusive end boundary to prevent overlap at exact boundaries
    const currentWord = captionsData.word_segments.find(
      (word) => currentTimeSec >= word.start && currentTimeSec < word.end,
    );

    // Find the current segment
    // Use exclusive end boundary to prevent overlap at exact boundaries
    const currentSegment = captionsData.segments.find(
      (segment) =>
        currentTimeSec >= segment.start && currentTimeSec < segment.end,
    );

    for (const wordContainer of this.activeWordContainers) {
      if (currentWord) {
        wordContainer.wordText = currentWord.text;
        wordContainer.wordStartMs = currentWord.start * 1000;
        wordContainer.wordEndMs = currentWord.end * 1000;
        // Set word index for deterministic animation variation
        const wordIndex = captionsData.word_segments.findIndex(
          (w) =>
            w.start === currentWord.start &&
            w.end === currentWord.end &&
            w.text === currentWord.text,
        );
        wordContainer.wordIndex = wordIndex >= 0 ? wordIndex : 0;
        // Force re-render to update hidden property
        wordContainer.requestUpdate();
      } else {
        // No active word - maintain layout with invisible placeholder
        wordContainer.wordText = ""; // Empty when no active word
        wordContainer.wordStartMs = 0;
        wordContainer.wordEndMs = 0;
        wordContainer.requestUpdate();
      }
    }

    for (const segmentContainer of this.segmentContainers) {
      if (currentSegment) {
        segmentContainer.segmentText = currentSegment.text;
        segmentContainer.segmentStartMs = currentSegment.start * 1000;
        segmentContainer.segmentEndMs = currentSegment.end * 1000;
      } else {
        // No active segment - clear the container
        segmentContainer.segmentText = "";
        segmentContainer.segmentStartMs = 0;
        segmentContainer.segmentEndMs = 0;
      }
      segmentContainer.requestUpdate();
    }

    // Process context for both word and segment cases
    if (currentWord && currentSegment) {
      // Find all word segments that fall within the current segment's time range
      const segmentWords = captionsData.word_segments.filter(
        (word) =>
          word.start >= currentSegment.start && word.end <= currentSegment.end,
      );

      // Find the index of the current word within the segment's word segments
      const currentWordIndex = segmentWords.findIndex(
        (word) =>
          word.start === currentWord.start && word.end === currentWord.end,
      );

      if (currentWordIndex !== -1) {
        // Get words before the current word
        const beforeWords = segmentWords
          .slice(0, currentWordIndex)
          .map((w) => w.text.trim())
          .join(" ");

        // Get words after the current word
        const afterWords = segmentWords
          .slice(currentWordIndex + 1)
          .map((w) => w.text.trim())
          .join(" ");

        // Update before containers - should be visible at the same time as active word
        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = beforeWords;
          container.segmentStartMs = currentWord.start * 1000;
          container.segmentEndMs = currentWord.end * 1000;
          container.requestUpdate();
        }

        // Update after containers - should be visible at the same time as active word
        for (const container of this.afterActiveWordContainers) {
          container.segmentText = afterWords;
          container.segmentStartMs = currentWord.start * 1000;
          container.segmentEndMs = currentWord.end * 1000;
          container.requestUpdate();
        }
      }
    } else if (currentSegment) {
      // No active word but we have an active segment
      const segmentWords = captionsData.word_segments.filter(
        (word) =>
          word.start >= currentSegment.start && word.end <= currentSegment.end,
      );

      // Check if we're before the first word or after the last word
      const firstWord = segmentWords[0];
      const isBeforeFirstWord = firstWord && currentTimeSec < firstWord.start;

      if (isBeforeFirstWord) {
        // Before first word starts - show all words in "after" container (they're all upcoming)
        const allWords = segmentWords.map((w) => w.text.trim()).join(" ");

        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = ""; // Nothing before yet
          container.segmentStartMs = currentSegment.start * 1000;
          container.segmentEndMs = currentSegment.end * 1000;
          container.requestUpdate();
        }

        for (const container of this.afterActiveWordContainers) {
          container.segmentText = allWords; // All words are upcoming
          container.segmentStartMs = currentSegment.start * 1000;
          container.segmentEndMs = currentSegment.end * 1000;
          container.requestUpdate();
        }
      } else {
        // After last word ends - show all completed words in "before" container
        const allCompletedWords = segmentWords
          .map((w) => w.text.trim())
          .join(" ");

        for (const container of this.beforeActiveWordContainers) {
          container.segmentText = allCompletedWords;
          container.segmentStartMs = currentSegment.start * 1000;
          container.segmentEndMs = currentSegment.end * 1000;
          container.requestUpdate();
        }

        for (const container of this.afterActiveWordContainers) {
          container.segmentText = "";
          container.segmentStartMs = currentSegment.start * 1000;
          container.segmentEndMs = currentSegment.end * 1000;
          container.requestUpdate();
        }
      }
    } else {
      // No active segment or word - clear all context containers
      for (const container of this.beforeActiveWordContainers) {
        container.segmentText = "";
        container.segmentStartMs = 0;
        container.segmentEndMs = 0;
        container.requestUpdate();
      }

      for (const container of this.afterActiveWordContainers) {
        container.segmentText = "";
        container.segmentStartMs = 0;
        container.segmentEndMs = 0;
        container.requestUpdate();
      }
    }
  }

  get targetElement() {
    const target = document.getElementById(this.targetSelector ?? "");
    if (target instanceof EFAudio || target instanceof EFVideo) {
      return target;
    }
    // When using custom captions data, a target is not required
    if (this.hasCustomCaptionsData) {
      return null;
    }
    return null;
  }

  get hasCustomCaptionsData(): boolean {
    return !!(this.captionsData || this.captionsSrc || this.captionsScript);
  }

  // Follow the exact EFMedia pattern for safe duration integration
  get intrinsicDurationMs(): number | undefined {
    // Return cached value if available (null means not computed yet)
    if (this.#cachedIntrinsicDurationMs !== null) {
      return this.#cachedIntrinsicDurationMs;
    }

    // Direct access to custom captions data - avoiding complex task dependencies
    // Priority: direct data > script reference > external file
    let captionsData: Caption | null = null;

    if (this.captionsData) {
      captionsData = this.captionsData;
    } else if (this.captionsScript) {
      const scriptElement = document.getElementById(this.captionsScript);
      if (scriptElement?.textContent) {
        try {
          captionsData = JSON.parse(scriptElement.textContent) as Caption;
        } catch {
          // Invalid JSON, fall through to return undefined
        }
      }
    } else if (this.customCaptionsDataTask.value) {
      captionsData = this.customCaptionsDataTask.value as Caption;
    }

    if (!captionsData) {
      // Don't cache undefined when data hasn't loaded yet - it may load later
      // Only cache once we have confirmed no data source
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
      // Find the maximum end time from both segments and word_segments
      // Use reduce instead of Math.max(...array) to avoid creating intermediate arrays
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

      result = Math.max(maxSegmentEnd, maxWordEnd) * 1000; // Convert to milliseconds
    }

    // Cache the computed result
    this.#cachedIntrinsicDurationMs = result;
    return result;
  }

  // Follow the exact EFMedia pattern for safe duration integration
  get hasOwnDuration(): boolean {
    // Simple check - if we have any form of custom captions data, we have our own duration
    return !!(
      this.captionsData ||
      this.captionsScript ||
      this.customCaptionsDataTask.value
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
