import { Task } from "@lit/task";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import { TWMixin } from "../gui/TWMixin.js";
import { EFMedia } from "./EFMedia.js";

@customElement("ef-audio")
export class EFAudio extends TWMixin(EFMedia) {
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

  frameTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.audioBufferTask.status,
        this.audioSeekTask.status,
        this.audioSegmentFetchTask.status,
        this.mediaEngineTask.status,
      ] as const,
    onError: (error) => {
      // CRITICAL: Attach .catch() handler to taskComplete BEFORE the promise is rejected.
      // This prevents unhandled rejection when hostUpdate() triggers _performTask() without awaiting.
      this.frameTask.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when tasks are cancelled
      const isAbortError = 
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        ));
      
      if (isAbortError) {
        return;
      }
      
      console.error("EFAudio frameTask error", error);
    },
    task: async ([_audioBufferStatus, _audioSeekStatus, _audioSegmentFetchStatus, _mediaEngineStatus], { signal }) => {
      // Wrap all taskComplete awaits in try/catch to handle AbortErrors
      try {
        await this.mediaEngineTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal?.throwIfAborted();
          return;
        }
        throw error;
      }
      signal?.throwIfAborted();
      
      try {
        await this.audioSegmentFetchTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal?.throwIfAborted();
          return;
        }
        throw error;
      }
      signal?.throwIfAborted();
      
      try {
        await this.audioSeekTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal?.throwIfAborted();
          return;
        }
        throw error;
      }
      signal?.throwIfAborted();
      
      try {
        await this.audioBufferTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal?.throwIfAborted();
          return;
        }
        throw error;
      }
      signal?.throwIfAborted();
      // REMOVED: this.rootTimegroup?.requestUpdate() was causing infinite update loops.
      // When EFAudio's frameTask ran, it would trigger root to update, which triggered
      // OwnCurrentTimeController.hostUpdated on all children, which triggered more
      // frameTask runs, creating an infinite cycle.
      // The root timegroup already updates when currentTime changes - no need to force it here.
    },
  });

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
