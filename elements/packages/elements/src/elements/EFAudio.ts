import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TWMixin } from "../gui/TWMixin.js";
import {
  type FrameRenderable,
  type FrameState,
  PRIORITY_AUDIO,
} from "../preview/FrameController.js";
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

  #mediaEngineLoaded = false;

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
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

  // ============================================================================
  // FrameRenderable Implementation
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Check if media engine is loaded
    const isReady =
      this.#mediaEngineLoaded && this.mediaEngineTask.status === 2; // COMPLETE

    return {
      needsPreparation: !isReady,
      isReady,
      priority: PRIORITY_AUDIO,
    };
  }

  /**
   * Async preparation - waits for media engine to load.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    // Just ensure media engine is loaded
    const mediaEngine = await this.getMediaEngine(signal);
    this.#mediaEngineLoaded = !!mediaEngine;
    signal.throwIfAborted();
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-audio": EFAudio;
  }
}
