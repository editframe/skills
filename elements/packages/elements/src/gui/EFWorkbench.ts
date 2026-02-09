import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

import { ContextMixin } from "./ContextMixin.js";
import { TWMixin } from "./TWMixin.js";
import { EFTimegroup } from "../elements/EFTimegroup.js";
import { findRootTemporal } from "../elements/findRootTemporal.js";
// Import only types - actual functions loaded dynamically to avoid SSR issues
import type { CanvasPreviewResult } from "../preview/renderTimegroupToCanvas.types.js";
import type { RenderToVideoOptions, RenderProgress } from "../preview/renderTimegroupToVideo.types.js";
import { updateAnimations } from "../elements/updateAnimations.js";
import { 
  isNativeCanvasApiAvailable, 
  getPreviewPresentationMode,
  setPreviewPresentationMode,
  type PreviewPresentationMode,
  getRenderMode,
  setRenderMode,
  type RenderMode,
  getPreviewResolutionScale,
  setPreviewResolutionScale,
  type PreviewResolutionScale,
  getShowStats,
  getShowThumbnailTimestamps,
  setShowThumbnailTimestamps,
  onPreviewSettingsChanged,
} from "../preview/previewSettings.js";
import { setShowStats } from "../preview/previewSettings.js";
import { AdaptiveResolutionTracker } from "../preview/AdaptiveResolutionTracker.js";
import { RenderStats, type PlaybackStats } from "../preview/RenderStats.js";
import { DomStatsStrategy } from "../preview/statsTrackingStrategy.js";
import { provide } from "@lit/context";
import { previewSettingsContext, type PreviewSettings } from "./previewSettingsContext.js";
import { phosphorIcon, ICONS } from "./icons.js";

// Side-effect import for template usage (pan-zoom is created in light DOM by wrapWithWorkbench)
import "./EFFitScale.js";

/** Debounce delay before considering the preview "at rest" after motion stops */
const REST_DEBOUNCE_MS = 200;

