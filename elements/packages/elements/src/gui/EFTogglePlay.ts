import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { attachContextRoot } from "../attachContextRoot.js";
import { isEFTemporal } from "../elements/EFTemporal.js";
import type { ControllableInterface } from "./Controllable.js";
import { efContext } from "./efContext.js";
import { playingContext } from "./playingContext.js";
import type { PlaybackController } from "./PlaybackController.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

attachContextRoot();

@customElement("ef-toggle-play")
export class EFTogglePlay extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
      :host {}
      div {
        all: inherit;
      }
    `,
  ];

  @consume({ context: playingContext, subscribe: true })
  @state()
  playing = false;

  get efContext(): ControllableInterface | null {
    return this.effectiveContext;
  }

  // Attach click listener to host
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this.togglePlay);
  }

  // Detach click listener from host
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this.togglePlay);
  }

  render() {
    return html`
      <div>
        ${
          this.playing
            ? html`<slot name="pause"></slot>`
            : html`<slot name="play"></slot>`
        }
      </div>
    `;
  }

  togglePlay = () => {
    if (this.efContext) {
      if (this.playing) {
        this.efContext.pause();
      } else {
        // Create and resume AudioContext synchronously within user interaction handler
        // This is required on mobile devices where AudioContext.resume() must be called
        // synchronously within a user interaction event handler
        const playbackController = this.getPlaybackController();
        if (playbackController) {
          try {
            const audioContext = new AudioContext({
              latencyHint: "playback",
            });
            // Resume synchronously (doesn't await, but initiates resume)
            // Once resumed via user interaction, the context stays "unlocked"
            audioContext.resume();
            playbackController.setPendingAudioContext(audioContext);
          } catch (error) {
            // If context creation/resume fails, continue with normal async flow
            // The fallback in startPlayback() will attempt resume (may not work on mobile)
            console.warn(
              "Failed to create/resume AudioContext synchronously:",
              error,
            );
          }
        }
        this.efContext.play();
      }
    }
  };

  private getPlaybackController(): PlaybackController | null {
    const context = this.efContext;
    if (!context) {
      return null;
    }

    // Check if context is a temporal element with playbackController
    if (isEFTemporal(context) && context.playbackController) {
      return context.playbackController;
    }

    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-toggle-play": EFTogglePlay;
  }
}
