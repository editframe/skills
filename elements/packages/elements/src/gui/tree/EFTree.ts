import { provide } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type {
  TreeItem,
  TreeContext,
  TreeState,
  TreeActions,
} from "./treeContext.js";
import { treeContext, collectAllIds } from "./treeContext.js";
import "./EFTreeItem.js";

/**
 * Generic tree component for displaying hierarchical data.
 *
 * Takes an array of TreeItem objects and renders them as an expandable tree.
 * Provides context for selection and expand/collapse state.
 *
 * @fires tree-select - When an item is selected. Detail: { id: string, item: TreeItem }
 *
 * @example
 * ```html
 * <ef-tree
 *   .items=${[
 *     { id: "folder1", label: "Folder 1", children: [
 *       { id: "file1", label: "File 1" },
 *       { id: "file2", label: "File 2" },
 *     ]},
 *     { id: "file3", label: "File 3" },
 *   ]}
 *   @tree-select=${(e) => console.log('Selected:', e.detail.id)}
 * ></ef-tree>
 * ```
 */
@customElement("ef-tree")
export class EFTree extends LitElement {
  static styles = css`
    :host {
      display: block;
      overflow: auto;
      font-size: 12px;

      --tree-bg: var(--ef-color-bg);
      --tree-text: var(--ef-color-text);
      --tree-hover-bg: var(--ef-color-hover);
      --tree-selected-bg: var(--ef-color-selected);
      --tree-border: var(--ef-color-border);
    }

    .tree-container {
      background: var(--tree-bg);
      color: var(--tree-text);
      min-height: 100%;
      padding: 4px 0;
    }

    .header {
      padding: 8px 12px;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ef-color-text-muted);
      border-bottom: 1px solid var(--tree-border);
      margin-bottom: 4px;
    }

    .empty {
      padding: 16px;
      text-align: center;
      color: var(--ef-color-text-subtle);
      font-style: italic;
    }
  `;

  /** Tree items to display */
  @property({ type: Array, attribute: false })
  items: TreeItem[] = [];

  /** Optional header text */
  @property({ type: String })
  header = "";

  /** Whether to show the header */
  @property({ type: Boolean, attribute: "show-header" })
  showHeader = false;

  /** Currently selected item ID (can be set externally) */
  @property({ type: String, attribute: "selected-id" })
  selectedId: string | null = null;

  /** Whether to expand all items by default */
  @property({ type: Boolean, attribute: "expand-all" })
  expandAll = true;

  @state()
  private treeState: TreeState = {
    selectedId: null,
    expandedIds: new Set(),
  };

  private treeActions: TreeActions = {
    select: (id: string | null) => {
      this.treeState = {
        ...this.treeState,
        selectedId: id,
      };

      // Find the item for the event detail
      const item = id ? this.findItem(id, this.items) : null;

      this.dispatchEvent(
        new CustomEvent("tree-select", {
          detail: { id, item },
          bubbles: true,
          composed: true,
        }),
      );
    },

    toggleExpanded: (id: string) => {
      const newExpanded = new Set(this.treeState.expandedIds);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      this.treeState = {
        ...this.treeState,
        expandedIds: newExpanded,
      };
    },

    setExpanded: (id: string, expanded: boolean) => {
      const newExpanded = new Set(this.treeState.expandedIds);
      if (expanded) {
        newExpanded.add(id);
      } else {
        newExpanded.delete(id);
      }
      this.treeState = {
        ...this.treeState,
        expandedIds: newExpanded,
      };
    },
  };

  @provide({ context: treeContext })
  @state()
  // @ts-ignore
  private providedContext: TreeContext = {
    state: this.treeState,
    actions: this.treeActions,
  };

  private findItem(id: string, items: TreeItem[]): TreeItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findItem(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }

  private initializeExpandedState(): void {
    if (this.expandAll && this.items.length > 0) {
      this.treeState = {
        ...this.treeState,
        expandedIds: collectAllIds(this.items),
      };
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    // Sync external selectedId with internal state
    if (
      changedProperties.has("selectedId") &&
      this.selectedId !== this.treeState.selectedId
    ) {
      this.treeState = {
        ...this.treeState,
        selectedId: this.selectedId,
      };
    }

    // Always update provided context
    this.providedContext = {
      state: this.treeState,
      actions: this.treeActions,
    };

    super.willUpdate(changedProperties);
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // Re-initialize expanded state when items change
    if (changedProperties.has("items")) {
      this.initializeExpandedState();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeExpandedState();
  }

  render() {
    return html`
      <div class="tree-container">
        ${this.showHeader ? html`<div class="header">${this.header}</div>` : nothing}
        ${
          this.items.length > 0
            ? this.items.map(
                (item) => html`<ef-tree-item .item=${item}></ef-tree-item>`,
              )
            : html`<div class="empty">No items</div>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-tree": EFTree;
  }
}
