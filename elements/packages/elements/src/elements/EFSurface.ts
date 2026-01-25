import { Task } from "@lit/task";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { ContextMixinInterface } from "../gui/ContextMixin.ts";
import { TargetController } from "./TargetController.ts";

@customElement("ef-surface")
export class EFSurface extends LitElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
      }
      canvas {
        all: inherit;
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ];

  canvasRef = createRef<HTMLCanvasElement>();

  // @ts-expect-error controller is intentionally not referenced directly
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for side effects
  #targetController: TargetController = new TargetController(this);

  @state()
  targetElement: ContextMixinInterface | null = null;

  @property({ type: String })
  target = "";

  render() {
    return html`<canvas ${ref(this.canvasRef)}></canvas>`;
  }

  // Provide minimal temporal-like properties so EFTimegroup can schedule us
  get rootTimegroup(): any {
    // Prefer the target element's root timegroup if available
    const target: any = this.targetElement;
    if (target && "rootTimegroup" in target) {
      return target.rootTimegroup;
    }
    // Fallback: nearest containing timegroup if any
    let root: any = this.closest("ef-timegroup");
    while (root?.parentTimegroup) {
      root = root.parentTimegroup;
    }
    return root;
  }

  get currentTimeMs(): number {
    return this.rootTimegroup?.currentTimeMs ?? 0;
  }

  get durationMs(): number {
    return this.rootTimegroup?.durationMs ?? 0;
  }

  get startTimeMs(): number {
    return this.rootTimegroup?.startTimeMs ?? 0;
  }

  get endTimeMs(): number {
    return this.startTimeMs + this.durationMs;
  }

  /**
   * Minimal integration with EFTimegroup's frame scheduling:
   * - Waits for the target video element's frameTask to complete (ensuring it painted)
   * - Copies the target's canvas into this element's canvas
   */
  frameTask = new Task(this, {
    autoRun: false,
    args: () => [this.targetElement] as const,
    onError: (error) => {
      // Attach catch to prevent unhandled rejection
      this.frameTask.taskComplete.catch(() => {});
      
      // Don't log AbortErrors - these are expected when element is disconnected
      const isAbortError = 
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("signal is aborted") ||
          error.message?.includes("The user aborted a request")
        );
      
      if (isAbortError) {
        return;
      }
      console.error("EFSurface frameTask error", error);
    },
    task: async ([target], { signal }) => {
      // Check abort before starting
      signal?.throwIfAborted();
      
      if (!target) return;

      // Ensure the target has painted its frame for this tick
      try {
        const maybeTask = (target as any).frameTask;
        if (maybeTask && typeof maybeTask.run === "function") {
          // Run (idempotent) and then wait for completion
          maybeTask.run().catch(() => {
            // AbortErrors are expected during cleanup
          });
          await maybeTask.taskComplete;
          // Check abort after async operation
          signal?.throwIfAborted();
        }
      } catch (error) {
        // Re-throw AbortError to propagate cancellation
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // Best-effort; continue to attempt copy for other errors
      }

      // Check abort before copy operation
      signal?.throwIfAborted();
      
      this.copyFromTarget(target);
    },
  });
  // CRITICAL: Attach .catch() handler IMMEDIATELY after creation
  { this.frameTask.taskComplete.catch(() => {}); }

  protected updated(): void {
    if (this.targetElement) {
      this.copyFromTarget(this.targetElement);
    }
  }

  // Target resolution is handled by TargetController. No implicit discovery.

  private getSourceCanvas(from: Element): HTMLCanvasElement | null {
    const anyEl = from as any;
    if ("canvasElement" in anyEl) {
      return anyEl.canvasElement ?? null;
    }
    const sr = (from as HTMLElement).shadowRoot;
    if (sr) {
      const c = sr.querySelector("canvas");
      return (c as HTMLCanvasElement) ?? null;
    }
    return null;
  }

  private copyFromTarget(target: Element) {
    const dst = this.canvasRef.value;
    const src = this.getSourceCanvas(target);
    if (!dst || !src) return;
    if (!src.width || !src.height) return;

    // Match source pixel size for a faithful mirror; layout scaling is handled by CSS
    if (dst.width !== src.width || dst.height !== src.height) {
      dst.width = src.width;
      dst.height = src.height;
    }

    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-surface": EFSurface;
  }
}
