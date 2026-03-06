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

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../../elements/EFTemporal.js";
import { EFTimegroup } from "../../elements/EFTimegroup.js";
import { findRootTemporal } from "../../elements/findRootTemporal.js";
import { TargetController } from "../../elements/TargetController.js";
import { selectionContext } from "../../canvas/selection/selectionContext.js";
import { targetTemporalContext } from "../ContextMixin.js";
import { currentTimeContext } from "../currentTimeContext.js";
import { durationContext } from "../durationContext.js";
import { loopContext, playingContext } from "../playingContext.js";
import type { EFCanvas } from "../../canvas/EFCanvas.js";
import { shouldRenderElement } from "../hierarchy/EFHierarchyItem.js";
import { TWMixin } from "../TWMixin.js";
import type { ControllableSubscription } from "../Controllable.js";
import { createDirectTemporalSubscription } from "../Controllable.js";
// NOTE: Track components (ef-audio-track, ef-video-track, etc.) are NOT imported here
// to avoid circular dependencies with TrackItem. They must be registered before
// EFTimeline is used. See preloadTracks.ts for the registration sequence.
import "./tracks/preloadTracks.js";
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
} from "./timelineStateContext.js";
import "../EFTimelineRuler.js";
import {
  quantizeToFrameTimeMs,
  calculateFrameIntervalMs,
  calculatePixelsPerFrame,
  shouldShowFrameMarkers,
} from "../EFTimelineRuler.js";
import {
  timelineEditingContext,
  type TimelineEditingContext,
  createTimelineEditingContext,
} from "./timelineEditingContext.js";

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
        --timeline-hierarchy-width: var(--ef-hierarchy-width, 200px);
        --timeline-row-height: var(--ef-row-height, 24px);
        --timeline-track-height: var(--ef-track-height, 24px);
        
        /* Component tokens (reference globals from ef-theme.css) */
        --timeline-bg: var(--ef-color-bg);
        --timeline-border: var(--ef-color-border);
        --timeline-header-bg: var(--ef-color-bg-panel);
        --timeline-text: var(--ef-color-text);
        --timeline-ruler-bg: var(--ef-color-bg-panel);
        --timeline-track-bg: var(--ef-color-bg-inset);
        --timeline-track-hover: var(--ef-color-hover);
        --timeline-playhead: var(--ef-color-playhead);
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
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border-subtle);
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
        background: var(--ef-color-hover);
        border-color: var(--ef-color-border);
      }
      
      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .control-btn.active {
        background: var(--ef-color-primary-subtle);
        border-color: var(--ef-color-primary);
      }
      
      .time-display {
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        font-size: 13px;
        font-weight: 500;
        padding: 6px 12px;
        background: var(--ef-color-bg-elevated);
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
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border-subtle);
        border-radius: 6px;
        color: inherit;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .zoom-btn:hover {
        background: var(--ef-color-hover);
        border-color: var(--ef-color-border);
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
        /* Sticky positioning for native scroll sync */
        position: sticky;
        top: 0;
        z-index: 10;
      }
      
      .ruler-spacer {
        width: var(--timeline-hierarchy-width);
        flex-shrink: 0;
        background: var(--timeline-header-bg);
        border-right: 1px solid var(--timeline-border);
        /* Sticky positioning to stay fixed during horizontal scroll */
        position: sticky;
        left: 0;
        z-index: 11;
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
      
      .ruler-playhead-handle {
        position: absolute;
        bottom: -6px;
        transform: translateX(-50%);
        width: 12px;
        height: 12px;
        background: var(--timeline-playhead);
        border-radius: 50%;
        pointer-events: auto;
        cursor: ew-resize;
        z-index: 101;
      }
      
      /* Thumbnail strip row */
      .thumbnail-row {
        display: flex;
        height: 48px;
        background: var(--timeline-bg);
        border-bottom: 1px solid var(--timeline-border);
        flex-shrink: 0;
      }
      
      .thumbnail-spacer {
        width: var(--timeline-hierarchy-width);
        flex-shrink: 0;
        background: var(--timeline-header-bg);
        border-right: 1px solid var(--timeline-border);
      }
      
      .thumbnail-content {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .thumbnail-strip .thumbnail {
        flex-shrink: 0;
        border-radius: 2px;
        overflow: hidden;
        background: var(--timeline-track-bg);
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
      
      /* === TRACKS CONTENT uses grid to layer playhead over tracks === */
      .tracks-content {
        position: relative;
        min-height: 100%;
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
      }
      
      .tracks-content > * {
        grid-area: 1 / 1;
      }
      
      .tracks-rows-layer {
        display: flex;
        flex-direction: column;
      }
      
      /* === PLAYHEAD (sticky layer that stays visible during vertical scroll) === */
      .playhead-layer {
        position: sticky;
        top: 0;
        height: 100%;
        pointer-events: none;
        /* Below sticky labels (z-index 10-11) but above tracks */
        z-index: 5;
        overflow: hidden;
      }
      
      .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--timeline-playhead);
        pointer-events: none;
      }
      
      .playhead-drag-target {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 16px;
        cursor: ew-resize;
        pointer-events: auto;
      }
      
      /* === FRAME HIGHLIGHT === */
      .frame-highlight {
        position: absolute;
        top: 0;
        bottom: 0;
        background: var(--ef-color-primary-subtle);
        border-left: 2px solid var(--ef-color-primary);
        pointer-events: none;
      }
      
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--ef-color-text-subtle);
        font-style: italic;
      }
    `,
  ];

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  /**
   * Target element ID or "selection" to derive from canvas selection.
   *
   * - Empty string (default): Automatically derives target from canvas selection.
   *   The timeline shows the root temporal element containing the currently selected element.
   * - "selection": Explicitly use selection-derived targeting (same as empty string).
   * - Element ID: Use the specified element as the target (must be a temporal element).
   *
   * When deriving from selection, the timeline automatically updates when selection changes.
   */
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
   * Target temporal element ID for playback control.
   * Use this to specify which temporal element the timeline controls.
   * If not set and target is a canvas, derives from canvas selection.
   *
   * Examples:
   * - `control-target="timegroup-1"` - control specific timegroup
   * - Empty: derive from canvas active selection
   */
  @property({ type: String, attribute: "control-target" })
  controlTarget = "";

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

  /**
   * Target element for canvas-wide state (selection, highlight).
   * This should be set to the canvas element.
   */
  @state()
  private targetElement: HTMLElement | null = null;

  @state()
  private currentTimeMs = 0;

  @state()
  private isPlaying = false;

  @state()
  private isLooping = false;

  @state()
  private viewportScrollLeft = 0;

  @provide({ context: timelineStateContext })
  @state()
  private _timelineState: TimelineState = {
    pixelsPerMs: DEFAULT_PIXELS_PER_MS,
    currentTimeMs: 0,
    durationMs: 0,
    viewportScrollLeft: 0,
    viewportWidth: 800,
    seek: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
  };

  @provide({ context: timelineEditingContext })
  @state()
  private _editingContext: TimelineEditingContext =
    createTimelineEditingContext();

  private targetController?: TargetController;
  private tracksScrollRef: Ref<HTMLDivElement> = createRef();
  private containerRef: Ref<HTMLDivElement> = createRef();
  // Refs for direct DOM manipulation of playhead (bypasses Lit render cycle)
  private playheadRef: Ref<HTMLDivElement> = createRef();
  private playheadHandleRef: Ref<HTMLDivElement> = createRef();
  private frameHighlightRef: Ref<HTMLDivElement> = createRef();
  private animationFrameId?: number;
  private selectionChangeHandler?: () => void;
  private scrollHandler?: () => void;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private isDraggingPlayhead = false;
  private targetObserver?: MutationObserver;
  private canvasActiveRootTemporalChangeHandler?: () => void;
  private resizeObserver?: ResizeObserver;
  private cachedViewportWidth = 800; // Cached to avoid layout thrashing
  private saveZoomScrollDebounceTimer: number | null = null;
  // Throttling for context updates (avoid cascading re-renders)
  private lastContextUpdateTime = 0;
  private static readonly CONTEXT_UPDATE_INTERVAL_MS = 100; // 10fps for context updates
  // Subscription to playback controller for playing state (avoids polling race conditions)
  #playbackSubscription: ControllableSubscription | null = null;
  // Wheel event handler bound reference for cleanup
  #wheelHandler: ((e: WheelEvent) => void) | null = null;

  // ============================================================================
  // CONTEXT PROVIDERS
  // ============================================================================

  @consume({ context: selectionContext, subscribe: true })
  selectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

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
    // Use cached viewport width to avoid layout thrashing
    // ResizeObserver updates cachedViewportWidth when container size changes
    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    const viewportWidth = this.cachedViewportWidth - hierarchyWidth;

    const newState: TimelineState = {
      pixelsPerMs: this.pixelsPerMs,
      currentTimeMs: this.currentTimeMs,
      durationMs: this.durationMs,
      viewportScrollLeft: this.viewportScrollLeft,
      viewportWidth,
      seek: (ms: number) => this.handleSeek(ms),
      zoomIn: () => this.handleZoomIn(),
      zoomOut: () => this.handleZoomOut(),
    };

    // Check which values changed
    const pixelsPerMsChanged =
      this._timelineState.pixelsPerMs !== newState.pixelsPerMs;
    const currentTimeMsChanged =
      this._timelineState.currentTimeMs !== newState.currentTimeMs;
    const durationMsChanged =
      this._timelineState.durationMs !== newState.durationMs;
    const viewportScrollLeftChanged =
      this._timelineState.viewportScrollLeft !== newState.viewportScrollLeft;
    const viewportWidthChanged =
      this._timelineState.viewportWidth !== newState.viewportWidth;

    // PERFORMANCE: During playback, scroll changes should NOT trigger context updates.
    //
    // Why this works:
    // 1. Context consumers (ruler, thumbnails) are INSIDE the scroll container
    // 2. They scroll natively with the container - no re-render needed for visual correctness
    // 3. They have pre-rendered buffers (RULER_CANVAS_BUFFER, VIRTUAL_RENDER_PADDING_PX)
    // 4. Virtualization updates can wait until playback pauses
    //
    // This prevents the cascade: scroll → context update → all consumers re-render
    // which was causing stuttering when playback and auto-scroll happened together.
    const scrollOnlyChange =
      viewportScrollLeftChanged &&
      !pixelsPerMsChanged &&
      !currentTimeMsChanged &&
      !durationMsChanged &&
      !viewportWidthChanged;

    const shouldSkipScrollUpdate = scrollOnlyChange && this.isPlaying;

    const hasRelevantChanges =
      pixelsPerMsChanged ||
      currentTimeMsChanged ||
      durationMsChanged ||
      viewportWidthChanged ||
      (viewportScrollLeftChanged && !shouldSkipScrollUpdate);

    if (hasRelevantChanges) {
      // Update state - this will trigger context updates to consumers
      this._timelineState = newState;
      // Explicitly request update to ensure consumers are notified
      this.requestUpdate();
    }
  }

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  /**
   * Get the target canvas element.
   * The canvas is the source of truth for selection and highlight state.
   */
  private getCanvas(): EFCanvas | null {
    // Use target element if it's a canvas
    if (this.targetElement && (this.targetElement as any).selectionContext) {
      return this.targetElement as EFCanvas;
    }
    // Fall back to finding a canvas by ID
    if (this.target) {
      const target = document.getElementById(this.target);
      if (target && (target as any).selectionContext) {
        return target as EFCanvas;
      }
    }
    // Fall back to first canvas in document
    return document.querySelector("ef-canvas") as EFCanvas | null;
  }

  private getCanvasSelectionContext():
    | import("../../canvas/selection/selectionContext.js").SelectionContext
    | undefined {
    if (this.selectionContext) return this.selectionContext;
    return this.getCanvas()?.selectionContext;
  }

  /**
   * Get the currently highlighted element from the canvas.
   */
  getHighlightedElement(): HTMLElement | null {
    return this.getCanvas()?.highlightedElement ?? null;
  }

  /**
   * Set the highlighted element on the canvas.
   * Called when user hovers a row in the timeline.
   */
  setHighlightedElement(element: HTMLElement | null): void {
    this.getCanvas()?.setHighlightedElement(element);
  }

  get targetTemporal(): TemporalMixinInterface | null {
    // If controlTarget is explicitly set, look it up directly
    if (
      this.controlTarget &&
      this.controlTarget !== "" &&
      this.controlTarget !== "selection"
    ) {
      const element = document.getElementById(this.controlTarget);
      if (element && isEFTemporal(element)) {
        return element as TemporalMixinInterface & HTMLElement;
      }
    }

    // If controlTarget is "selection" or empty, derive from canvas selection
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

  /**
   * Get the root timegroup ID for localStorage key generation.
   * Returns null if no root timegroup is found or it has no ID.
   */
  private getRootTimegroupId(): string | null {
    if (!this.targetTemporal) return null;

    const rootTemporal = findRootTemporal(
      this.targetTemporal as unknown as Element,
    );

    if (rootTemporal instanceof EFTimegroup && rootTemporal.id) {
      return rootTemporal.id;
    }

    return null;
  }

  /**
   * Get localStorage key for timeline state (zoom and scroll).
   */
  private getTimelineStorageKey(): string | null {
    const rootId = this.getRootTimegroupId();
    return rootId ? `ef-timeline-${rootId}` : null;
  }

  /**
   * Save timeline zoom and scroll to localStorage.
   */
  private saveTimelineState(): void {
    const storageKey = this.getTimelineStorageKey();
    if (!storageKey) return;

    try {
      const state = {
        pixelsPerMs: this.pixelsPerMs,
        viewportScrollLeft: this.viewportScrollLeft,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save timeline state to localStorage", error);
    }
  }

  /**
   * Restore timeline zoom and scroll from localStorage.
   */
  private restoreTimelineState(): void {
    const storageKey = this.getTimelineStorageKey();
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      const state = JSON.parse(stored);
      if (typeof state.pixelsPerMs === "number" && state.pixelsPerMs > 0) {
        this.pixelsPerMs = Math.max(
          this.minZoom * DEFAULT_PIXELS_PER_MS,
          Math.min(this.maxZoom * DEFAULT_PIXELS_PER_MS, state.pixelsPerMs),
        );
      }
      if (
        typeof state.viewportScrollLeft === "number" &&
        state.viewportScrollLeft >= 0
      ) {
        // Restore scroll position after DOM is ready
        requestAnimationFrame(() => {
          const tracksScroll = this.tracksScrollRef.value;
          if (tracksScroll) {
            tracksScroll.scrollLeft = state.viewportScrollLeft;
            this.viewportScrollLeft = state.viewportScrollLeft;
          }
        });
      }
    } catch (error) {
      console.warn("Failed to restore timeline state from localStorage", error);
    }
  }

  /**
   * Debounced save of timeline state to avoid excessive localStorage writes.
   */
  private debouncedSaveTimelineState(): void {
    if (this.saveZoomScrollDebounceTimer !== null) {
      clearTimeout(this.saveZoomScrollDebounceTimer);
    }
    this.saveZoomScrollDebounceTimer = window.setTimeout(() => {
      this.saveZoomScrollDebounceTimer = null;
      this.saveTimelineState();
    }, 200);
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
    // Subscribe to playback controller when connected
    this.subscribeToPlaybackController();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopTimeUpdate();
    this.removeSelectionListener();
    this.removeScrollListener();
    this.removeKeyboardListener();
    this.targetObserver?.disconnect();
    if (this.#durationChangeTarget) {
      this.#durationChangeTarget.removeEventListener(
        "durationchange",
        this.#durationChangeHandler,
      );
      this.#durationChangeTarget = undefined;
    }
    this.resizeObserver?.disconnect();
    // Unsubscribe from playback controller
    this.unsubscribeFromPlaybackController();
    // Save state before disconnecting
    if (this.saveZoomScrollDebounceTimer !== null) {
      clearTimeout(this.saveZoomScrollDebounceTimer);
      this.saveZoomScrollDebounceTimer = null;
    }
    this.saveTimelineState();
  }

  /**
   * Setup MutationObserver to watch target element for ANY changes.
   * Re-registers when target changes.
   */
  private setupTargetObserver(): void {
    // Always disconnect from previous target first
    this.targetObserver?.disconnect();
    if (this.#durationChangeTarget) {
      this.#durationChangeTarget.removeEventListener(
        "durationchange",
        this.#durationChangeHandler,
      );
      this.#durationChangeTarget = undefined;
    }

    const target = this.targetTemporal;
    if (target && target instanceof Element) {
      this.targetObserver = new MutationObserver(() => this.requestUpdate());
      this.targetObserver.observe(target, {
        childList: true, // children added/removed
        subtree: true, // watch entire subtree
        attributes: true, // attribute changes
      });
      target.addEventListener("durationchange", this.#durationChangeHandler);
      this.#durationChangeTarget = target;
    }
  }

  #durationChangeTarget?: Element;
  #durationChangeHandler = () => this.requestUpdate();
  #previousTargetTemporal: TemporalMixinInterface | null = null;

  protected willUpdate(changedProperties: PropertyValues): void {
    // Setup TargetController for canvas target
    if (
      changedProperties.has("target") &&
      this.target &&
      !this.targetController
    ) {
      this.targetController = new TargetController(this as any);
    }

    // Retry setting up selection listener if not yet connected
    this.setupSelectionListener();

    // Always update timeline state - values may come from getters
    this.updateTimelineState();

    super.willUpdate(changedProperties);
  }

  protected firstUpdated(): void {
    // Set up ResizeObserver to cache viewport width without layout thrashing
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    const tracksScroll = this.tracksScrollRef.value;
    if (!tracksScroll) return;

    // Disconnect existing observer if any (shouldn't happen, but be safe)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Initial measurement (only happens once on setup)
    // Use clientWidth for initial measurement as it's more reliable than contentRect
    // which might be 0 if element hasn't been laid out yet
    const initialWidth = tracksScroll.clientWidth;
    if (initialWidth > 0) {
      this.cachedViewportWidth = initialWidth;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect to avoid triggering layout
        const width = entry.contentRect.width;
        if (width > 0) {
          this.cachedViewportWidth = width;
          // Update timeline state to propagate new viewport width to context consumers
          this.updateTimelineState();
          // Request update to trigger re-render with new dimensions
          this.requestUpdate();
        }
      }
    });
    this.resizeObserver.observe(tracksScroll);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // Sync CSS variable and attribute when hierarchy visibility changes
    if (changedProperties.has("showHierarchy")) {
      if (this.showHierarchy) {
        this.style.removeProperty("--timeline-hierarchy-width");
        this.removeAttribute("hide-hierarchy");
      } else {
        this.style.setProperty("--timeline-hierarchy-width", "0px");
        this.setAttribute("hide-hierarchy", "");
      }
    }

    // Subscribe to playback controller when targetTemporal changes
    if (
      changedProperties.has("targetTemporal") ||
      changedProperties.has("controlTarget")
    ) {
      this.subscribeToPlaybackController();
    }

    // Restore timeline state when target changes
    if (
      changedProperties.has("targetTemporal") ||
      changedProperties.has("target")
    ) {
      // Wait for DOM to be ready before restoring scroll
      requestAnimationFrame(() => {
        this.restoreTimelineState();
      });
    }

    // Save timeline state when zoom or scroll changes
    if (
      changedProperties.has("pixelsPerMs") ||
      changedProperties.has("viewportScrollLeft")
    ) {
      this.debouncedSaveTimelineState();
    }

    // Re-register observer and listeners when target changes
    if (
      changedProperties.has("targetElement") ||
      changedProperties.has("target")
    ) {
      // Reset selection listener to ensure we're listening to the right canvas
      this.removeSelectionListener();
      this.selectionChangeHandler = undefined;
      this.setupSelectionListener();
    }

    // Re-attach observer/durationchange listener whenever targetTemporal changes,
    // regardless of which property triggered the update (selection changes, controlTarget
    // changes, canvas activation, etc. all can silently change targetTemporal).
    const currentTargetTemporal = this.targetTemporal;
    if (currentTargetTemporal !== this.#previousTargetTemporal) {
      this.#previousTargetTemporal = currentTargetTemporal;
      this.setupTargetObserver();
    }

    if (this.tracksScrollRef.value && !this.scrollHandler) {
      this.setupScrollListener();
    } else if (!this.tracksScrollRef.value && this.scrollHandler) {
      this.removeScrollListener();
    }

    // Set up ResizeObserver when tracks-scroll element becomes available
    // This handles the case where timeline initially has no target (empty state)
    // and then gets a target after selection, causing tracks-scroll to be rendered
    if (this.tracksScrollRef.value && !this.resizeObserver) {
      this.setupResizeObserver();
      // Update timeline state to propagate the newly measured viewport width
      this.updateTimelineState();
    } else if (!this.tracksScrollRef.value && this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
  }

  private setupSelectionListener(): void {
    // Don't set up if already set up
    if (this.selectionChangeHandler) {
      return;
    }

    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => this.requestUpdate();
      (selectionCtx as any).addEventListener(
        "selectionchange",
        this.selectionChangeHandler,
      );
      // Request update immediately to catch initial selection
      this.requestUpdate();
    }

    // Also listen to activeroottemporalchange from canvas for more reliable updates
    const canvas = this.getCanvas();
    if (canvas && !this.canvasActiveRootTemporalChangeHandler) {
      this.canvasActiveRootTemporalChangeHandler = () => {
        this.requestUpdate();
      };
      canvas.addEventListener(
        "activeroottemporalchange",
        this.canvasActiveRootTemporalChangeHandler,
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
      this.selectionChangeHandler = undefined;
    }

    // Remove activeroottemporalchange listener
    const canvas = document.querySelector("ef-canvas");
    if (canvas && this.canvasActiveRootTemporalChangeHandler) {
      canvas.removeEventListener(
        "activeroottemporalchange",
        this.canvasActiveRootTemporalChangeHandler,
      );
      this.canvasActiveRootTemporalChangeHandler = undefined;
    }
  }

  private setupScrollListener(): void {
    if (this.tracksScrollRef.value) {
      this.scrollHandler = () => {
        if (this.tracksScrollRef.value) {
          const newScrollLeft = this.tracksScrollRef.value.scrollLeft;
          // Only update if scroll position actually changed
          if (newScrollLeft !== this.viewportScrollLeft) {
            this.viewportScrollLeft = newScrollLeft;
            // Update timeline state immediately to propagate to consumers
            this.updateTimelineState();
            // Save scroll position on scroll
            this.debouncedSaveTimelineState();
          }
        }
      };
      this.tracksScrollRef.value.addEventListener(
        "scroll",
        this.scrollHandler,
        { passive: true },
      );
      // Initialize scroll position
      this.scrollHandler();

      // Set up wheel listener for gestural zoom
      this.#wheelHandler = (e: WheelEvent) => this.handleWheel(e);
      this.tracksScrollRef.value.addEventListener("wheel", this.#wheelHandler, {
        passive: false,
      });
    }
  }

  private removeScrollListener(): void {
    if (this.tracksScrollRef.value) {
      if (this.scrollHandler) {
        this.tracksScrollRef.value.removeEventListener(
          "scroll",
          this.scrollHandler,
        );
      }
      if (this.#wheelHandler) {
        this.tracksScrollRef.value.removeEventListener(
          "wheel",
          this.#wheelHandler,
        );
        this.#wheelHandler = null;
      }
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
        // Skip time updates during thumbnail capture to prevent playhead jumping
        // Note: captureInProgress is a property that may exist on EFTimegroup
        const isCapturing = (this.targetTemporal as any).captureInProgress;
        if (!isCapturing) {
          const rawTime = this.targetTemporal.currentTimeMs ?? 0;
          const duration = this.targetTemporal.durationMs ?? 0;
          // Clamp time to valid range to prevent display issues
          const newTimeMs = Math.max(0, Math.min(rawTime, duration));

          // Update playhead position directly via DOM (bypasses Lit render cycle)
          this.updatePlayheadPositionDirect(newTimeMs);

          // Note: Playing state is now updated via subscription (subscribeToPlaybackController)
          // We still read it here as a fallback, but the subscription is the primary source
          // This ensures we catch state changes even if subscription hasn't been set up yet
          const newIsPlaying = this.targetTemporal.playing ?? false;
          const newIsLooping = this.targetTemporal.loop ?? false;

          // Only update if subscription hasn't already updated these values
          // This prevents race conditions between polling and subscription
          if (
            newIsPlaying !== this.isPlaying ||
            newIsLooping !== this.isLooping
          ) {
            // Only update if we don't have an active subscription (fallback mode)
            if (!this.#playbackSubscription) {
              const wasPlaying = this.isPlaying;
              this.isPlaying = newIsPlaying;
              this.isLooping = newIsLooping;

              // PERFORMANCE: When playback stops, force context update with current scroll
              // During playback, scroll-only changes don't trigger context updates (see updateTimelineState).
              // When stopping, we need to update context so consumers can do any deferred work.
              if (wasPlaying && !newIsPlaying) {
                // Force context update by calling updateTimelineState directly
                // (isPlaying is now false, so scroll changes will propagate)
                this.updateTimelineState();
              }
            }
          }

          // Update currentTimeMs for context consumers
          // - When NOT playing: always sync immediately (for seek responsiveness)
          // - When playing: throttle to 10fps to avoid cascading re-renders
          const now = performance.now();
          const shouldUpdateContext =
            !newIsPlaying ||
            now - this.lastContextUpdateTime >=
              EFTimeline.CONTEXT_UPDATE_INTERVAL_MS;

          if (shouldUpdateContext && this.currentTimeMs !== newTimeMs) {
            this.currentTimeMs = newTimeMs;
            this.lastContextUpdateTime = now;
          }

          // Auto-scroll to keep playhead visible (only when playing and not dragging)
          if (this.isPlaying && !this.isDraggingPlayhead) {
            this.followPlayhead(newTimeMs);
          } else {
            this.isFollowingPlayhead = false;
          }
        }
      } else {
        // Defensive check: if we were playing and lost targetTemporal, this is unexpected
        if (this.isPlaying) {
          console.warn(
            "[EFTimeline] Lost targetTemporal during playback. Stopping playback state.",
            "controlTarget:",
            this.controlTarget,
            "target:",
            this.target,
          );
          this.isPlaying = false;
          this.isLooping = false;
          // Force context update to notify consumers
          this.updateTimelineState();
        }
        // Continue polling to detect when target becomes available again
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }

  /**
   * Update playhead position directly via DOM manipulation.
   * This bypasses the Lit render cycle for smooth 60fps playhead movement.
   */
  private updatePlayheadPositionDirect(timeMs: number): void {
    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    const playheadPx = timeToPx(timeMs, this.pixelsPerMs);
    const playheadLeft = hierarchyWidth + playheadPx;

    // Update main playhead
    const playhead = this.playheadRef.value;
    if (playhead) {
      playhead.style.left = `${playheadLeft - 1}px`;
    }

    // Update ruler playhead handle
    const handle = this.playheadHandleRef.value;
    if (handle) {
      handle.style.left = `${playheadPx}px`;
    }

    // Update frame highlight if visible
    if (this.showFrameMarkers && this.durationMs > 0) {
      const frameHighlight = this.frameHighlightRef.value;
      if (frameHighlight) {
        const fps = this.fps;
        const frameDurationMs = 1000 / fps;
        const frameStartMs = quantizeToFrameTimeMs(timeMs, fps);
        const frameEndMs = Math.min(
          frameStartMs + frameDurationMs,
          this.durationMs,
        );
        const startPx = timeToPx(frameStartMs, this.pixelsPerMs);
        const widthPx = timeToPx(frameEndMs, this.pixelsPerMs) - startPx;

        if (widthPx > 0 && startPx >= 0) {
          frameHighlight.style.left = `${hierarchyWidth + startPx}px`;
          frameHighlight.style.width = `${widthPx}px`;
          frameHighlight.style.display = "block";
        } else {
          frameHighlight.style.display = "none";
        }
      }
    }
  }

  /**
   * Smooth playhead following - scrolls to keep playhead at a fixed screen position.
   * This eliminates jitter by scrolling exactly as much as the playhead moves.
   *
   * PERFORMANCE NOTE: We DO update viewportScrollLeft state here, but the context
   * cascade is prevented in updateTimelineState() during playback. This means:
   * - State stays in sync (for non-context consumers)
   * - But context consumers don't re-render during auto-scroll
   * - Components inside the scroll container scroll natively
   */
  private followPlayhead(currentTimeMs: number): void {
    const tracksScroll = this.tracksScrollRef.value;
    if (!tracksScroll) return;

    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    const playheadPx = timeToPx(currentTimeMs, this.pixelsPerMs);
    const viewportWidth = tracksScroll.clientWidth - hierarchyWidth;
    const maxScroll = tracksScroll.scrollWidth - tracksScroll.clientWidth;

    // Calculate where playhead is relative to visible area
    const playheadInViewport = playheadPx - tracksScroll.scrollLeft;
    const rightThreshold = viewportWidth - EFTimeline.PLAYHEAD_MARGIN;
    const leftThreshold = EFTimeline.PLAYHEAD_MARGIN;

    let newScrollLeft = tracksScroll.scrollLeft;
    let scrollChanged = false;

    if (this.isFollowingPlayhead) {
      // Already following - scroll by exactly the delta to keep playhead stationary on screen
      const delta = playheadPx - this.lastPlayheadPx;
      if (delta !== 0) {
        newScrollLeft = Math.max(
          0,
          Math.min(maxScroll, tracksScroll.scrollLeft + delta),
        );
        tracksScroll.scrollLeft = newScrollLeft;
        scrollChanged = true;
      }
    } else if (playheadInViewport > rightThreshold) {
      // Playhead reached right threshold - start following from this exact position (no snap)
      this.isFollowingPlayhead = true;
      // No scroll change - just start tracking from current position
    } else if (
      playheadInViewport < leftThreshold &&
      tracksScroll.scrollLeft > 0
    ) {
      // Playhead at left edge and we can scroll left - scroll to show more
      newScrollLeft = Math.max(0, playheadPx - leftThreshold);
      tracksScroll.scrollLeft = newScrollLeft;
      scrollChanged = true;
    }

    // Update state (context cascade is prevented during playback in updateTimelineState)
    if (scrollChanged && this.viewportScrollLeft !== newScrollLeft) {
      this.viewportScrollLeft = newScrollLeft;
    }

    this.lastPlayheadPx = playheadPx;
  }

  private stopTimeUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Subscribe to playback controller events for playing/loop state.
   * This avoids race conditions from polling when targetTemporal changes.
   */
  private subscribeToPlaybackController(): void {
    // Unsubscribe from previous controller
    this.unsubscribeFromPlaybackController();

    const temporal = this.targetTemporal;
    if (!temporal) {
      return;
    }

    // Wait for playbackController to be available if needed
    if (!temporal.playbackController) {
      (temporal as any).updateComplete?.then(() => {
        // Check again after async operation - temporal might have changed
        if (temporal === this.targetTemporal && temporal.playbackController) {
          this.#playbackSubscription = createDirectTemporalSubscription(
            temporal as TemporalMixinInterface & HTMLElement,
            {
              onPlayingChange: (value) => {
                // Only update if targetTemporal hasn't changed
                if (temporal === this.targetTemporal) {
                  const wasPlaying = this.isPlaying;
                  this.isPlaying = value;

                  // When stopping, force context update
                  if (wasPlaying && !value) {
                    this.updateTimelineState();
                  }
                }
              },
              onLoopChange: (value) => {
                if (temporal === this.targetTemporal) {
                  this.isLooping = value;
                }
              },
              onCurrentTimeMsChange: () => {
                // We still poll for currentTimeMs to update playhead smoothly
                // This callback is here for completeness but doesn't need to do anything
              },
              onDurationMsChange: () => {
                // Duration changes are handled via other mechanisms
              },
              onTargetTemporalChange: () => {
                // Not used here
              },
            },
          );
        }
      });
      return;
    }

    // Subscribe immediately if controller is available
    this.#playbackSubscription = createDirectTemporalSubscription(
      temporal as TemporalMixinInterface & HTMLElement,
      {
        onPlayingChange: (value) => {
          // Only update if targetTemporal hasn't changed
          if (temporal === this.targetTemporal) {
            const wasPlaying = this.isPlaying;
            this.isPlaying = value;

            // When stopping, force context update
            if (wasPlaying && !value) {
              this.updateTimelineState();
            }
          }
        },
        onLoopChange: (value) => {
          if (temporal === this.targetTemporal) {
            this.isLooping = value;
          }
        },
        onCurrentTimeMsChange: () => {
          // We still poll for currentTimeMs to update playhead smoothly
          // This callback is here for completeness but doesn't need to do anything
        },
        onDurationMsChange: () => {
          // Duration changes are handled via other mechanisms
        },
        onTargetTemporalChange: () => {
          // Not used here
        },
      },
    );
  }

  /**
   * Unsubscribe from playback controller events.
   */
  private unsubscribeFromPlaybackController(): void {
    if (this.#playbackSubscription) {
      this.#playbackSubscription.unsubscribe();
      this.#playbackSubscription = null;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handlePlay(): void {
    if (!this.targetTemporal) {
      console.warn(
        "[EFTimeline] Cannot play: targetTemporal is null. controlTarget:",
        this.controlTarget,
        "target:",
        this.target,
      );
      return;
    }
    this.targetTemporal.play();
  }

  private handlePause(): void {
    if (!this.targetTemporal) {
      console.warn(
        "[EFTimeline] Cannot pause: targetTemporal is null. controlTarget:",
        this.controlTarget,
        "target:",
        this.target,
      );
      return;
    }
    this.targetTemporal.pause();
  }

  private handleToggleLoop(): void {
    if (!this.targetTemporal) {
      console.warn(
        "[EFTimeline] Cannot toggle loop: targetTemporal is null. controlTarget:",
        this.controlTarget,
        "target:",
        this.target,
      );
      return;
    }
    this.targetTemporal.loop = !this.targetTemporal.loop;
    this.isLooping = this.targetTemporal.loop;
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
   * Handle wheel events for gestural zoom.
   * Cmd/Ctrl + wheel zooms toward the cursor position.
   * Without modifier, native scroll behavior is preserved.
   */
  private handleWheel(e: WheelEvent): void {
    const isZoom = e.metaKey || e.ctrlKey;

    if (!isZoom) {
      // Let native scroll handle it
      return;
    }

    // Prevent default to handle zoom ourselves
    e.preventDefault();
    e.stopPropagation();

    const tracksScroll = this.tracksScrollRef.value;
    if (!tracksScroll) return;

    const rect = tracksScroll.getBoundingClientRect();
    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;

    // Cursor X position relative to the track content area (excluding hierarchy)
    const cursorXInViewport = e.clientX - rect.left - hierarchyWidth;

    // If cursor is over the hierarchy panel, don't zoom
    if (cursorXInViewport < 0) return;

    // Calculate the time at cursor position before zoom
    const scrollLeft = tracksScroll.scrollLeft;
    const cursorXInContent = cursorXInViewport + scrollLeft;
    const timeAtCursor = pxToTime(cursorXInContent, this.pixelsPerMs);

    // Calculate zoom delta (same factor as EFPanZoom)
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const currentZoom = pixelsPerMsToZoom(this.pixelsPerMs);
    const newZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, currentZoom * zoomFactor),
    );
    const newPixelsPerMs = newZoom * DEFAULT_PIXELS_PER_MS;

    // Calculate new scroll position to keep timeAtCursor under the cursor
    const newCursorXInContent = timeToPx(timeAtCursor, newPixelsPerMs);
    const newScrollLeft = newCursorXInContent - cursorXInViewport;

    // Apply zoom
    this.pixelsPerMs = newPixelsPerMs;

    // Apply scroll position (clamp to valid range)
    const maxScroll = Math.max(
      0,
      timeToPx(this.durationMs, newPixelsPerMs) - (rect.width - hierarchyWidth),
    );
    tracksScroll.scrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft));
    this.viewportScrollLeft = tracksScroll.scrollLeft;

    // Update timeline state
    this.updateTimelineState();
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
    if (!this.targetTemporal) {
      console.warn(
        "[EFTimeline] Cannot seek: targetTemporal is null. controlTarget:",
        this.controlTarget,
        "target:",
        this.target,
      );
      return;
    }

    let seekTime = timeMs;

    // Quantize to frame boundaries when snapping is enabled
    if (snapToFrame && this.fps > 0) {
      seekTime = quantizeToFrameTimeMs(seekTime, this.fps);
    }

    // Clamp to valid range
    const clampedTime = Math.max(0, Math.min(seekTime, this.durationMs));

    this.targetTemporal.currentTimeMs = clampedTime;
    this.currentTimeMs = clampedTime;
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
    // Since ruler-content is inside scroll container and moves with scroll,
    // rect.left already accounts for scroll position. No need to add scrollLeft.
    const x = e.clientX - rect.left;
    const timeMs = pxToTime(x, this.pixelsPerMs);
    this.handleSeek(timeMs);
    this.startPlayheadDrag(e);
    e.preventDefault();
  }

  @eventOptions({ passive: false })
  private handlePlayheadPointerDown(e: PointerEvent): void {
    e.stopPropagation();
    this.startPlayheadDrag(e);
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
      const hierarchyWidth = this.showHierarchy
        ? EFTimeline.HIERARCHY_WIDTH
        : 0;
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
    // Update editing context to block hover interactions during scrubbing
    this._editingContext.setState({
      mode: "scrubbing",
      startTimeMs: this.currentTimeMs,
    });
    // Sync scroll state immediately to prevent offset
    const tracksScroll = this.tracksScrollRef.value;
    if (tracksScroll) {
      this.viewportScrollLeft = tracksScroll.scrollLeft;
    }
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
      trackAreaRight - trackAreaLeft;

      // Calculate distance from edges (relative to track area, not full scroll container)
      const distanceFromLeft = lastClientX - trackAreaLeft;
      const distanceFromRight = trackAreaRight - lastClientX;

      let scrollDelta = 0;

      if (
        distanceFromLeft < EFTimeline.EDGE_SCROLL_ZONE &&
        distanceFromLeft >= 0
      ) {
        // Near left edge - scroll left (faster as you get closer to edge)
        const intensity = 1 - distanceFromLeft / EFTimeline.EDGE_SCROLL_ZONE;
        scrollDelta = -EFTimeline.EDGE_SCROLL_SPEED * intensity;
      } else if (
        distanceFromRight < EFTimeline.EDGE_SCROLL_ZONE &&
        distanceFromRight >= 0
      ) {
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
        const newScrollLeft = Math.max(
          0,
          Math.min(maxScroll, tracksScroll.scrollLeft + scrollDelta),
        );
        tracksScroll.scrollLeft = newScrollLeft;
        this.viewportScrollLeft = newScrollLeft; // Sync immediately

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
      // Reset editing context to allow hover interactions again
      this._editingContext.setState({ mode: "idle" });
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
            ? html`<button class="control-btn" @click=${this.handlePause} title="Pause">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="4" y="3" width="3" height="10" rx="0.5"/>
                  <rect x="9" y="3" width="3" height="10" rx="0.5"/>
                </svg>
              </button>`
            : html`<button class="control-btn" @click=${this.handlePlay} title="Play">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 3.5v9l7-4.5z"/>
                </svg>
              </button>`
        }
        <button class="control-btn ${this.isLooping ? "active" : ""}" @click=${this.handleToggleLoop} title="Loop">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 7.5H4.707l2.147-2.146a.5.5 0 0 0-.708-.708l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708-.708L4.707 8.5H13.5a1.5 1.5 0 0 1 0 3h-2a.5.5 0 0 0 0 1h2a2.5 2.5 0 0 0 0-5z"/>
            <path d="M2.5 8.5a1.5 1.5 0 0 1 1.5-1.5h2a.5.5 0 0 0 0-1H4a2.5 2.5 0 0 0 0 5h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.793 9.5H4a1.5 1.5 0 0 1-1.5-1.5z"/>
          </svg>
        </button>
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
   * Only rendered when frame markers are visible (zoom level high enough).
   */
  private renderFrameHighlight() {
    // Only render when frame markers should be visible
    if (!this.showFrameMarkers) {
      return nothing;
    }

    const bounds = this.calculateFrameHighlightBounds();
    if (!bounds) return nothing;

    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;

    return html`
      <div 
        ${ref(this.frameHighlightRef)}
        class="frame-highlight" 
        style=${styleMap({
          left: `${hierarchyWidth + bounds.startPx}px`,
          width: `${bounds.widthPx}px`,
        })}
      ></div>
    `;
  }

  private renderControls() {
    if (!this.showControls) return nothing;
    return html`
      <div class="header" part="header">
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
    const { elementId, value } = e.detail;
    const element = this.targetElement?.querySelector(
      `#${elementId}`,
    ) as TemporalMixinInterface & HTMLElement;
    if (element) {
      element.trimStartMs = value.startMs;
      element.trimEndMs = value.endMs;
    }
  }

  /**
   * Handle row hover events - update canvas highlighted element.
   */
  private handleRowHover(e: CustomEvent<{ element: Element | null }>): void {
    // Update canvas highlight (source of truth)
    this.setHighlightedElement(e.detail.element as HTMLElement | null);
  }

  /**
   * Handle row selection events - update selection context.
   */
  private handleRowSelect(
    e: CustomEvent<{ elementId: string; element: Element }>,
  ): void {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && e.detail.elementId) {
      selectionCtx.select(e.detail.elementId);
    }
  }

  /**
   * Render timeline rows using flattened hierarchy.
   * Each row is a unified component with both label and track.
   */
  private renderRows(
    target: TemporalMixinInterface & HTMLElement,
  ): TemplateResult {
    const rows = flattenHierarchy(
      target as unknown as TemporalMixinInterface & Element,
    ).filter((row) =>
      shouldRenderElement(row.element, this.hideSelectors, this.showSelectors),
    );

    const selectionCtx = this.getCanvasSelectionContext();
    // Create new Set to break reference equality - ensures Lit detects changes
    const selectedIds = new Set(selectionCtx?.selectedIds ?? []);
    const highlightedElement = this.getHighlightedElement();

    return html`
      <div
        class="tracks-rows"
        @track-trim-change=${this.handleTrimChange}
        @row-hover=${this.handleRowHover}
        @row-select=${this.handleRowSelect}
      >
        ${repeat(
          rows,
          // Key function: use element ID or element itself for stable identity
          (row) => {
            const el = row.element as unknown as HTMLElement;
            return el && el.id ? el.id : row.element;
          },
          (row) => html`
            <ef-timeline-row
              .element=${row.element}
              depth=${row.depth}
              pixels-per-ms=${this.pixelsPerMs}
              ?enable-trim=${this.enableTrim}
              ?hide-label=${!this.showHierarchy}
              .hideSelectors=${this.hideSelectors}
              .showSelectors=${this.showSelectors}
              .highlightedElement=${highlightedElement}
              .selectedIds=${selectedIds}
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

    const hierarchyWidth = this.showHierarchy ? EFTimeline.HIERARCHY_WIDTH : 0;
    // Playhead position includes hierarchy offset since it's inside scroll container
    const playheadLeft = hierarchyWidth + playheadPx;

    return html`
      <div class="timeline-container" tabindex="0" ${ref(this.containerRef)}>
        ${this.renderControls()}
        <div class="timeline-area">
          <!-- Tracks Viewport - Single scrollable container -->
          <div class="tracks-viewport" part="tracks">
            <div 
              class="tracks-scroll" 
              ${ref(this.tracksScrollRef)} 
              @pointerdown=${this.handleTracksPointerDown}
            >
              <!-- Ruler Row - Inside scroll container with sticky positioning -->
              ${
                this.showRuler
                  ? html`
                <div class="ruler-row" style="width: ${this.contentWidthPx + hierarchyWidth}px;">
                  ${this.showHierarchy ? html`<div class="ruler-spacer"></div>` : nothing}
                  <div 
                    class="ruler-content"
                    part="ruler"
                    @pointerdown=${this.handleRulerPointerDown}
                  >
                    <ef-timeline-ruler
                      duration-ms=${this.durationMs}
                      fps=${this.fps}
                      content-width=${this.contentWidthPx}
                    ></ef-timeline-ruler>
                    ${
                      this.showPlayhead
                        ? html`
                      <div 
                        ${ref(this.playheadHandleRef)}
                        class="ruler-playhead-handle" 
                        style="left: ${playheadPx}px;"
                        @pointerdown=${this.handlePlayheadPointerDown}
                      ></div>
                    `
                        : nothing
                    }
                  </div>
                </div>
              `
                  : nothing
              }
              <div class="tracks-content" style="min-width: ${this.contentWidthPx + hierarchyWidth}px;">
                <!-- Track rows layer -->
                <div class="tracks-rows-layer">
                  ${this.renderRows(target as unknown as TemporalMixinInterface & HTMLElement)}
                </div>
                
                <!-- Playhead layer - sticky to stay visible during vertical scroll -->
                <div class="playhead-layer">
                  ${this.renderFrameHighlight()}
                  ${
                    this.showPlayhead
                      ? html`
                    <div ${ref(this.playheadRef)} class="playhead" part="playhead" style="left: ${playheadLeft - 1}px;">
                      <div class="playhead-drag-target" @pointerdown=${this.handlePlayheadPointerDown}></div>
                    </div>
                  `
                      : nothing
                  }
                </div>
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
