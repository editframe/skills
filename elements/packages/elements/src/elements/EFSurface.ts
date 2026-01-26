import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { ContextMixinInterface } from "../gui/ContextMixin.ts";
import type { FrameRenderable, FrameState } from "../preview/FrameController.js";
import { TargetController } from "./TargetController.ts";

@customElement("ef-surface")
export class EFSurface extends LitElement implements FrameRenderable {
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
   * @deprecated Use FrameRenderable methods (prepareFrame, renderFrame) via FrameController instead.
   * This is a compatibility wrapper that delegates to the new system.
   */
  #frameTaskPromise: Promise<void> = Promise.resolve();
  
  frameTask = (() => {
    const self = this;
    const taskObj: { run(): void | Promise<void>; taskComplete: Promise<void> } = {
      run: () => {
        const abortController = new AbortController();
        const timeMs = self.currentTimeMs;
        self.#frameTaskPromise = (async () => {
          try {
            await self.prepareFrame(timeMs, abortController.signal);
            self.renderFrame(timeMs);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            throw error;
          }
        })();
        taskObj.taskComplete = self.#frameTaskPromise;
        return self.#frameTaskPromise;
      },
      taskComplete: Promise.resolve(),
    };
    return taskObj;
  })();

  // ============================================================================
  // FrameRenderable Implementation
  // Centralized frame control - replaces distributed Lit Task system
  // ============================================================================

  /**
   * Query readiness state for a given time.
   * @implements FrameRenderable
   */
  getFrameState(_timeMs: number): FrameState {
    // Surface is ready when target element exists
    const hasTarget = !!this.targetElement;

    return {
      needsPreparation: false, // Surface just copies, no async prep needed
      isReady: hasTarget,
      priority: 10, // Surface renders last (depends on other elements)
    };
  }

  /**
   * Async preparation - waits for target element's frameTask.
   * @implements FrameRenderable
   */
  async prepareFrame(_timeMs: number, signal: AbortSignal): Promise<void> {
    if (!this.targetElement) return;

    // Wait for target's frame to be ready
    const maybeTask = (this.targetElement as any).frameTask;
    if (maybeTask && typeof maybeTask.run === "function") {
      try {
        maybeTask.run().catch(() => {});
        await maybeTask.taskComplete;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          signal.throwIfAborted();
          return;
        }
        // Best-effort; continue to copy for other errors
      }
    }
    signal.throwIfAborted();
  }

  /**
   * Synchronous render - copies canvas from target element.
   * @implements FrameRenderable
   */
  renderFrame(_timeMs: number): void {
    if (this.targetElement) {
      this.copyFromTarget(this.targetElement);
    }
  }

  // ============================================================================
  // End FrameRenderable Implementation
  // ============================================================================

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
