import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFTreeItem } from "./EFTreeItem.js";
import type { TreeItem } from "./treeContext.js";
import "./EFTreeItem.js";
import "./EFTree.js";

const sampleItem: TreeItem = {
  id: "root",
  label: "Root Item",
  children: [
    {
      id: "child-1",
      label: "Child 1",
      children: [
        { id: "grandchild-1", label: "Grandchild 1" },
        { id: "grandchild-2", label: "Grandchild 2" },
      ],
    },
    { id: "child-2", label: "Child 2" },
  ],
};

export default defineSandbox({
  name: "EFTreeItem",
  description: "Individual tree item component with expand/collapse and selection",
  category: "gui",
  subcategory: "tree",

  render: () => html`
    <ef-tree style="width: 300px; background: #1e293b; padding: 8px;">
      <ef-tree-item .item=${sampleItem}></ef-tree-item>
    </ef-tree>
  `,

  scenarios: {
    async "renders tree item"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      ctx.expect(item).toBeDefined();
    },

    async "displays item label"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      const label = item.shadowRoot?.querySelector(".label");
      ctx.expect(label?.textContent).toBe("Root Item");
    },

    async "shows expand icon for items with children"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      const expandIcon = item.shadowRoot?.querySelector(".expand-icon svg");
      ctx.expect(expandIcon).toBeDefined();
    },

    async "reports hasChildren correctly"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      ctx.expect(item.hasChildren).toBe(true);
    },

    async "renders children when expanded"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      const childrenContainer = item.shadowRoot?.querySelector(".children");
      ctx.expect(childrenContainer).toBeDefined();

      const childItems = childrenContainer?.querySelectorAll("ef-tree-item");
      ctx.expect(childItems?.length).toBe(2);
    },

    async "toggles expansion on expand icon click"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      const expandIcon = item.shadowRoot?.querySelector(".expand-icon") as HTMLElement;
      const initialExpanded = item.isExpanded;

      expandIcon.click();
      await ctx.frame();

      ctx.expect(item.isExpanded).toBe(!initialExpanded);
    },

    async "renders item without children"(ctx) {
      const container = ctx.getContainer();
      const leafItem: TreeItem = { id: "leaf", label: "Leaf Node" };

      const treeItemEl = document.createElement("ef-tree-item") as EFTreeItem;
      treeItemEl.item = leafItem;
      container.appendChild(treeItemEl);
      await ctx.frame();

      ctx.expect(treeItemEl.hasChildren).toBe(false);
    },

    async "applies selected style when selected"(ctx) {
      const item = ctx.querySelector<EFTreeItem>("ef-tree-item")!;
      await ctx.frame();

      const itemRow = item.shadowRoot?.querySelector(".item-row") as HTMLElement;
      itemRow.click();
      await ctx.frame();

      ctx.expect(item.isSelected).toBe(true);
    },
  },
});
