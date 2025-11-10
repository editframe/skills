import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, eventOptions, state } from "lit/decorators.js";

import { ref } from "lit/directives/ref.js";
import type { ControllableInterface } from "./Controllable.js";
import { currentTimeContext } from "./currentTimeContext.js";
import { durationContext } from "./durationContext.js";
import { efContext } from "./efContext.js";
import { playingContext } from "./playingContext.js";
import { TargetOrContextMixin } from "./TargetOrContextMixin.js";

@customElement("ef-scrubber")
export class EFScrubber extends TargetOrContextMixin(LitElement, efContext) {
  static styles = [
    css`
    :host {
      --ef-scrubber-height: 4px;
      --ef-scrubber-background: rgb(209 213 219);
      --ef-scrubber-progress-color: rgb(37 99 235);
      --ef-scrubber-handle-size: 12px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    :host(.dark), :host-context(.dark) {
      --ef-scrubber-background: rgb(75 85 99);
      --ef-scrubber-progress-color: rgb(96 165 250);
    }
    
    .scrubber {
      width: 100%;
      height: var(--ef-scrubber-height);
      background: var(--ef-scrubber-background);
      position: relative;
      cursor: pointer;
      border-radius: 2px;
      touch-action: none;
      user-select: none;
    }

    .progress {
      position: absolute;
      height: 100%;
      background: var(--ef-scrubber-progress-color);
      border-radius: 2px;
    }

    .handle {
      position: absolute;
      width: var(--ef-scrubber-handle-size);
      height: var(--ef-scrubber-handle-size);
      background: var(--ef-scrubber-progress-color);
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
    }

    /* Add CSS Shadow Parts */
    ::part(scrubber) { }
    ::part(progress) { }
    ::part(handle) { }
    `,
  ];

  @consume({ context: playingContext, subscribe: true })
  playing = false;

  @consume({ context: currentTimeContext, subscribe: true })
  currentTimeMs = Number.NaN;

  @consume({ context: durationContext, subscribe: true })
  durationMs = 0;

  get context(): ControllableInterface | null {
    return this.effectiveContext;
  }

  @state()
  private scrubProgress = 0;

  @state()
  private isMoving = false;

  private scrubberRef?: HTMLElement;
  private capturedPointerId: number | null = null;

  private updateProgress(e: PointerEvent) {
    if (!this.context || !this.scrubberRef) return;

    const rect = this.scrubberRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));

    this.scrubProgress = progress;
    this.context.currentTimeMs = progress * this.durationMs;
  }

  @eventOptions({ passive: false, capture: false })
  private handlePointerDown(e: PointerEvent) {
    if (!this.scrubberRef) return;

    this.isMoving = true;
    e.preventDefault();
    e.stopPropagation();
    this.capturedPointerId = e.pointerId;
    try {
      this.scrubberRef.setPointerCapture(e.pointerId);
    } catch (err) {
      // setPointerCapture may fail in some cases, continue anyway
      console.warn("Failed to set pointer capture:", err);
    }
    this.updateProgress(e);
  }

  private boundHandlePointerMove = (e: PointerEvent) => {
    if (this.isMoving && e.pointerId === this.capturedPointerId) {
      e.preventDefault();
      e.stopPropagation();
      this.updateProgress(e);
    }
  };

  private boundHandlePointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.capturedPointerId && this.scrubberRef) {
      e.preventDefault();
      e.stopPropagation();
      try {
        this.scrubberRef.releasePointerCapture(e.pointerId);
      } catch (_err) {
        // releasePointerCapture may fail if capture was already lost
      }
      this.capturedPointerId = null;
      this.isMoving = false;
    }
  };

  private boundHandlePointerCancel = (e: PointerEvent) => {
    if (e.pointerId === this.capturedPointerId && this.scrubberRef) {
      try {
        this.scrubberRef.releasePointerCapture(e.pointerId);
      } catch (_err) {
        // releasePointerCapture may fail if capture was already lost
      }
      this.capturedPointerId = null;
      this.isMoving = false;
    }
  };

  private boundHandleContextMenu = (e: Event) => {
    if (this.isMoving) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  render() {
    // Calculate progress from currentTimeMs and duration
    const currentProgress =
      this.durationMs > 0 ? (this.currentTimeMs ?? 0) / this.durationMs : 0;

    const displayProgress = this.isMoving
      ? this.scrubProgress
      : currentProgress;

    return html`
      <div 
        ${ref((el) => {
          this.scrubberRef = el as HTMLElement;
        })}
        part="scrubber"
        class="scrubber"
        @pointerdown=${this.handlePointerDown}
        @contextmenu=${this.boundHandleContextMenu}
      >
        <div class="progress" style="width: ${displayProgress * 100}%"></div>
        <div class="handle" style="left: ${displayProgress * 100}%"></div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "pointerup",
      this.boundHandlePointerUp as EventListener,
      { passive: false },
    );
    window.addEventListener("pointermove", this.boundHandlePointerMove, {
      passive: false,
    });
    window.addEventListener(
      "pointercancel",
      this.boundHandlePointerCancel as EventListener,
      { passive: false },
    );
    this.addEventListener("contextmenu", this.boundHandleContextMenu, {
      passive: false,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "pointerup",
      this.boundHandlePointerUp as EventListener,
    );
    window.removeEventListener("pointermove", this.boundHandlePointerMove);
    window.removeEventListener(
      "pointercancel",
      this.boundHandlePointerCancel as EventListener,
    );
    this.removeEventListener("contextmenu", this.boundHandleContextMenu);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-scrubber": EFScrubber;
  }
}
