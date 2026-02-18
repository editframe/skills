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
import type { EFCanvas } from "../../canvas/EFCanvas.js";

@customElement("ef-hierarchy")
export class EFHierarchy extends TWMixin(LitElement) {
  static styles = [
    css`
      :host {
        display: block;
        overflow: auto;
        height: 100%;
        font-size: 12px;
        
        /* Component tokens (reference globals from ef-theme.css) */
        --hierarchy-bg: var(--ef-color-bg);
        --hierarchy-border: var(--ef-color-border);
        --hierarchy-text: var(--ef-color-text);
        --hierarchy-hover-bg: var(--ef-color-hover);
        --hierarchy-selected-bg: var(--ef-color-selected);
        --hierarchy-ancestor-selected-bg: var(--ef-color-selected-subtle);
        --hierarchy-focused-bg: var(--ef-color-focused);
        --hierarchy-drop-indicator: var(--ef-color-primary);
      }
      
      .hierarchy-container {
        background: var(--hierarchy-bg);
        color: var(--hierarchy-text);
        padding: 4px 0;
      }
      
      .header {
        padding: 8px 12px;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ef-color-text-muted);
        border-bottom: 1px solid var(--hierarchy-border);
        margin-bottom: 4px;
      }
      
      .empty {
        padding: 16px;
        text-align: center;
        color: var(--ef-color-text-subtle);
        font-style: italic;
      }
    `,
  ];

  @property({ type: String })
  target = "";

  @property({ type: String })
  header = "";

  @property({ type: Boolean, attribute: "show-header" })
  showHeader = false;

  @property({ type: Array, attribute: false })
  hideSelectors?: string[];

  @property({ type: Array, attribute: false })
  showSelectors?: string[];

  @state()
  targetElement: Element | null = null;

  private targetController?: TargetController;

  @consume({ context: selectionContext, subscribe: true })
  canvasSelectionContext?: import("../../canvas/selection/selectionContext.js").SelectionContext;

  /**
   * Get the target canvas element.
   * The canvas is the source of truth for selection and highlight state.
   */
  private getCanvas(): EFCanvas | null {
    // First try TargetController (for registered elements like EFCanvas)
    if (this.targetElement && (this.targetElement as any).selectionContext) {
      return this.targetElement as EFCanvas;
    }
    // Fall back to direct lookup for any element with matching ID
    if (this.target) {
      const target = document.getElementById(this.target);
      if (target && (target as any).selectionContext) {
        return target as EFCanvas;
      }
    }
    return null;
  }

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
    // Use target canvas
    const canvas = this.getCanvas();
    return canvas?.selectionContext;
  }

  /**
   * Get the currently highlighted element from the canvas.
   */
  getHighlightedElement(): HTMLElement | null {
    const canvas = this.getCanvas();
    return canvas?.highlightedElement ?? null;
  }

  /**
   * Set the highlighted element on the canvas.
   * Called when user hovers an item in the hierarchy.
   */
  setHighlightedElement(element: HTMLElement | null): void {
    const canvas = this.getCanvas();
    canvas?.setHighlightedElement(element);
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
  // @ts-ignore
  private providedContext: HierarchyContext = {
    state: this.hierarchyState,
    actions: this.hierarchyActions,
    getCanvasSelectionContext: () => this.getCanvasSelectionContext(),
    getHighlightedElement: () => this.getHighlightedElement(),
    setHighlightedElement: (el) => this.setHighlightedElement(el),
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
    if (!target) {
      return [];
    }

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

    // Always update provided context to ensure children have fresh getters
    this.providedContext = {
      state: this.hierarchyState,
      actions: this.hierarchyActions,
      getCanvasSelectionContext: () => this.getCanvasSelectionContext(),
      getHighlightedElement: () => this.getHighlightedElement(),
      setHighlightedElement: (el) => this.setHighlightedElement(el),
    };

    super.willUpdate(changedProperties);
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeExpandedState();
    this.setupSelectionListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeSelectionListener();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // Re-initialize when target changes
    if (changedProperties.has("targetElement") || changedProperties.has("target")) {
      this.initializeExpandedState();
      this.removeSelectionListener();
      this.selectionChangeHandler = undefined;
      this.setupSelectionListener();
      
      // Auto-select first root timegroup if nothing is selected
      this.autoSelectFirstRootTimegroup();
    }
  }

  /**
   * Auto-select the first root timegroup if nothing is currently selected
   */
  private autoSelectFirstRootTimegroup(): void {
    // Only auto-select if nothing is currently selected
    const currentSelection = this.getSelectedElementId();
    if (currentSelection) return;

    const roots = this.getRootElements();
    for (const root of roots) {
      // Select the first root that is a timegroup (ef-timegroup)
      if (root.tagName.toLowerCase() === "ef-timegroup" && root.id) {
        this.hierarchyActions.select(root.id);
        return;
      }
    }

    // Fallback: select first root with an ID
    for (const root of roots) {
      if (root.id) {
        this.hierarchyActions.select(root.id);
        return;
      }
    }
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

  render() {
    const roots = this.getRootElements();

    return html`
      <div class="hierarchy-container" part="list">
        ${this.showHeader ? html`<div class="header" part="header">${this.header}</div>` : nothing}
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
