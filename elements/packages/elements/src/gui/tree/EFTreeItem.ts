import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { TreeItem, TreeContext } from "./treeContext.js";
import { treeContext } from "./treeContext.js";

/**
 * Generic tree item component.
 * 
 * Renders a single item in a tree with:
 * - Expand/collapse toggle for items with children
 * - Optional icon
 * - Label
 * - Recursive children rendering
 * 
 * @fires tree-item-click - When item is clicked (for selection)
 */
@customElement("ef-tree-item")
export class EFTreeItem extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .item-row {
      display: flex;
      align-items: center;
      height: var(--tree-item-height, 1.5rem);
      padding-left: var(--tree-item-padding-left, 0.5rem);
      padding-right: var(--tree-item-padding-right, 0.5rem);
      font-size: var(--tree-item-font-size, 0.75rem);
      cursor: pointer;
      user-select: none;
      color: var(--tree-text, rgb(226 232 240));
    }

    .item-row:hover {
      background: var(--tree-hover-bg, rgba(148, 163, 184, 0.2));
    }

    .item-row[data-selected] {
      background: var(--tree-selected-bg, rgba(59, 130, 246, 0.3));
    }

    .expand-icon {
      width: var(--tree-expand-icon-size, 1rem);
      height: var(--tree-expand-icon-size, 1rem);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .expand-icon svg {
      width: 0.75rem;
      height: 0.75rem;
      transition: transform 0.15s ease;
    }

    .expand-icon[data-expanded] svg {
      transform: rotate(90deg);
    }

    .icon {
      margin-right: var(--tree-icon-gap, 0.25rem);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .children {
      padding-left: var(--tree-indent, 1rem);
    }

    .children[data-collapsed] {
      display: none;
    }
  `;

  @consume({ context: treeContext, subscribe: true })
  treeContext?: TreeContext;

  @property({ type: Object, attribute: false })
  item!: TreeItem;

  @state()
  private localExpanded = true;

  get isSelected(): boolean {
    if (!this.treeContext || !this.item) return false;
    return this.treeContext.state.selectedId === this.item.id;
  }

  get isExpanded(): boolean {
    if (!this.treeContext || !this.item) return this.localExpanded;
    return this.treeContext.state.expandedIds.has(this.item.id);
  }

  get hasChildren(): boolean {
    return Boolean(this.item?.children && this.item.children.length > 0);
  }

  private handleClick(e: Event): void {
    e.stopPropagation();
    console.log("[EFTreeItem] handleClick", {
      item: this.item,
      hasContext: !!this.treeContext,
      itemId: this.item?.id,
    });
    if (this.treeContext && this.item) {
      this.treeContext.actions.select(this.item.id);
    } else {
      console.warn("[EFTreeItem] Missing context or item", {
        treeContext: this.treeContext,
        item: this.item,
      });
    }
  }

  private handleExpandClick(e: Event): void {
    e.stopPropagation();
    if (this.treeContext && this.item) {
      this.treeContext.actions.toggleExpanded(this.item.id);
    } else {
      this.localExpanded = !this.localExpanded;
    }
  }

  render() {
    if (!this.item) return nothing;

    const expanded = this.isExpanded;

    return html`
      <div
        class="item-row"
        ?data-selected=${this.isSelected}
        @click=${this.handleClick}
      >
        ${this.hasChildren
          ? html`
              <span
                class="expand-icon"
                ?data-expanded=${expanded}
                @click=${this.handleExpandClick}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            `
          : html`<span class="expand-icon"></span>`}
        ${this.item.icon
          ? html`<span class="icon">${this.item.icon}</span>`
          : nothing}
        <span class="label">${this.item.label}</span>
      </div>
      ${this.hasChildren
        ? html`
            <div class="children" ?data-collapsed=${!expanded}>
              ${this.item.children!.map(
                (child) => html`<ef-tree-item .item=${child}></ef-tree-item>`
              )}
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-tree-item": EFTreeItem;
  }
}
