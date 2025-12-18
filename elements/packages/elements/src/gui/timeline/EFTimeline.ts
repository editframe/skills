import { consume, provide } from "@lit/context";
import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import {
  customElement,
  eventOptions,
  property,
  state,
} from "lit/decorators.js";
import { createRef, ref, type Ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";

import { EFAudio } from "../../elements/EFAudio.js";
import { EFImage } from "../../elements/EFImage.js";
import { EFText } from "../../elements/EFText.js";
import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../../elements/EFTemporal.js";
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
import { shouldRenderElement } from "../hierarchy/EFHierarchyItem.js";
import { TWMixin } from "../TWMixin.js";
import "./tracks/index.js";
import type { TrimChangeDetail } from "./TrimHandles.js";
import { flattenHierarchy } from "./flattenHierarchy.js";
import "./EFTimelineRow.js";
import {
  timelineStateContext,
  type TimelineState,
  timeToPx,
  pxToTime,
  DEFAULT_PIXELS_PER_MS,
  pixelsPerMsToZoom,
  TIMELINE_ROW_HEIGHT,
  TIMELINE_ROW_PADDING,
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
        
        /* Layout coordination via CSS custom properties */
        --timeline-hierarchy-width: 200px;
        --timeline-row-height: 28px;
        --timeline-track-height: 22px;
        
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
      
      .timeline-container {
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
        flex-direction: column;
        overflow: hidden;
        position: relative;
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
      
      .tracks-rows {
        display: flex;
        flex-direction: column;
      }
      
      .playhead-clip {
        position: absolute;
        top: 0;
        bottom: 0;
        left: var(--timeline-hierarchy-width, 200px);
        right: 0;
        overflow: hidden;
        pointer-events: none;
      }
      
      .playhead-layer {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
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

  /**
   * CSS selectors for elements to hide in the timeline.
   * Comma-separated list of selectors (e.g., "ef-waveform, .helper").
   */
  @property({ type: String })
  hide = "";

  /**
   * CSS selectors for elements to show in the timeline.
   * When set, only matching elements are shown. Comma-separated list.
   */
  @property({ type: String })
  show = "";

  get hideSelectors(): string[] | undefined {
    if (!this.hide) return undefined;
    return this.hide
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  get showSelectors(): string[] | undefined {
    if (!this.show) return undefined;
    return this.show
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

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
  private hoveredElement: Element | null = null;

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
  private containerRef: Ref<HTMLDivElement> = createRef();
  private animationFrameId?: number;
  private selectionChangeHandler?: () => void;
  private scrollHandler?: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private isDraggingPlayhead = false;
  private targetObserver?: MutationObserver;

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

  private getCanvasSelectionContext():
    | import("../../canvas/selection/selectionContext.js").SelectionContext
    | undefined {
    if (this.selectionContext) return this.selectionContext;
    const canvas = document.querySelector("ef-canvas") as any;
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
    if (target && "fps" in target) {
      return (target as any).fps ?? 30;
    }
    return 30;
  }

  /** Whether frame markers should be visible at current zoom */
  get showFrameMarkers(): boolean {
    const frameIntervalMs = calculateFrameIntervalMs(this.fps);
    const pixelsPerFrame = calculatePixelsPerFrame(
      frameIntervalMs,
      this.pixelsPerMs,
    );
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
    this.targetObserver?.disconnect();
  }

  /**
   * Setup MutationObserver to watch target element for ANY changes.
   * Re-registers when target changes.
   */
  private setupTargetObserver(): void {
    // Always disconnect from previous target first
    this.targetObserver?.disconnect();

    const target = this.targetTemporal;
    if (target && target instanceof Element) {
      this.targetObserver = new MutationObserver(() => this.requestUpdate());
      this.targetObserver.observe(target, {
        childList: true, // children added/removed
        subtree: true, // watch entire subtree
        attributes: true, // attribute changes
      });
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("target") && this.target) {
      const selectionCtx = this.getCanvasSelectionContext();
      const hasSelection =
        selectionCtx && Array.from(selectionCtx.selectedIds).length > 0;
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

    // Re-register observer when target changes
    if (changedProperties.has("targetElement") || changedProperties.has("target")) {
      this.setupTargetObserver();
    }

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
      (selectionCtx as any).addEventListener(
        "selectionchange",
        this.selectionChangeHandler,
      );
    }
  }

  private removeSelectionListener(): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (
      selectionCtx &&
      "removeEventListener" in selectionCtx &&
      this.selectionChangeHandler
    ) {
      (selectionCtx as any).removeEventListener(
        "selectionchange",
        this.selectionChangeHandler,
      );
    }
  }

  private setupScrollListener(): void {
    if (this.tracksScrollRef.value) {
      this.scrollHandler = () => {
        if (this.tracksScrollRef.value) {
          this.viewportScrollLeft = this.tracksScrollRef.value.scrollLeft;
        }
      };
      this.tracksScrollRef.value.addEventListener(
        "scroll",
        this.scrollHandler,
        { passive: true },
      );
      this.scrollHandler();
    }
  }

  private removeScrollListener(): void {
    if (this.tracksScrollRef.value && this.scrollHandler) {
      this.tracksScrollRef.value.removeEventListener(
        "scroll",
        this.scrollHandler,
      );
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

  /** Margin from edge before auto-scroll kicks in during playback */
  private static readonly PLAYHEAD_MARGIN = 100;

  private lastPlayheadPx = 0;
  private isFollowingPlayhead = false;

  private startTimeUpdate(): void {
    const update = () => {
      if (this.targetTemporal) {
        const rawTime = this.targetTemporal.currentTimeMs ?? 0;
        const duration = this.targetTemporal.durationMs ?? 0;
        // Clamp time to valid range to prevent display issues
        this.currentTimeMs = Math.max(0, Math.min(rawTime, duration));
        this.isPlaying = this.targetTemporal.playing ?? false;
        this.isLooping = this.targetTemporal.loop ?? false;

        // Auto-scroll to keep playhead visible (only when playing and not dragging)
        if (this.isPlaying && !this.isDraggingPlayhead) {
          this.followPlayhead();
        } else {
          this.isFollowingPlayhead = false;
        }
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }

  /**
   * Smooth playhead following - scrolls to keep playhead at a fixed screen position.
   * This eliminates jitter by scrolling exactly as much as the playhead moves.
   */
  private followPlayhead(): void {
    const tracksScroll = this.tracksScrollRef.value;
    if (!tracksScroll) return;

    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    const playheadPx = timeToPx(this.currentTimeMs, this.pixelsPerMs);
    const viewportWidth = tracksScroll.clientWidth - hierarchyWidth;
    const maxScroll = tracksScroll.scrollWidth - tracksScroll.clientWidth;

    // Calculate where playhead is relative to visible area
    const playheadInViewport = playheadPx - tracksScroll.scrollLeft;
    const rightThreshold = viewportWidth - EFTimeline.PLAYHEAD_MARGIN;
    const leftThreshold = EFTimeline.PLAYHEAD_MARGIN;

    if (this.isFollowingPlayhead) {
      // Already following - scroll by exactly the delta to keep playhead stationary on screen
      const delta = playheadPx - this.lastPlayheadPx;
      if (delta !== 0) {
        const newScroll = Math.max(0, Math.min(maxScroll, tracksScroll.scrollLeft + delta));
        tracksScroll.scrollLeft = newScroll;
        // Immediately sync our state to prevent flicker
        this.viewportScrollLeft = newScroll;
      }
    } else if (playheadInViewport > rightThreshold) {
      // Playhead reached right threshold - start following from this exact position (no snap)
      this.isFollowingPlayhead = true;
      // No scroll change - just start tracking from current position
    } else if (playheadInViewport < leftThreshold && tracksScroll.scrollLeft > 0) {
      // Playhead at left edge and we can scroll left - scroll to show more
      const newScroll = Math.max(0, playheadPx - leftThreshold);
      tracksScroll.scrollLeft = newScroll;
      this.viewportScrollLeft = newScroll;
    }

    this.lastPlayheadPx = playheadPx;
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
  private handleSeek(
    timeMs: number,
    snapToFrame: boolean = this.showFrameMarkers,
  ): void {
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

  /** Hierarchy panel width - must match CSS --timeline-hierarchy-width */
  private static readonly HIERARCHY_WIDTH = 200;

  @eventOptions({ passive: false })
  private handleTracksPointerDown(e: PointerEvent): void {
    // Only seek on direct clicks (not on track items)
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains("tracks-content")
    ) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const scrollLeft = target.scrollLeft;
      const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
      const x = e.clientX - rect.left + scrollLeft - hierarchyWidth;
      if (x >= 0) {
        const timeMs = pxToTime(x, this.pixelsPerMs);
        this.handleSeek(timeMs);
        this.startPlayheadDrag(e);
      }
      e.preventDefault();
    }
  }

  /** Edge scroll zone width in pixels */
  private static readonly EDGE_SCROLL_ZONE = 50;
  /** Base scroll speed in pixels per frame */
  private static readonly EDGE_SCROLL_SPEED = 8;

  private startPlayheadDrag(e: PointerEvent): void {
    this.isDraggingPlayhead = true;
    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    let lastClientX = e.clientX;
    let edgeScrollAnimationId: number | null = null;

    const updatePlayheadFromMouse = () => {
      const tracksScroll = this.tracksScrollRef.value;
      if (!tracksScroll) return;
      const rect = tracksScroll.getBoundingClientRect();
      const scrollLeft = tracksScroll.scrollLeft;
      const x = lastClientX - rect.left + scrollLeft - hierarchyWidth;
      const timeMs = pxToTime(Math.max(0, x), this.pixelsPerMs);
      this.handleSeek(Math.min(timeMs, this.durationMs));
    };

    const edgeScrollLoop = () => {
      if (!this.isDraggingPlayhead) return;
      const tracksScroll = this.tracksScrollRef.value;
      if (!tracksScroll) return;

      const rect = tracksScroll.getBoundingClientRect();
      const trackAreaLeft = rect.left + hierarchyWidth;
      const trackAreaRight = rect.right;
      const trackAreaWidth = trackAreaRight - trackAreaLeft;

      // Calculate distance from edges (relative to track area, not full scroll container)
      const distanceFromLeft = lastClientX - trackAreaLeft;
      const distanceFromRight = trackAreaRight - lastClientX;

      let scrollDelta = 0;

      if (distanceFromLeft < EFTimeline.EDGE_SCROLL_ZONE && distanceFromLeft >= 0) {
        // Near left edge - scroll left (faster as you get closer to edge)
        const intensity = 1 - distanceFromLeft / EFTimeline.EDGE_SCROLL_ZONE;
        scrollDelta = -EFTimeline.EDGE_SCROLL_SPEED * intensity;
      } else if (distanceFromRight < EFTimeline.EDGE_SCROLL_ZONE && distanceFromRight >= 0) {
        // Near right edge - scroll right
        const intensity = 1 - distanceFromRight / EFTimeline.EDGE_SCROLL_ZONE;
        scrollDelta = EFTimeline.EDGE_SCROLL_SPEED * intensity;
      } else if (lastClientX < trackAreaLeft) {
        // Beyond left edge - scroll left at max speed
        scrollDelta = -EFTimeline.EDGE_SCROLL_SPEED;
      } else if (lastClientX > trackAreaRight) {
        // Beyond right edge - scroll right at max speed
        scrollDelta = EFTimeline.EDGE_SCROLL_SPEED;
      }

      if (scrollDelta !== 0) {
        // Clamp scroll to valid range
        const maxScroll = tracksScroll.scrollWidth - tracksScroll.clientWidth;
        const newScrollLeft = Math.max(0, Math.min(maxScroll, tracksScroll.scrollLeft + scrollDelta));
        tracksScroll.scrollLeft = newScrollLeft;
        
        // Update playhead position based on current mouse and new scroll
        updatePlayheadFromMouse();
      }

      edgeScrollAnimationId = requestAnimationFrame(edgeScrollLoop);
    };

    const onMove = (moveEvent: PointerEvent) => {
      if (!this.isDraggingPlayhead) return;
      lastClientX = moveEvent.clientX;
      updatePlayheadFromMouse();
    };

    const onUp = () => {
      this.isDraggingPlayhead = false;
      if (edgeScrollAnimationId) {
        cancelAnimationFrame(edgeScrollAnimationId);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    
    // Start edge scroll detection loop
    edgeScrollAnimationId = requestAnimationFrame(edgeScrollLoop);
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
        ${
          this.isPlaying
            ? html`<button class="control-btn" @click=${this.handlePause} title="Pause">⏸</button>`
            : html`<button class="control-btn" @click=${this.handlePlay} title="Play">▶</button>`
        }
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
  private calculateFrameHighlightBounds(): {
    startPx: number;
    widthPx: number;
  } | null {
    if (!this.showFrameMarkers || this.durationMs <= 0) {
      return null;
    }

    const fps = this.fps;
    const frameDurationMs = 1000 / fps;
    const frameStartMs = quantizeToFrameTimeMs(this.currentTimeMs, fps);
    const frameEndMs = Math.min(
      frameStartMs + frameDurationMs,
      this.durationMs,
    );

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

  private handleTrimChange(e: CustomEvent<TrimChangeDetail>): void {
    const { elementId, type, newValueMs } = e.detail;
    const element = this.targetElement?.querySelector(`#${elementId}`) as TemporalMixinInterface & HTMLElement;
    if (element) {
      if (type === "start") {
        element.trimStartMs = newValueMs;
      } else {
        element.trimEndMs = newValueMs;
      }
    }
  }

  /**
   * Handle row hover events - update hoveredElement state.
   */
  private handleRowHover(e: CustomEvent<{ element: Element | null }>): void {
    this.hoveredElement = e.detail.element;
  }

  /**
   * Render timeline rows using flattened hierarchy.
   * Each row is a unified component with both label and track.
   */
  private renderRows(target: TemporalMixinInterface & Element): TemplateResult {
    const rows = flattenHierarchy(target).filter((row) =>
      shouldRenderElement(row.element, this.hideSelectors, this.showSelectors),
    );

    return html`
      <div
        class="tracks-rows"
        @track-trim-change=${this.handleTrimChange}
        @row-hover=${this.handleRowHover}
      >
        ${repeat(
          rows,
          // Key function: use element ID or element itself for stable identity
          (row) => (row.element as HTMLElement).id || row.element,
          (row) => html`
            <ef-timeline-row
              .element=${row.element}
              depth=${row.depth}
              pixels-per-ms=${this.pixelsPerMs}
              ?enable-trim=${this.enableTrim}
              .hideSelectors=${this.hideSelectors}
              .showSelectors=${this.showSelectors}
              .hoveredElement=${this.hoveredElement}
            ></ef-timeline-row>
          `,
        )}
      </div>
    `;
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  render() {
    const target = this.targetTemporal;

    if (!target) {
      return html`
        <div class="timeline-container">
          ${this.renderControls()}
          <div class="empty-state">No target element selected</div>
        </div>
      `;
    }

    const playheadPx = timeToPx(this.currentTimeMs, this.pixelsPerMs);

    return html`
      <div class="timeline-container" tabindex="0" ${ref(this.containerRef)}>
        ${this.renderControls()}
        <div class="timeline-area">
          <!-- Ruler Row -->
          ${
            this.showRuler
              ? html`
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
          `
              : nothing
          }
          
          <!-- Tracks Viewport - Single scrollable container -->
          <div class="tracks-viewport">
            <div 
              class="tracks-scroll" 
              ${ref(this.tracksScrollRef)} 
              @pointerdown=${this.handleTracksPointerDown}
            >
              <div class="tracks-content" style="min-width: ${this.contentWidthPx + (this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0)}px;">
                <!-- Unified rows with sticky labels -->
                ${this.renderRows(target as TemporalMixinInterface & Element)}
              </div>
            </div>
            
            <!-- Playhead clip container - stays fixed, clips at label boundary -->
            <div class="playhead-clip" style="left: ${this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0}px;">
              <div class="playhead-layer" style="left: ${-this.viewportScrollLeft}px;">
                ${this.renderFrameHighlight()}
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
