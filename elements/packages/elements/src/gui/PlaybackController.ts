import { ContextProvider } from "@lit/context";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { loopContext, playingContext } from "./playingContext.js";
import { updateAnimations, type AnimatableElement } from "../elements/updateAnimations.js";
import type { RenderFrameOptions } from "../preview/FrameController.js";

interface PlaybackHost extends HTMLElement, ReactiveControllerHost {
  currentTimeMs: number;
  durationMs: number;
  endTimeMs: number;
  frameTask: { run(): void; taskComplete: Promise<unknown> };
  /** New centralized frame controller (replaces frameTask) */
  frameController?: { 
    renderFrame(timeMs: number, options?: RenderFrameOptions): Promise<void>; 
    abort(): void;
  };
  renderAudio?(fromMs: number, toMs: number): Promise<AudioBuffer>;
  waitForMediaDurations?(signal?: AbortSignal): Promise<void>;
  saveTimeToLocalStorage?(time: number): void;
  loadTimeFromLocalStorage?(): number | undefined;
  requestUpdate(property?: string): void;
  updateComplete: Promise<boolean>;
  playing: boolean;
  loop: boolean;
  play(): void;
  pause(): void;
  playbackController?: PlaybackController;
  parentTimegroup?: any;
  rootTimegroup?: any;
}

export type PlaybackControllerUpdateEvent = {
  property: "playing" | "loop" | "currentTimeMs";
  value: boolean | number;
};

/**
 * Manages playback state and audio-driven timing for root temporal elements
 *
 * Created automatically when a temporal element becomes a root (no parent timegroup)
 * Provides playback contexts (playing, loop, currentTimeMs, durationMs) to descendants
 * Handles:
 * - Audio-driven playback with Web Audio API
 * - Seek and frame rendering throttling
 * - Time state management with pending seek handling
 * - Playback loop behavior
 *
 * Works with any temporal element (timegroups or standalone media) via PlaybackHost interface
 */
export class PlaybackController implements ReactiveController {
  #host: PlaybackHost;
  #playing = false;
  #loop = false;
  #listeners = new Set<(event: PlaybackControllerUpdateEvent) => void>();
  #playingProvider: ContextProvider<typeof playingContext>;
  #loopProvider: ContextProvider<typeof loopContext>;
  #currentTimeMsProvider: ContextProvider<typeof currentTimeContext>;
  #durationMsProvider: ContextProvider<typeof durationContext>;

  #FPS = 30;
  #MS_PER_FRAME = 1000 / this.#FPS;
  #playbackAudioContext: AudioContext | null = null;
  #playbackAnimationFrameRequest: number | null = null;
  #pendingAudioContext: AudioContext | null = null;
  #AUDIO_PLAYBACK_SLICE_MS = ((47 * 1024) / 48000) * 1000;

  #frameTaskInProgress = false;
  #pendingFrameTaskRun = false;
  #processingPendingFrameTask = false;

  #currentTime: number | undefined = undefined;
  #seekInProgress = false;
  #pendingSeekTime: number | undefined;
  #processingPendingSeek = false;
  #loopingPlayback = false; // Track if we're in a looping playback session
  #playbackWrapTimeSeconds = 0; // The AudioContext time when we wrapped

  #seekAbortController: AbortController | null = null;

