import type { ReactiveController, ReactiveControllerHost } from "lit";
import { SelectionModel } from "./SelectionModel.js";
import type { SelectionContext } from "./selectionContext.js";

/**
 * Reactive controller that bridges SelectionModel and Lit element lifecycle.
 * Provides selection context to child elements.
 */
export class SelectionController implements ReactiveController {
  private host: ReactiveControllerHost;
  private selectionModel: SelectionModel;
  private hitTestFn: ((bounds: DOMRect) => string[]) | null = null;
  selectionContext: SelectionContext;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    this.selectionModel = new SelectionModel();
    this.selectionContext = this.createContextProxy();
    host.addController(this);

    // Listen to selection change events from the model
    // Use queueMicrotask to defer the update and avoid Lit warning about
    // scheduling updates after update completed (change-in-update)
    this.selectionModel.addEventListener("selectionchange", () => {
      queueMicrotask(() => this.host.requestUpdate());
    });
  }

  hostConnected(): void {
    // Context is provided via @provide decorator
  }

  hostDisconnected(): void {
    // Cleanup if needed
  }

  /**
   * Set the hit test function for box selection.
   */
  setHitTest(fn: (bounds: DOMRect) => string[]): void {
    this.hitTestFn = fn;
  }

  /**
   * Get the underlying selection model.
   */
  getModel(): SelectionModel {
    return this.selectionModel;
  }

  /**
   * Create a proxy context that delegates to the selection model.
   */
  private createContextProxy(): SelectionContext {
    const selectionModel = this.selectionModel;
    const getHost = () => this.host;
    const getHitTestFn = () => this.hitTestFn;
    return new Proxy(
      {
        select: (id: string) => {
          selectionModel.select(id);
          // Event will trigger requestUpdate via event listener
        },
        selectMultiple: (ids: string[]) => {
          selectionModel.selectMultiple(ids);
          // Event will trigger requestUpdate via event listener
        },
        addToSelection: (id: string) => {
          selectionModel.addToSelection(id);
          // Event will trigger requestUpdate via event listener
        },
        deselect: (id: string) => {
          selectionModel.deselect(id);
          // Event will trigger requestUpdate via event listener
        },
        toggle: (id: string) => {
          selectionModel.toggle(id);
          // Event will trigger requestUpdate via event listener
        },
        clear: () => {
          selectionModel.clear();
          // Event will trigger requestUpdate via event listener
        },
        startBoxSelect: (x: number, y: number) => {
          selectionModel.startBoxSelect(x, y);
          queueMicrotask(() => getHost().requestUpdate());
        },
        updateBoxSelect: (x: number, y: number) => {
          selectionModel.updateBoxSelect(x, y);
          queueMicrotask(() => getHost().requestUpdate());
        },
        endBoxSelect: (hitTest: (bounds: DOMRect) => string[], addToSelection?: boolean) => {
          const fn = hitTest || getHitTestFn();
          if (fn) {
            selectionModel.endBoxSelect(fn, addToSelection ?? false);
          }
          // Event will trigger requestUpdate via event listener
        },
        createGroup: (ids: string[]) => {
          const groupId = selectionModel.createGroup(ids);
          return groupId;
        },
        ungroup: (groupId: string) => {
          selectionModel.ungroup(groupId);
        },
        selectGroup: (groupId: string) => {
          selectionModel.selectGroup(groupId);
          // Event will trigger requestUpdate via event listener
        },
        getGroupId: (elementId: string) => {
          return selectionModel.getGroupId(elementId);
        },
        getGroupElements: (groupId: string) => {
          return selectionModel.getGroupElements(groupId);
        },
        addEventListener: (type: "selectionchange", listener: (event: CustomEvent) => void) => {
          selectionModel.addEventListener(type, listener as EventListener);
        },
        removeEventListener: (type: "selectionchange", listener: (event: CustomEvent) => void) => {
          selectionModel.removeEventListener(type, listener as EventListener);
        },
      } as Omit<SelectionContext, "selectedIds" | "selectionMode" | "boxSelectBounds">,
      {
        get(target, prop) {
          if (prop === "selectedIds") {
            return selectionModel.selectedIds;
          }
          if (prop === "selectionMode") {
            return selectionModel.selectionMode;
          }
          if (prop === "boxSelectBounds") {
            return selectionModel.boxSelectBounds;
          }
          return (target as any)[prop];
        },
      },
    ) as SelectionContext;
  }
}
