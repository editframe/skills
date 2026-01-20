import { provide } from "@lit/context";
import { css, LitElement, type PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";
import { isContextMixin } from "../gui/ContextMixin.js";
import type { ControllableInterface } from "../gui/Controllable.js";
import { efContext } from "../gui/efContext.js";
import { withSpan } from "../otel/tracingHelpers.js";
import type { AudioSpan } from "../transcoding/types/index.ts";
import { UrlGenerator } from "../transcoding/utils/UrlGenerator.ts";
import { makeAudioBufferTask } from "./EFMedia/audioTasks/makeAudioBufferTask.ts";
import { makeAudioFrequencyAnalysisTask } from "./EFMedia/audioTasks/makeAudioFrequencyAnalysisTask.ts";
import { makeAudioInitSegmentFetchTask } from "./EFMedia/audioTasks/makeAudioInitSegmentFetchTask.ts";
import { makeAudioInputTask } from "./EFMedia/audioTasks/makeAudioInputTask.ts";
import { makeAudioSeekTask } from "./EFMedia/audioTasks/makeAudioSeekTask.ts";
import { makeAudioSegmentFetchTask } from "./EFMedia/audioTasks/makeAudioSegmentFetchTask.ts";
import { makeAudioSegmentIdTask } from "./EFMedia/audioTasks/makeAudioSegmentIdTask.ts";
import { makeAudioTimeDomainAnalysisTask } from "./EFMedia/audioTasks/makeAudioTimeDomainAnalysisTask.ts";
import { fetchAudioSpanningTime } from "./EFMedia/shared/AudioSpanUtils.ts";
import { makeMediaEngineTask } from "./EFMedia/tasks/makeMediaEngineTask.ts";
import { EFSourceMixin } from "./EFSourceMixin.js";
import { FetchMixin } from "./FetchMixin.js";
import { renderTemporalAudio } from "./renderTemporalAudio.js";
import { EFTargetable } from "./TargetController.ts";

// EF_FRAMEGEN is a global instance created in EF_FRAMEGEN.ts
declare global {
  var EF_FRAMEGEN: import("../EF_FRAMEGEN.js").EFFramegen;
}

const freqWeightsCache = new Map<number, Float32Array>();

export class IgnorableError extends Error {}

export const deepGetMediaElements = (
  element: Element,
  medias: EFMedia[] = [],
) => {
  for (const child of Array.from(element.children)) {
    if (child instanceof EFMedia) {
      medias.push(child);
    } else {
      deepGetMediaElements(child, medias);
    }
  }
  return medias;
};

// Import EFTemporal - use a function wrapper to defer evaluation until class definition
// This breaks the circular dependency: EFTimegroup -> EFMedia -> EFTemporal
import { EFTemporal } from "./EFTemporal.js";

export class EFMedia extends EFTargetable(
  EFSourceMixin(EFTemporal(FetchMixin(LitElement)), {
    assetType: "isobmff_files",
  }),
) {
  @provide({ context: efContext })
  get efContext(): ControllableInterface | null {
    return this.rootTimegroup ?? this;
  }

  // Sample buffer size configuration
  static readonly VIDEO_SAMPLE_BUFFER_SIZE = 30;
  static readonly AUDIO_SAMPLE_BUFFER_SIZE = 120;

  /**
   * Which tracks this media element requires.
   * Subclasses can override to specify their needs:
   * - "audio" - Only needs audio track (e.g., EFAudio)
   * - "video" - Only needs video track
   * - "both" - Needs both tracks (default for backwards compatibility)
   * 
   * This is used during media engine creation to skip validation
   * of tracks that won't be used, avoiding unnecessary network requests.
   */
  get requiredTracks(): "audio" | "video" | "both" {
    return "both";
  }

  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: We need to access super
    const parentAttributes = super.observedAttributes || [];
    return [
      ...parentAttributes,
      "mute",
      "fft-size",
      "fft-decay",
      "fft-gain",
      "interpolate-frequencies",
      "asset-id",
      "audio-buffer-duration",
      "max-audio-buffer-fetches",
      "enable-audio-buffering",
      "sourcein",
      "sourceout",
    ];
  }

  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        overflow: hidden;
      }
    `,
  ];

  /**
   * Duration in milliseconds for audio buffering ahead of current time
   * @domAttribute "audio-buffer-duration"
   */
  @property({ type: Number, attribute: "audio-buffer-duration" })
  audioBufferDurationMs = 10000; // 10 seconds - reasonable for JIT encoding

  /**
   * Maximum number of concurrent audio segment fetches for buffering
   * @domAttribute "max-audio-buffer-fetches"
   */
  @property({ type: Number, attribute: "max-audio-buffer-fetches" })
  maxAudioBufferFetches = 2;

  /**
   * Enable/disable audio buffering system
   * @domAttribute "enable-audio-buffering"
   */
  @property({ type: Boolean, attribute: "enable-audio-buffering" })
  enableAudioBuffering = true;

  /**
   * Mute/unmute the media element
   * @domAttribute "mute"
   */
  @property({
    type: Boolean,
    attribute: "mute",
    reflect: true,
  })
  mute = false;

  /**
   * FFT size for frequency analysis
   * @domAttribute "fft-size"
   */
  @property({ type: Number, attribute: "fft-size", reflect: true })
  fftSize = 128;

  /**
   * FFT decay rate for frequency analysis
   * @domAttribute "fft-decay"
   */
  @property({ type: Number, attribute: "fft-decay", reflect: true })
  fftDecay = 8;

  /**
   * FFT gain for frequency analysis
   * @domAttribute "fft-gain"
   */
  @property({ type: Number, attribute: "fft-gain", reflect: true })
  fftGain = 3.0;

  /**
   * Enable/disable frequency interpolation
   * @domAttribute "interpolate-frequencies"
   */
  @property({
    type: Boolean,
    attribute: "interpolate-frequencies",
    reflect: true,
  })
  interpolateFrequencies = false;

  // Update FREQ_WEIGHTS to use the instance fftSize instead of a static value
  get FREQ_WEIGHTS() {
    if (freqWeightsCache.has(this.fftSize)) {
      // biome-ignore lint/style/noNonNullAssertion: We know the value is set due to the guard above
      return freqWeightsCache.get(this.fftSize)!;
    }

    const weights = new Float32Array(this.fftSize / 2).map((_, i) => {
      const frequency = (i * 48000) / this.fftSize;
      if (frequency < 60) return 0.3;
      if (frequency < 250) return 0.4;
      if (frequency < 500) return 0.6;
      if (frequency < 2000) return 0.8;
      if (frequency < 4000) return 1.2;
      if (frequency < 8000) return 1.6;
      return 2.0;
    });

    freqWeightsCache.set(this.fftSize, weights);
    return weights;
  }

  // Helper getter for backwards compatibility
  get shouldInterpolateFrequencies() {
    return this.interpolateFrequencies;
  }

  get urlGenerator() {
    return new UrlGenerator(() => this.apiHost ?? "");
  }

  mediaEngineTask = makeMediaEngineTask(this);

  audioSegmentIdTask = makeAudioSegmentIdTask(this);
  audioInitSegmentFetchTask = makeAudioInitSegmentFetchTask(this);
  audioSegmentFetchTask = makeAudioSegmentFetchTask(this);
  audioInputTask = makeAudioInputTask(this);
  audioSeekTask = makeAudioSeekTask(this);

  audioBufferTask = makeAudioBufferTask(this);

  // Audio analysis tasks for frequency and time domain analysis
  byteTimeDomainTask = makeAudioTimeDomainAnalysisTask(this);
  frequencyDataTask = makeAudioFrequencyAnalysisTask(this);

  /**
   * The unique identifier for the media asset.
   * This property can be set programmatically or via the "asset-id" attribute.
   * @domAttribute "asset-id"
   */
  @property({ type: String, attribute: "asset-id", reflect: true })
  assetId: string | null = null;

  get intrinsicDurationMs() {
    return this.mediaEngineTask.value?.durationMs ?? 0;
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.updated(changedProperties);

    // Check if our timeline position has actually changed, even if ownCurrentTimeMs isn't tracked as a property
    const newCurrentSourceTimeMs = this.currentSourceTimeMs;
    if (newCurrentSourceTimeMs !== this.desiredSeekTimeMs) {
      this.executeSeek(newCurrentSourceTimeMs);
    }

    if (changedProperties.has("ownCurrentTimeMs")) {
      this.executeSeek(this.currentSourceTimeMs);
    }

    // Check if trim/source properties changed that affect duration
    const durationAffectingProps = [
      "_trimStartMs",
      "_trimEndMs",
      "_sourceInMs",
      "_sourceOutMs",
    ];

    const hasDurationChange = durationAffectingProps.some((prop) =>
      changedProperties.has(prop),
    );

    if (hasDurationChange) {
      // Notify parent timegroup to recalculate its duration (same pattern as EFCaptions)
      if (this.parentTimegroup) {
        this.parentTimegroup.requestUpdate("durationMs");
        this.parentTimegroup.requestUpdate("currentTime");

        // Also find and directly notify any context provider (ContextMixin)
        let parent = this.parentNode;
        while (parent) {
          if (isContextMixin(parent)) {
            parent.dispatchEvent(
              new CustomEvent("child-duration-changed", {
                detail: { source: this },
              }),
            );
            break;
          }
          parent = parent.parentNode;
        }
      }
    }
  }

  get hasOwnDuration() {
    return true;
  }

  @state()
  private _desiredSeekTimeMs = 0; // Initialize to 0 for proper segment loading

  get desiredSeekTimeMs() {
    return this._desiredSeekTimeMs;
  }

  set desiredSeekTimeMs(value: number) {
    if (this._desiredSeekTimeMs !== value) {
      this._desiredSeekTimeMs = value;
    }
  }

  protected async executeSeek(seekToMs: number) {
    // The seekToMs parameter should be the timeline-relative media time
    // calculated from currentSourceTimeMs which includes timeline positioning
    this.desiredSeekTimeMs = seekToMs;
  }

  /**
   * Main integration method for EFTimegroup audio playback
   * Now powered by clean, testable utility functions
   * Returns undefined if no audio rendition is available
   */
  async fetchAudioSpanningTime(
    fromMs: number,
    toMs: number,
    signal?: AbortSignal,
  ): Promise<AudioSpan | undefined> {
    return withSpan(
      "media.fetchAudioSpanningTime",
      {
        elementId: this.id || "unknown",
        tagName: this.tagName.toLowerCase(),
        fromMs,
        toMs,
        durationMs: toMs - fromMs,
        src: this.src || "none",
      },
      undefined,
      async () => {
        return fetchAudioSpanningTime(this, fromMs, toMs, signal);
      },
    );
  }

  /**
   * Wait for media engine to load and determine duration
   * Ensures media is ready for playback
   */
  async waitForMediaDurations(signal?: AbortSignal): Promise<void> {
    if (this.mediaEngineTask.value) {
      return;
    }
    
    // Use taskComplete instead of run() to avoid throwing errors
    // taskComplete resolves when the task completes successfully or rejects on error
    // This allows us to handle AbortError without it being logged as unhandled
    try {
      await this.mediaEngineTask.taskComplete;
    } catch (error) {
      // Don't throw AbortError - these are intentional cancellations when element is disconnected
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message.includes("signal is aborted") ||
          error.message.includes("The user aborted a request")
        );
      
      // If explicitly aborted via signal, throw to propagate cancellation
      if (signal?.aborted) {
        throw error;
      }
      
      // For task abort (element disconnected), silently return
      // This is expected behavior when element is removed from DOM
      if (isAbortError) {
        return;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Returns media elements for playback audio rendering
   * For standalone media, returns [this]; for timegroups, returns all descendants
   * Used by PlaybackController for audio-driven playback
   */
  getMediaElements(): EFMedia[] {
    return [this];
  }

  /**
   * Render audio buffer for playback
   * Called by PlaybackController during live playback
   * Delegates to shared renderTemporalAudio utility for consistent behavior
   */
  async renderAudio(fromMs: number, toMs: number): Promise<AudioBuffer> {
    return renderTemporalAudio(this, fromMs, toMs);
  }
}
