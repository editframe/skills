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
    const controller = this;
    return {
      get selectedIds() {
        return controller.selectionModel.selectedIds;
      },
      get selectionMode() {
        return controller.selectionModel.selectionMode;
      },
      get boxSelectBounds() {
        return controller.selectionModel.boxSelectBounds;
      },
      select: (id: string) => {
        controller.selectionModel.select(id);
        // Event will trigger requestUpdate via event listener
      },
      selectMultiple: (ids: string[]) => {
        controller.selectionModel.selectMultiple(ids);
        // Event will trigger requestUpdate via event listener
      },
      addToSelection: (id: string) => {
        controller.selectionModel.addToSelection(id);
        // Event will trigger requestUpdate via event listener
      },
      deselect: (id: string) => {
        controller.selectionModel.deselect(id);
        // Event will trigger requestUpdate via event listener
      },
      toggle: (id: string) => {
        controller.selectionModel.toggle(id);
        // Event will trigger requestUpdate via event listener
      },
      clear: () => {
        controller.selectionModel.clear();
        // Event will trigger requestUpdate via event listener
      },
      startBoxSelect: (x: number, y: number) => {
        controller.selectionModel.startBoxSelect(x, y);
        queueMicrotask(() => controller.host.requestUpdate());
      },
      updateBoxSelect: (x: number, y: number) => {
        controller.selectionModel.updateBoxSelect(x, y);
        queueMicrotask(() => controller.host.requestUpdate());
      },
      endBoxSelect: (
        hitTest: (bounds: DOMRect) => string[],
        addToSelection?: boolean,
      ) => {
        const fn = hitTest || controller.hitTestFn;
        if (fn) {
          controller.selectionModel.endBoxSelect(fn, addToSelection ?? false);
        }
        // Event will trigger requestUpdate via event listener
      },
      createGroup: (ids: string[]) => {
        const groupId = controller.selectionModel.createGroup(ids);
        return groupId;
      },
      ungroup: (groupId: string) => {
        controller.selectionModel.ungroup(groupId);
      },
      selectGroup: (groupId: string) => {
        controller.selectionModel.selectGroup(groupId);
        // Event will trigger requestUpdate via event listener
      },
      getGroupId: (elementId: string) => {
        return controller.selectionModel.getGroupId(elementId);
      },
      getGroupElements: (groupId: string) => {
        return controller.selectionModel.getGroupElements(groupId);
      },
      addEventListener: (
        type: "selectionchange",
        listener: (event: CustomEvent) => void,
      ) => {
        controller.selectionModel.addEventListener(type, listener);
      },
      removeEventListener: (
        type: "selectionchange",
        listener: (event: CustomEvent) => void,
      ) => {
        controller.selectionModel.removeEventListener(type, listener);
      },
    };
  }
}
