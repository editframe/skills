import { TaskStatus } from "@lit/task";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TWMixin } from "../gui/TWMixin.js";
import type { FrameRenderable, FrameState } from "../preview/FrameController.js";
import { EFMedia } from "./EFMedia.js";

@customElement("ef-audio")
export class EFAudio extends TWMixin(EFMedia) implements FrameRenderable {
  /**
   * EFAudio only requires audio tracks - skip video track validation
   * to avoid unnecessary network requests to transcoding service.
   */
  override get requiredTracks(): "audio" | "video" | "both" {
    return "audio";
  }

  /**
   * Audio volume level (0.0 to 1.0)
   * @domAttribute "volume"
   */
  @property({ type: Number, attribute: "volume", reflect: true })
  volume = 1.0;

  audioElementRef = createRef<HTMLAudioElement>();

  protected updated(
    changedProperties: Map<PropertyKey, unknown>,
  ): void {
    super.updated(changedProperties);
    
    // Sync volume property to HTMLAudioElement whenever it changes or element is first rendered
    if (this.audioElementRef.value) {
      if (changedProperties.has("volume") || changedProperties.size === 0) {
        this.audioElementRef.value.volume = this.volume;
      }
    }
  }

  render() {
    return html`<audio ${ref(this.audioElementRef)}></audio>`;
  }

  /**
   * @deprecated Use FrameRenderable methods (prepareFrame, renderFrame) via FrameController instead.
   * This is a compatibility wrapper that delegates to the new system.
   */
  #frameTaskPromise: Promise<void> = Promise.resolve();
  
  frameTask = (() => {
    const self = this;
    return {
      run: () => {
        const abortController = new AbortController();
        const timeMs = self.desiredSeekTimeMs;
        self.#frameTaskPromise = (async () => {
          try {
            await self.prepareFrame(timeMs, abortController.signal);
            self.renderFrame(timeMs);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            throw error;
          }
        })();
        return self.#frameTaskPromise;
      },
      get taskComplete() {
        return self.#frameTaskPromise;
      },
    };
  })();

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - replaces distributed Lit Task system
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Check if all audio tasks are complete
    const allTasksComplete = 
      this.mediaEngineTask.status === TaskStatus.COMPLETE &&
      this.audioSegmentFetchTask.status === TaskStatus.COMPLETE &&
      this.audioSeekTask.status === TaskStatus.COMPLETE &&
      this.audioBufferTask.status === TaskStatus.COMPLETE;

    return {
      needsPreparation: !allTasksComplete,
      isReady: allTasksComplete,
      priority: 3, // Audio renders after video and captions
    };
  }

  /**
   * Async preparation - waits for audio tasks to complete.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    // Wait for all audio tasks in sequence
    const tasks = [
      this.mediaEngineTask,
      this.audioSegmentFetchTask,
      this.audioSeekTask,
      this.audioBufferTask,
    ];

    for (const task of tasks) {
      if (task.status !== TaskStatus.COMPLETE) {
        try {
          await task.taskComplete;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            signal.throwIfAborted();
            return;
          }
          throw error;
        }
      }
      signal.throwIfAborted();
    }
  }

  /**
   * Synchronous render - audio plays via HTMLAudioElement, no explicit render needed.
   * @implements FrameRenderable
   */
  renderFrame(_timeMs: number): void {
    // Audio playback is handled by the browser's HTMLAudioElement
    // No explicit rendering action needed
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

  /**
   * Legacy getter for fragment index task (maps to audioSegmentIdTask)
   * Still used by EFCaptions
   */
  get fragmentIndexTask() {
    return this.audioSegmentIdTask;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-audio": EFAudio;
  }
}
