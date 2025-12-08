import { consume, provide } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";

import { isEFTemporal, type TemporalMixinInterface } from "../../elements/EFTemporal.js";
import { findRootTemporal } from "../../elements/findRootTemporal.js";
import { TargetController } from "../../elements/TargetController.js";
import { selectionContext } from "../../canvas/selection/selectionContext.js";
import { targetTemporalContext } from "../ContextMixin.js";
import { currentTimeContext } from "../currentTimeContext.js";
import { durationContext } from "../durationContext.js";
import { type FocusContext, focusContext } from "../focusContext.js";
import { focusedElementContext } from "../focusedElementContext.js";
import { loopContext, playingContext } from "../playingContext.js";
import { TWMixin } from "../TWMixin.js";
import "../EFTimelineRuler.js";
import "../EFScrubber.js";
import "../EFFilmstrip.js";

@customElement("ef-timeline")
export class EFTimeline extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 100px;
        
        --timeline-bg: rgb(30 41 59);
        --timeline-border: rgb(71 85 105);
        --timeline-header-bg: rgb(51 65 85);
        --timeline-text: rgb(226 232 240);
        --timeline-ruler-bg: rgb(51 65 85);
      }
      
      :host(.light) {
        --timeline-bg: rgb(241 245 249);
        --timeline-border: rgb(203 213 225);
        --timeline-header-bg: rgb(226 232 240);
        --timeline-text: rgb(30 41 59);
        --timeline-ruler-bg: rgb(226 232 240);
      }
      
      .container {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: none;
        height: 100%;
        background: var(--timeline-bg);
        color: var(--timeline-text);
        overflow: hidden;
      }
      
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        background: var(--timeline-header-bg);
        border-bottom: 1px solid var(--timeline-border);
        flex-shrink: 0;
      }
      
      .controls {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .playback-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-right: 12px;
        border-right: 1px solid var(--timeline-border);
      }
      
      .control-btn {
        min-width: 32px;
        height: 32px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: inherit;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .control-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .control-btn:active:not(:disabled) {
        transform: translateY(0);
      }
      
      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .control-btn.active {
        background: rgba(59, 130, 246, 0.6);
        border-color: rgba(59, 130, 246, 0.8);
      }
      
      .time-display {
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        font-weight: 500;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        letter-spacing: 0.5px;
      }
      
      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .zoom-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: inherit;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .zoom-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }
      
      .zoom-label {
        font-size: 12px;
        min-width: 48px;
        text-align: center;
        font-weight: 500;
        color: var(--timeline-text);
      }
      
      .timeline-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }
      
      .ruler-container {
        position: relative;
        height: 24px;
        background: var(--timeline-ruler-bg);
        border-bottom: 1px solid var(--timeline-border);
        flex-shrink: 0;
        overflow: hidden;
        pointer-events: auto;
        cursor: ew-resize;
      }
      
      .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }
      
      .tracks-scroll {
        flex: 1;
        overflow: auto;
        position: relative;
      }
      
      .tracks-content {
        position: relative;
        min-height: 100%;
      }
      
      .playhead-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 100;
      }
      
      .playhead-container ::slotted(*),
      .playhead-container * {
        pointer-events: auto;
      }
      
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(148, 163, 184, 0.6);
        font-style: italic;
      }
    `,
  ];

  @property({ type: String })
  target = "";

  @consume({ context: selectionContext, subscribe: true })
  selectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

  /**
   * Get canvas selection context by finding the canvas element.
   * Used when timeline is a sibling of canvas (can't access via Lit context).
   */
  private getCanvasSelectionContext(): import("../../canvas/selection/selectionContext.js").SelectionContext | undefined {
    // First try Lit context (works when timeline is inside canvas)
    if (this.selectionContext) {
      return this.selectionContext;
    }
    // Fallback: find canvas element and access its selectionContext property
    const canvas = document.querySelector('ef-canvas') as any;
    if (canvas && canvas.selectionContext) {
      return canvas.selectionContext;
    }
    return undefined;
  }

  @property({ type: Number, attribute: "zoom-scale" })
  zoomScale = 1.0;

  @property({ type: Number, attribute: "min-zoom" })
  minZoom = 0.1;

  @property({ type: Number, attribute: "max-zoom" })
  maxZoom = 10;

  @property({ type: Boolean, attribute: "enable-trim" })
  enableTrim = false;

  @property({ type: Boolean, attribute: "show-controls" })
  showControls = true;

  @property({ type: Boolean, attribute: "show-playback-controls" })
  showPlaybackControls = true;

  @property({ type: Boolean, attribute: "show-zoom-controls" })
  showZoomControls = true;

  @property({ type: Boolean, attribute: "show-time-display" })
  showTimeDisplay = true;

  @state()
  private targetElement: HTMLElement | null = null;

  @state()
  private currentTimeMs = 0;

  @state()
  private isPlaying = false;

  @state()
  private isLooping = false;

  private targetController?: TargetController;
  private scrollContainerRef: Ref<HTMLDivElement> = createRef();
  private animationFrameId?: number;
  private scrubberScrollContainerRef = { current: null as HTMLElement | null };

  private get scrollContainerRefForScrubber() {
    // Update the ref object when the ref value changes
    this.scrubberScrollContainerRef.current = this.scrollContainerRef.value ?? null;
    return this.scrubberScrollContainerRef;
  }

  @provide({ context: focusContext })
  @state()
  private _focusContextValue: FocusContext = { focusedElement: null };

  @provide({ context: focusedElementContext })
  @state()
  private _focusedElement: HTMLElement | null = null;

  @provide({ context: playingContext })
  get providedPlaying(): boolean {
    return this.isPlaying;
  }

  @provide({ context: loopContext })
  get providedLoop(): boolean {
    return this.isLooping;
  }

  @provide({ context: currentTimeContext })
  get providedCurrentTime(): number {
    return this.currentTimeMs;
  }

  @provide({ context: durationContext })
  get providedDuration(): number {
    return this.targetTemporal?.durationMs ?? 0;
  }

  @provide({ context: targetTemporalContext })
  get providedTargetTemporal(): TemporalMixinInterface | null {
    return this.targetTemporal;
  }

  get targetTemporal(): TemporalMixinInterface | null {
    // If selection context exists and has selections, derive from selection
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx) {
      const selectedIds = Array.from(selectionCtx.selectedIds);
      if (selectedIds.length > 0 && selectedIds[0]) {
        const element = document.getElementById(selectedIds[0]);
        if (element) {
          // Walk up from the selected element to find root temporal
          const rootTemporal = findRootTemporal(element);
          if (rootTemporal) {
            return rootTemporal;
          }
        }
      }
    }
    // Fall back to explicit target property
    if (this.targetElement && isEFTemporal(this.targetElement)) {
      return this.targetElement as TemporalMixinInterface & HTMLElement;
    }
    return null;
  }

  get durationMs(): number {
    return this.targetTemporal?.durationMs ?? 0;
  }

  get pixelsPerMs(): number {
    return (100 * this.zoomScale) / 1000;
  }

  private selectionChangeHandler?: (event: CustomEvent) => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.startTimeUpdate();
    this.setupSelectionListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopTimeUpdate();
    this.removeSelectionListener();
  }

  private setupSelectionListener(): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => {
        this.requestUpdate(); // Trigger re-render to update targetTemporal
      };
      (selectionCtx as any).addEventListener("selectionchange", this.selectionChangeHandler);
    }
  }

  private removeSelectionListener(): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "removeEventListener" in selectionCtx && this.selectionChangeHandler) {
      (selectionCtx as any).removeEventListener("selectionchange", this.selectionChangeHandler);
      this.selectionChangeHandler = undefined;
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("target")) {
      // Only use TargetController if we have an explicit target and no selection context
      // (or selection context has no selections)
      const selectionCtx = this.getCanvasSelectionContext();
      const hasSelection = selectionCtx && 
        Array.from(selectionCtx.selectedIds).length > 0;
      if (this.target && !hasSelection && !this.targetController) {
        this.targetController = new TargetController(this as any);
      }
    }
    super.willUpdate(changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    // Update scrubber's scrollContainerRef when it becomes available
    if (this.scrollContainerRef.value) {
      const scrubber = this.shadowRoot?.querySelector('ef-scrubber') as any;
      if (scrubber) {
        if (scrubber.scrollContainerRef) {
          scrubber.scrollContainerRef.current = this.scrollContainerRef.value;
        }
        // Request update to ensure scrubber re-renders with new ref
        scrubber.requestUpdate();
      }
    }
  }

  private startTimeUpdate(): void {
    const update = () => {
      if (this.targetTemporal) {
        this.currentTimeMs = this.targetTemporal.currentTimeMs ?? 0;
        this.isPlaying = this.targetTemporal.playing ?? false;
        this.isLooping = this.targetTemporal.loop ?? false;
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }

  private stopTimeUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private handlePlay(): void {
    this.targetTemporal?.play();
  }

  private handlePause(): void {
    this.targetTemporal?.pause();
  }

  private handleToggleLoop(): void {
    if (this.targetTemporal) {
      this.targetTemporal.loop = !this.targetTemporal.loop;
      this.isLooping = this.targetTemporal.loop;
    }
  }

  private handleZoomIn(): void {
    this.zoomScale = Math.min(this.maxZoom, this.zoomScale * 1.25);
  }

  private handleZoomOut(): void {
    this.zoomScale = Math.max(this.minZoom, this.zoomScale / 1.25);
  }

  private handleSeek(e: CustomEvent | number): void {
    const timeMs = typeof e === 'number' ? e : (e.detail as number);
    if (this.targetTemporal) {
      this.targetTemporal.currentTimeMs = timeMs;
      this.currentTimeMs = timeMs;
    }
  }

  @eventOptions({ passive: false, capture: false })
  private handleRulerPointerDown(e: PointerEvent): void {
    // Forward pointer events from ruler to scrubber
    const scrubber = this.shadowRoot?.querySelector('ef-scrubber');
    if (scrubber) {
      // Calculate the time based on the click position
      const rulerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const scrollContainer = this.scrollContainerRef.value;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      const x = e.clientX - rulerRect.left;
      const pixelPosition = scrollLeft + x;
      const contentWidth = (this.durationMs / 1000) * 100 * this.zoomScale;
      const duration = this.durationMs;
      
      if (contentWidth > 0 && duration > 0) {
        const pixelsPerSecond = 100 * this.zoomScale;
        const timeMs = Math.max(0, Math.min((pixelPosition / pixelsPerSecond) * 1000, duration));
        
        // Trigger seek directly
        this.handleSeek(timeMs);
        
        // Also forward the event to scrubber for dragging
        const scrubberRect = scrubber.getBoundingClientRect();
        const syntheticEvent = new PointerEvent('pointerdown', {
          pointerId: e.pointerId,
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: scrubberRect.top + scrubberRect.height / 2,
          button: e.button,
          buttons: e.buttons,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        });
        scrubber.dispatchEvent(syntheticEvent);
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const frames = Math.floor((ms % 1000) / (1000 / 30));
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  }

  private renderPlaybackControls() {
    if (!this.showPlaybackControls) return nothing;

    return html`
      <div class="playback-controls">
        ${this.isPlaying
          ? html`<button class="control-btn" @click=${this.handlePause} 
                  title="Pause">⏸</button>`
          : html`<button class="control-btn" @click=${this.handlePlay}
                  title="Play">▶</button>`}
        <button
          class="control-btn ${this.isLooping ? "active" : ""}"
          @click=${this.handleToggleLoop}
          title="Loop">
          🔁
        </button>
      </div>
    `;
  }

  private renderTimeDisplay() {
    if (!this.showTimeDisplay) return nothing;

    return html`
      <span class="time-display">
        ${this.formatTime(this.currentTimeMs)} / ${this.formatTime(this.durationMs)}
      </span>
    `;
  }

  private renderZoomControls() {
    if (!this.showZoomControls) return nothing;

    return html`
      <div class="zoom-controls">
        <button class="zoom-btn" @click=${this.handleZoomOut} 
                title="Zoom out">−</button>
        <span class="zoom-label">${Math.round(this.zoomScale * 100)}%</span>
        <button class="zoom-btn" @click=${this.handleZoomIn}
                title="Zoom in">+</button>
      </div>
    `;
  }

  private renderControls() {
    if (!this.showControls) return nothing;

    return html`
      <div class="header">
        <div class="controls">
          ${this.renderPlaybackControls()}
          ${this.renderTimeDisplay()}
        </div>
        ${this.renderZoomControls()}
      </div>
    `;
  }

  render() {
    const contentWidth = (this.durationMs / 1000) * 100 * this.zoomScale;
    const targetTemporal = this.targetTemporal;

    if (!targetTemporal) {
      return html`
        <div class="container">
          ${this.renderControls()}
          <div class="empty-state">No target element selected</div>
        </div>
      `;
    }

    // If deriving from selection, filmstrip will use context (providedTargetTemporal)
    // Otherwise, pass the target ID explicitly
    const hasSelection = this.selectionContext && 
      Array.from(this.selectionContext.selectedIds).length > 0;
    const filmstripTarget = hasSelection ? "" : this.target;

    return html`
      <div class="container">
        ${this.renderControls()}
        <div class="timeline-area">
          <div class="ruler-container" @pointerdown=${this.handleRulerPointerDown}>
            <ef-timeline-ruler
              duration-ms=${this.durationMs}
              zoom-scale=${this.zoomScale}
              container-width=${contentWidth}
              .scrollContainerElement=${this.scrollContainerRef.value ?? null}
            ></ef-timeline-ruler>
          </div>
          <div class="content">
            <div class="tracks-scroll" ${ref(this.scrollContainerRef)}>
              <div class="tracks-content" style="width: ${contentWidth}px;">
                <ef-filmstrip
                  target=${filmstripTarget}
                  pixels-per-ms=${this.pixelsPerMs}
                  ?enable-trim=${this.enableTrim}
                ></ef-filmstrip>
              </div>
            </div>
          </div>
          <div class="playhead-container">
            <ef-scrubber
              orientation="vertical"
              current-time-ms=${this.currentTimeMs}
              duration-ms=${this.durationMs}
              zoom-scale=${this.zoomScale}
              container-width=${contentWidth}
              .scrollContainerRef=${this.scrollContainerRefForScrubber}
              .onSeek=${this.handleSeek.bind(this)}
              @seek=${this.handleSeek}
            ></ef-scrubber>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-timeline": EFTimeline;
  }
}

