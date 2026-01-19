import { defineSandbox } from "../../sandbox/index.js";
import { html } from "lit";
import type { EFTree } from "./EFTree.js";
import type { TreeItem } from "@editframe/elements";
import "./EFTree.js";
import "./EFTreeItem.js";

export default defineSandbox({
  name: "EFTree",
  description: "Generic tree component for hierarchical data display",
  category: "gui",
  subcategory: "hierarchy",
  
  render: () => html`
    <div style="width: 300px; height: 400px; border: 1px solid #ccc;">
      <ef-tree
        id="test-tree"
        show-header
        header="Files"
        expand-all
        style="width: 100%; height: 100%;"
      ></ef-tree>
    </div>
  `,
  
  setup: async (container) => {
    const tree = container.querySelector<EFTree>("ef-tree")!;
    
    const treeItems: TreeItem[] = [
      {
        id: "folder-1",
        label: "Documents",
        icon: "📁",
        children: [
          {
            id: "file-1",
            label: "report.pdf",
            data: { type: "file", path: "/Documents/report.pdf" },
          },
          {
            id: "file-2",
            label: "notes.txt",
            data: { type: "file", path: "/Documents/notes.txt" },
          },
        ],
      },
      {
        id: "folder-2",
        label: "Images",
        icon: "📁",
        children: [
          {
            id: "file-3",
            label: "photo.jpg",
            data: { type: "file", path: "/Images/photo.jpg" },
          },
        ],
      },
      {
        id: "file-4",
        label: "readme.md",
        data: { type: "file", path: "/readme.md" },
      },
    ];
    
    tree.items = treeItems;
  },
  
  scenarios: {
    async "renders tree component"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      
      await ctx.frame();
      
      ctx.expect(tree).toBeDefined();
      ctx.expect(tree.items.length).toBeGreaterThan(0);
    },
    
    async "displays tree items"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      
      await ctx.frame();
      
      const items = tree.shadowRoot?.querySelectorAll("ef-tree-item");
      ctx.expect(items).toBeDefined();
      ctx.expect(items!.length).toBeGreaterThan(0);
    },
    
    async "shows header when enabled"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      
      await ctx.frame();
      
      ctx.expect(tree.showHeader).toBe(true);
      ctx.expect(tree.header).toBe("Files");
      
      const header = tree.shadowRoot?.querySelector(".header");
      ctx.expect(header).toBeDefined();
    },
    
    async "supports item selection"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      
      await ctx.frame();
      
      tree.selectedId = "file-1";
      await ctx.frame();
      
      ctx.expect(tree.selectedId).toBe("file-1");
    },
    
    async "expands all items when expandAll is true"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      
      await ctx.frame();
      
      ctx.expect(tree.expandAll).toBe(true);
    },
    
    async "emits tree-select event"(ctx) {
      const tree = ctx.querySelector<EFTree>("ef-tree")!;
      let selectedId: string | null = null;
      
      tree.addEventListener("tree-select", (e: any) => {
        selectedId = e.detail.id;
      });
      
      await ctx.frame();
      
      (tree as any).treeActions.select("file-2");
      await ctx.frame();
      
      ctx.expect(selectedId).toBe("file-2");
    },
  },
});
