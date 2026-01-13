import { css, html, LitElement, type PropertyValueMap } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

import { ContextMixin } from "./ContextMixin.js";
import { TWMixin } from "./TWMixin.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { renderTimegroupToCanvas } from "../preview/renderTimegroupToCanvas.js";
import { renderTimegroupPreview } from "../preview/renderTimegroupPreview.js";
import { renderTimegroupToVideo, type RenderToVideoOptions, type RenderProgress, RenderCancelledError } from "../preview/renderTimegroupToVideo.js";
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
} from "../preview/previewSettings.js";
import { provide } from "@lit/context";
import { previewSettingsContext, type PreviewSettings } from "./previewSettingsContext.js";
import { phosphorIcon, ICONS } from "./icons.js";

// Side-effect import for template usage (pan-zoom is created in light DOM by wrapWithWorkbench)
import "./EFFitScale.js";

@customElement("ef-workbench")
export class EFWorkbench extends ContextMixin(TWMixin(LitElement)) {
  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        
        /* Light mode colors */
        --workbench-bg: rgb(30 41 59); /* slate-800 */
        --workbench-overlay-border: rgb(59 130 246); /* blue-500 */
        --workbench-overlay-bg: rgb(191 219 254); /* blue-200 */
        --toolbar-bg: rgb(15 23 42); /* slate-900 */
        --toolbar-border: rgba(148, 163, 184, 0.2);
      }
      
      :host(.dark), :host-context(.dark) {
        /* Dark mode colors */
        --workbench-bg: rgb(2 6 23); /* slate-950 */
        --workbench-overlay-border: rgb(96 165 250); /* blue-400 */
        --workbench-overlay-bg: rgb(30 58 138); /* blue-900 */
        --toolbar-bg: rgb(2 6 23);
        --toolbar-border: rgba(148, 163, 184, 0.15);
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
        background: rgba(51, 65, 85, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .toolbar-btn:hover {
        background: rgba(51, 65, 85, 0.9);
        border-color: rgba(148, 163, 184, 0.3);
      }
      
      .toolbar-btn.active {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: #60a5fa;
      }
      
      .toolbar-btn.primary {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        border-color: transparent;
        color: white;
        font-weight: 600;
      }
      
      .toolbar-btn.primary:hover {
        background: linear-gradient(135deg, #60a5fa, #3b82f6);
      }
      
      .toolbar-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: rgba(51, 65, 85, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        color: #e2e8f0;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      .toolbar-icon-btn:hover {
        background: rgba(51, 65, 85, 0.9);
        border-color: rgba(148, 163, 184, 0.3);
      }
      
      .toolbar-icon-btn.active {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: #60a5fa;
      }
      
      .mode-indicator {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .mode-indicator.dom {
        background: rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      
      .mode-indicator.canvas {
        background: rgba(168, 85, 247, 0.2);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
      }
      
      .canvas-container {
        position: relative;
        overflow: hidden;
        flex: 1;
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: 100%;
      }
      
      .canvas-container ::slotted(*) {
        width: 100%;
        height: 100%;
        grid-column: 1;
        grid-row: 1;
      }
      
      .clone-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
      }
      
      .clone-content {
        position: absolute;
        transform-origin: 0 0;
      }
      
      .dropdown-panel {
        position: fixed;
        margin: 0;
        padding: 14px 16px;
        min-width: 260px;
        max-width: calc(100vw - 32px);
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 10px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      }
      
      .dropdown-title {
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 600;
      }
      
      .dropdown-close {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 2px;
        line-height: 1;
        font-size: 14px;
        transition: color 0.15s;
      }
      
      .dropdown-close:hover {
        color: #94a3b8;
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
  
  
  @state()
  private renderMode: RenderMode = getRenderMode();
  
  @state()
  private presentationMode: PreviewPresentationMode = getPreviewPresentationMode();
  
  @state()
  private previewResolutionScale: PreviewResolutionScale = getPreviewResolutionScale();
  
  @provide({ context: previewSettingsContext })
  private previewSettings: PreviewSettings = {
    resolutionScale: getPreviewResolutionScale(),
  };
  
  @state()
  private debugThumbnailTimestamps = false;
  
  @state()
  private exportOptions = {
    includeAudio: true,
    scale: 1,
    useInOut: false,
    inMs: 0,
    outMs: 0,
  };
  
  private exportAbortController: AbortController | null = null;
  
  // Clone overlay (computed styles preview on top of hidden original)
  private cloneOverlayRef = createRef<HTMLDivElement>();
  private cloneRefresh: (() => void) | null = null;
  private cloneAnimationFrame: number | null = null;
  private cloneRootElement: HTMLElement | null = null;
  private cloneTimegroup: EFTimegroup | null = null;
  private structureObserver: MutationObserver | null = null;
  private rebuildPending = false;
  
  // Canvas renderer (kept for thumbnail generation, not displayed)
  private canvasRefresh: (() => Promise<void>) | null = null;
  
  // Canvas preview mode state
  private canvasPreviewRef = createRef<HTMLDivElement>();
  private canvasPreviewElement: HTMLCanvasElement | null = null;
  private canvasAnimationFrame: number | null = null;
  
  private boundHandleTransformChanged = this.handleTransformChanged.bind(this);

  focusOverlay = createRef<HTMLDivElement>();

  @eventOptions({ passive: false, capture: true })
  handleStageWheel(event: WheelEvent) {
    event.preventDefault();
  }

  connectedCallback(): void {
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    super.connectedCallback();
    // Listen for pan-zoom transform changes
    this.addEventListener("transform-changed", this.boundHandleTransformChanged as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.body.style.width = "";
    document.body.style.height = "";
    document.documentElement.style.width = "";
    document.documentElement.style.height = "";
    
    // Clean up current mode
    if (this.presentationMode === "clone") {
      this.stopCloneOverlay();
    } else if (this.presentationMode === "dom") {
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
  }
  
  protected firstUpdated(): void {
    // Initialize based on current presentation mode
    if (this.presentationMode === "clone") {
      this.initCloneOverlay();
    } else if (this.presentationMode === "dom") {
      this.initDomMode();
    } else if (this.presentationMode === "canvas") {
      this.initCanvasMode();
    }
  }
  
  // Track zoom for detecting changes that need canvas reinit
  private lastCanvasZoom = 1;
  private zoomReinitTimeout: number | null = null;
  
  private handleTransformChanged(e: CustomEvent<{ x: number; y: number; scale: number }>) {
    this.panZoomTransform = e.detail;
    
    // Update overlay transform based on current mode
    if (this.presentationMode === "clone") {
      this.updateCloneTransform();
    } else if (this.presentationMode === "canvas") {
      this.updateCanvasTransform();
      
      // Check if zoom changed enough to warrant re-rendering at new resolution
      // Only reinit if zoom changed by >25% from last init
      const zoomRatio = e.detail.scale / this.lastCanvasZoom;
      if (zoomRatio < 0.75 || zoomRatio > 1.33) {
        // Debounce to avoid thrashing during zoom gestures
        if (this.zoomReinitTimeout !== null) {
          clearTimeout(this.zoomReinitTimeout);
        }
        this.zoomReinitTimeout = window.setTimeout(() => {
          this.zoomReinitTimeout = null;
          if (this.presentationMode === "canvas") {
            this.lastCanvasZoom = this.panZoomTransform.scale;
            this.stopCanvasMode();
            this.initCanvasMode();
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
  
  private initCloneOverlay() {
    // Don't initialize if we're no longer in clone mode
    if (this.presentationMode !== "clone") return;
    
    const timegroup = this.getTimegroup();
    const cloneContainer = this.cloneOverlayRef.value;
    
    // Wait for both timegroup and container to be available
    if (!timegroup || !cloneContainer) {
      // Retry after a short delay
      setTimeout(() => this.initCloneOverlay(), 100);
      return;
    }
    
    // Store reference to timegroup
    this.cloneTimegroup = timegroup;
    
    // Disable the timegroup's own proxy mode - workbench handles cloning
    timegroup.proxyMode = false;
    
    // Ensure timegroup and its children have finished their initial render
    // before building the clone (custom elements need their shadow DOM ready)
    timegroup.updateComplete.then(() => {
      // Double-check we're still in clone mode
      if (this.presentationMode !== "clone") return;
      this.finishCloneSetup(timegroup, cloneContainer);
    });
  }
  
  private finishCloneSetup(timegroup: EFTimegroup, cloneContainer: HTMLDivElement) {
    
    // Hide the original timegroup but keep it rendering (critical for video frame decoding)
    // Using clip-path instead of opacity ensures video elements continue to decode frames
    timegroup.style.clipPath = "inset(100%)";
    timegroup.style.pointerEvents = "none";
    
    // Show the clone overlay container
    cloneContainer.style.display = "block";
    
    // Build initial clone
    this.rebuildClone(timegroup);
    
    // Watch for structural changes to rebuild clone
    this.setupStructureObserver(timegroup);
  }
  
  private rebuildClone(timegroup: EFTimegroup) {
    // Don't rebuild if we're not in clone mode
    if (this.presentationMode !== "clone") return;
    
    const container = this.cloneOverlayRef.value;
    if (!container) return;
    
    try {
      const { container: previewContainer, refresh, syncState } = renderTimegroupPreview(timegroup);
      
      container.innerHTML = "";
      previewContainer.classList.add("clone-content");
      container.appendChild(previewContainer);
      this.cloneRefresh = refresh;
      
      // Store reference to the root clone element
      this.cloneRootElement = syncState.tree.root?.clone as HTMLElement ?? null;
      
      // Ensure the clone root is visible and properly positioned
      // (opacity and position values get copied from hidden original which are wrong for clone context)
      if (this.cloneRootElement) {
        this.cloneRootElement.style.opacity = "1";
        this.cloneRootElement.style.clipPath = "none";
        this.cloneRootElement.style.position = "relative";
        this.cloneRootElement.style.inset = "auto";
        this.cloneRootElement.style.top = "0";
        this.cloneRootElement.style.right = "auto";
        this.cloneRootElement.style.bottom = "auto";
        this.cloneRootElement.style.left = "0";
      }
      
      // Apply current transform
      this.updateCloneTransform();
      
      // Re-observe shadow roots (new ones may have been created)
      this.observeShadowRoots(timegroup);
      
      // Start the sync loop if not already running
      if (this.cloneAnimationFrame === null) {
        this.startCloneLoop();
      }
    } catch (e) {
      console.error("Failed to build clone:", e);
    }
  }
  
  private setupStructureObserver(timegroup: EFTimegroup) {
    // Clean up existing observer
    if (this.structureObserver) {
      this.structureObserver.disconnect();
    }
    
    // Watch for structural changes (child additions/removals)
    // No special handling needed for batch operations - preview uses userTimeMs
    // which doesn't change during thumbnail/export captures
    this.structureObserver = new MutationObserver((mutations) => {
      // Don't process if we're no longer in clone mode
      if (this.presentationMode !== "clone") return;
      
      // Check if any mutation added/removed nodes
      const hasStructuralChange = mutations.some(m => 
        m.type === "childList" && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
      );
      
      if (hasStructuralChange && !this.rebuildPending) {
        this.rebuildPending = true;
        // Debounce rebuilds to batch rapid changes
        requestAnimationFrame(() => {
          this.rebuildPending = false;
          if (this.presentationMode === "clone") {
            this.rebuildClone(timegroup);
          }
        });
      }
    });
    
    // Observe the timegroup and all descendants for child changes
    this.structureObserver.observe(timegroup, {
      childList: true,
      subtree: true,
    });
    
    // Also observe shadow roots of custom elements
    this.observeShadowRoots(timegroup);
  }
  
  private observeShadowRoots(root: Element) {
    if (!this.structureObserver) return;
    
    // Walk the tree and observe any shadow roots
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node: Element | null = root;
    while (node) {
      if (node.shadowRoot) {
        this.structureObserver.observe(node.shadowRoot, {
          childList: true,
          subtree: true,
        });
      }
      node = walker.nextNode() as Element | null;
    }
  }
  
  private updateCloneTransform() {
    if (this.presentationMode !== "clone") return;
    
    const container = this.cloneOverlayRef.value;
    if (!container) return;
    
    const cloneContent = container.querySelector(".clone-content") as HTMLElement;
    if (!cloneContent) return;
    
    const { x, y, scale } = this.panZoomTransform;
    cloneContent.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  
  private startCloneLoop() {
    const loop = () => {
      // Stop the loop if we're no longer in clone mode
      if (this.presentationMode !== "clone" || !this.cloneRefresh) {
        this.cloneAnimationFrame = null;
        return;
      }
      
      // Skip sync during export to avoid wasting CPU
      // cloneRefresh uses userTimeMs which doesn't change during batch captures
      if (!this.isExporting) {
        this.cloneRefresh();
        // Restore visibility and position on root clone 
        // (syncing copies clip-path and position values from the hidden original,
        // which are relative to the workbench, not the clone container)
        if (this.cloneRootElement) {
          this.cloneRootElement.style.clipPath = "none";
          this.cloneRootElement.style.opacity = "1";
          // Reset position to fill the preview container
          this.cloneRootElement.style.position = "relative";
          this.cloneRootElement.style.inset = "auto";
          this.cloneRootElement.style.top = "0";
          this.cloneRootElement.style.right = "auto";
          this.cloneRootElement.style.bottom = "auto";
          this.cloneRootElement.style.left = "0";
        }
      }
      this.cloneAnimationFrame = requestAnimationFrame(loop);
    };
    this.cloneAnimationFrame = requestAnimationFrame(loop);
  }
  
  private stopCloneOverlay() {
    if (this.cloneAnimationFrame !== null) {
      cancelAnimationFrame(this.cloneAnimationFrame);
      this.cloneAnimationFrame = null;
    }
    if (this.structureObserver) {
      this.structureObserver.disconnect();
      this.structureObserver = null;
    }
    this.cloneRefresh = null;
    this.cloneRootElement = null;
    this.cloneTimegroup = null;
    this.rebuildPending = false;
    
    // Clear and hide the clone overlay container
    const container = this.cloneOverlayRef.value;
    if (container) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }
  
  private async handlePresentationModeChange(mode: PreviewPresentationMode) {
    if (mode === this.presentationMode) return;
    
    const previousMode = this.presentationMode;
    
    // Stop previous mode
    if (previousMode === "clone") {
      this.stopCloneOverlay();
    } else if (previousMode === "dom") {
      this.stopDomMode();
    } else if (previousMode === "canvas") {
      this.stopCanvasMode();
    }
    
    // Update state and persist
    this.presentationMode = mode;
    setPreviewPresentationMode(mode);
    
    // Wait for Lit to re-render (removes old overlay, adds new one if needed)
    await this.updateComplete;
    
    // Start new mode after DOM is updated
    if (mode === "clone") {
      this.initCloneOverlay();
    } else if (mode === "dom") {
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
    timegroup.proxyMode = false;
    
    // Show the original timegroup directly
    timegroup.style.clipPath = "";
    timegroup.style.pointerEvents = "";
  }
  
  private stopDomMode() {
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
   * Get the resolution scale for canvas rendering.
   * 
   * Logic:
   * - Get actual displayed size from getBoundingClientRect()
   * - For "Full": render at displayed size (1:1 pixel mapping)
   * - For other settings: render at that % of displayed size
   * - Never exceed composition size (100%)
   */
  private getResolutionScale(
    timegroup: EFTimegroup,
    _canvasContainer: HTMLElement
  ): number {
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
    
    console.log(`[EFWorkbench] Resolution scale:
  Composition (offsetWidth×offsetHeight): ${compositionWidth}×${compositionHeight}
  Displayed (boundingRect): ${Math.round(displayedWidth)}×${Math.round(displayedHeight)}
  Display scale: ${(displayScale * 100).toFixed(1)}%
  Setting: ${this.previewResolutionScale === 1 ? "Full" : `${Math.round(this.previewResolutionScale * 100)}%`}
  Final: ${(finalScale * 100).toFixed(1)}% → ${renderWidth}×${renderHeight}`);
    
    return finalScale;
  }
  
  private initCanvasMode() {
    // Don't initialize if we're no longer in canvas mode
    if (this.presentationMode !== "canvas") return;
    
    const timegroup = this.getTimegroup();
    const canvasContainer = this.canvasPreviewRef.value;
    
    // Wait for both timegroup and container to be available
    if (!timegroup || !canvasContainer) {
      setTimeout(() => this.initCanvasMode(), 100);
      return;
    }
    
    // Disable the timegroup's own proxy mode - workbench handles canvas rendering
    timegroup.proxyMode = false;
    
    // Hide the original timegroup
    timegroup.style.clipPath = "inset(100%)";
    timegroup.style.pointerEvents = "none";
    
    // Show the canvas container
    canvasContainer.style.display = "block";
    
    // Get resolution scale based on display size and user setting
    const resolutionScale = this.getResolutionScale(timegroup, canvasContainer);
    
    // Track zoom level for detecting significant changes
    this.lastCanvasZoom = this.panZoomTransform.scale;
    
    try {
      const { container, canvas, refresh } = renderTimegroupToCanvas(timegroup, {
        scale: 1,
        resolutionScale: resolutionScale,
      });
      
      this.canvasPreviewElement = canvas;
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
            await refresh();
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
    this.canvasPreviewElement = null;
    
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
  initCanvasRenderer(): { canvas: HTMLCanvasElement; refresh: () => Promise<void> } | null {
    const timegroup = this.getTimegroup();
    if (!timegroup) return null;
    
    try {
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
    this.renderMode = mode;
  }
  
  private handleResolutionScaleChange(scale: PreviewResolutionScale) {
    console.log(`[EFWorkbench] Resolution scale changed to ${scale}, presentationMode=${this.presentationMode}`);
    setPreviewResolutionScale(scale);
    this.previewResolutionScale = scale;
    this.previewSettings = { ...this.previewSettings, resolutionScale: scale };
    
    // Reinitialize canvas mode if active to apply new resolution
    // Note: presentationMode at runtime may be "clone" or "dom" (not in TS type but used in UI)
    if (this.presentationMode === "canvas") {
      console.log("[EFWorkbench] Reinitializing canvas mode with new resolution scale");
      this.stopCanvasMode();
      this.initCanvasMode();
    }
  }
  
  private handleDebugThumbnailTimestampsToggle(enabled: boolean) {
    this.debugThumbnailTimestamps = enabled;
    // Dispatch event so thumbnail strips can react
    this.dispatchEvent(new CustomEvent("ef-debug-thumbnail-timestamps-changed", {
      detail: { enabled },
      bubbles: true,
      composed: true,
    }));
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
          background: rgba(51, 65, 85, 0.4);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        ">
          <div style="color: #e2e8f0; font-size: 12px; font-weight: 500; margin-bottom: 10px;">Presentation Mode</div>
          
          <div style="display: flex; gap: 4px; background: rgba(30, 41, 59, 0.6); border-radius: 6px; padding: 3px;">
            <button
              @click=${() => this.handlePresentationModeChange("clone")}
              style="
                flex: 1;
                padding: 6px 10px;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.presentationMode === "clone" ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.presentationMode === "clone" ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.presentationMode === "clone" ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >Clone</button>
            <button
              @click=${() => this.handlePresentationModeChange("dom")}
              style="
                flex: 1;
                padding: 6px 10px;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.presentationMode === "dom" ? "rgba(34, 197, 94, 0.3)" : "transparent"};
                color: ${this.presentationMode === "dom" ? "#4ade80" : "#94a3b8"};
                border: 1px solid ${this.presentationMode === "dom" ? "rgba(34, 197, 94, 0.4)" : "transparent"};
              "
            >DOM</button>
            <button
              @click=${() => this.handlePresentationModeChange("canvas")}
              style="
                flex: 1;
                padding: 6px 10px;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.presentationMode === "canvas" ? "rgba(168, 85, 247, 0.3)" : "transparent"};
                color: ${this.presentationMode === "canvas" ? "#c084fc" : "#94a3b8"};
                border: 1px solid ${this.presentationMode === "canvas" ? "rgba(168, 85, 247, 0.4)" : "transparent"};
              "
            >Canvas</button>
          </div>
          
          <div style="margin-top: 8px; color: #64748b; font-size: 10px; line-height: 1.4;">
            ${this.presentationMode === "clone" 
              ? "Default. Shows a styled clone synced from the hidden original." 
              : this.presentationMode === "dom" 
                ? "Shows the real timegroup DOM directly." 
                : "Renders to canvas each frame (experimental)."}
          </div>
        </div>
        
        <!-- Render Mode Setting -->
        <div style="
          background: rgba(51, 65, 85, 0.4);
          border-radius: 8px;
          padding: 12px;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #e2e8f0; font-size: 12px; font-weight: 500;">Render Mode</span>
            ${isAvailable ? html`
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="
                  display: inline-block;
                  width: 7px;
                  height: 7px;
                  border-radius: 50%;
                  background: #4ade80;
                "></span>
                <span style="color: #4ade80; font-size: 10px; font-weight: 500;">
                  Native Available
                </span>
              </div>
            ` : ''}
          </div>
          
          <div style="display: flex; gap: 4px; background: rgba(30, 41, 59, 0.6); border-radius: 6px; padding: 3px;">
            <button
              @click=${() => this.handleRenderModeChange("foreignObject")}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.renderMode === "foreignObject" ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.renderMode === "foreignObject" ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.renderMode === "foreignObject" ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >foreignObject</button>
            <button
              @click=${() => this.handleRenderModeChange("native")}
              ?disabled=${!isAvailable}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: ${isAvailable ? 'pointer' : 'not-allowed'};
                transition: all 0.15s ease;
                background: ${this.renderMode === "native" ? "rgba(34, 197, 94, 0.3)" : "transparent"};
                color: ${this.renderMode === "native" ? "#4ade80" : isAvailable ? "#94a3b8" : "#64748b"};
                border: 1px solid ${this.renderMode === "native" ? "rgba(34, 197, 94, 0.4)" : "transparent"};
                opacity: ${isAvailable ? '1' : '0.5'};
              "
            >native</button>
          </div>
          
          <div style="margin-top: 8px; color: #64748b; font-size: 10px; line-height: 1.4;">
            ${this.renderMode === "foreignObject" 
              ? "SVG foreignObject serialization. Works everywhere but slower." 
              : "Chrome's drawElementImage API. Fastest, requires chrome://flags/#canvas-draw-element."}
          </div>
        </div>
        
        <!-- Preview Resolution Setting -->
        <div style="
          background: rgba(51, 65, 85, 0.4);
          border-radius: 8px;
          padding: 12px;
          margin-top: 10px;
        ">
          <div style="color: #e2e8f0; font-size: 12px; font-weight: 500; margin-bottom: 10px;">Preview Resolution</div>
          
          <div style="display: flex; gap: 4px; background: rgba(30, 41, 59, 0.6); border-radius: 6px; padding: 3px;">
            <button
              @click=${() => this.handleResolutionScaleChange(1)}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.previewResolutionScale === 1 ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.previewResolutionScale === 1 ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.previewResolutionScale === 1 ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >Full</button>
            <button
              @click=${() => this.handleResolutionScaleChange(0.75)}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.previewResolutionScale === 0.75 ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.previewResolutionScale === 0.75 ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.previewResolutionScale === 0.75 ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >3/4</button>
            <button
              @click=${() => this.handleResolutionScaleChange(0.5)}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.previewResolutionScale === 0.5 ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.previewResolutionScale === 0.5 ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.previewResolutionScale === 0.5 ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >1/2</button>
            <button
              @click=${() => this.handleResolutionScaleChange(0.25)}
              style="
                flex: 1;
                padding: 6px 8px;
                border: none;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                background: ${this.previewResolutionScale === 0.25 ? "rgba(59, 130, 246, 0.3)" : "transparent"};
                color: ${this.previewResolutionScale === 0.25 ? "#60a5fa" : "#94a3b8"};
                border: 1px solid ${this.previewResolutionScale === 0.25 ? "rgba(59, 130, 246, 0.4)" : "transparent"};
              "
            >1/4</button>
          </div>
          
          <div style="margin-top: 8px; color: #64748b; font-size: 10px; line-height: 1.4;">
            ${this.previewResolutionScale === 1 
              ? "Full: Matches display resolution (1:1 pixels, adapts to zoom)." 
              : `${Math.round(this.previewResolutionScale * 100)}%: Reduced quality for faster rendering.`}
            Canvas mode only.
          </div>
        </div>
        
        <!-- Debug Thumbnails Setting -->
        <div style="
          background: rgba(51, 65, 85, 0.4);
          border-radius: 8px;
          padding: 12px;
          margin-top: 10px;
        ">
          <label style="
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          ">
            <input
              type="checkbox"
              ?checked=${this.debugThumbnailTimestamps}
              @change=${(e: Event) => this.handleDebugThumbnailTimestampsToggle((e.target as HTMLInputElement).checked)}
              style="
                width: 14px;
                height: 14px;
                accent-color: #f59e0b;
                cursor: pointer;
              "
            />
            <span style="color: #e2e8f0; font-size: 12px; font-weight: 500;">Show Thumbnail Timestamps</span>
          </label>
          
          <div style="
            margin-top: 8px;
            color: #64748b;
            font-size: 10px;
            line-height: 1.4;
          ">
            Overlays capture timestamps on timeline thumbnails for debugging.
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
          <label style="display: block; color: #94a3b8; font-size: 11px; margin-bottom: 4px;">Scale</label>
          <select
            style="
              width: 100%;
              padding: 6px 10px;
              background: rgba(51, 65, 85, 0.8);
              border: 1px solid rgba(148, 163, 184, 0.2);
              border-radius: 5px;
              color: #e2e8f0;
              font-size: 12px;
              cursor: pointer;
            "
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
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              ?checked=${this.exportOptions.includeAudio}
              @change=${(e: Event) => this.updateExportOption("includeAudio", (e.target as HTMLInputElement).checked)}
              style="width: 14px; height: 14px; accent-color: #3b82f6;"
            />
            <span style="color: #e2e8f0; font-size: 12px;">Include Audio</span>
          </label>
        </div>
        
        <!-- In/Out Range -->
        <div style="margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 6px;">
            <input
              type="checkbox"
              ?checked=${this.exportOptions.useInOut}
              @change=${(e: Event) => this.updateExportOption("useInOut", (e.target as HTMLInputElement).checked)}
              style="width: 14px; height: 14px; accent-color: #3b82f6;"
            />
            <span style="color: #e2e8f0; font-size: 12px;">Custom Range</span>
          </label>
          
          ${this.exportOptions.useInOut ? html`
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
              <div>
                <label style="display: block; color: #94a3b8; font-size: 10px; margin-bottom: 2px;">In (ms)</label>
                <input
                  type="number"
                  min="0"
                  max=${durationMs}
                  .value=${String(this.exportOptions.inMs)}
                  @change=${(e: Event) => this.updateExportOption("inMs", Number((e.target as HTMLInputElement).value))}
                  style="
                    width: 100%;
                    padding: 5px 7px;
                    background: rgba(51, 65, 85, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 11px;
                    font-family: ui-monospace, monospace;
                  "
                />
              </div>
              <div>
                <label style="display: block; color: #94a3b8; font-size: 10px; margin-bottom: 2px;">Out (ms)</label>
                <input
                  type="number"
                  min="0"
                  max=${durationMs}
                  .value=${String(this.exportOptions.outMs)}
                  @change=${(e: Event) => this.updateExportOption("outMs", Number((e.target as HTMLInputElement).value))}
                  style="
                    width: 100%;
                    padding: 5px 7px;
                    background: rgba(51, 65, 85, 0.8);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 11px;
                    font-family: ui-monospace, monospace;
                  "
                />
              </div>
            </div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px;">
              Duration: ${this.formatTime(this.exportOptions.outMs - this.exportOptions.inMs)} / ${this.formatTime(durationMs)}
            </div>
          ` : html`
            <div style="color: #64748b; font-size: 10px;">
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
      statusColor = "#4ade80";
      statusText = "Complete!";
    } else if (isError) {
      statusColor = "#f87171";
      statusText = "Failed";
    } else if (isCancelled) {
      statusColor = "#fbbf24";
      statusText = "Cancelled";
    } else {
      statusColor = "#60a5fa";
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
              style="color: #f87171;"
              @click=${this.handleCancelClick}
            >Cancel</button>
          ` : null}
        </div>
        
        ${isRendering && p !== null ? html`
          ${p.framePreviewUrl ? html`
            <div style="margin-bottom: 10px; display: flex; justify-content: center;">
              <img 
                src=${p.framePreviewUrl} 
                alt="Current frame"
                style="
                  border-radius: 4px;
                  border: 1px solid rgba(148, 163, 184, 0.2);
                  max-width: 100%;
                  height: auto;
                "
              />
            </div>
          ` : null}
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 10px; font-family: ui-monospace, monospace; font-size: 10px;">
            <div>
              <div style="color: #64748b;">Frames</div>
              <div style="color: #e2e8f0;">${p.currentFrame} / ${p.totalFrames}</div>
            </div>
            <div>
              <div style="color: #64748b;">Time</div>
              <div style="color: #e2e8f0;">${this.formatTime(p.renderedMs)} / ${this.formatTime(p.totalDurationMs)}</div>
            </div>
            <div>
              <div style="color: #64748b;">Speed</div>
              <div style="color: ${p.speedMultiplier >= 1 ? "#4ade80" : "#fbbf24"};">${p.speedMultiplier.toFixed(2)}x</div>
            </div>
            <div>
              <div style="color: #64748b;">ETA</div>
              <div style="color: #e2e8f0;">${this.formatTime(p.estimatedRemainingMs)}</div>
            </div>
          </div>
        ` : null}
        
        <div style="height: 4px; background: rgba(51, 65, 85, 0.8); border-radius: 2px; overflow: hidden;">
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
      <div class="toolbar">
        <div class="toolbar-left">
          <!-- Future: Add more toolbar items here (zoom, etc.) -->
        </div>
        
        <div class="toolbar-right">
          <!-- Mode indicator (shown when not in default clone mode) -->
          ${this.presentationMode !== "clone" ? html`
            <span class="mode-indicator ${this.presentationMode}">
              ${this.presentationMode === "dom" ? "DOM" : "Canvas"}
            </span>
          ` : null}
          
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
              <div style="width: 12px; height: 12px; border: 2px solid rgba(96, 165, 250, 0.3); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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

  render() {
    if (this.rendering) {
      return html`
        <slot class="fixed inset-0 h-full w-full" name="canvas"></slot>
      `;
    }
    return html`
      <div
        class="grid h-full w-full"
        style="grid-template-rows: auto 1fr 280px; grid-template-columns: 280px 1fr; background-color: var(--workbench-bg);"
      >
        <!-- Top: Full-width Toolbar -->
        <div style="grid-row: 1 / 2; grid-column: 1 / -1;">
          ${this.renderToolbar()}
        </div>
        
        <!-- Left: Hierarchy Panel -->
        <div
          class="overflow-auto"
          style="grid-row: 2 / 3; grid-column: 1 / 2; background: rgb(30 41 59); border-right: 1px solid rgba(148, 163, 184, 0.2);"
        >
          <slot name="hierarchy"></slot>
        </div>

        <!-- Center: Canvas area -->
        <div
          class="canvas-container"
          style="grid-row: 2 / 3; grid-column: 2 / 3;"
          @wheel=${this.handleStageWheel}
        >
          <!-- Original timegroup (hidden in clone/canvas mode, visible in dom mode) -->
          <slot name="canvas"></slot>
          
          <!-- Clone overlay (visible in clone mode only) -->
          <div 
            class="clone-overlay" 
            ${ref(this.cloneOverlayRef)}
            style="display: ${this.presentationMode === "clone" ? "block" : "none"}"
          ></div>
          
          <!-- Canvas preview (visible in canvas mode only) -->
          <div 
            class="clone-overlay" 
            ${ref(this.canvasPreviewRef)}
            style="display: ${this.presentationMode === "canvas" ? "block" : "none"}"
          ></div>
        </div>

        <!-- Bottom: Timeline -->
        <div
          class="overflow-hidden"
          style="grid-row: 3 / 4; grid-column: 1 / -1; border-top: 1px solid rgba(148, 163, 184, 0.2);"
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
