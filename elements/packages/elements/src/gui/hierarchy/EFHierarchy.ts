import { consume, provide } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { isEFTemporal } from "../../elements/EFTemporal.js";
import { selectionContext } from "../../canvas/selection/selectionContext.js";
import { TargetController } from "../../elements/TargetController.js";
import { TWMixin } from "../TWMixin.js";
import {
  type HierarchyActions,
  type HierarchyContext,
  type HierarchyState,
  hierarchyContext,
} from "./hierarchyContext.js";
import { renderHierarchyChildren } from "./EFHierarchyItem.js";
import { type FocusContext, focusContext } from "../focusContext.js";

@customElement("ef-hierarchy")
export class EFHierarchy extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        overflow: auto;
        font-size: 12px;
        
        --hierarchy-bg: rgb(30 41 59);
        --hierarchy-border: rgb(71 85 105);
        --hierarchy-text: rgb(226 232 240);
        --hierarchy-hover-bg: rgba(148, 163, 184, 0.2);
        --hierarchy-selected-bg: rgba(59, 130, 246, 0.3);
        --hierarchy-ancestor-selected-bg: rgba(59, 130, 246, 0.15);
        --hierarchy-focused-bg: rgba(148, 163, 184, 0.4);
        --hierarchy-drop-indicator: #3b82f6;
      }
      
      :host(.light) {
        --hierarchy-bg: rgb(241 245 249);
        --hierarchy-border: rgb(203 213 225);
        --hierarchy-text: rgb(30 41 59);
        --hierarchy-hover-bg: rgba(100, 116, 139, 0.15);
        --hierarchy-selected-bg: rgba(59, 130, 246, 0.2);
        --hierarchy-ancestor-selected-bg: rgba(59, 130, 246, 0.1);
        --hierarchy-focused-bg: rgba(100, 116, 139, 0.25);
      }
      
      .hierarchy-container {
        background: var(--hierarchy-bg);
        color: var(--hierarchy-text);
        min-height: 100%;
        padding: 4px 0;
      }
      
      .header {
        padding: 8px 12px;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(148, 163, 184, 0.8);
        border-bottom: 1px solid var(--hierarchy-border);
        margin-bottom: 4px;
      }
      
      .empty {
        padding: 16px;
        text-align: center;
        color: rgba(148, 163, 184, 0.6);
        font-style: italic;
      }
    `,
  ];

  @property({ type: String })
  target = "";

  @property({ type: String })
  header = "Hierarchy";

  @property({ type: Boolean, attribute: "show-header" })
  showHeader = true;

  /**
   * Component ID or selector to sync hover state with.
   * When set, the hierarchy will listen to hover events from the specified component
   * and update its focused element state accordingly.
   * 
   * Examples:
   * - `sync-hover="timeline"` - sync with element with id="timeline"
   * - `sync-hover="ef-timeline"` - sync with first ef-timeline element
   * - `sync-hover="#my-timeline"` - sync with element with id="my-timeline"
   */
  @property({ type: String, attribute: "sync-hover" })
  syncHover = "";

  /**
   * Component ID or selector to sync selection state with.
   * When set, the hierarchy will listen to selection events from the specified component.
   * 
   * Note: Selection is typically synced automatically via selectionContext.
   * This attribute is for explicit syncing when selectionContext is not available.
   * 
   * Examples:
   * - `sync-selection="timeline"` - sync with element with id="timeline"
   * - `sync-selection="ef-timeline"` - sync with first ef-timeline element
   */
  @property({ type: String, attribute: "sync-selection" })
  syncSelection = "";

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  @state()
  targetElement: Element | null = null;

  private targetController?: TargetController;
  private syncHoverHandler?: (e: Event) => void;
  private syncSelectionHandler?: (e: Event) => void;
  private syncedHoverComponent: HTMLElement | null = null;
  private syncedSelectionComponent: HTMLElement | null = null;
  private isSyncingHover = false;
  private isSyncingSelection = false;

  @consume({ context: selectionContext, subscribe: true })
  canvasSelectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

  @consume({ context: focusContext, subscribe: true })
  focusContextValue?: FocusContext;

  /**
   * Get canvas selection context from the target canvas element.
   * Used when hierarchy is a sibling of canvas (can't access via Lit context).
   */
  private getCanvasSelectionContext():
    | import("../../canvas/selection/selectionContext.js").SelectionContext
    | undefined {
    // First try Lit context (works when hierarchy is inside canvas)
    if (this.canvasSelectionContext) {
      return this.canvasSelectionContext;
    }
    // Use target element (from TargetController or direct lookup)
    const target = this.getTargetElement();
    if (target && (target as any).selectionContext) {
      return (target as any).selectionContext;
    }
    return undefined;
  }

  @state()
  private hierarchyState: HierarchyState = {
    selectedElementId: null,
    expandedIds: new Set(),
    draggedElementId: null,
    dropTargetId: null,
    dropPosition: null,
  };

  private selectionChangeHandler?: (event: CustomEvent) => void;

  private hierarchyActions: HierarchyActions = {
    select: (elementId: string | null) => {
      const selectionCtx = this.getCanvasSelectionContext();
      if (selectionCtx) {
        if (elementId) {
          // Ensure element is registered with canvas before selecting
          const element = document.getElementById(elementId);
          if (element) {
            // Find the canvas element
            const canvas = element.closest("ef-canvas") as any;
            if (canvas && canvas.tryRegisterElement) {
              // Try to register if not already registered
              canvas.tryRegisterElement(element);
            }
          }

          // Select the element directly by its ID
          selectionCtx.select(elementId);
        } else {
          selectionCtx.clear();
        }
      } else {
        this.hierarchyState = {
          ...this.hierarchyState,
          selectedElementId: elementId,
        };
      }
      this.dispatchEvent(
        new CustomEvent("hierarchy-select", {
          detail: { elementId },
          bubbles: true,
          composed: true,
        }),
      );
    },

    toggleExpanded: (elementId: string) => {
      const newExpanded = new Set(this.hierarchyState.expandedIds);
      if (newExpanded.has(elementId)) {
        newExpanded.delete(elementId);
      } else {
        newExpanded.add(elementId);
      }
      this.hierarchyState = {
        ...this.hierarchyState,
        expandedIds: newExpanded,
      };
    },

    setExpanded: (elementId: string, expanded: boolean) => {
      const newExpanded = new Set(this.hierarchyState.expandedIds);
      if (expanded) {
        newExpanded.add(elementId);
      } else {
        newExpanded.delete(elementId);
      }
      this.hierarchyState = {
        ...this.hierarchyState,
        expandedIds: newExpanded,
      };
    },

    startDrag: (elementId: string) => {
      this.hierarchyState = {
        ...this.hierarchyState,
        draggedElementId: elementId,
      };
    },

    updateDropTarget: (
      targetId: string | null,
      position: "before" | "after" | "inside" | null,
    ) => {
      if (targetId === this.hierarchyState.draggedElementId) {
        return;
      }
      this.hierarchyState = {
        ...this.hierarchyState,
        dropTargetId: targetId,
        dropPosition: position,
      };
    },

    endDrag: () => {
      this.hierarchyState = {
        ...this.hierarchyState,
        draggedElementId: null,
        dropTargetId: null,
        dropPosition: null,
      };
    },

    reorder: (
      sourceId: string,
      targetId: string,
      position: "before" | "after" | "inside",
    ) => {
      this.dispatchEvent(
        new CustomEvent("hierarchy-reorder", {
          detail: { sourceId, targetId, position },
          bubbles: true,
          composed: true,
        }),
      );
    },
  };

  @provide({ context: hierarchyContext })
  @state()
  private providedContext: HierarchyContext = {
    state: this.hierarchyState,
    actions: this.hierarchyActions,
    getCanvasSelectionContext: () => this.getCanvasSelectionContext(),
  };

  private getTargetElement(): Element | null {
    // First try TargetController (for registered elements like EFCanvas)
    if (this.targetElement) {
      return this.targetElement;
    }
    // Fall back to direct lookup for any element with matching ID
    if (this.target) {
      return document.getElementById(this.target);
    }
    return null;
  }

  private getRootElements(): Element[] {
    const target = this.getTargetElement();
    if (!target) return [];

    if (isEFTemporal(target)) {
      return [target];
    }

    return Array.from(target.children);
  }

  private initializeExpandedState(): void {
    const roots = this.getRootElements();
    const newExpanded = new Set<string>();

    const addExpandedIds = (element: Element) => {
      if (element.id) {
        newExpanded.add(element.id);
      }
      for (const child of Array.from(element.children)) {
        if (child.children.length > 0) {
          addExpandedIds(child);
        }
      }
    };

    for (const root of roots) {
      addExpandedIds(root);
    }

    this.hierarchyState = {
      ...this.hierarchyState,
      expandedIds: newExpanded,
    };
  }

  select(elementId: string | null): void {
    this.hierarchyActions.select(elementId);
  }

  getSelectedElementId(): string | null {
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx) {
      const selectedIds = Array.from(selectionCtx.selectedIds);
      if (selectedIds.length === 0) {
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return selectedIds[0]!;
    }
    return this.hierarchyState.selectedElementId;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    // Set up TargetController if target changes
    if (changedProperties.has("target") && !this.targetController) {
      this.targetController = new TargetController(this as any);
    }

    // Retry setting up selection listener if not yet connected
    this.setupSelectionListener();

    // Check for selection changes from canvas (via context or direct access)
    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx) {
      const selectedIds = Array.from(selectionCtx.selectedIds);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const selectedId: string | null =
        selectedIds.length === 0 ? null : selectedIds[0]!;

      if (this.hierarchyState.selectedElementId !== selectedId) {
        this.hierarchyState = {
          ...this.hierarchyState,
          selectedElementId: selectedId,
        };
      }
    }

    // Re-setup sync listeners when sync attributes change
    if (
      changedProperties.has("syncHover") ||
      changedProperties.has("syncSelection")
    ) {
      this.setupSyncListeners();
    }

    // Update provided context when state or targetElement changes
    if (
      changedProperties.has("hierarchyState") ||
      changedProperties.has("targetElement")
    ) {
      this.providedContext = {
        state: this.hierarchyState,
        actions: this.hierarchyActions,
        getCanvasSelectionContext: () => this.getCanvasSelectionContext(),
      };
    }

    super.willUpdate(changedProperties);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeExpandedState();
    this.setupSelectionListener();
    this.setupSyncListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeSelectionListener();
    this.removeSyncListeners();
  }

  private setupSelectionListener(): void {
    // Don't set up if already set up
    if (this.selectionChangeHandler) {
      return;
    }

    const selectionCtx = this.getCanvasSelectionContext();
    if (selectionCtx && "addEventListener" in selectionCtx) {
      this.selectionChangeHandler = () => {
        this.requestUpdate(); // Trigger re-render to update hierarchy items
      };
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
      this.selectionChangeHandler = undefined;
    }
  }

  /**
   * Find component to sync with based on ID or selector.
   */
  private findSyncComponent(selector: string): HTMLElement | null {
    if (!selector) return null;

    // Try as ID first
    const byId = document.getElementById(selector);
    if (byId) return byId;

    // Try as selector (e.g., "ef-timeline", "#my-timeline")
    try {
      const bySelector = document.querySelector(selector) as HTMLElement | null;
      if (bySelector) return bySelector;
    } catch {
      // Invalid selector, ignore
    }

    return null;
  }

  /**
   * Setup sync listeners for hover and selection.
   */
  private setupSyncListeners(): void {
    this.removeSyncListeners();

    // Setup hover sync - listen to timeline row-hover and canvas-hover events
    if (this.syncHover) {
      const hoverComponent = this.findSyncComponent(this.syncHover);
      if (hoverComponent) {
        this.syncedHoverComponent = hoverComponent;
        this.syncHoverHandler = (e: Event) => {
          // Check if event originated from or bubbled through the synced component
          // For row-hover events from timeline, check if they came from within the timeline
          const target = e.target as Node;
          const eventPath = e.composedPath();
          
          // Check if the synced component is in the event path (for bubbling events)
          const isFromSyncedComponent = 
            hoverComponent === target || 
            hoverComponent.contains(target) ||
            eventPath.includes(hoverComponent);
          
          if (!isFromSyncedComponent) {
            return;
          }
          
          const customEvent = e as CustomEvent<{ element: HTMLElement | null }>;
          if (customEvent.detail && this.focusContextValue && !this.isSyncingHover) {
            this.isSyncingHover = true;
            try {
              // Update focused element via focusContext for cross-view hover highlighting
              this.focusContextValue.focusedElement = customEvent.detail.element;
            } finally {
              this.isSyncingHover = false;
            }
          }
        };
        // Listen on document to catch bubbling events from timeline rows and canvas elements
        document.addEventListener("row-hover", this.syncHoverHandler);
        document.addEventListener("canvas-hover", this.syncHoverHandler);
      }
    }

    // Setup selection sync - listen to timeline row-select events
    // Note: Selection is already synced via selectionContext, but this handles
    // cases where timeline row-select fires before selectionContext updates.
    if (this.syncSelection) {
      const selectionComponent = this.findSyncComponent(this.syncSelection);
      if (selectionComponent) {
        this.syncedSelectionComponent = selectionComponent;
        this.syncSelectionHandler = (e: Event) => {
          // Only handle events that originated from or bubbled through the synced component
          const target = e.target as Node;
          if (target && selectionComponent !== target && !selectionComponent.contains(target)) {
            return;
          }
          const customEvent = e as CustomEvent<{
            elementId: string;
            element: HTMLElement;
          }>;
          if (customEvent.detail && customEvent.detail.elementId && !this.isSyncingSelection) {
            this.isSyncingSelection = true;
            try {
              // Check if already selected to avoid redundant updates
              const selectionCtx = this.getCanvasSelectionContext();
              const currentSelection = selectionCtx ? Array.from(selectionCtx.selectedIds) : [];
              if (!currentSelection.includes(customEvent.detail.elementId)) {
                // Select via hierarchy actions (which will sync with canvas)
                this.hierarchyActions.select(customEvent.detail.elementId);
              }
            } finally {
              this.isSyncingSelection = false;
            }
          }
        };
        // Listen on document to catch bubbling events from timeline rows
        document.addEventListener("row-select", this.syncSelectionHandler);
      }
    }
  }

  /**
   * Remove sync listeners.
   */
  private removeSyncListeners(): void {
    if (this.syncHoverHandler) {
      document.removeEventListener("row-hover", this.syncHoverHandler);
      document.removeEventListener("canvas-hover", this.syncHoverHandler);
      this.syncedHoverComponent = null;
      this.syncHoverHandler = undefined;
    }

    if (this.syncSelectionHandler) {
      document.removeEventListener("row-select", this.syncSelectionHandler);
      this.syncedSelectionComponent = null;
      this.syncSelectionHandler = undefined;
    }
  }

  render() {
    const roots = this.getRootElements();

    return html`
      <div class="hierarchy-container">
        ${this.showHeader ? html`<div class="header">${this.header}</div>` : nothing}
        ${
          roots.length > 0
            ? renderHierarchyChildren(
                roots,
                this.hideSelectors,
                this.showSelectors,
                true,
              )
            : html`<div class="empty">No elements</div>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-hierarchy": EFHierarchy;
  }
}
