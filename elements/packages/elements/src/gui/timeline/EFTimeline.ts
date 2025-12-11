import { consume, provide } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";

import { EFAudio } from "../../elements/EFAudio.js";
import { EFImage } from "../../elements/EFImage.js";
import { EFText } from "../../elements/EFText.js";
import { isEFTemporal, type TemporalMixinInterface } from "../../elements/EFTemporal.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
import { EFVideo } from "../../elements/EFVideo.js";
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
import { 
  timelineStateContext, 
  type TimelineState, 
  timeToPx, 
  pxToTime,
  DEFAULT_PIXELS_PER_MS,
  pixelsPerMsToZoom,
} from "./timelineStateContext.js";
import "../EFTimelineRuler.js";
import { 
  quantizeToFrameTimeMs,
  calculateFrameIntervalMs,
  calculatePixelsPerFrame,
  shouldShowFrameMarkers,
} from "../EFTimelineRuler.js";
import "../../elements/EFThumbnailStrip.js";

// ============================================================================
// TIMELINE STATE CONTEXT
// ============================================================================

/**
 * EFTimeline - Unified timeline component
 * 
 * Core invariant: pixelsPerMs determines all positioning.
 * Everything else (ruler, tracks, playhead) derives from this single value.
 */
@customElement("ef-timeline")
export class EFTimeline extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 100px;
        
        /* Layout coordination via CSS custom property */
        --timeline-hierarchy-width: 200px;
        
        /* Theme */
        --timeline-bg: rgb(30 41 59);
        --timeline-border: rgb(71 85 105);
        --timeline-header-bg: rgb(51 65 85);
        --timeline-text: rgb(226 232 240);
        --timeline-ruler-bg: rgb(51 65 85);
        --timeline-track-bg: rgb(51 65 85);
        --timeline-track-hover: rgb(71 85 105);
        --timeline-playhead: rgb(239 68 68);
      }
      
      :host(.light) {
        --timeline-bg: rgb(241 245 249);
        --timeline-border: rgb(203 213 225);
        --timeline-header-bg: rgb(226 232 240);
        --timeline-text: rgb(30 41 59);
        --timeline-ruler-bg: rgb(226 232 240);
        --timeline-track-bg: rgb(226 232 240);
        --timeline-track-hover: rgb(203 213 225);
        --timeline-playhead: rgb(185 28 28);
      }
      
      .container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: var(--timeline-bg);
        color: var(--timeline-text);
        overflow: hidden;
      }
      
      /* === HEADER / CONTROLS === */
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
      }
      
      /* === TIMELINE LAYOUT === */
      .timeline-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }
      
      .ruler-row {
        display: flex;
        height: 24px;
        background: var(--timeline-ruler-bg);
        border-bottom: 1px solid var(--timeline-border);
        flex-shrink: 0;
      }
      
      .ruler-spacer {
        width: var(--timeline-hierarchy-width);
        flex-shrink: 0;
        background: var(--timeline-header-bg);
        border-right: 1px solid var(--timeline-border);
      }
      
      .ruler-content {
        flex: 1;
        position: relative;
        overflow: hidden;
        cursor: ew-resize;
      }
      
      .ruler-content ef-timeline-ruler {
        width: 100%;
        height: 100%;
      }
      
      .tracks-viewport {
        flex: 1;
        display: flex;
        overflow: hidden;
        position: relative;
      }
      
      .hierarchy-panel {
        width: var(--timeline-hierarchy-width);
        flex-shrink: 0;
        background: var(--timeline-header-bg);
        border-right: 1px solid var(--timeline-border);
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .tracks-scroll {
        flex: 1;
        overflow: auto;
        position: relative;
        background: var(--timeline-track-bg);
      }
      
      .tracks-content {
        position: relative;
        min-height: 100%;
      }
      
      /* === PLAYHEAD === */
      .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--timeline-playhead);
        pointer-events: none;
        z-index: 100;
      }
      
      .playhead-handle {
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 12px;
        height: 12px;
        background: var(--timeline-playhead);
        border-radius: 50%;
        pointer-events: auto;
        cursor: ew-resize;
      }
      
      /* === FRAME HIGHLIGHT === */
      .frame-highlight {
        position: absolute;
        top: 0;
        bottom: 0;
        background: rgba(59, 130, 246, 0.3);
        border-left: 2px solid rgba(59, 130, 246, 0.7);
        pointer-events: none;
        z-index: 99;
      }
      
      /* === TRACK ITEMS === */
      .track-row {
        display: flex;
        align-items: center;
        height: 28px;
        border-bottom: 1px solid var(--timeline-border);
      }
      
      .track-label {
        padding: 0 8px;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .track-bar {
        position: absolute;
        height: 22px;
        background: rgba(59, 130, 246, 0.4);
        border: 1px solid rgba(59, 130, 246, 0.6);
        border-radius: 4px;
        display: flex;
        align-items: center;
        overflow: hidden;
      }
      
      .track-bar:hover {
        background: rgba(59, 130, 246, 0.5);
      }
      
      .track-bar[data-focused="true"] {
        background: rgba(59, 130, 246, 0.6);
        border-color: rgba(59, 130, 246, 0.8);
      }
      
      .track-bar.video {
        background: rgba(147, 51, 234, 0.4);
        border-color: rgba(147, 51, 234, 0.6);
      }
      
      .track-bar.audio {
        background: rgba(34, 197, 94, 0.4);
        border-color: rgba(34, 197, 94, 0.6);
      }
      
      .track-bar.image {
        background: rgba(234, 179, 8, 0.4);
        border-color: rgba(234, 179, 8, 0.6);
      }
      
      .track-bar.text {
        background: rgba(236, 72, 153, 0.4);
        border-color: rgba(236, 72, 153, 0.6);
      }
      
      .track-bar.timegroup {
        background: rgba(100, 116, 139, 0.4);
        border-color: rgba(100, 116, 139, 0.6);
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

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  @property({ type: String })
  target = "";

  /** 
   * The core zoom value - pixels per millisecond.
   * All positioning derives from this single value.
   */
  @property({ type: Number, attribute: "pixels-per-ms" })
  pixelsPerMs = DEFAULT_PIXELS_PER_MS;

  @property({ type: Number, attribute: "min-zoom" })
  minZoom = 0.1;

  @property({ type: Number, attribute: "max-zoom" })
  maxZoom = 10;

  @property({ type: Boolean, attribute: "enable-trim" })
  enableTrim = false;

  @property({ type: Boolean, attribute: "show-controls" })
  showControls = true;

  @property({ type: Boolean, attribute: "show-ruler" })
  showRuler = true;

  @property({ type: Boolean, attribute: "show-hierarchy" })
  showHierarchy = true;

  @property({ type: Boolean, attribute: "show-playhead" })
  showPlayhead = true;

  @property({ type: Boolean, attribute: "show-playback-controls" })
  showPlaybackControls = true;

  @property({ type: Boolean, attribute: "show-zoom-controls" })
  showZoomControls = true;

  @property({ type: Boolean, attribute: "show-time-display" })
  showTimeDisplay = true;

  // ============================================================================
  // STATE
  // ============================================================================

  @state()
  private targetElement: HTMLElement | null = null;

  @state()
  private currentTimeMs = 0;

  @state()
  private isPlaying = false;

  @state()
  private isLooping = false;

  @state()
  private focusedElement: HTMLElement | null = null;

  @state()
  private viewportScrollLeft = 0;

  @provide({ context: timelineStateContext })
  @state()
  private _timelineState: TimelineState = {
    pixelsPerMs: DEFAULT_PIXELS_PER_MS,
    currentTimeMs: 0,
    durationMs: 0,
    viewportScrollLeft: 0,
    seek: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
  };

  private targetController?: TargetController;
  private tracksScrollRef: Ref<HTMLDivElement> = createRef();
  private hierarchyScrollRef: Ref<HTMLDivElement> = createRef();
  private containerRef: Ref<HTMLDivElement> = createRef();
  private animationFrameId?: number;
  private selectionChangeHandler?: () => void;
  private scrollHandler?: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private isDraggingPlayhead = false;

  // ============================================================================
  // CONTEXT PROVIDERS
  // ============================================================================

  @consume({ context: selectionContext, subscribe: true })
  selectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

  @provide({ context: focusContext })
  @state()
  private _focusContextValue: FocusContext = { focusedElement: null };

  @provide({ context: focusedElementContext })
  get _focusedElement(): HTMLElement | null {
    return this.focusedElement;
  }

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

  /** Get timeline state (for external access) */
  get timelineState(): TimelineState {
    return this._timelineState;
  }

  /** Update timeline state when any constituent value changes */
  private updateTimelineState(): void {
    const newState: TimelineState = {
      pixelsPerMs: this.pixelsPerMs,
      currentTimeMs: this.currentTimeMs,
      durationMs: this.durationMs,
      viewportScrollLeft: this.viewportScrollLeft,
      seek: (ms: number) => this.handleSeek(ms),
      zoomIn: () => this.handleZoomIn(),
      zoomOut: () => this.handleZoomOut(),
    };
    
    // Only update if values changed to avoid infinite loops
    if (
      this._timelineState.pixelsPerMs !== newState.pixelsPerMs ||
      this._timelineState.currentTimeMs !== newState.currentTimeMs ||
      this._timelineState.durationMs !== newState.durationMs ||
      this._timelineState.viewportScrollLeft !== newState.viewportScrollLeft
    ) {
      this._timelineState = newState;
    }
  }

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  private getCanvasSelectionContext(): import("../../canvas/selection/selectionContext.js").SelectionContext | undefined {
    if (this.selectionContext) return this.selectionContext;
    const canvas = document.querySelector('ef-canvas') as any;
    return canvas?.selectionContext;
  }

  get targetTemporal(): TemporalMixinInterface | null {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx) {
      const selectedIds = Array.from(selectionCtx.selectedIds);
      if (selectedIds.length > 0 && selectedIds[0]) {
        const element = document.getElementById(selectedIds[0]);
        if (element) {
          const rootTemporal = findRootTemporal(element);
          if (rootTemporal) return rootTemporal;
        }
      }
    }
    if (this.targetElement && isEFTemporal(this.targetElement)) {
      return this.targetElement as TemporalMixinInterface & HTMLElement;
    }
    return null;
  }

  get durationMs(): number {
    return this.targetTemporal?.durationMs ?? 0;
  }

  /** Content width in pixels (derived from duration and pixelsPerMs) */
  get contentWidthPx(): number {
    return timeToPx(this.durationMs, this.pixelsPerMs);
  }

  /** Current zoom as percentage (for display) */
  get zoomPercent(): number {
    return Math.round(pixelsPerMsToZoom(this.pixelsPerMs) * 100);
  }

  /** Derive fps from target temporal (defaults to 30) */
  get fps(): number {
    const target = this.targetTemporal;
    if (target && 'fps' in target) {
      return (target as any).fps ?? 30;
    }
    return 30;
  }

  /** Whether frame markers should be visible at current zoom */
  get showFrameMarkers(): boolean {
    const frameIntervalMs = calculateFrameIntervalMs(this.fps);
    const pixelsPerFrame = calculatePixelsPerFrame(frameIntervalMs, this.pixelsPerMs);
    return shouldShowFrameMarkers(pixelsPerFrame);
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  connectedCallback(): void {
    super.connectedCallback();
    this.startTimeUpdate();
    this.setupSelectionListener();
    this.setupKeyboardListener();
    this.updateTimelineState();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopTimeUpdate();
    this.removeSelectionListener();
    this.removeScrollListener();
    this.removeKeyboardListener();
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("target") && this.target) {
      const selectionCtx = this.getCanvasSelectionContext();
      const hasSelection = selectionCtx && Array.from(selectionCtx.selectedIds).length > 0;
      if (!hasSelection && !this.targetController) {
        this.targetController = new TargetController(this as any);
      }
    }
    
    // Always update timeline state - values may come from getters
    this.updateTimelineState();
    
    super.willUpdate(changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (this.tracksScrollRef.value && !this.scrollHandler) {
      this.setupScrollListener();
    } else if (!this.tracksScrollRef.value && this.scrollHandler) {
      this.removeScrollListener();
    }
  }

  private setupSelectionListener(): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => this.requestUpdate();
      (selectionCtx as any).addEventListener("selectionchange", this.selectionChangeHandler);
    }
  }

  private removeSelectionListener(): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "removeEventListener" in selectionCtx && this.selectionChangeHandler) {
      (selectionCtx as any).removeEventListener("selectionchange", this.selectionChangeHandler);
    }
  }

  private setupScrollListener(): void {
    if (this.tracksScrollRef.value) {
      this.scrollHandler = () => {
        if (this.tracksScrollRef.value) {
          this.viewportScrollLeft = this.tracksScrollRef.value.scrollLeft;
        }
      };
      this.tracksScrollRef.value.addEventListener("scroll", this.scrollHandler, { passive: true });
      this.scrollHandler();
    }
  }

  private removeScrollListener(): void {
    if (this.tracksScrollRef.value && this.scrollHandler) {
      this.tracksScrollRef.value.removeEventListener("scroll", this.scrollHandler);
    }
  }

  private setupKeyboardListener(): void {
    this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.addEventListener("keydown", this.keydownHandler);
  }

  private removeKeyboardListener(): void {
    if (this.keydownHandler) {
      this.removeEventListener("keydown", this.keydownHandler);
    }
  }

  private startTimeUpdate(): void {
    const update = () => {
      if (this.targetTemporal) {
        const rawTime = this.targetTemporal.currentTimeMs ?? 0;
        const duration = this.targetTemporal.durationMs ?? 0;
        // Clamp time to valid range to prevent display issues
        this.currentTimeMs = Math.max(0, Math.min(rawTime, duration));
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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

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
    const currentZoom = pixelsPerMsToZoom(this.pixelsPerMs);
    const newZoom = Math.min(this.maxZoom, currentZoom * 1.25);
    this.pixelsPerMs = newZoom * DEFAULT_PIXELS_PER_MS;
  }

  private handleZoomOut(): void {
    const currentZoom = pixelsPerMsToZoom(this.pixelsPerMs);
    const newZoom = Math.max(this.minZoom, currentZoom / 1.25);
    this.pixelsPerMs = newZoom * DEFAULT_PIXELS_PER_MS;
  }

  /**
   * Seek to a specific time, optionally quantizing to frame boundaries.
   * @param timeMs The raw time to seek to
   * @param snapToFrame Whether to quantize to the nearest frame boundary (default: true when frame markers visible)
   */
  private handleSeek(timeMs: number, snapToFrame: boolean = this.showFrameMarkers): void {
    let seekTime = timeMs;
    
    // Quantize to frame boundaries when snapping is enabled
    if (snapToFrame && this.fps > 0) {
      seekTime = quantizeToFrameTimeMs(seekTime, this.fps);
    }
    
    // Clamp to valid range
    const clampedTime = Math.max(0, Math.min(seekTime, this.durationMs));
    
    if (this.targetTemporal) {
      this.targetTemporal.currentTimeMs = clampedTime;
      this.currentTimeMs = clampedTime;
    }
  }

  /**
   * Handle keyboard navigation for frame-by-frame or second-by-second movement.
   * - Arrow Left/Right: move by one frame
   * - Shift+Arrow Left/Right: move by one second
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Only handle arrow keys
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }

    // Don't handle if user is typing in an input/textarea
    const activeElement = document.activeElement;
    if (
      activeElement?.tagName === "INPUT" ||
      activeElement?.tagName === "TEXTAREA" ||
      (activeElement as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    e.preventDefault();

    const isShiftPressed = e.shiftKey;
    const isRightArrow = e.key === "ArrowRight";
    const fps = this.fps;
    const durationMs = this.durationMs;

    let newTime: number;

    if (isShiftPressed) {
      // Shift+arrow: move by 1 second (1000ms)
      const deltaMs = isRightArrow ? 1000 : -1000;
      newTime = this.currentTimeMs + deltaMs;
    } else {
      // Arrow: move by one frame
      const frameIntervalMs = fps > 0 ? 1000 / fps : 1000 / 30;
      const deltaMs = isRightArrow ? frameIntervalMs : -frameIntervalMs;
      newTime = this.currentTimeMs + deltaMs;

      // Quantize to frame boundaries
      newTime = quantizeToFrameTimeMs(newTime, fps);
    }

    // Clamp to bounds
    newTime = Math.max(0, Math.min(newTime, durationMs));

    // Seek to new time
    this.handleSeek(newTime);
  }

  @eventOptions({ passive: false })
  private handleRulerPointerDown(e: PointerEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const scrollLeft = this.tracksScrollRef.value?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const timeMs = pxToTime(x, this.pixelsPerMs);
    this.handleSeek(timeMs);
    this.startPlayheadDrag(e);
    e.preventDefault();
  }

  @eventOptions({ passive: false })
  private handleTracksPointerDown(e: PointerEvent): void {
    // Only seek on direct clicks (not on track items)
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('tracks-content')) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const scrollLeft = target.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const timeMs = pxToTime(x, this.pixelsPerMs);
      this.handleSeek(timeMs);
      this.startPlayheadDrag(e);
      e.preventDefault();
    }
  }

  private startPlayheadDrag(e: PointerEvent): void {
    this.isDraggingPlayhead = true;
    const onMove = (moveEvent: PointerEvent) => {
      if (!this.isDraggingPlayhead) return;
      const tracksScroll = this.tracksScrollRef.value;
      if (!tracksScroll) return;
      const rect = tracksScroll.getBoundingClientRect();
      const scrollLeft = tracksScroll.scrollLeft;
      const x = moveEvent.clientX - rect.left + scrollLeft;
      const timeMs = pxToTime(x, this.pixelsPerMs);
      this.handleSeek(timeMs);
    };
    const onUp = () => {
      this.isDraggingPlayhead = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  @eventOptions({ passive: true })
  private syncHierarchyScroll(): void {
    if (this.hierarchyScrollRef.value && this.tracksScrollRef.value) {
      this.tracksScrollRef.value.scrollTop = this.hierarchyScrollRef.value.scrollTop;
    }
  }

  @eventOptions({ passive: true })
  private syncTracksScroll(): void {
    if (this.hierarchyScrollRef.value && this.tracksScrollRef.value) {
      this.hierarchyScrollRef.value.scrollTop = this.tracksScrollRef.value.scrollTop;
    }
  }

  // ============================================================================
  // RENDERING - CONTROLS
  // ============================================================================

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
          ? html`<button class="control-btn" @click=${this.handlePause} title="Pause">⏸</button>`
          : html`<button class="control-btn" @click=${this.handlePlay} title="Play">▶</button>`}
        <button class="control-btn ${this.isLooping ? "active" : ""}" @click=${this.handleToggleLoop} title="Loop">🔁</button>
      </div>
    `;
  }

  private renderTimeDisplay() {
    if (!this.showTimeDisplay) return nothing;
    return html`<span class="time-display">${this.formatTime(this.currentTimeMs)} / ${this.formatTime(this.durationMs)}</span>`;
  }

  private renderZoomControls() {
    if (!this.showZoomControls) return nothing;
    return html`
      <div class="zoom-controls">
        <button class="zoom-btn" @click=${this.handleZoomOut} title="Zoom out">−</button>
        <span class="zoom-label">${this.zoomPercent}%</span>
        <button class="zoom-btn" @click=${this.handleZoomIn} title="Zoom in">+</button>
      </div>
    `;
  }

  /**
   * Calculate frame highlight bounds (semantics).
   * Returns null if frame markers aren't visible or duration is invalid.
   */
  private calculateFrameHighlightBounds(): { startPx: number; widthPx: number } | null {
    if (!this.showFrameMarkers || this.durationMs <= 0) {
      return null;
    }

    const fps = this.fps;
    const frameDurationMs = 1000 / fps;
    const frameStartMs = quantizeToFrameTimeMs(this.currentTimeMs, fps);
    const frameEndMs = Math.min(frameStartMs + frameDurationMs, this.durationMs);

    const startPx = timeToPx(frameStartMs, this.pixelsPerMs);
    const endPx = timeToPx(frameEndMs, this.pixelsPerMs);
    const widthPx = endPx - startPx;

    if (widthPx <= 0 || startPx < 0) {
      return null;
    }

    return { startPx, widthPx };
  }

  /**
   * Render frame highlight (mechanism).
   * Shows the current frame as a rectangle to indicate frames have duration.
   */
  private renderFrameHighlight() {
    const bounds = this.calculateFrameHighlightBounds();
    if (!bounds) return nothing;

    return html`
      <div 
        class="frame-highlight" 
        style=${styleMap({
          left: `${bounds.startPx}px`,
          width: `${bounds.widthPx}px`,
        })}
      ></div>
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

  // ============================================================================
  // RENDERING - TRACKS
  // ============================================================================

  private getElementType(element: Element): string {
    if (element instanceof EFVideo) return "video";
    if (element instanceof EFAudio) return "audio";
    if (element instanceof EFImage) return "image";
    if (element instanceof EFText) return "text";
    if (element instanceof EFTimegroup) return "timegroup";
    return "unknown";
  }

  private getElementLabel(element: Element): string {
    const id = element.id || "";
    const type = this.getElementType(element);
    return id || type;
  }

  private renderTrackItem(element: TemporalMixinInterface & Element, depth: number = 0): TemplateResult | typeof nothing {
    if (!isEFTemporal(element)) return nothing;

    const type = this.getElementType(element);
    const label = this.getElementLabel(element);
    const leftPx = timeToPx(element.startTimeWithinParentMs, this.pixelsPerMs);
    const widthPx = timeToPx(element.durationMs, this.pixelsPerMs);
    const isFocused = this.focusedElement === element;

    // Render children for timegroups
    const children = element instanceof EFTimegroup 
      ? Array.from(element.children).filter(isEFTemporal)
      : [];

    return html`
      <div class="track-row" style="padding-left: ${depth * 16}px">
        <div class="track-label">${label}</div>
      </div>
      ${children.map(child => this.renderTrackItem(child as TemporalMixinInterface & Element, depth + 1))}
    `;
  }

  private renderTrackBar(element: TemporalMixinInterface & Element, depth: number = 0): TemplateResult | typeof nothing {
    if (!isEFTemporal(element)) return nothing;

    const type = this.getElementType(element);
    const leftPx = timeToPx(element.startTimeWithinParentMs, this.pixelsPerMs);
    const widthPx = timeToPx(element.durationMs, this.pixelsPerMs);
    const isFocused = this.focusedElement === element;
    const topPx = depth * 28 + 3;  // 28px per row + 3px padding

    // For videos, render thumbnail strip inside
    const content = element instanceof EFVideo
      ? html`<ef-thumbnail-strip target="${(element as HTMLElement).id}" use-intrinsic-duration style="width: 100%; height: 100%;"></ef-thumbnail-strip>`
      : nothing;

    // Render children for timegroups
    const children = element instanceof EFTimegroup 
      ? Array.from(element.children).filter(isEFTemporal)
      : [];

    return html`
      <div 
        class="track-bar ${type}"
        data-focused="${isFocused}"
        style=${styleMap({
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          top: `${topPx}px`,
        })}
        @mouseenter=${() => { this.focusedElement = element as HTMLElement; this._focusContextValue = { focusedElement: element as HTMLElement }; }}
        @mouseleave=${() => { this.focusedElement = null; this._focusContextValue = { focusedElement: null }; }}
      >
        ${content}
      </div>
      ${children.map((child, i) => this.renderTrackBar(child as TemporalMixinInterface & Element, depth + 1 + i))}
    `;
  }

  private countTracks(element: TemporalMixinInterface & Element): number {
    if (!isEFTemporal(element)) return 0;
    const children = element instanceof EFTimegroup 
      ? Array.from(element.children).filter(isEFTemporal)
      : [];
    return 1 + children.reduce((sum, child) => sum + this.countTracks(child as TemporalMixinInterface & Element), 0);
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  render() {
    const target = this.targetTemporal;

    if (!target) {
      return html`
        <div class="container">
          ${this.renderControls()}
          <div class="empty-state">No target element selected</div>
        </div>
      `;
    }

    const playheadPx = timeToPx(this.currentTimeMs, this.pixelsPerMs);
    const trackCount = this.countTracks(target as TemporalMixinInterface & Element);
    const tracksHeightPx = trackCount * 28;
    const zoomScale = pixelsPerMsToZoom(this.pixelsPerMs);

    return html`
      <div class="container" tabindex="0" ${ref(this.containerRef)}>
        ${this.renderControls()}
        <div class="timeline-area">
          <!-- Ruler Row -->
          ${this.showRuler ? html`
            <div class="ruler-row">
              ${this.showHierarchy ? html`<div class="ruler-spacer"></div>` : nothing}
              <div 
                class="ruler-content" 
                @pointerdown=${this.handleRulerPointerDown}
              >
                <ef-timeline-ruler
                  duration-ms=${this.durationMs}
                  fps=${this.fps}
                ></ef-timeline-ruler>
              </div>
            </div>
          ` : nothing}
          
          <!-- Tracks Viewport -->
          <div class="tracks-viewport">
            <!-- Hierarchy Panel -->
            ${this.showHierarchy ? html`
              <div class="hierarchy-panel" ${ref(this.hierarchyScrollRef)} @scroll=${this.syncHierarchyScroll}>
                ${this.renderTrackItem(target as TemporalMixinInterface & Element)}
              </div>
            ` : nothing}
            
            <!-- Tracks Area -->
            <div 
              class="tracks-scroll" 
              ${ref(this.tracksScrollRef)} 
              @scroll=${this.syncTracksScroll}
              @pointerdown=${this.handleTracksPointerDown}
            >
              <div class="tracks-content" style="width: ${this.contentWidthPx}px; height: ${tracksHeightPx}px;">
                ${this.renderTrackBar(target as TemporalMixinInterface & Element)}
                
                <!-- Frame Highlight (shows current frame has duration) -->
                ${this.renderFrameHighlight()}
                
                <!-- Playhead -->
                ${this.showPlayhead ? html`
                  <div class="playhead" style="left: ${playheadPx}px;">
                    <div class="playhead-handle"></div>
                  </div>
                ` : nothing}
              </div>
            </div>
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