  constructor(host: PlaybackHost) {
    this.#host = host;
    host.addController(this);

    this.#playingProvider = new ContextProvider(host, {
      context: playingContext,
      initialValue: this.#playing,
    });
    this.#loopProvider = new ContextProvider(host, {
      context: loopContext,
      initialValue: this.#loop,
    });
    this.#currentTimeMsProvider = new ContextProvider(host, {
      context: currentTimeContext,
      initialValue: host.currentTimeMs,
    });
    this.#durationMsProvider = new ContextProvider(host, {
      context: durationContext,
      initialValue: host.durationMs,
    });
  }

  get currentTime(): number {
    const rawTime = this.#currentTime ?? 0;
    // Quantize to frame boundaries based on host's fps
    const fps = (this.#host as any).fps ?? 30;
    if (!fps || fps <= 0) return rawTime;
    const frameDurationS = 1 / fps;
    const quantizedTime = Math.round(rawTime / frameDurationS) * frameDurationS;
    // Clamp to valid range after quantization to prevent exceeding duration
    const durationS = this.#host.durationMs / 1000;
    return Math.max(0, Math.min(quantizedTime, durationS));
  }

  set currentTime(time: number) {
    time = Math.max(0, Math.min(this.#host.durationMs / 1000, time));
    if (Number.isNaN(time)) {
      return;
    }
    if (time === this.#currentTime && !this.#processingPendingSeek) {
      return;
    }
    if (this.#pendingSeekTime === time) {
      return;
    }

    if (this.#seekInProgress) {
      this.#pendingSeekTime = time;
      this.#currentTime = time;
      return;
    }

    this.#currentTime = time;
    this.#seekInProgress = true;

    this.#runSeek(time).finally(() => {
      if (
        this.#pendingSeekTime !== undefined &&
        this.#pendingSeekTime !== time
      ) {
        const pendingTime = this.#pendingSeekTime;
        this.#pendingSeekTime = undefined;
        this.#processingPendingSeek = true;
        try {
          this.currentTime = pendingTime;
        } finally {
          this.#processingPendingSeek = false;
        }
      } else {
        this.#pendingSeekTime = undefined;
      }
    });
  }

  async #runSeek(targetTime: number): Promise<number | undefined> {
    // Abort any in-flight seek
    this.#seekAbortController?.abort();
    this.#seekAbortController = new AbortController();
    const signal = this.#seekAbortController.signal;

    try {
      signal.throwIfAborted();
      
      await this.#host.waitForMediaDurations?.(signal);
      signal.throwIfAborted();
      
      const newTime = Math.max(
        0,
        Math.min(targetTime, this.#host.durationMs / 1000),
      );
      this.#currentTime = newTime;
      this.#host.requestUpdate("currentTime");
      this.#currentTimeMsProvider.setValue(this.currentTimeMs);
      this.#notifyListeners({
        property: "currentTimeMs",
        value: this.currentTimeMs,
      });
      
      signal.throwIfAborted();
      
      await this.runThrottledFrameTask();
      signal.throwIfAborted();
      
      // Save to localStorage for persistence (only if not restoring to avoid loops)
      const isRestoring = (this.#host as any).isRestoringFromLocalStorage?.() ?? false;
      if (!isRestoring) {
        this.#host.saveTimeToLocalStorage?.(newTime);
      } else {
        (this.#host as any).setRestoringFromLocalStorage?.(false);
      }
      this.#seekInProgress = false;
      return newTime;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Expected - don't log
        return undefined;
      }
      throw error;
    }
  }

  get playing(): boolean {
    return this.#playing;
  }

  setPlaying(value: boolean): void {
    if (this.#playing === value) return;
    this.#playing = value;
    this.#playingProvider.setValue(value);
    this.#host.requestUpdate("playing");
    this.#notifyListeners({ property: "playing", value });

    if (value) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  get loop(): boolean {
    return this.#loop;
  }

  setLoop(value: boolean): void {
    if (this.#loop === value) return;
    this.#loop = value;
    this.#loopProvider.setValue(value);
    this.#host.requestUpdate("loop");
    this.#notifyListeners({ property: "loop", value });
  }

  get currentTimeMs(): number {
    return this.currentTime * 1000;
  }

  setCurrentTimeMs(value: number): void {
    this.currentTime = value / 1000;
  }

  // Update time during playback without triggering a seek
  // Used by #syncPlayheadToAudioContext to avoid frame drops
  #updatePlaybackTime(timeMs: number): void {
    // Clamp to valid range to prevent time exceeding duration
    const durationMs = this.#host.durationMs;
    const clampedTimeMs = Math.max(0, Math.min(timeMs, durationMs));
    const timeSec = clampedTimeMs / 1000;
    if (this.#currentTime === timeSec) {
      return;
    }
    this.#currentTime = timeSec;
    this.#host.requestUpdate("currentTime");
    this.#currentTimeMsProvider.setValue(clampedTimeMs);
    this.#notifyListeners({
      property: "currentTimeMs",
      value: clampedTimeMs,
    });
    // Trigger frame rendering without the async seek mechanism
    this.runThrottledFrameTask();
  }

  play(): void {
    this.setPlaying(true);
  }

  pause(): void {
    this.setPlaying(false);
  }

  #removed = false;
  
  hostConnected(): void {
    // Defer all operations to avoid blocking during initialization
    // This prevents deadlocks when many timegroups are initializing simultaneously
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Check if this controller was removed before the RAF callback executed.
        // This happens when wrapWithWorkbench moves the element, causing disconnect/reconnect.
        if (this.#removed || this.#host.playbackController !== this) {
          return;
        }
        
        if (this.#playing) {
          this.startPlayback();
        } else {
          // Wait for media durations then restore from localStorage
          this.#host.waitForMediaDurations?.().then(() => {
            // Check again after async operation - controller could have been removed
            if (this.#removed || this.#host.playbackController !== this) {
              return;
            }
            
            const maybeLoadedTime = this.#host.loadTimeFromLocalStorage?.();
            if (maybeLoadedTime !== undefined) {
              // Set restoration flag to prevent seek from saving back to localStorage
              (this.#host as any).setRestoringFromLocalStorage?.(true);
              this.currentTime = maybeLoadedTime;
              // Flag is cleared by runSeek after seek finishes
            } else if (this.#currentTime === undefined) {
              this.#currentTime = 0;
            }
          }).catch(err => {
            // Don't log AbortError - these are intentional cancellations when element is disconnected
            const isAbortError = 
              err instanceof DOMException && err.name === "AbortError" ||
              err instanceof Error && (
                err.name === "AbortError" ||
                err.message.includes("signal is aborted") ||
                err.message.includes("The user aborted a request")
              );
            
            if (!isAbortError) {
              console.error("Error in PlaybackController hostConnected:", err);
            }
          });
        }
      });
    });
  }

  hostDisconnected(): void {
    this.pause();
  }

  hostUpdated(): void {
    this.#durationMsProvider.setValue(this.#host.durationMs);
    this.#currentTimeMsProvider.setValue(this.currentTimeMs);
  }

  static readonly THROTTLED_FRAME_TASK_MAX_WAITS = 100;
  
  /**
   * Run frame rendering with throttling to prevent concurrent executions.
   * Uses the new FrameController when available, falling back to frameTask.
   */
  async runThrottledFrameTask(): Promise<void> {
    // Use FrameController if available (new centralized system)
    if (this.#host.frameController) {
      // FrameController handles its own cancellation and queuing internally
      // Animation updates are centralized via the onAnimationsUpdate callback
      try {
        await this.#host.frameController.renderFrame(this.currentTimeMs, {
          onAnimationsUpdate: (root: Element) => {
            // Update CSS visibility and animation synchronization after frame renders
            // This sets display:none on elements outside their time range
            updateAnimations(root as unknown as AnimatableElement);
          },
        });
      } catch (error) {
        // Silently ignore AbortErrors (expected during cancellation)
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("FrameController error:", error);
      }
      return;
    }

    // Fallback to old frameTask system (for backwards compatibility)
    if (this.#frameTaskInProgress) {
      this.#pendingFrameTaskRun = true;
      let waitLoopCount = 0;
      while (this.#frameTaskInProgress) {
        waitLoopCount++;
        if (waitLoopCount > PlaybackController.THROTTLED_FRAME_TASK_MAX_WAITS) {
          // Safety break to prevent infinite loops
          break;
        }
        await this.#host.frameTask.taskComplete;
      }
      return;
    }

    this.#frameTaskInProgress = true;

    try {
      await this.#host.frameTask.run();
    } catch (error) {
      console.error("Frame task error:", error);
    } finally {
      this.#frameTaskInProgress = false;

      if (this.#pendingFrameTaskRun && !this.#processingPendingFrameTask) {
        this.#pendingFrameTaskRun = false;
        this.#processingPendingFrameTask = true;
        try {
          await this.runThrottledFrameTask();
        } finally {
          this.#processingPendingFrameTask = false;
        }
      } else {
        this.#pendingFrameTaskRun = false;
      }
    }
  }

  addListener(listener: (event: PlaybackControllerUpdateEvent) => void): void {
    this.#listeners.add(listener);
  }

  removeListener(
    listener: (event: PlaybackControllerUpdateEvent) => void,
  ): void {
    this.#listeners.delete(listener);
  }

  #notifyListeners(event: PlaybackControllerUpdateEvent): void {
    for (const listener of this.#listeners) {
      listener(event);
    }
  }

  remove(): void {
    this.#removed = true;  // Mark as removed to abort any pending RAF callbacks
    this.stopPlayback();
    this.#listeners.clear();
    this.#host.removeController(this);
  }

  setPendingAudioContext(context: AudioContext): void {
    this.#pendingAudioContext = context;
  }

  #syncPlayheadToAudioContext(startMs: number) {
    const audioContextTime = this.#playbackAudioContext?.currentTime ?? 0;
    const endMs = this.#host.endTimeMs;

    // Calculate raw time based on audio context
    let rawTimeMs: number;
    if (
      this.#playbackWrapTimeSeconds > 0 &&
      audioContextTime >= this.#playbackWrapTimeSeconds
    ) {
      // After wrap: time since wrap, wrapped to duration
      const timeSinceWrap =
        (audioContextTime - this.#playbackWrapTimeSeconds) * 1000;
      rawTimeMs = timeSinceWrap % endMs;
    } else {
      // Before wrap or no wrap: normal calculation
      rawTimeMs = startMs + audioContextTime * 1000;

      // If looping and we've reached the end, wrap around
      if (this.#loopingPlayback && rawTimeMs >= endMs) {
        rawTimeMs = rawTimeMs % endMs;
      }
    }

    const nextTimeMs =
      Math.round(rawTimeMs / this.#MS_PER_FRAME) * this.#MS_PER_FRAME;

    // During playback, update time directly without triggering seek
    // This avoids frame drops at the loop boundary
    this.#updatePlaybackTime(nextTimeMs);

    // Only check for end if we haven't already handled looping
    if (!this.#loopingPlayback && nextTimeMs >= endMs) {
      this.maybeLoopPlayback();
      return;
    }

    this.#playbackAnimationFrameRequest = requestAnimationFrame(() => {
      this.#syncPlayheadToAudioContext(startMs);
    });
  }

  private async maybeLoopPlayback() {
    if (this.#loop) {
      // Loop enabled: reset to beginning and restart playback
      // We restart the audio system directly without changing #playing state
      // to keep the play button in sync
      this.setCurrentTimeMs(0);
      // Restart in next frame without awaiting to minimize gap
      requestAnimationFrame(() => {
        this.startPlayback();
      });
    } else {
      // No loop: reset to beginning and stop
      // This ensures play button works when clicked again
      this.setCurrentTimeMs(0);
      this.pause();
    }
  }

  private async stopPlayback() {
    if (this.#playbackAudioContext) {
      if (this.#playbackAudioContext.state !== "closed") {
        await this.#playbackAudioContext.close();
      }
    }
    if (this.#playbackAnimationFrameRequest) {
      cancelAnimationFrame(this.#playbackAnimationFrameRequest);
    }
    this.#playbackAudioContext = null;
    this.#playbackAnimationFrameRequest = null;
    this.#pendingAudioContext = null;
  }

  private async startPlayback() {
    // Guard against starting playback on a removed controller
    if (this.#removed) {
      return;
    }
    
    await this.stopPlayback();
    const host = this.#host;
    if (!host) {
      return;
    }

    if (host.waitForMediaDurations) {
      await host.waitForMediaDurations();
    }
    
    // Check again after async - controller could have been removed
    if (this.#removed) {
      return;
    }

    const currentMs = this.currentTimeMs;
    const fromMs = currentMs;
    const toMs = host.endTimeMs;

    if (fromMs >= toMs) {
      this.pause();
      return;
    }

    let bufferCount = 0;
    // Check for pre-resumed AudioContext from synchronous user interaction
    if (this.#pendingAudioContext) {
      this.#playbackAudioContext = this.#pendingAudioContext;
      this.#pendingAudioContext = null;
    } else {
      this.#playbackAudioContext = new AudioContext({
        latencyHint: "playback",
      });
    }
    this.#loopingPlayback = this.#loop; // Remember if we're in a looping session
    this.#playbackWrapTimeSeconds = 0; // Reset wrap time

    if (this.#playbackAnimationFrameRequest) {
      cancelAnimationFrame(this.#playbackAnimationFrameRequest);
    }
    this.#syncPlayheadToAudioContext(currentMs);
    const playbackContext = this.#playbackAudioContext;

    // Check if context is suspended (fallback for newly-created contexts)
    if (playbackContext.state === "suspended") {
      // Attempt to resume (may not work on mobile if user interaction context is lost)
      try {
        await playbackContext.resume();
        // Check state again after resume attempt
        if (playbackContext.state === "suspended") {
          console.warn(
            "AudioContext is suspended and resume() failed. " +
              "On mobile devices, AudioContext.resume() must be called synchronously within a user interaction handler. " +
              "Media playback will not work until user has interacted with page.",
          );
          this.setPlaying(false);
          return;
        }
      } catch (error) {
        console.warn(
          "Failed to resume AudioContext:",
          error,
          "On mobile devices, AudioContext.resume() must be called synchronously within a user interaction handler.",
        );
        this.setPlaying(false);
        return;
      }
    }
    await playbackContext.suspend();

    // Track the logical media time (what position in the media we're rendering)
    // vs the AudioContext schedule time (when to play it)
    let logicalTimeMs = currentMs;
    let audioContextTimeMs = 0; // Tracks the schedule position in the AudioContext timeline
    let hasWrapped = false;

    const fillBuffer = async () => {
      if (bufferCount > 2) {
        return;
      }
      const canFillBuffer = await queueBufferSource();
      if (canFillBuffer) {
        fillBuffer();
      }
    };

    const queueBufferSource = async () => {
      // Check if we've already wrapped and aren't looping anymore
      if (hasWrapped && !this.#loopingPlayback) {
        return false;
      }

      const startMs = logicalTimeMs;
      const endMs = Math.min(
        logicalTimeMs + this.#AUDIO_PLAYBACK_SLICE_MS,
        toMs,
      );

      // Will this slice reach the end?
      const willReachEnd = endMs >= toMs;

      if (!host.renderAudio) {
        console.log('[PlaybackController] host.renderAudio is not defined');
        return false;
      }

      console.log(`[PlaybackController] Rendering audio from ${startMs}ms to ${endMs}ms`);
      const audioBuffer = await host.renderAudio(startMs, endMs);
      console.log(`[PlaybackController] Got audio buffer: ${audioBuffer.length} samples, ${audioBuffer.duration}s`);
      bufferCount++;
      const source = playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContext.destination);
      // Schedule this buffer to play at the current audioContextTime position
      source.start(audioContextTimeMs / 1000);

      const sliceDurationMs = endMs - startMs;

      source.onended = () => {
        bufferCount--;

        if (willReachEnd) {
          if (!this.#loopingPlayback) {
            // Not looping, end playback
            this.maybeLoopPlayback();
          } else {
            // Looping: continue filling buffer after wrap
            fillBuffer();
          }
        } else {
          // Continue filling buffer
          fillBuffer();
        }
      };

      // Advance the AudioContext schedule time
      audioContextTimeMs += sliceDurationMs;

      // If this buffer reaches the end and we're looping, immediately queue the wraparound
      if (willReachEnd && this.#loopingPlayback) {
        // Mark that we've wrapped
        hasWrapped = true;
        // Store when we wrapped (relative to when playback started, which is time 0 in AudioContext)
        // This is the duration from start to end
        this.#playbackWrapTimeSeconds = (toMs - fromMs) / 1000;
        // Reset logical time to beginning
        logicalTimeMs = 0;
        // Continue buffering will happen in fillBuffer() call below
      } else {
        // Normal advance
        logicalTimeMs = endMs;
      }

      return true;
    };

    try {
      await fillBuffer();
      await playbackContext.resume();
    } catch (error) {
      // Ignore errors if AudioContext is closed or during test cleanup
      if (
        error instanceof Error &&
        (error.name === "InvalidStateError" || error.message.includes("closed"))
      ) {
        return;
      }
      throw error;
    }
  }
}
