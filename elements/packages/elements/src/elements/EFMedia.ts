import { provide } from "@lit/context";
import { css, LitElement, type PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";
import { isContextMixin } from "../gui/ContextMixin.js";
import type { ControllableInterface } from "../gui/Controllable.js";
import { efContext } from "../gui/efContext.js";
import { withSpan } from "../otel/tracingHelpers.js";
import type { MediaEngine } from "../transcoding/types/index.ts";
import type { AudioSpan } from "../transcoding/types/index.ts";
import { createMediaEngineFromSource } from "./EFMedia/MediaEngine.js";
import { UrlGenerator } from "../transcoding/utils/UrlGenerator.ts";
import { LRUCache } from "../utils/LRUCache.js";
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

/**
 * Gets all child elements including slotted content for shadow DOM elements.
 * Duplicated here to avoid circular imports from EFTemporal.
 */
const getChildrenIncludingSlotted = (element: Element): Element[] => {
  if (element.shadowRoot) {
    const slots = element.shadowRoot.querySelectorAll("slot");
    if (slots.length > 0) {
      const assignedElements: Element[] = [];
      for (const slot of slots) {
        assignedElements.push(...slot.assignedElements());
      }
      for (const child of element.shadowRoot.children) {
        if (child.tagName !== "SLOT") {
          assignedElements.push(child);
        }
      }
      return assignedElements;
    }
  }
  return Array.from(element.children);
};

export const deepGetMediaElements = (
  element: Element,
  medias: EFMedia[] = [],
) => {
  const children = getChildrenIncludingSlotted(element);
  for (const child of children) {
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

/**
 * Simple async value wrapper that mimics Lit Task interface.
 * Used for backwards compatibility with code expecting task-like objects.
 */
export class AsyncValue<T> {
  #value: T | undefined = undefined;
  #error: Error | undefined = undefined;
  #status: "initial" | "pending" | "complete" | "error" = "initial";
  #promise: Promise<T | undefined> = Promise.resolve(undefined);
  #resolvePromise: ((value: T | undefined) => void) | undefined;

  // Use properties instead of getters to avoid TypeScript declaration generation bug
  get value(): T | undefined {
    return this.#value;
  }

  get error(): Error | undefined {
    return this.#error;
  }

  get status(): number {
    // Match TaskStatus enum: INITIAL=0, PENDING=1, COMPLETE=2, ERROR=3
    switch (this.#status) {
      case "initial":
        return 0;
      case "pending":
        return 1;
      case "complete":
        return 2;
      case "error":
        return 3;
    }
  }

  get taskComplete(): Promise<T | undefined> {
    return this.#promise;
  }

  /**
   * Set the value (marks status as complete)
   */
  setValue(value: T): void {
    this.#value = value;
    this.#error = undefined;
    this.#status = "complete";
    this.#resolvePromise?.(value);
  }

  /**
   * Set an error (marks status as error)
   */
  setError(error: Error): void {
    this.#error = error;
    this.#value = undefined;
    this.#status = "error";
    // Don't reject - just resolve with undefined to match old behavior
    this.#resolvePromise?.(undefined);
  }

  /**
   * Start a new async operation
   */
  startPending(): void {
    this.#status = "pending";
    this.#promise = new Promise((resolve) => {
      this.#resolvePromise = resolve;
    });
    // Prevent unhandled rejection warnings
    this.#promise.catch(() => {});
  }

  /**
   * Run an async function and update status accordingly
   */
  async run(fn: () => Promise<T>): Promise<T | undefined> {
    this.startPending();
    try {
      const result = await fn();
      this.setValue(result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.setError(error);
      } else {
        this.setError(new Error(String(error)));
      }
      return undefined;
    }
  }
}

// Audio analysis helper functions
const DECAY_WEIGHT = 0.8;

function processFFTData(
  fftData: Uint8Array,
  zeroThresholdPercent = 0.1,
): Uint8Array {
  const totalBins = fftData.length;
  const zeroThresholdCount = Math.floor(totalBins * zeroThresholdPercent);

  let zeroCount = 0;
  let cutoffIndex = totalBins;

  for (let i = totalBins - 1; i >= 0; i--) {
    if (fftData[i] ?? 0 < 10) {
      zeroCount++;
    } else {
      if (zeroCount >= zeroThresholdCount) {
        cutoffIndex = i + 1;
        break;
      }
    }
  }

  if (cutoffIndex < zeroThresholdCount) {
    return fftData;
  }

  const goodData = fftData.slice(0, cutoffIndex);
  const resampledData = interpolateData(goodData, fftData.length);

  const attenuationStartIndex = Math.floor(totalBins * 0.9);
  for (let i = attenuationStartIndex; i < totalBins; i++) {
    const attenuationProgress =
      (i - attenuationStartIndex) / (totalBins - attenuationStartIndex) + 0.2;
    const attenuationFactor = Math.max(0, 1 - attenuationProgress);
    resampledData[i] = Math.floor((resampledData[i] ?? 0) * attenuationFactor);
  }

  return resampledData;
}

function interpolateData(data: Uint8Array, targetSize: number): Uint8Array {
  const resampled = new Uint8Array(targetSize);
  const dataLength = data.length;

  for (let i = 0; i < targetSize; i++) {
    const ratio = (i / (targetSize - 1)) * (dataLength - 1);
    const index = Math.floor(ratio);
    const fraction = ratio - index;

    if (index >= dataLength - 1) {
      resampled[i] = data[dataLength - 1] ?? 0;
    } else {
      resampled[i] = Math.round(
        (data[index] ?? 0) * (1 - fraction) + (data[index + 1] ?? 0) * fraction,
      );
    }
  }

  return resampled;
}

export class EFMedia extends EFTargetable(
  EFSourceMixin(EFTemporal(FetchMixin(LitElement)), {
    assetType: "isobmff_files",
  }),
) {
  @provide({ context: efContext })
  get efContext(): ControllableInterface | null {
    return this.rootTimegroup ?? this;
  }

  override shouldAutoReady(): boolean {
    return false;
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
      "file-id",
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

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === "asset-id") {
      this.fileId = newValue;
      return;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
  }

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
  getFreqWeights() {
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

  // Helper method for backwards compatibility
  getShouldInterpolateFrequencies() {
    return this.interpolateFrequencies;
  }

  getUrlGenerator() {
    return new UrlGenerator(() => this.apiHost ?? "");
  }

  // ============================================================================
  // Media Engine - replaced task with async method + cached wrapper
  // ============================================================================

  #mediaEngine: MediaEngine | undefined = undefined;
  #mediaEnginePromise: Promise<MediaEngine | undefined> | undefined = undefined;
  #mediaEngineError: Error | undefined = undefined;
  #mediaEngineSrcKey: string | null = null;

  /**
   * Async wrapper that mimics Task interface for backwards compatibility.
   * Code expecting mediaEngineTask.value, .taskComplete, .error, .status will still work.
   */
  mediaEngineTask = new AsyncValue<MediaEngine>();

  /**
   * Get or create the MediaEngine for this element.
   * Uses caching based on src/fileId to avoid redundant fetches.
   */
  async getMediaEngine(signal?: AbortSignal): Promise<MediaEngine | undefined> {
    const srcKey = `${this.src}|${this.fileId}`;

    // Return cached if src hasn't changed
    if (this.#mediaEngineSrcKey === srcKey && this.#mediaEngine) {
      this.setContentReadyState("ready");
      return this.#mediaEngine;
    }

    // If already loading for this src, wait for it
    if (this.#mediaEngineSrcKey === srcKey && this.#mediaEnginePromise) {
      return this.#mediaEnginePromise;
    }

    // Start new load
    this.#mediaEngineSrcKey = srcKey;
    this.mediaEngineTask.startPending();
    this.setContentReadyState("loading");

    // Store the handled promise so that concurrent callers at the cache check
    // (line above) get a resolved promise, not a raw rejecting one.
    const loadPromise = this.#loadMediaEngine(signal);
    this.#mediaEnginePromise = loadPromise;
    return loadPromise;
  }

  async #loadMediaEngine(
    signal?: AbortSignal,
  ): Promise<MediaEngine | undefined> {
    try {
      this.#mediaEngine = await this.#createMediaEngine(signal);
      this.#mediaEngineError = undefined;
      if (this.#mediaEngine) {
        this.mediaEngineTask.setValue(this.#mediaEngine);
        this.#handleMediaEngineComplete();
        this.setContentReadyState("ready");
      } else {
        // No engine (empty/invalid src) — return to idle
        this.setContentReadyState("idle");
      }
      return this.#mediaEngine;
    } catch (error) {
      this.#mediaEngineError =
        error instanceof Error ? error : new Error(String(error));
      this.mediaEngineTask.setError(this.#mediaEngineError);
      this.setContentReadyState("error");

      // Don't throw for expected errors
      const isExpectedError =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error &&
          (error.message === "No valid media source" ||
            error.message.includes("File not found") ||
            error.message.includes("404") ||
            error.message.includes("Failed to fetch")));

      if (!isExpectedError) {
        console.error("Media engine error:", error);
      }

      return undefined;
    }
  }

  async #createMediaEngine(
    signal?: AbortSignal,
  ): Promise<MediaEngine | undefined> {
    const { src, fileId, apiHost, requiredTracks } = this;
    const urlGenerator = this.getUrlGenerator();
    const configuration = this.closest("ef-configuration");

    return createMediaEngineFromSource({
      src,
      fileId,
      apiHost,
      requiredTracks,
      fetchFn: (url, init) => this.fetch(url, init),
      urlGenerator,
      mediaEnginePreference: configuration?.mediaEngine,
      signal,
    });
  }

  #handleMediaEngineComplete(): void {
    // Update self synchronously
    this.requestUpdate("intrinsicDurationMs");
    this.requestUpdate("ownCurrentTimeMs");

    // Defer updates to parent/root timegroup
    if (this.rootTimegroup) {
      queueMicrotask(() => {
        this.rootTimegroup?.requestUpdate("ownCurrentTimeMs");
        this.rootTimegroup?.requestUpdate("durationMs");
      });
    }
  }

  // ============================================================================
  // Audio Analysis - replaced tasks with async methods + cached wrappers
  // ============================================================================

  #frequencyDataCache = new LRUCache<string, Uint8Array>(100);
  #timeDomainDataCache = new LRUCache<string, Uint8Array>(100);

  /**
   * Async wrapper for frequency data - mimics Task interface for EFWaveform compatibility
   */
  frequencyDataTask = new AsyncValue<Uint8Array | null>();

  /**
   * Async wrapper for time domain data - mimics Task interface for EFWaveform compatibility
   */
  byteTimeDomainTask = new AsyncValue<Uint8Array | null>();

  /**
   * Get frequency data for audio visualization at a given time.
   */
  async getFrequencyData(
    timeMs: number,
    signal?: AbortSignal,
  ): Promise<Uint8Array | null> {
    if (timeMs < 0) return null;

    const cacheKey = `${this.getShouldInterpolateFrequencies()}:${this.fftSize}:${this.fftDecay}:${this.fftGain}:${timeMs}`;
    const cached = this.#frequencyDataCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.#analyzeFrequencies(timeMs, signal);
      if (result) {
        this.#frequencyDataCache.set(cacheKey, result);
        this.frequencyDataTask.setValue(result);
      }
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get time domain data for audio visualization at a given time.
   */
  async getTimeDomainData(
    timeMs: number,
    signal?: AbortSignal,
  ): Promise<Uint8Array | null> {
    if (timeMs < 0) return null;

    const cacheKey = `${this.fftSize}:${timeMs}`;
    const cached = this.#timeDomainDataCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.#analyzeTimeDomain(timeMs, signal);
      if (result) {
        this.#timeDomainDataCache.set(cacheKey, result);
        this.byteTimeDomainTask.setValue(result);
      }
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      return null;
    }
  }

  async #analyzeFrequencies(
    currentTimeMs: number,
    signal?: AbortSignal,
  ): Promise<Uint8Array | null> {
    const mediaEngine = await this.getMediaEngine(signal);
    signal?.throwIfAborted();

    if (!mediaEngine?.tracks.audio) {
      return null;
    }

    // Calculate exact audio window needed based on fftDecay and frame timing
    const frameIntervalMs = 1000 / 30;
    const earliestFrameMs =
      currentTimeMs - (this.fftDecay - 1) * frameIntervalMs;
    const fromMs = Math.max(0, earliestFrameMs);
    const maxToMs = currentTimeMs + frameIntervalMs;
    const videoDurationMs = this.intrinsicDurationMs || 0;
    const toMs =
      videoDurationMs > 0 ? Math.min(maxToMs, videoDurationMs) : maxToMs;

    if (fromMs >= toMs) {
      return null;
    }

    const { fetchAudioSpanningTime: fetchAudioSpan } =
      await import("./EFMedia/shared/AudioSpanUtils.js");

    let audioSpan;
    try {
      audioSpan = await fetchAudioSpan(this, fromMs, toMs, signal!);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      return null;
    }

    if (!audioSpan?.blob || audioSpan.blob.size < 100) {
      return null;
    }

    // Decode the real audio data
    const tempAudioContext = new OfflineAudioContext(2, 48000, 48000);
    const arrayBuffer = await audioSpan.blob.arrayBuffer();
    signal?.throwIfAborted();

    let audioBuffer;
    try {
      audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);
      signal?.throwIfAborted();
    } catch {
      return null;
    }

    const startOffsetMs = audioSpan.startMs;

    const framesData = await Promise.all(
      Array.from({ length: this.fftDecay }, async (_, i) => {
        const frameOffset = i * (1000 / 30);
        const startTime = Math.max(
          0,
          (currentTimeMs - frameOffset - startOffsetMs) / 1000,
        );

        const SIZE = 48000 / 30;
        const audioContext = new OfflineAudioContext(2, SIZE, 48000);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = this.fftSize;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = this.fftGain;

        const filter = audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 15000;
        filter.Q.value = 0.05;

        const audioBufferSource = audioContext.createBufferSource();
        audioBufferSource.buffer = audioBuffer;

        audioBufferSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        audioBufferSource.start(0, startTime, 1 / 30);

        try {
          await audioContext.startRendering();
          signal?.throwIfAborted();

          const frameData = new Uint8Array(this.fftSize / 2);
          analyser.getByteFrequencyData(frameData);
          return frameData;
        } finally {
          audioBufferSource.disconnect();
          analyser.disconnect();
        }
      }),
    );

    const frameLength = framesData[0]?.length ?? 0;

    // Combine frames with decay
    const smoothedData = new Uint8Array(frameLength);
    for (let i = 0; i < frameLength; i++) {
      let weightedSum = 0;
      let weightSum = 0;

      framesData.forEach((frame: Uint8Array, frameIndex: number) => {
        const decayWeight = DECAY_WEIGHT ** frameIndex;
        weightedSum += (frame[i] ?? 0) * decayWeight;
        weightSum += decayWeight;
      });

      smoothedData[i] = Math.min(255, Math.round(weightedSum / weightSum));
    }

    // Apply frequency weights
    smoothedData.forEach((value, i) => {
      const freqWeight = this.getFreqWeights()[i] ?? 0;
      smoothedData[i] = Math.min(255, Math.round(value * freqWeight));
    });

    // Only return the lower half of the frequency data
    const slicedData = smoothedData.slice(
      0,
      Math.floor(smoothedData.length / 2),
    );
    return this.getShouldInterpolateFrequencies()
      ? processFFTData(slicedData)
      : slicedData;
  }

  async #analyzeTimeDomain(
    currentTimeMs: number,
    signal?: AbortSignal,
  ): Promise<Uint8Array | null> {
    const mediaEngine = await this.getMediaEngine(signal);
    signal?.throwIfAborted();

    if (!mediaEngine?.tracks.audio) {
      return null;
    }

    const frameIntervalMs = 1000 / 30;
    const earliestFrameMs =
      currentTimeMs - (this.fftDecay - 1) * frameIntervalMs;
    const fromMs = Math.max(0, earliestFrameMs);
    const maxToMs = currentTimeMs + frameIntervalMs;
    const videoDurationMs = this.intrinsicDurationMs || 0;
    const toMs =
      videoDurationMs > 0 ? Math.min(maxToMs, videoDurationMs) : maxToMs;

    if (fromMs >= toMs) {
      return null;
    }

    const { fetchAudioSpanningTime: fetchAudioSpan } =
      await import("./EFMedia/shared/AudioSpanUtils.js");

    let audioSpan;
    try {
      audioSpan = await fetchAudioSpan(this, fromMs, toMs, signal!);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      return null;
    }

    if (!audioSpan?.blob || audioSpan.blob.size < 100) {
      return null;
    }

    const tempAudioContext = new OfflineAudioContext(2, 48000, 48000);
    const arrayBuffer = await audioSpan.blob.arrayBuffer();
    signal?.throwIfAborted();

    let audioBuffer;
    try {
      audioBuffer = await tempAudioContext.decodeAudioData(arrayBuffer);
      signal?.throwIfAborted();
    } catch {
      return null;
    }

    const startOffsetMs = audioSpan.startMs;

    const framesData = await Promise.all(
      Array.from({ length: this.fftDecay }, async (_, i) => {
        const frameOffset = i * (1000 / 30);
        const startTime = Math.max(
          0,
          (currentTimeMs - frameOffset - startOffsetMs) / 1000,
        );

        const SIZE = 48000 / 30;
        const audioContext = new OfflineAudioContext(2, SIZE, 48000);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = this.fftSize;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = this.fftGain;

        const filter = audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 15000;
        filter.Q.value = 0.05;

        const audioBufferSource = audioContext.createBufferSource();
        audioBufferSource.buffer = audioBuffer;

        audioBufferSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);

        audioBufferSource.start(0, startTime, 1 / 30);

        try {
          await audioContext.startRendering();
          signal?.throwIfAborted();

          const frameData = new Uint8Array(this.fftSize);
          analyser.getByteTimeDomainData(frameData);
          return frameData;
        } finally {
          audioBufferSource.disconnect();
          analyser.disconnect();
        }
      }),
    );

    const frameLength = framesData[0]?.length ?? 0;

    // Use RMS calculation to preserve waveform shape
    const smoothedData = new Uint8Array(frameLength);
    for (let i = 0; i < frameLength; i++) {
      let sumSquares = 0;
      framesData.forEach((frame: Uint8Array) => {
        const value = (frame[i] ?? 128) - 128;
        sumSquares += value * value;
      });
      const rms = Math.sqrt(sumSquares / framesData.length);
      smoothedData[i] = Math.min(255, Math.max(0, Math.round(rms + 128)));
    }

    return smoothedData;
  }

  // ============================================================================
  // Removed task properties - these are kept as stubs for backwards compatibility
  // ============================================================================

  // These tasks are no longer used but kept for API compatibility
  audioSegmentIdTask = new AsyncValue<number | undefined>();
  audioInitSegmentFetchTask = new AsyncValue<ArrayBuffer | undefined>();
  audioSegmentFetchTask = new AsyncValue<ArrayBuffer | undefined>();
  audioInputTask = new AsyncValue<any>();
  audioSeekTask = new AsyncValue<any>();
  audioBufferTask = new AsyncValue<any>();

  /**
   * The unique identifier for the media file.
   * This property can be set programmatically or via the "file-id" attribute.
   * The "asset-id" attribute is also supported for backward compatibility.
   * @domAttribute "file-id"
   */
  @property({ type: String, attribute: "file-id", reflect: true })
  fileId: string | null = null;

  /** @deprecated Use fileId instead */
  get assetId(): string | null {
    return this.fileId;
  }
  set assetId(value: string | null) {
    this.fileId = value;
  }

  get intrinsicDurationMs(): number | undefined {
    return this.#mediaEngine?.durationMs;
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.updated(changedProperties);

    // Trigger media engine load when src or fileId changes
    if (changedProperties.has("src") || changedProperties.has("fileId")) {
      this.getMediaEngine().catch(() => {});
      // Source identity changed — cached renderable output is stale
      if (
        changedProperties.get("src") !== undefined ||
        changedProperties.get("fileId") !== undefined
      ) {
        this.emitContentChange("source");
      }
    }

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
      this.emitContentChange("bounds");
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

  get hasOwnDuration(): boolean {
    return true;
  }

  @state()
  private _desiredSeekTimeMs = 0; // Initialize to 0 for proper segment loading

  get desiredSeekTimeMs(): number {
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
    this._desiredSeekTimeMs = seekToMs;
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
        // Create a default signal if not provided (public API convenience)
        const effectiveSignal = signal ?? new AbortController().signal;
        const { fetchAudioSpanningTime } =
          await import("./EFMedia/shared/AudioSpanUtils.js");
        return fetchAudioSpanningTime(this, fromMs, toMs, effectiveSignal);
      },
    );
  }

  /**
   * Wait for media engine to load and determine duration
   * Ensures media is ready for playback
   */
  async waitForMediaDurations(signal?: AbortSignal): Promise<void> {
    if (this.#mediaEngine) {
      return;
    }

    try {
      await this.getMediaEngine(signal);
    } catch (error) {
      // Don't throw AbortError - these are intentional cancellations when element is disconnected
      const isAbortError =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error &&
          (error.name === "AbortError" ||
            error.message.includes("signal is aborted") ||
            error.message.includes("The user aborted a request")));

      // If explicitly aborted via signal, throw to propagate cancellation
      if (signal?.aborted) {
        throw error;
      }

      // For task abort (element disconnected), silently return
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