@customElement("ef-workbench")
export class EFWorkbench extends ContextMixin(TWMixin(LitElement)) {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        
        /* Component tokens (reference globals from ef-theme.css) */
        --workbench-bg: var(--ef-color-bg);
        --workbench-overlay-border: var(--ef-color-primary);
        --workbench-overlay-bg: var(--ef-color-primary-subtle);
        --toolbar-bg: var(--ef-color-bg-elevated);
        --toolbar-border: var(--ef-color-border-subtle);
      }
      
      /* Utility classes (not relying on external Tailwind) */
      .grid {
        display: grid;
      }
      
      .overflow-hidden {
        overflow: hidden;
      }
      
      .fixed {
        position: fixed;
      }
      
      .inset-0 {
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
      }
      
      .h-full {
        height: 100%;
      }
      
      .w-full {
        width: 100%;
      }
      
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        background: var(--toolbar-bg);
        border-bottom: 1px solid var(--toolbar-border);
        flex-shrink: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        position: relative;
        z-index: 20;
      }
      
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border-subtle);
        border-radius: 6px;
        color: var(--ef-color-text);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .toolbar-btn:hover {
        background: var(--ef-color-hover);
        border-color: var(--ef-color-border);
      }
      
      .toolbar-btn.active {
        background: var(--ef-color-primary-subtle);
        border-color: var(--ef-color-primary);
        color: var(--ef-color-primary-hover);
      }
      
      .toolbar-btn.primary {
        background: var(--ef-color-primary);
        border-color: transparent;
        color: white;
        font-weight: 600;
      }
      
      .toolbar-btn.primary:hover {
        background: var(--ef-color-primary-hover);
      }
      
      .toolbar-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border-subtle);
        border-radius: 6px;
        color: var(--ef-color-text);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .toolbar-icon-btn:hover {
        background: var(--ef-color-hover);
        border-color: var(--ef-color-border);
      }
      
      .toolbar-icon-btn.active {
        background: var(--ef-color-primary-subtle);
        border-color: var(--ef-color-primary);
        color: var(--ef-color-primary-hover);
      }
      
      .mode-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
      
      .mode-indicator.dom {
        background: color-mix(in srgb, var(--ef-color-success) 15%, transparent);
        color: var(--ef-color-success);
        border: 1px solid color-mix(in srgb, var(--ef-color-success) 30%, transparent);
      }
      
      .mode-indicator.canvas {
        background: color-mix(in srgb, var(--ef-color-type-image) 15%, transparent);
        color: var(--ef-color-type-image);
        border: 1px solid color-mix(in srgb, var(--ef-color-type-image) 30%, transparent);
      }
      
      .canvas-container {
        position: relative;
        overflow: hidden;
        flex: 1;
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: 100%;
        min-height: 0;
        background: var(--ef-color-bg);
      }
      
      .canvas-container ::slotted(*) {
        width: 100%;
        height: 100%;
        grid-column: 1;
        grid-row: 1;
      }
      
      .canvas-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
      }
      
      .clone-content {
        position: absolute;
        transform-origin: 0 0;
      }
      
      .playback-stats {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 200px;
        background: color-mix(in srgb, var(--ef-color-bg-elevated) 90%, transparent);
        backdrop-filter: blur(4px);
        border-radius: 6px;
        padding: 8px 12px;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        font-size: 11px;
        color: var(--ef-color-text);
        z-index: 10;
        pointer-events: none;
        line-height: 1.5;
      }
      
      .playback-stats .stat-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      
      .playback-stats .stat-label {
        color: var(--ef-color-text-muted);
        flex-shrink: 0;
        width: 85px;
      }
      
      .playback-stats .stat-value {
        font-weight: 600;
        text-align: right;
        flex: 1;
        font-variant-numeric: tabular-nums;
      }
      
      .playback-stats .stat-value.good {
        color: var(--ef-color-success);
      }
      
      .playback-stats .stat-value.warning {
        color: var(--ef-color-warning);
      }
      
      .playback-stats .stat-value.bad {
        color: var(--ef-color-danger);
      }
      
      .pressure-histogram {
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 24px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--ef-color-border-subtle);
      }
      
      .pressure-histogram .bar {
        flex: 1;
        min-width: 2px;
        max-width: 4px;
        border-radius: 1px 1px 0 0;
        transition: height 0.1s ease-out;
      }
      
      .pressure-histogram .bar.nominal {
        background: var(--ef-color-success);
        height: 25%;
      }
      
      .pressure-histogram .bar.fair {
        background: var(--ef-color-warning);
        height: 50%;
      }
      
      .pressure-histogram .bar.serious {
        background: var(--ef-color-warning);
        height: 75%;
      }
      
      .pressure-histogram .bar.critical {
        background: var(--ef-color-danger);
        height: 100%;
      }
      
      .pressure-histogram-label {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 9px;
        color: var(--ef-color-text-subtle);
      }
      
      .dropdown-panel {
        position: fixed;
        margin: 0;
        padding: 14px 16px;
        min-width: 260px;
        max-width: calc(100vw - 32px);
        background: var(--ef-color-bg-elevated);
        border: 1px solid var(--ef-color-border);
        border-radius: 10px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px color-mix(in srgb, var(--ef-color-bg) 50%, transparent);
      }
      
      .dropdown-panel::backdrop {
        background: transparent;
      }
      
      .dropdown-panel:popover-open {
        /* Animation for opening */
        animation: popover-fade-in 0.15s ease-out;
      }
      
      @keyframes popover-fade-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--ef-color-border-subtle);
      }
      
      .dropdown-title {
        color: var(--ef-color-text);
        font-size: 13px;
        font-weight: 600;
      }
      
      .dropdown-close {
        background: transparent;
        border: none;
        color: var(--ef-color-text-subtle);
        cursor: pointer;
      }
      
      .dropdown-section {
        background: var(--ef-color-bg-inset);
        border-radius: 8px;
        padding: 12px;
        margin-top: 10px;
      }
      
      .dropdown-label {
        color: var(--ef-color-text);
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      
      .dropdown-description {
        margin-top: 8px;
        color: var(--ef-color-text-subtle);
        font-size: 10px;
        line-height: 1.4;
      }
      
      .button-group {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }
      
      .button-group-btn {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        background: transparent;
        color: var(--ef-color-text-muted);
      }
      
      .button-group-btn.active {
        background: var(--ef-color-selected);
        color: var(--ef-color-primary);
        border-color: var(--ef-color-primary-subtle);
      }
      
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      
      .checkbox-label input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: var(--ef-color-primary);
        cursor: pointer;
      }
      
      .checkbox-label span {
        color: var(--ef-color-text);
        font-size: 12px;
        font-weight: 500;
      }
      
      .dropdown-select {
        width: 100%;
        padding: 6px 8px;
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border);
        border-radius: 6px;
        color: var(--ef-color-text);
        font-size: 11px;
        cursor: pointer;
      }
      
      .dropdown-input {
        width: 100%;
        padding: 5px 7px;
        background: var(--ef-color-bg-inset);
        border: 1px solid var(--ef-color-border);
        border-radius: 4px;
        color: var(--ef-color-text);
        font-size: 11px;
      }
      
      .dropdown-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        padding: 2px;
        line-height: 1;
        font-size: 14px;
        transition: color 0.15s;
      }
      
      .dropdown-close:hover {
        color: var(--ef-color-text-muted);
      }
    `,
  ];

  @property({ type: Boolean })
  rendering = false;
  
  @state()
  private panZoomTransform = { x: 0, y: 0, scale: 1 };
  
  @state()
  private isExporting = false;
  
  @state()
  private exportProgress: RenderProgress | null = null;
  
  @state()
  private exportStatus: "idle" | "rendering" | "complete" | "error" | "cancelled" = "idle";
  
  
  @provide({ context: previewSettingsContext })
  @state()
  private previewSettings: PreviewSettings = {
    presentationMode: getPreviewPresentationMode(),
    renderMode: getRenderMode(),
    resolutionScale: getPreviewResolutionScale(),
    showStats: getShowStats(),
    showThumbnailTimestamps: getShowThumbnailTimestamps(),
  };
  
  // Local state mirrors for direct access (context is primary source of truth)
  @state()
  private renderMode: RenderMode = this.previewSettings.renderMode;
  
  @state()
  private presentationMode: PreviewPresentationMode = this.previewSettings.presentationMode;
  
  @state()
  private previewResolutionScale: PreviewResolutionScale = this.previewSettings.resolutionScale;
  
  @state()
  private exportOptions = {
    includeAudio: true,
    scale: 1,
    useInOut: false,
    inMs: 0,
    outMs: 0,
  };
  
  private exportAbortController: AbortController | null = null;
  
  // Motion state tracking for adaptive resolution
  @state()
  private isPlaying = false;
  
  @state()
  private isScrubbing = false;
  
  @state()
  private isAtRest = true;
  
  /**
   * Current adaptive resolution scale (only used when previewResolutionScale === "auto")
   */
  @state()
  private currentAdaptiveScale: number = 1;
  
  /**
   * Playback stats for display (FPS, dropped frames, etc.)
   * Mirrors previewSettings.showStats for direct access
   */
  @state()
  private showStats: boolean = this.previewSettings.showStats;
  
  /**
   * Theme mode: 'light', 'dark', or 'system'
   */
  @state()
  private themeMode: 'light' | 'dark' | 'system' = this.getInitialTheme();
  
  /**
   * Always-on render statistics collection for canvas mode.
   * Collects data regardless of whether stats are visible.
   */
  private renderStats: RenderStats | null = null;
  
  /**
   * Media query for system theme preference
   */
  private systemThemeMediaQuery: MediaQueryList | null = null;
  private systemThemeListener: (() => void) | null = null;
  
  /**
   * DOM mode stats strategy (has its own animation loop).
   * Only active in DOM mode.
   */
  private domStatsStrategy: DomStatsStrategy | null = null;
  
  /**
   * Reference for tracking scrubbing state from EFScrubber.
   * Pass this to <ef-scrubber isScrubbingRef={...}> to enable motion detection.
   */
  readonly isScrubbingRef = { current: false };
  
  private restDebounceTimer: number | null = null;
  private playingCheckInterval: number | null = null;
  private adaptiveTracker: AdaptiveResolutionTracker | null = null;
  private savePanZoomDebounceTimer: number | null = null;
  
  
  // Canvas renderer (kept for thumbnail generation, not displayed)
  private canvasRefresh: (() => Promise<void>) | null = null;
  
  // Canvas preview mode state
  private canvasPreviewRef = createRef<HTMLDivElement>();
  private canvasPreviewResult: CanvasPreviewResult | null = null;
  private canvasAnimationFrame: number | null = null;
  
  private boundHandleTransformChanged = this.handleTransformChanged.bind(this);

  focusOverlay = createRef<HTMLDivElement>();

  @eventOptions({ passive: false, capture: true })
  handleStageWheel(event: WheelEvent) {
    event.preventDefault();
  }

  connectedCallback(): void {
    super.connectedCallback();
    
    // Apply initial theme
    this.applyTheme();
    
    // Check if we're in rendering mode and set rendering=true before first render
    if (!this.hasAttribute("rendering") && typeof window !== "undefined" && "FRAMEGEN_BRIDGE" in window) {
      this.rendering = true;
    }
    
    // Listen for pan-zoom transform changes
    this.addEventListener("transform-changed", this.boundHandleTransformChanged as EventListener);
    
    // Start motion state polling (checks playing state and scrubbing ref)
    this.startMotionStateTracking();
    
    // Initialize adaptive tracker
    // Scale changes directly update the canvas resolution - no expensive reinit needed
    this.adaptiveTracker = new AdaptiveResolutionTracker({
      onScaleChange: (scale) => {
        const oldScale = this.currentAdaptiveScale;
        this.currentAdaptiveScale = scale;
        
        // Directly update resolution if in auto mode, canvas mode, and in motion
        if (this.previewResolutionScale === "auto" && this.presentationMode === "canvas" && !this.isAtRest) {
          // Use the new dynamic setResolutionScale - instant, no DOM rebuild
          if (this.canvasPreviewResult) {
            this.canvasPreviewResult.setResolutionScale(scale);
            console.log(`[EFWorkbench] Resolution changed ${(oldScale * 100).toFixed(0)}% → ${(scale * 100).toFixed(0)}% (instant)`);
          }
        }
      },
    });
    
    // Initialize render stats (always-on collection)
    this.renderStats = new RenderStats(this.adaptiveTracker);
    
    // Listen for system theme changes when in system mode
    if (typeof window !== 'undefined') {
      this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemThemeListener = () => {
        if (this.themeMode === 'system') {
          this.applyTheme();
        }
      };
      this.systemThemeMediaQuery.addEventListener('change', this.systemThemeListener);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    
    // Clean up current mode
    if (this.presentationMode === "dom") {
      this.stopDomMode();
    } else if (this.presentationMode === "canvas") {
      this.stopCanvasMode();
    }
    
    // Restore timegroup visibility
    const timegroup = this.getTimegroup();
    if (timegroup) {
      timegroup.style.clipPath = "";
      timegroup.style.pointerEvents = "";
    }
    
    this.removeEventListener("transform-changed", this.boundHandleTransformChanged as EventListener);
    
    // Clean up theme listener
    if (this.systemThemeMediaQuery && this.systemThemeListener) {
      this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
    }
    
    // Clean up motion state tracking
    this.stopMotionStateTracking();
    
    // Clean up cache stats updates
    this.stopCacheStatsUpdates();
    
    // Clean up adaptive tracker
    if (this.adaptiveTracker) {
      this.adaptiveTracker.dispose();
      this.adaptiveTracker = null;
    }
    
    // Save pan/zoom state before disconnecting
    if (this.savePanZoomDebounceTimer !== null) {
      clearTimeout(this.savePanZoomDebounceTimer);
      this.savePanZoomDebounceTimer = null;
    }
    this.savePreviewPanZoom();
  }
  
  protected firstUpdated(): void {
    // Restore preview pan/zoom from localStorage
    // Wait for timegroup to be available
    requestAnimationFrame(() => {
      this.restorePreviewPanZoom();
    });
    
    // Wait for Lit to complete initial render and layout before initializing preview
    // This ensures workbench dimensions are available for resolution calculation
    this.updateComplete.then(() => {
      
      // Initialize based on current presentation mode
      if (this.presentationMode === "dom") {
        this.initDomMode();
      } else if (this.presentationMode === "canvas") {
        this.initCanvasMode();
      }
    });
  }
  
  // Track zoom for detecting changes that need canvas reinit
  private lastCanvasZoom = 1;
  private zoomReinitTimeout: number | null = null;
  
  private handleTransformChanged(e: CustomEvent<{ x: number; y: number; scale: number }>) {
    this.panZoomTransform = e.detail;
    
    // Save pan/zoom state to localStorage
    this.debouncedSavePreviewPanZoom();
    
    // Update overlay transform based on current mode
    if (this.presentationMode === "canvas") {
      this.updateCanvasTransform();
      
      // Check if zoom changed enough to warrant re-rendering at new resolution
      // Only update if zoom changed by >25% from last init
      const zoomRatio = e.detail.scale / this.lastCanvasZoom;
      if (zoomRatio < 0.75 || zoomRatio > 1.33) {
        // Debounce to avoid thrashing during zoom gestures
        if (this.zoomReinitTimeout !== null) {
          clearTimeout(this.zoomReinitTimeout);
        }
        this.zoomReinitTimeout = window.setTimeout(() => {
          this.zoomReinitTimeout = null;
          if (this.presentationMode === "canvas" && this.canvasPreviewResult) {
            this.lastCanvasZoom = this.panZoomTransform.scale;
            
            // Dynamically update resolution scale without recreating canvas
            const timegroup = this.getTimegroup();
            const canvasContainer = this.canvasPreviewRef.value;
            if (timegroup && canvasContainer) {
              const newScale = this.previewResolutionScale === "auto"
                ? this.getEffectiveResolutionScale(timegroup, canvasContainer)
                : this.getResolutionScale(timegroup, canvasContainer);
              
              this.canvasPreviewResult.setResolutionScale(newScale);
            }
          }
        }, 500); // Wait 500ms after zoom stops
      }
    }
  }
  
  private getTimegroup(): EFTimegroup | null {
    // Find the timegroup in our canvas slot
    const canvas = this.querySelector("[slot='canvas']");
    if (!canvas) return null;
    return canvas.querySelector("ef-timegroup") as EFTimegroup | null;
  }

  /**
   * Get the root timegroup ID for localStorage key generation.
   * Returns null if no root timegroup is found or it has no ID.
   */
  private getRootTimegroupId(): string | null {
    const timegroup = this.getTimegroup();
    if (!timegroup) return null;
    
    const rootTemporal = findRootTemporal(timegroup);
    if (rootTemporal instanceof EFTimegroup && rootTemporal.id) {
      return rootTemporal.id;
    }
    
    return null;
  }

  /**
   * Get localStorage key for preview pan/zoom state.
   */
  private getPreviewPanZoomStorageKey(): string | null {
    const rootId = this.getRootTimegroupId();
    return rootId ? `ef-workbench-panzoom-${rootId}` : null;
  }

  /**
   * Save preview pan/zoom to localStorage.
   */
  private savePreviewPanZoom(): void {
    const storageKey = this.getPreviewPanZoomStorageKey();
    if (!storageKey) return;

    try {
      const state = {
        x: this.panZoomTransform.x,
        y: this.panZoomTransform.y,
        scale: this.panZoomTransform.scale,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save preview pan/zoom to localStorage", error);
    }
  }

  /**
   * Restore preview pan/zoom from localStorage.
   */
  private restorePreviewPanZoom(): void {
    const storageKey = this.getPreviewPanZoomStorageKey();
    if (!storageKey) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;

      const state = JSON.parse(stored);
      if (
        typeof state.x === "number" &&
        typeof state.y === "number" &&
        typeof state.scale === "number" &&
        state.scale > 0
      ) {
        // Clamp scale to valid range [0.1, 5]
        const clampedScale = Math.max(0.1, Math.min(5, state.scale));
        this.panZoomTransform = {
          x: state.x,
          y: state.y,
          scale: clampedScale,
        };
        
        // Apply transform to pan-zoom element if it exists
        requestAnimationFrame(() => {
          const panZoomElement = this.querySelector("ef-pan-zoom");
          if (panZoomElement) {
            (panZoomElement as any).x = this.panZoomTransform.x;
            (panZoomElement as any).y = this.panZoomTransform.y;
            (panZoomElement as any).scale = this.panZoomTransform.scale;
          }
          
          // Update transforms based on current mode
          if (this.presentationMode === "canvas") {
            this.updateCanvasTransform();
          }
        });
      }
    } catch (error) {
      console.warn("Failed to restore preview pan/zoom from localStorage", error);
    }
  }

  /**
   * Debounced save of preview pan/zoom to avoid excessive localStorage writes.
   */
  private debouncedSavePreviewPanZoom(): void {
    if (this.savePanZoomDebounceTimer !== null) {
      clearTimeout(this.savePanZoomDebounceTimer);
    }
    this.savePanZoomDebounceTimer = window.setTimeout(() => {
      this.savePanZoomDebounceTimer = null;
      this.savePreviewPanZoom();
    }, 200);
  }
  
  // ==================== Motion State Detection ====================
  
  /**
   * Start polling for motion state (playing/scrubbing).
   * We use polling because:
   * - Playing state comes from timegroup's playbackController
   * - Scrubbing state comes from isScrubbingRef (set by EFScrubber)
   */
  private startMotionStateTracking(): void {
    if (this.playingCheckInterval !== null) return;
    
    this.playingCheckInterval = window.setInterval(() => {
      this.updateMotionState();
    }, 50); // Check every 50ms for responsive motion detection
  }
  
  private stopMotionStateTracking(): void {
    if (this.playingCheckInterval !== null) {
      clearInterval(this.playingCheckInterval);
      this.playingCheckInterval = null;
    }
    if (this.restDebounceTimer !== null) {
      clearTimeout(this.restDebounceTimer);
      this.restDebounceTimer = null;
    }
  }
  
  /**
   * Update motion state by checking timegroup and scrubbing ref.
   */
  private updateMotionState(): void {
    const timegroup = this.getTimegroup();
    const wasPlaying = this.isPlaying;
    const wasScrubbing = this.isScrubbing;
    
    // Check playing state from timegroup
    this.isPlaying = timegroup?.playing ?? false;
    
    // Check scrubbing state from ref
    this.isScrubbing = this.isScrubbingRef.current;
    
    const wasInMotion = wasPlaying || wasScrubbing;
    const isInMotion = this.isPlaying || this.isScrubbing;
    
    // Handle motion state transitions
    if (isInMotion && !wasInMotion) {
      // Started moving - immediately mark as not at rest
      this.handleMotionStart();
    } else if (!isInMotion && wasInMotion) {
      // Stopped moving - start debounce timer for rest
      this.handleMotionStop();
    }
  }
  
  /**
   * Called when motion starts (playing or scrubbing began).
   */
  private handleMotionStart(): void {
    // Cancel any pending rest transition
    if (this.restDebounceTimer !== null) {
      clearTimeout(this.restDebounceTimer);
      this.restDebounceTimer = null;
    }

    // Mark as in motion immediately
    this.isAtRest = false;

    // For auto mode, initialize the tracker at the current display scale
    // so it doesn't have to step down from 100% to reach it.
    if (this.previewResolutionScale === "auto" && this.adaptiveTracker) {
      const timegroup = this.getTimegroup();
      if (timegroup) {
        const compositionWidth = timegroup.offsetWidth || 1920;
        const compositionHeight = timegroup.offsetHeight || 1080;
        const rect = timegroup.getBoundingClientRect();
        const displayScale = Math.min(
          rect.width / compositionWidth,
          rect.height / compositionHeight
        );

        // Initialize tracker at display scale so it can immediately start
        // scaling down if there are performance issues
        this.adaptiveTracker.initializeAtScale(displayScale);
        this.currentAdaptiveScale = this.adaptiveTracker.getRecommendedScale();

        // Set canvas to the initial adaptive scale (instant - no rebuild)
        if (this.canvasPreviewResult) {
          this.canvasPreviewResult.setResolutionScale(this.currentAdaptiveScale);
        }

        console.log(`[EFWorkbench] Motion started, set resolution to ${(this.currentAdaptiveScale * 100).toFixed(0)}% (displayScale=${(displayScale * 100).toFixed(0)}%)`);
      }
    }

    console.log(`[EFWorkbench] Motion started (playing=${this.isPlaying}, scrubbing=${this.isScrubbing})`);
  }
  
  /**
   * Called when motion stops (not playing and not scrubbing).
   * Starts a debounce timer before transitioning to rest state.
   */
  private handleMotionStop(): void {
    // Start debounce timer
    if (this.restDebounceTimer !== null) {
      clearTimeout(this.restDebounceTimer);
    }
    
    this.restDebounceTimer = window.setTimeout(() => {
      this.restDebounceTimer = null;
      this.transitionToRest();
    }, REST_DEBOUNCE_MS);
  }
  
  /**
   * Called after debounce period when we're confirmed to be at rest.
   */
  private transitionToRest(): void {
    this.isAtRest = true;

    // If in auto mode, set full resolution (instant - no rebuild needed)
    if (this.previewResolutionScale === "auto" && this.presentationMode === "canvas") {
      // Reset tracker and set full resolution
      this.adaptiveTracker?.reset();
      this.currentAdaptiveScale = 1;
      
      // Use instant resolution change - no DOM rebuild
      if (this.canvasPreviewResult) {
        this.canvasPreviewResult.setResolutionScale(1);
        console.log("[EFWorkbench] Set full resolution for rest state (instant)");
      }
    }
  }
  
  /**
   * Get the effective resolution scale based on current mode and motion state.
   * For "auto" mode, returns full resolution at rest, adaptive scale in motion.
   */
  private getEffectiveResolutionScale(timegroup: EFTimegroup, canvasContainer: HTMLElement): number {
    // For non-auto modes, use the existing logic
    if (this.previewResolutionScale !== "auto") {
      return this.getResolutionScale(timegroup, canvasContainer);
    }
    
    // Auto mode: full resolution at rest, adaptive in motion
    const compositionWidth = timegroup.offsetWidth || 1920;
    const compositionHeight = timegroup.offsetHeight || 1080;
    const rect = timegroup.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    const displayScale = Math.min(
      displayedWidth / compositionWidth,
      displayedHeight / compositionHeight
    );
    
    if (this.isAtRest) {
      // At rest: use display scale (full resolution for current display size)
      const scale = Math.max(0.1, Math.min(1, displayScale));
      console.log(`[EFWorkbench] Auto mode (at rest): using display scale ${(scale * 100).toFixed(1)}%`);
      return scale;
    } else {
      // In motion: use adaptive scale (may be reduced to prevent dropped frames)
      const adaptiveScale = this.currentAdaptiveScale;
      const targetScale = Math.min(displayScale, adaptiveScale);
      const scale = Math.max(0.1, Math.min(1, targetScale));
      console.log(`[EFWorkbench] Auto mode (in motion): adaptive=${adaptiveScale}, display=${displayScale.toFixed(2)}, final=${(scale * 100).toFixed(1)}%`);
      return scale;
    }
  }
  
  
  /**
   * Apply settings when dependencies are ready.
   * Called from updated() hook when settings change or dependencies become available.
   */
  private applySettings(): void {
    // Sync local state from context (for direct property access)
    this.presentationMode = this.previewSettings.presentationMode;
    this.renderMode = this.previewSettings.renderMode;
    this.previewResolutionScale = this.previewSettings.resolutionScale;
    this.showStats = this.previewSettings.showStats;
  }
  
  // ==================== End Motion State Detection ====================
  
  
  private async handlePresentationModeChange(mode: PreviewPresentationMode) {
    if (mode === this.presentationMode) return;
    
    const previousMode = this.presentationMode;
    
    // Stop previous mode (this will stop stats strategy)
    if (previousMode === "dom") {
      this.stopDomMode();
    } else if (previousMode === "canvas") {
      this.stopCanvasMode();
    }
    
    // Update context and persist
    setPreviewPresentationMode(mode);
    this.previewSettings = { ...this.previewSettings, presentationMode: mode };
    
    // Wait for Lit to re-render (removes old overlay, adds new one if needed)
    await this.updateComplete;
    
    // Start new mode after DOM is updated
    if (mode === "dom") {
      this.initDomMode();
    } else if (mode === "canvas") {
      this.initCanvasMode();
    }
  }
  
  private initDomMode() {
    // Don't initialize if we're no longer in dom mode
    if (this.presentationMode !== "dom") return;
    
    const timegroup = this.getTimegroup();
    if (!timegroup) {
      setTimeout(() => this.initDomMode(), 100);
      return;
    }
    
    // Pause the ef-fit-scale to prevent it from applying transforms
    const fitScale = this.querySelector("[slot='canvas']") as any;
    if (fitScale?.removeScale && fitScale?.paused !== undefined) {
      fitScale.paused = true;
      fitScale.removeScale();
    }
    
    // Disable the timegroup's own proxy mode (it may have been enabled by thumbnail strip)
    (timegroup as any).proxyMode = false;
    
    // Show the original timegroup directly
    timegroup.style.clipPath = "";
    timegroup.style.pointerEvents = "";
    
    // Create DOM stats strategy if stats are enabled
    if (this.showStats && this.adaptiveTracker) {
      this.domStatsStrategy = new DomStatsStrategy({
        timegroup,
        adaptiveTracker: this.adaptiveTracker,
      });
      this.domStatsStrategy.start();
    }
  }
  
  private stopDomMode() {
    // Stop DOM stats strategy
    if (this.domStatsStrategy) {
      this.domStatsStrategy.stop();
      this.domStatsStrategy = null;
    }
    
    const timegroup = this.getTimegroup();
    if (timegroup) {
      // Hide the original again
      timegroup.style.clipPath = "inset(100%)";
      timegroup.style.pointerEvents = "none";
    }
    
    // Resume the ef-fit-scale
    const fitScale = this.querySelector("[slot='canvas']") as any;
    if (fitScale?.paused !== undefined) {
      fitScale.paused = false;
    }
  }
  
  /**
   * Get the resolution scale for canvas rendering (for fixed scale modes).
   * 
   * Logic:
   * - Get actual displayed size from getBoundingClientRect()
   * - For "Full": render at displayed size (1:1 pixel mapping)
   * - For other settings: render at that % of displayed size
   * - Never exceed composition size (100%)
   * 
   * Note: For "auto" mode, use getEffectiveResolutionScale() instead.
   */
  private getResolutionScale(
    timegroup: EFTimegroup,
    _canvasContainer: HTMLElement
  ): number {
    // For "auto" mode, delegate to getEffectiveResolutionScale
    if (this.previewResolutionScale === "auto") {
      return this.getEffectiveResolutionScale(timegroup, _canvasContainer);
    }
    
    // Composition size = the native resolution (offsetWidth/Height gives CSS layout size)
    const compositionWidth = timegroup.offsetWidth || 1920;
    const compositionHeight = timegroup.offsetHeight || 1080;
    
    // Displayed size = actual screen pixels after all transforms
    const rect = timegroup.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    
    // Display scale = displayed / composition (how much the composition is scaled down for display)
    const displayScale = Math.min(
      displayedWidth / compositionWidth,
      displayedHeight / compositionHeight
    );
    
    // For "Full", we want to render at displayed size (displayScale of composition)
    // For other settings, we want min(displayScale, setting) of composition
    // But we should never exceed 100% of composition
    const targetScale = this.previewResolutionScale === 1 
      ? displayScale  // Full = match display
      : Math.min(displayScale, this.previewResolutionScale);  // Others = min of display and setting
    
    // Clamp to reasonable bounds [10%, 100%]
    const finalScale = Math.max(0.1, Math.min(1, targetScale));
    
    const renderWidth = Math.floor(compositionWidth * finalScale);
    const renderHeight = Math.floor(compositionHeight * finalScale);
    
    return finalScale;
  }
  
  private async initCanvasMode() {
    // Don't initialize if we're no longer in canvas mode
    if (this.presentationMode !== "canvas") return;
    
    const timegroup = this.getTimegroup();
    const canvasContainer = this.canvasPreviewRef.value;
    
    // Wait for both timegroup and container to be available
    if (!timegroup || !canvasContainer) {
      setTimeout(() => this.initCanvasMode(), 100);
      return;
    }
    
    // Don't wait for timegroup initialization here - it can cause deadlocks when
    // localStorage restoration triggers seeks that wait for waitForMediaDurations().
    // The canvas refresh loop already handles this by checking if timegroup is ready:
    // - refresh() checks if sourceTimeMs and userTimeMs are synchronized
    // - If they're not synchronized (seek in progress), refresh() returns early
    // - Once the seek completes and times are synchronized, refresh() will render
    // This avoids blocking the main thread while still ensuring correct rendering.
    
    // Disable the timegroup's own proxy mode - workbench handles canvas rendering
    (timegroup as any).proxyMode = false;
    
    // Hide the original timegroup
    timegroup.style.clipPath = "inset(100%)";
    timegroup.style.pointerEvents = "none";
    
    // Show the canvas container
    canvasContainer.style.display = "block";
    
    // Get initial resolution scale based on display size, user setting, and motion state
    const initialResolutionScale = this.previewResolutionScale === "auto"
      ? this.getEffectiveResolutionScale(timegroup, canvasContainer)
      : this.getResolutionScale(timegroup, canvasContainer);
    
    // Track zoom level for detecting significant changes
    this.lastCanvasZoom = this.panZoomTransform.scale;
    
    // Store composition dimensions for stats calculation
    const compositionWidth = timegroup.offsetWidth || 1920;
    const compositionHeight = timegroup.offsetHeight || 1080;
    
    try {
      // CRITICAL: Wait for any in-progress seek to complete AND let playback controller initialize
      // The playback controller may be restoring time from localStorage
      await timegroup.seekTask.taskComplete;
      
      // If there's a playback controller, wait for it to complete initial seek
      // This prevents rendering at 0ms before restoring to saved time
      if (timegroup.playbackController) {
        // The playback controller's seek is async, give it time to start and coordinate animations
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // CRITICAL: Ensure timegroup has correct display states before first render
      // Text elements have default display:flex until updateAnimations runs
      updateAnimations(timegroup);
      
      // Create canvas preview - this builds the clone structure ONCE
      // Dynamic import to avoid loading render utilities during SSR
      const { renderTimegroupToCanvas } = await import("../preview/renderTimegroupToCanvas.js");
      const result = renderTimegroupToCanvas(timegroup, {
        scale: 1,
        resolutionScale: initialResolutionScale,
      });
      
      // Store the full result for dynamic resolution changes
      this.canvasPreviewResult = result;
      
      const { container, canvas, refresh, getResolutionScale } = result;
      
      canvas.classList.add("clone-content");
      
      canvasContainer.innerHTML = "";
      canvasContainer.appendChild(container);
      
      // Apply current transform
      this.updateCanvasTransform();
      
      
      // Start the canvas render loop
      const loop = async () => {
        if (this.presentationMode !== "canvas") return;
        
        // Skip refresh during export to avoid wasting CPU
        if (!this.isExporting) {
          try {
            // Measure render time for stats tracking
            const renderStart = performance.now();
            await refresh();
            const renderTime = performance.now() - renderStart;
            
            // Always record render stats (regardless of display visibility)
            if (this.renderStats) {
              this.renderStats.recordFrame(renderTime, performance.now(), this.isAtRest);
            }
            
            this.updateCanvasTransform();
          } catch (e) {
            console.error("Canvas refresh failed:", e);
          }
        }
        
        this.canvasAnimationFrame = requestAnimationFrame(loop);
      };
      this.canvasAnimationFrame = requestAnimationFrame(loop);
    } catch (e) {
      console.error("Failed to init canvas mode:", e);
    }
  }
  
  private stopCanvasMode() {
    if (this.canvasAnimationFrame !== null) {
      cancelAnimationFrame(this.canvasAnimationFrame);
      this.canvasAnimationFrame = null;
    }
    if (this.zoomReinitTimeout !== null) {
      clearTimeout(this.zoomReinitTimeout);
      this.zoomReinitTimeout = null;
    }
    this.canvasPreviewResult = null;
    
    // Note: renderStats persists across mode changes - no cleanup needed
    
    // Clear and hide the canvas container
    const container = this.canvasPreviewRef.value;
    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }
  
  private updateCanvasTransform() {
    if (this.presentationMode !== "canvas") return;
    
    const container = this.canvasPreviewRef.value;
    if (!container) return;
    
    const canvas = container.querySelector("canvas") as HTMLElement;
    if (!canvas) return;
    
    const { x, y, scale } = this.panZoomTransform;
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  
  // Canvas renderer - kept for thumbnail generation
  async initCanvasRenderer(): Promise<{ canvas: HTMLCanvasElement; refresh: () => Promise<void> } | null> {
    const timegroup = this.getTimegroup();
    if (!timegroup) return null;
    
    try {
      // Dynamic import to avoid loading render utilities during SSR
      const { renderTimegroupToCanvas } = await import("../preview/renderTimegroupToCanvas.js");
      const { canvas, refresh } = renderTimegroupToCanvas(timegroup, 1);
      this.canvasRefresh = refresh;
      return { canvas, refresh };
    } catch (e) {
      console.error("Failed to init canvas renderer:", e);
      return null;
    }
  }
  
  /** Start video export with progress tracking */
  async startExport(options: RenderToVideoOptions = {}): Promise<void> {
    const timegroup = this.getTimegroup();
    if (!timegroup) {
      console.error("No timegroup found for export");
      return;
    }
    
    if (this.isExporting) {
      console.warn("Export already in progress");
      return;
    }
    
    this.exportAbortController = new AbortController();
    this.isExporting = true;
    this.exportProgress = null;
    this.exportStatus = "rendering";
    
    try {
      // Dynamic import to avoid loading render utilities during SSR
      const { renderTimegroupToVideo, RenderCancelledError } = await import("../preview/renderTimegroupToVideo.js");
      await renderTimegroupToVideo(timegroup, {
        ...options,
        signal: this.exportAbortController.signal,
        onProgress: (progress) => {
          this.exportProgress = progress;
        },
      });
      
      this.exportStatus = "complete";
      setTimeout(() => {
        this.isExporting = false;
        this.exportProgress = null;
        this.exportStatus = "idle";
        this.exportAbortController = null;
      }, 2000);
    } catch (e) {
      // Need to re-import to check error type
      const { RenderCancelledError } = await import("../preview/renderTimegroupToVideo.js");
      if (e instanceof RenderCancelledError) {
        console.log("Export cancelled by user");
        this.exportStatus = "cancelled";
        setTimeout(() => {
          this.isExporting = false;
          this.exportProgress = null;
          this.exportStatus = "idle";
          this.exportAbortController = null;
        }, 1500);
      } else {
        console.error("Export failed:", e);
        this.exportStatus = "error";
        setTimeout(() => {
          this.isExporting = false;
          this.exportProgress = null;
          this.exportStatus = "idle";
          this.exportAbortController = null;
        }, 3000);
      }
    }
  }
  
  /** Cancel the current export */
  cancelExport(): void {
    if (this.exportAbortController) {
      this.exportAbortController.abort();
    }
  }
  
  private positionPopover(popover: HTMLElement, anchorId: string) {
    const anchor = this.shadowRoot?.getElementById(anchorId);
    if (!anchor) return;
    
    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const padding = 8;
    
    // Position below the anchor
    let top = anchorRect.bottom + padding;
    // Align right edge of popover with right edge of anchor
    let left = anchorRect.right - popoverRect.width;
    
    // Keep within viewport bounds
    if (left < padding) {
      left = padding;
    }
    if (left + popoverRect.width > window.innerWidth - padding) {
      left = window.innerWidth - popoverRect.width - padding;
    }
    if (top + popoverRect.height > window.innerHeight - padding) {
      // Flip to above if doesn't fit below
      top = anchorRect.top - popoverRect.height - padding;
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }
  
  private handleSettingsPopoverToggle(e: Event) {
    const popover = e.target as HTMLElement;
    if ((e as ToggleEvent).newState === 'open') {
      // Position after the popover is shown so we can measure it
      requestAnimationFrame(() => {
        this.positionPopover(popover, 'settings-btn');
      });
    }
  }
  
  private handleExportPopoverToggle(e: Event) {
    const popover = e.target as HTMLElement;
    if ((e as ToggleEvent).newState === 'open') {
      // Initialize export options when popover opens
      if (this.exportOptions.outMs === 0) {
        const timegroup = this.getTimegroup();
        if (timegroup) {
          this.exportOptions = {
            ...this.exportOptions,
            outMs: timegroup.durationMs,
          };
        }
      }
      // Position after the popover is shown
      requestAnimationFrame(() => {
        this.positionPopover(popover, 'export-btn');
      });
    }
  }
  
  private handleStartExport() {
    this.startExport({
      includeAudio: this.exportOptions.includeAudio,
      scale: this.exportOptions.scale,
      fromMs: this.exportOptions.useInOut ? this.exportOptions.inMs : undefined,
      toMs: this.exportOptions.useInOut ? this.exportOptions.outMs : undefined,
    });
  }
  
  private updateExportOption<K extends keyof typeof this.exportOptions>(
    key: K,
    value: typeof this.exportOptions[K]
  ) {
    this.exportOptions = { ...this.exportOptions, [key]: value };
  }
  
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  }
  
  private handleCancelClick() {
    this.cancelExport();
  }
  
  private handleRenderModeChange(mode: RenderMode) {
    setRenderMode(mode);
    this.previewSettings = { ...this.previewSettings, renderMode: mode };
  }
  
  private handleResolutionScaleChange(scale: PreviewResolutionScale) {
    console.log(`[EFWorkbench] Resolution scale changed to ${scale}, presentationMode=${this.presentationMode}`);
    setPreviewResolutionScale(scale);
    this.previewSettings = { ...this.previewSettings, resolutionScale: scale };
    
    // Reset adaptive tracker when switching to auto mode
    if (scale === "auto") {
      this.adaptiveTracker?.reset();
      this.currentAdaptiveScale = 1;
    }
    
    // Apply new resolution scale dynamically if canvas mode is active
    if (this.presentationMode === "canvas" && this.canvasPreviewResult) {
      console.log("[EFWorkbench] Applying new resolution scale to canvas");
      const timegroup = this.getTimegroup();
      const canvasContainer = this.canvasPreviewRef.value;
      if (timegroup && canvasContainer) {
        const newScale = scale === "auto"
          ? this.getEffectiveResolutionScale(timegroup, canvasContainer)
          : this.getResolutionScale(timegroup, canvasContainer);
        
        this.canvasPreviewResult.setResolutionScale(newScale);
      }
    }
  }
  
  private handleShowStatsToggle(enabled: boolean) {
    setShowStats(enabled);
    this.previewSettings = { ...this.previewSettings, showStats: enabled };
    // applySettings() will be called automatically via updated() hook when context changes
  }
  
  private handleShowThumbnailTimestampsToggle(enabled: boolean) {
    setShowThumbnailTimestamps(enabled);
    this.previewSettings = { ...this.previewSettings, showThumbnailTimestamps: enabled };
  }
  
  /**
   * Get initial theme from localStorage or default to 'dark'
   */
  private getInitialTheme(): 'light' | 'dark' | 'system' {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('ef-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'dark';
  }
  
  /**
   * Cycle through theme modes: light → dark → system → light
   */
  private handleThemeToggle(): void {
    const nextTheme = this.themeMode === 'light' ? 'dark' : this.themeMode === 'dark' ? 'system' : 'light';
    this.themeMode = nextTheme;
    localStorage.setItem('ef-theme', nextTheme);
    this.applyTheme();
  }
  
  /**
   * Apply the current theme to the document and host element
   */
  private applyTheme(): void {
    const root = document.documentElement;
    let shouldBeDark = false;
    
    if (this.themeMode === 'light') {
      shouldBeDark = false;
    } else if (this.themeMode === 'dark') {
      shouldBeDark = true;
    } else {
      // System mode - check system preference
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply to document root (for light DOM elements)
    if (shouldBeDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // Apply to host element (for shadow DOM and :host-context)
    if (shouldBeDark) {
      this.classList.add('dark');
      this.classList.remove('light');
    } else {
      this.classList.add('light');
      this.classList.remove('dark');
    }
  }
  
  /**
   * Reset and fit the preview to show all content centered.
   * Finds the pan-zoom element and calls fitToContent() on it.
   */
  private handleFitToContent(): void {
    const panZoomElement = this.querySelector("ef-pan-zoom") as any;
    if (panZoomElement && typeof panZoomElement.fitToContent === "function") {
      panZoomElement.fitToContent();
    }
  }
  
  private renderSettingsPopover() {
    const isAvailable = isNativeCanvasApiAvailable();
    
    return html`
      <div 
        id="settings-popover" 
        popover="auto"
        class="dropdown-panel"
        @toggle=${this.handleSettingsPopoverToggle}
      >
        <div class="dropdown-header">
          <span class="dropdown-title">Preview Settings</span>
          <button class="dropdown-close" popovertarget="settings-popover" popovertargetaction="hide">✕</button>
        </div>
        
        <!-- Presentation Mode Setting -->
        <div style="
          background: var(--ef-color-bg-inset);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        ">
          <div class="dropdown-label" style="margin-bottom: 10px;">Presentation Mode</div>
          
          <div class="button-group">
            <button
              @click=${() => this.handlePresentationModeChange("dom")}
              class="button-group-btn ${this.presentationMode === "dom" ? "active" : ""}"
            >DOM</button>
            <button
              @click=${() => this.handlePresentationModeChange("canvas")}
              class="button-group-btn ${this.presentationMode === "canvas" ? "active" : ""}"
            >Canvas</button>
          </div>
          
          <div class="dropdown-description">
            ${this.presentationMode === "dom" 
              ? "Default. Shows the real timegroup DOM directly." 
              : "Renders to canvas each frame."}
          </div>
        </div>
        
        <!-- Render Mode Setting -->
        <div class="dropdown-section">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span class="dropdown-label">Render Mode</span>
            ${isAvailable ? html`
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="
                  display: inline-block;
                  width: 7px;
                  height: 7px;
                  border-radius: 50%;
                  background: var(--ef-color-success);
                "></span>
                <span style="color: var(--ef-color-success); font-size: 10px; font-weight: 500;">
                  Native Available
                </span>
              </div>
            ` : ''}
          </div>
          
          <div class="button-group">
            <button
              @click=${() => this.handleRenderModeChange("foreignObject")}
              class="button-group-btn ${this.renderMode === "foreignObject" ? "active" : ""}"
            >foreignObject</button>
            <button
              @click=${() => this.handleRenderModeChange("native")}
              ?disabled=${!isAvailable}
              class="button-group-btn ${this.renderMode === "native" ? "active" : ""}"
              style="
                cursor: ${isAvailable ? 'pointer' : 'not-allowed'};
                opacity: ${isAvailable ? '1' : '0.5'};
              "
            >native</button>
          </div>
          
          <div class="dropdown-description">
            ${this.renderMode === "foreignObject" 
              ? "SVG foreignObject serialization. Works everywhere but slower." 
              : "Chrome's drawElementImage API. Fastest, requires chrome://flags/#canvas-draw-element."}
          </div>
        </div>
        
        <!-- This section was already updated earlier in the dropdown-section refactor -->
        
        <!-- Show Performance Stats Setting -->
        <div class="dropdown-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              ?checked=${this.showStats}
              @change=${(e: Event) => this.handleShowStatsToggle((e.target as HTMLInputElement).checked)}
            />
            <span>Show Performance Stats</span>
          </label>
          
          <div class="dropdown-description">
            Display FPS, CPU pressure, and performance metrics overlay.
          </div>
        </div>
        
        <!-- Thumbnail Timestamps -->
        <div class="dropdown-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              ?checked=${this.previewSettings.showThumbnailTimestamps}
              @change=${(e: Event) => this.handleShowThumbnailTimestampsToggle((e.target as HTMLInputElement).checked)}
            />
            <span>Show Thumbnail Timestamps</span>
          </label>
          
          <div class="dropdown-description">
            Display timestamp overlay on timeline thumbnails for debugging.
          </div>
        </div>
      </div>
    `;
  }
  
  private renderExportPopover() {
    const timegroup = this.getTimegroup();
    const durationMs = timegroup?.durationMs ?? 0;
    
    return html`
      <div 
        id="export-popover" 
        popover="auto"
        class="dropdown-panel"
        @toggle=${this.handleExportPopoverToggle}
      >
        <div class="dropdown-header">
          <span class="dropdown-title">Export Settings</span>
          <button class="dropdown-close" popovertarget="export-popover" popovertargetaction="hide">✕</button>
        </div>
        
        <!-- Scale -->
        <div style="margin-bottom: 10px;">
          <label class="dropdown-label" style="display: block; margin-bottom: 4px;">Scale</label>
          <select
            class="dropdown-select"
            .value=${String(this.exportOptions.scale)}
            @change=${(e: Event) => this.updateExportOption("scale", Number((e.target as HTMLSelectElement).value))}
          >
            <option value="1">100% (Full)</option>
            <option value="0.75">75%</option>
            <option value="0.5">50%</option>
            <option value="0.25">25%</option>
          </select>
        </div>
        
        <!-- Audio -->
        <div style="margin-bottom: 10px;">
          <label class="checkbox-label">
            <input
              type="checkbox"
              ?checked=${this.exportOptions.includeAudio}
              @change=${(e: Event) => this.updateExportOption("includeAudio", (e.target as HTMLInputElement).checked)}
            />
            <span>Include Audio</span>
          </label>
        </div>
        
        <!-- In/Out Range -->
        <div style="margin-bottom: 12px;">
          <label class="checkbox-label" style="margin-bottom: 6px;">
            <input
              type="checkbox"
              ?checked=${this.exportOptions.useInOut}
              @change=${(e: Event) => this.updateExportOption("useInOut", (e.target as HTMLInputElement).checked)}
            />
            <span>Custom Range</span>
          </label>
          
          ${this.exportOptions.useInOut ? html`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
              <div>
                <label class="dropdown-label" style="display: block; margin-bottom: 2px; font-size: 10px;">In (ms)</label>
                <input
                  type="number"
                  class="dropdown-input"
                  style="font-family: ui-monospace, monospace;"
                  min="0"
                  max=${durationMs}
                  .value=${String(this.exportOptions.inMs)}
                  @change=${(e: Event) => this.updateExportOption("inMs", Number((e.target as HTMLInputElement).value))}
                />
              </div>
              <div>
                <label class="dropdown-label" style="display: block; margin-bottom: 2px; font-size: 10px;">Out (ms)</label>
                <input
                  type="number"
                  class="dropdown-input"
                  style="font-family: ui-monospace, monospace;"
                  min="0"
                  max=${durationMs}
                  .value=${String(this.exportOptions.outMs)}
                  @change=${(e: Event) => this.updateExportOption("outMs", Number((e.target as HTMLInputElement).value))}
                />
              </div>
            </div>
            <div class="dropdown-description" style="margin-top: 4px;">
              Duration: ${this.formatTime(this.exportOptions.outMs - this.exportOptions.inMs)} / ${this.formatTime(durationMs)}
            </div>
          ` : html`
            <div class="dropdown-description">
              Full duration: ${this.formatTime(durationMs)}
            </div>
          `}
        </div>
        
        <!-- Start Export button -->
        <button
          class="toolbar-btn primary"
          style="width: 100%; justify-content: center;"
          @click=${this.handleStartExport}
          popovertarget="export-popover"
          popovertargetaction="hide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          Start Export
        </button>
      </div>
    `;
  }
  
  private renderExportProgressPopover() {
    const p = this.exportProgress;
    const progressPercent = p ? Math.round(p.progress * 100) : 0;
    const isComplete = this.exportStatus === "complete";
    const isError = this.exportStatus === "error";
    const isCancelled = this.exportStatus === "cancelled";
    const isRendering = this.exportStatus === "rendering";
    
    let statusColor: string;
    let statusText: string;
    
    if (isComplete) {
      statusColor = "var(--ef-color-success)";
      statusText = "Complete!";
    } else if (isError) {
      statusColor = "var(--ef-color-danger)";
      statusText = "Failed";
    } else if (isCancelled) {
      statusColor = "var(--ef-color-warning)";
      statusText = "Cancelled";
    } else {
      statusColor = "var(--ef-color-primary)";
      statusText = `${progressPercent}%`;
    }
    
    return html`
      <div 
        id="export-progress-popover" 
        popover="manual"
        class="dropdown-panel" 
        style="min-width: 240px;"
      >
        <div class="dropdown-header">
          <span class="dropdown-title">Exporting</span>
          ${isRendering ? html`
            <button 
              class="dropdown-close" 
              style="color: var(--ef-color-danger);"
              @click=${this.handleCancelClick}
            >Cancel</button>
          ` : null}
        </div>
        
        ${isRendering && p !== null ? html`
          ${p.framePreviewCanvas ? html`
            <div style="margin-bottom: 10px; display: flex; justify-content: center;">
              ${p.framePreviewCanvas}
            </div>
            <style>
              ef-workbench canvas {
                border-radius: 4px;
                border: 1px solid var(--ef-color-border);
                max-width: 100%;
                height: auto;
              }
            </style>
          ` : null}
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 10px; font-family: ui-monospace, monospace; font-size: 10px;">
            <div>
              <div style="color: var(--ef-color-text-subtle);">Frames</div>
              <div style="color: var(--ef-color-text);">${p.currentFrame} / ${p.totalFrames}</div>
            </div>
            <div>
              <div style="color: var(--ef-color-text-subtle);">Time</div>
              <div style="color: var(--ef-color-text);">${this.formatTime(p.renderedMs)} / ${this.formatTime(p.totalDurationMs)}</div>
            </div>
            <div>
              <div style="color: var(--ef-color-text-subtle);">Speed</div>
              <div style="color: ${p.speedMultiplier >= 1 ? "var(--ef-color-success)" : "var(--ef-color-warning)"};">${p.speedMultiplier.toFixed(2)}x</div>
            </div>
            <div>
              <div style="color: var(--ef-color-text-subtle);">ETA</div>
              <div style="color: var(--ef-color-text);">${this.formatTime(p.estimatedRemainingMs)}</div>
            </div>
          </div>
        ` : null}
        
        <div style="height: 4px; background: var(--ef-color-bg-inset); border-radius: 2px; overflow: hidden;">
          <div style="
            height: 100%;
            width: ${progressPercent}%;
            background: ${statusColor};
            border-radius: 2px;
            transition: width 0.15s ease-out;
          "></div>
        </div>
        
        <div style="text-align: center; margin-top: 6px; font-size: 11px; font-weight: 600; color: ${statusColor};">
          ${statusText}
        </div>
      </div>
      
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }
  
  private renderToolbar() {
    return html`
      <div class="toolbar" part="toolbar">
        <div class="toolbar-left">
          <!-- Fit to content button -->
          <button 
            class="toolbar-icon-btn"
            @click=${this.handleFitToContent}
            title="Fit to Content (Reset Zoom & Center)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M8 12h8M12 8v8"></path>
            </svg>
          </button>
        </div>
        
        <div class="toolbar-right">
          <!-- Mode indicator -->
          <span class="mode-indicator ${this.presentationMode}">
            ${this.presentationMode === "dom" ? "DOM" : html`
              Canvas ${getRenderMode() === "native" 
                ? phosphorIcon(ICONS.lightning, 12) 
                : phosphorIcon(ICONS.code, 12)}
            `}
          </span>
          
          <!-- Theme toggle button -->
          <button 
            class="toolbar-icon-btn"
            @click=${this.handleThemeToggle}
            title="${this.themeMode === 'light' ? 'Light mode' : this.themeMode === 'dark' ? 'Dark mode' : 'System preference'}"
          >
            ${this.themeMode === 'light' ? html`
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ` : this.themeMode === 'dark' ? html`
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ` : html`
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            `}
          </button>
          
          <!-- Settings button -->
          <button 
            id="settings-btn"
            class="toolbar-icon-btn"
            popovertarget="settings-popover"
            title="Preview Settings"
          >
            ${phosphorIcon(ICONS.gear, 16)}
          </button>
          
          <!-- Export button -->
          ${this.isExporting ? html`
            <button 
              id="export-btn"
              class="toolbar-btn active"
              style="min-width: 100px;"
              popovertarget="export-progress-popover"
            >
              <div style="width: 12px; height: 12px; border: 2px solid var(--ef-color-primary-subtle); border-top-color: var(--ef-color-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
              Exporting...
            </button>
          ` : html`
            <button 
              id="export-btn"
              class="toolbar-btn primary"
              popovertarget="export-popover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Export
            </button>
          `}
        </div>
      </div>
      
      <!-- Popovers (rendered into top-layer) -->
      ${this.renderSettingsPopover()}
      ${this.renderExportPopover()}
      ${this.renderExportProgressPopover()}
    `;
  }

  update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.update(changedProperties);

    if (changedProperties.has("focusedElement")) {
      this.drawOverlays();
    }
  }
  
  updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    
    // Restore preview pan/zoom when timegroup becomes available
    // Check if timegroup is now available (slot content changed)
    const timegroup = this.getTimegroup();
    if (timegroup && !changedProperties.has("panZoomTransform")) {
      // Only restore if we haven't already restored (avoid overwriting user changes)
      // Check if panZoomTransform is still at default values
      if (
        this.panZoomTransform.x === 0 &&
        this.panZoomTransform.y === 0 &&
        this.panZoomTransform.scale === 1
      ) {
        requestAnimationFrame(() => {
          this.restorePreviewPanZoom();
        });
      }
    }
    
    // Apply settings when dependencies become available or settings change
    if (changedProperties.has("previewSettings") || 
        changedProperties.has("presentationMode") ||
        changedProperties.has("showStats")) {
      this.applySettings();
    }
    
    // Show/hide export progress popover based on isExporting state
    if (changedProperties.has("isExporting")) {
      const popover = this.shadowRoot?.getElementById("export-progress-popover") as HTMLElement | null;
      if (popover) {
        if (this.isExporting) {
          popover.showPopover();
          // Position after showing
          requestAnimationFrame(() => {
            this.positionPopover(popover, 'export-btn');
          });
        } else {
          popover.hidePopover();
        }
      }
    }
  }

  drawOverlays = () => {
    const focusOverlay = this.focusOverlay.value;
    if (focusOverlay) {
      if (this.focusedElement) {
        focusOverlay.style.display = "block";
        const rect = this.focusedElement.getBoundingClientRect();
        Object.assign(focusOverlay.style, {
          position: "fixed",
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        requestAnimationFrame(this.drawOverlays);
      } else {
        focusOverlay.style.display = "none";
      }
    }
  };
  
  private renderPlaybackStats() {
    // Only show stats if enabled
    if (!this.showStats) {
      return null;
    }
    
    // Get stats based on current mode
    let stats: PlaybackStats | null = null;
    
    if (this.presentationMode === "canvas" && this.renderStats) {
      // Canvas mode: use RenderStats (always-on collection)
      const timegroup = this.getTimegroup();
      if (!timegroup) return null;
      
      const compositionWidth = timegroup.offsetWidth || 1920;
      const compositionHeight = timegroup.offsetHeight || 1080;
      
      const resolutionScale = this.canvasPreviewResult
        ? this.canvasPreviewResult.getResolutionScale()
        : 1;
      
      const renderWidth = Math.floor(compositionWidth * resolutionScale);
      const renderHeight = Math.floor(compositionHeight * resolutionScale);
      
      stats = this.renderStats.getStats(renderWidth, renderHeight, resolutionScale);
    } else if (this.presentationMode === "dom" && this.domStatsStrategy) {
      // DOM mode: use DomStatsStrategy (has its own loop)
      stats = this.domStatsStrategy.getStats();
    }
    
    if (!stats) {
      return null;
    }
    
    // Determine FPS color (based on frame interval, not render time)
    const fpsClass = stats.fps >= 55 ? "good" : stats.fps >= 25 ? "warning" : "bad";
    
    // Determine render time color (target is 33ms for 30fps)
    const renderClass = stats.avgRenderTime !== null
      ? (stats.avgRenderTime <= 20 ? "good" : stats.avgRenderTime <= 30 ? "warning" : "bad")
      : "";
    
    // Determine headroom color (positive = good, negative = bad)
    const headroomClass = stats.headroom !== null
      ? (stats.headroom >= 10 ? "good" : stats.headroom >= 0 ? "warning" : "bad")
      : "";
    
    // Determine pressure color
    const pressureClass = stats.pressureState === "nominal" ? "good" 
      : stats.pressureState === "fair" ? "good"
      : stats.pressureState === "serious" ? "warning" 
      : "bad";
    
    // Resolution scale color (only for canvas mode)
    const scaleClass = stats.resolutionScale !== null
      ? (stats.resolutionScale >= 0.75 ? "good" : stats.resolutionScale >= 0.5 ? "warning" : "bad")
      : "";
    
    // Determine which stats to show based on mode
    const isCanvasMode = this.presentationMode === "canvas";
    const showRenderTime = isCanvasMode;
    const showHeadroom = isCanvasMode;
    const showResolutionScale = isCanvasMode;
    const showAdaptiveResolution = isCanvasMode && this.previewResolutionScale === "auto";
    
    // Motion state
    const motionState = this.isAtRest ? "At Rest" : this.isPlaying ? "Playing" : this.isScrubbing ? "Scrubbing" : "Idle";
    
    // Render pressure histogram bars
    const renderPressureHistogram = () => {
      if (stats.pressureHistory.length === 0) {
        return html`<div style="color: var(--ef-color-text-subtle); font-size: 9px;">No pressure data (API not available)</div>`;
      }
      
      return html`
        <div class="pressure-histogram">
          ${stats.pressureHistory.map((state) => html`
            <div class="bar ${state}"></div>
          `)}
        </div>
        <div class="pressure-histogram-label">
          <span>30s ago</span>
          <span>now</span>
        </div>
      `;
    };
    
    // Helper to pad numbers for consistent width
    const padNum = (n: number, decimals: number, width: number) => {
      const str = n.toFixed(decimals);
      return str.padStart(width, '\u2007'); // Use figure space for padding
    };
    
    return html`
      <div class="playback-stats">
        <div class="stat-row">
          <span class="stat-label">FPS</span>
          <span class="stat-value ${fpsClass}">${padNum(stats.fps, 1, 5)}</span>
        </div>
        ${showRenderTime && stats.avgRenderTime !== null ? html`
          <div class="stat-row">
            <span class="stat-label">Render</span>
            <span class="stat-value ${renderClass}">${padNum(stats.avgRenderTime, 1, 5)}ms</span>
          </div>
        ` : null}
        ${showHeadroom && stats.headroom !== null ? html`
          <div class="stat-row">
            <span class="stat-label">Headroom</span>
            <span class="stat-value ${headroomClass}">${stats.headroom >= 0 ? '+' : ''}${padNum(stats.headroom, 1, 4)}ms</span>
          </div>
        ` : null}
        <div class="stat-row">
          <span class="stat-label">Resolution</span>
          <span class="stat-value">${stats.renderWidth}×${stats.renderHeight}</span>
        </div>
        ${showResolutionScale && stats.resolutionScale !== null ? html`
          <div class="stat-row">
            <span class="stat-label">Scale</span>
            <span class="stat-value ${scaleClass}">${String(Math.round(stats.resolutionScale * 100)).padStart(3, '\u2007')}%</span>
          </div>
        ` : null}
        <div class="stat-row">
          <span class="stat-label">CPU</span>
          <span class="stat-value ${pressureClass}">${stats.pressureState}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">State</span>
          <span class="stat-value">${motionState}</span>
        </div>
        ${showAdaptiveResolution && stats.samplesAtCurrentScale !== undefined ? html`
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--ef-color-border-subtle);">
            <div class="stat-row">
              <span class="stat-label">Mode</span>
              <span class="stat-value good">Auto</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Samples</span>
              <span class="stat-value">${String(stats.samplesAtCurrentScale).padStart(3, '\u2007')}/60</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Scale Up</span>
              <span class="stat-value ${stats.canScaleUp ? 'good' : ''}">${stats.canScaleUp ? 'Ready' : 'Waiting'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Scale Down</span>
              <span class="stat-value ${stats.canScaleDown ? '' : 'warning'}">${stats.canScaleDown ? 'Ready' : 'Min'}</span>
            </div>
          </div>
        ` : null}
        
        <!-- CPU Pressure Histogram -->
        <div style="margin-top: 8px;">
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 4px;">CPU Pressure History</div>
          ${renderPressureHistogram()}
        </div>
      </div>
    `;
  }

  render() {
    if (this.rendering) {
      return html`
        <slot class="fixed inset-0 h-full w-full" name="canvas"></slot>
      `;
    }
    return html`
      <div
        class="grid overflow-hidden"
        style="position: absolute; inset: 0; grid-template-rows: auto 1fr 280px; grid-template-columns: 280px 1fr; background-color: var(--workbench-bg);"
      >
        <!-- Top: Full-width Toolbar -->
        <div style="grid-row: 1 / 2; grid-column: 1 / -1;">
          ${this.renderToolbar()}
        </div>
        
        <!-- Left: Hierarchy Panel -->
        <div
          style="grid-row: 2 / 3; grid-column: 1 / 2; background: var(--ef-color-bg-panel); border-right: 1px solid var(--ef-color-border); min-height: 0; display: flex; flex-direction: column; overflow: hidden;"
        >
          <slot name="hierarchy"></slot>
        </div>

        <!-- Center: Canvas area -->
        <div
          class="canvas-container"
          part="canvas"
          style="grid-row: 2 / 3; grid-column: 2 / 3; min-height: 0;"
          @wheel=${this.handleStageWheel}
        >
          <!-- Original timegroup (hidden in clone/canvas mode, visible in dom mode) -->
          <slot name="canvas"></slot>
          
          <!-- Canvas preview (visible in canvas mode only) -->
          <div 
            class="canvas-overlay" 
            ${ref(this.canvasPreviewRef)}
            style="display: ${this.presentationMode === "canvas" ? "block" : "none"}"
          ></div>
          
          <!-- Playback stats overlay (visible in canvas mode only) -->
          ${this.renderPlaybackStats()}
        </div>

        <!-- Bottom: Timeline -->
        <div
          class="overflow-hidden"
          style="grid-row: 3 / 4; grid-column: 1 / -1; width: 100%; border-top: 1px solid var(--ef-color-border);"
        >
          <slot name="timeline"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-workbench": EFWorkbench;
  }
}
