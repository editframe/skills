import { css, html, LitElement, nothing, type PropertyValueMap } from "lit";
import { customElement, eventOptions, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

import { ContextMixin } from "./ContextMixin.js";
import { TWMixin } from "./TWMixin.js";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { renderTimegroupToCanvas } from "../preview/renderTimegroupToCanvas.js";
import { renderTimegroupPreview } from "../preview/renderTimegroupPreview.js";

// Side-effect import for template usage (pan-zoom is created in light DOM by wrapWithWorkbench)
import "./EFFitScale.js";

type PreviewMode = "original" | "computed" | "canvas";

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
      }
      
      :host(.dark), :host-context(.dark) {
        /* Dark mode colors */
        --workbench-bg: rgb(2 6 23); /* slate-950 */
        --workbench-overlay-border: rgb(96 165 250); /* blue-400 */
        --workbench-overlay-bg: rgb(30 58 138); /* blue-900 */
      }
      
      .preview-toolbar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        font-size: 12px;
        color: rgb(226 232 240);
      }
      
      .preview-toolbar label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
      }
      
      .preview-toolbar input[type="checkbox"] {
        cursor: pointer;
      }
      
      .preview-container {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      
      .preview-pane {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .preview-pane + .preview-pane {
        border-left: 2px solid rgba(148, 163, 184, 0.3);
      }
      
      .preview-label {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        font-size: 11px;
        border-radius: 4px;
        z-index: 10;
        pointer-events: none;
      }
      
      .preview-content-wrapper {
        position: absolute;
        inset: 0;
        transform-origin: 0 0;
      }
      
      .preview-content-wrapper > * {
        position: absolute;
        top: 0;
        left: 0;
      }
    `,
  ];

  @property({ type: Boolean })
  rendering = false;
  
  @state()
  private previewModes: Set<PreviewMode> = new Set(["original"]);
  
  @state()
  private panZoomTransform = { x: 0, y: 0, scale: 1 };
  
  private canvasPreviewRef = createRef<HTMLDivElement>();
  private canvasRefresh: (() => Promise<void>) | null = null;
  private canvasAnimationFrame: number | null = null;
  
  private computedPreviewRef = createRef<HTMLDivElement>();
  private computedRefresh: (() => void) | null = null;
  private computedAnimationFrame: number | null = null;
  
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
    this.stopCanvasPreview();
    this.stopComputedPreview();
    this.removeEventListener("transform-changed", this.boundHandleTransformChanged as EventListener);
  }
  
  private handleTransformChanged(e: CustomEvent<{ x: number; y: number; scale: number }>) {
    this.panZoomTransform = e.detail;
  }
  
  private getTimegroup(): EFTimegroup | null {
    // Find the timegroup in our canvas slot
    const canvas = this.querySelector("[slot='canvas']");
    if (!canvas) return null;
    return canvas.querySelector("ef-timegroup") as EFTimegroup | null;
  }
  
  private togglePreviewMode(mode: PreviewMode, checked: boolean) {
    const newModes = new Set(this.previewModes);
    if (checked) {
      newModes.add(mode);
    } else {
      newModes.delete(mode);
      // Ensure at least one mode is selected
      if (newModes.size === 0) {
        newModes.add("original");
      }
    }
    this.previewModes = newModes;
    // Disable proxy mode - we show all previews separately
    const timegroup = this.getTimegroup();
    if (timegroup) {
      timegroup.proxyMode = false;
    }
    this.updateComputedPreview();
    this.updateCanvasPreview();
  }
  
  private updateComputedPreview() {
    const showComputed = this.previewModes.has("computed");
    
    if (showComputed && !this.computedRefresh) {
      this.initComputedPreview();
    } else if (!showComputed && this.computedRefresh) {
      this.stopComputedPreview();
    }
  }
  
  private initComputedPreview() {
    const timegroup = this.getTimegroup();
    if (!timegroup) return;
    
    // Wait for next frame to ensure container is rendered
    requestAnimationFrame(() => {
      const container = this.computedPreviewRef.value;
      if (!container) return;
      
      try {
        const { container: previewContainer, refresh } = renderTimegroupPreview(timegroup);
        container.innerHTML = "";
        // Scale to fit the container
        previewContainer.style.transformOrigin = "top left";
        previewContainer.style.transform = "scale(var(--preview-scale, 1))";
        container.appendChild(previewContainer);
        this.computedRefresh = refresh;
        this.startComputedLoop();
      } catch (e) {
        console.error("Failed to init computed preview:", e);
      }
    });
  }
  
  private startComputedLoop() {
    const loop = () => {
      if (this.computedRefresh) {
        this.computedRefresh();
        this.computedAnimationFrame = requestAnimationFrame(loop);
      }
    };
    this.computedAnimationFrame = requestAnimationFrame(loop);
  }
  
  private stopComputedPreview() {
    if (this.computedAnimationFrame !== null) {
      cancelAnimationFrame(this.computedAnimationFrame);
      this.computedAnimationFrame = null;
    }
    this.computedRefresh = null;
    const container = this.computedPreviewRef.value;
    if (container) {
      container.innerHTML = "";
    }
  }
  
  private updateCanvasPreview() {
    const showCanvas = this.previewModes.has("canvas");
    
    if (showCanvas && !this.canvasRefresh) {
      this.initCanvasPreview();
    } else if (!showCanvas && this.canvasRefresh) {
      this.stopCanvasPreview();
    }
  }
  
  private initCanvasPreview() {
    const timegroup = this.getTimegroup();
    if (!timegroup) return;
    
    // Wait for next frame to ensure container is rendered
    requestAnimationFrame(() => {
      const container = this.canvasPreviewRef.value;
      if (!container) return;
      
      try {
        const { canvas, refresh } = renderTimegroupToCanvas(timegroup, 1);
        container.innerHTML = "";
        container.appendChild(canvas);
        this.canvasRefresh = refresh;
        this.startCanvasLoop();
      } catch (e) {
        console.error("Failed to init canvas preview:", e);
      }
    });
  }
  
  private startCanvasLoop() {
    const loop = async () => {
      if (this.canvasRefresh) {
        await this.canvasRefresh();
        this.canvasAnimationFrame = requestAnimationFrame(loop);
      }
    };
    this.canvasAnimationFrame = requestAnimationFrame(loop);
  }
  
  private stopCanvasPreview() {
    if (this.canvasAnimationFrame !== null) {
      cancelAnimationFrame(this.canvasAnimationFrame);
      this.canvasAnimationFrame = null;
    }
    this.canvasRefresh = null;
    const container = this.canvasPreviewRef.value;
    if (container) {
      container.innerHTML = "";
    }
  }

  update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    super.update(changedProperties);

    if (changedProperties.has("focusedElement")) {
      this.drawOverlays();
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

  private renderPreviewToolbar() {
    return html`
      <div class="preview-toolbar">
        <span>Preview:</span>
        <label>
          <input 
            type="checkbox" 
            ?checked=${this.previewModes.has("original")}
            @change=${(e: Event) => this.togglePreviewMode("original", (e.target as HTMLInputElement).checked)}
          />
          Original
        </label>
        <label>
          <input 
            type="checkbox" 
            ?checked=${this.previewModes.has("computed")}
            @change=${(e: Event) => this.togglePreviewMode("computed", (e.target as HTMLInputElement).checked)}
          />
          ComputedStyles
        </label>
        <label>
          <input 
            type="checkbox" 
            ?checked=${this.previewModes.has("canvas")}
            @change=${(e: Event) => this.togglePreviewMode("canvas", (e.target as HTMLInputElement).checked)}
          />
          Canvas
        </label>
      </div>
    `;
  }
  
  private renderPreviewPanes() {
    const panes: ReturnType<typeof html>[] = [];
    const showOriginal = this.previewModes.has("original");
    const showComputed = this.previewModes.has("computed");
    const showCanvas = this.previewModes.has("canvas");
    const { x, y, scale } = this.panZoomTransform;
    
    // Track which visible position each pane is in (for strip offset calculation)
    let visibleIndex = 0;
    
    // Original - ALWAYS render the slot so timegroup stays in DOM and animations run
    // When hidden, use position:absolute and opacity:0 to keep it rendering but invisible
    const hiddenStyle = "position: absolute; opacity: 0; pointer-events: none; width: 100%; height: 100%;";
    const originalVisibleIndex = showOriginal ? visibleIndex++ : -1;
    panes.push(html`
      <div 
        class="preview-pane" 
        style="${showOriginal ? '' : hiddenStyle}"
        @wheel=${this.handleStageWheel}
      >
        ${showOriginal ? html`<span class="preview-label">Original</span>` : nothing}
        <slot name="canvas" class="contents h-full w-full block"></slot>
      </div>
    `);
    
    // ComputedStyles - offset to show complementary strip
    // Each subsequent pane offsets by 100% (its own width) to show the next strip
    if (showComputed) {
      const computedVisibleIndex = visibleIndex++;
      const offsetPercent = computedVisibleIndex * 100;
      const transformStyle = `transform: translate(calc(${x}px - ${offsetPercent}%), ${y}px) scale(${scale});`;
      panes.push(html`
        <div class="preview-pane">
          <span class="preview-label">ComputedStyles</span>
          <div class="preview-content-wrapper" style="${transformStyle}" ${ref(this.computedPreviewRef)}></div>
        </div>
      `);
    }
    
    // Canvas - offset to show the last strip
    if (showCanvas) {
      const canvasVisibleIndex = visibleIndex++;
      const offsetPercent = canvasVisibleIndex * 100;
      const transformStyle = `transform: translate(calc(${x}px - ${offsetPercent}%), ${y}px) scale(${scale});`;
      panes.push(html`
        <div class="preview-pane">
          <span class="preview-label">Canvas</span>
          <div class="preview-content-wrapper" style="${transformStyle}" ${ref(this.canvasPreviewRef)}></div>
        </div>
      `);
    }
    
    return panes;
  }

  render() {
    // TODO: this.rendering is not correctly set when using the framegen bridge
    // so to hack we're checking for the existence of EF_RENDERING on the window
    if (
      this.rendering ||
      (typeof window !== "undefined" && window.EF_RENDERING?.() === true)
    ) {
      return html`
        <slot class="fixed inset-0 h-full w-full" name="canvas"></slot>
      `;
    }
    return html`
      <div
        class="grid h-full w-full"
        style="grid-template-rows: auto 1fr 280px; grid-template-columns: 280px 1fr; background-color: var(--workbench-bg);"
      >
        <!-- Top: Preview Mode Toolbar (spans full width above canvas) -->
        <div style="grid-row: 1 / 2; grid-column: 2 / 3;">
          ${this.renderPreviewToolbar()}
        </div>
        
        <!-- Left: Hierarchy Panel -->
        <div
          class="overflow-auto"
          style="grid-row: 1 / 3; grid-column: 1 / 2; background: rgb(30 41 59); border-right: 1px solid rgba(148, 163, 184, 0.2);"
        >
          <slot name="hierarchy"></slot>
        </div>

        <!-- Center: Canvas/Preview Panes -->
        <div
          class="preview-container"
          style="grid-row: 2 / 3; grid-column: 2 / 3;"
        >
          ${this.renderPreviewPanes()}
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
