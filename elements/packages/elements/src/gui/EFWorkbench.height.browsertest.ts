import { beforeEach, describe, test, expect } from "vitest";
import type { EFWorkbench } from "./EFWorkbench.js";
import "./EFWorkbench.js";
import "./EFConfiguration.js";
import "./hierarchy/EFHierarchy.js";
import "../canvas/EFCanvas.js";
import "../elements/EFTimegroup.js";

describe("EFWorkbench height consistency", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "1200px";
    container.style.height = "800px";
    container.style.position = "relative";
    document.body.appendChild(container);
  });

  test("workbench maintains container height when hierarchy collapses", async () => {
    // Create configuration inside container
    const config = document.createElement("ef-configuration");
    config.style.width = "100%";
    config.style.height = "100%";
    container.appendChild(config);

    // Create timegroup with workbench attribute
    const timegroup = document.createElement("ef-timegroup");
    timegroup.id = "test-timegroup";
    timegroup.setAttribute("workbench", "");
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    timegroup.style.width = "400px";
    timegroup.style.height = "300px";
    config.appendChild(timegroup);

    // Wait for workbench to wrap
    await new Promise((resolve) => setTimeout(resolve, 300));

    const workbench = container.querySelector<EFWorkbench>("ef-workbench");
    expect(workbench).toBeDefined();

    if (!workbench) {
      throw new Error("Workbench not found");
    }

    // Get initial dimensions
    const initialRect = workbench.getBoundingClientRect();
    console.log("Initial workbench height:", initialRect.height);
    console.log("Container height:", container.getBoundingClientRect().height);

    // CRITICAL: Workbench should fill container
    expect(initialRect.height).toBeGreaterThan(700);

    // Find hierarchy and collapse it
    const hierarchy = workbench.querySelector("ef-hierarchy");
    expect(hierarchy).toBeDefined();

    if (!hierarchy) {
      throw new Error("Hierarchy not found");
    }

    // Find the root hierarchy item and collapse it
    await new Promise((resolve) => setTimeout(resolve, 100));
    const hierarchyItem = hierarchy.shadowRoot?.querySelector(
      "ef-timegroup-hierarchy-item",
    );

    if (hierarchyItem) {
      // Click the expand icon to collapse
      const expandIcon = hierarchyItem.shadowRoot?.querySelector(
        ".expand-icon",
      ) as HTMLElement;
      if (expandIcon) {
        expandIcon.click();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check workbench height after collapse
        const collapsedRect = workbench.getBoundingClientRect();
        console.log("Collapsed workbench height:", collapsedRect.height);

        // CRITICAL TEST: Workbench should maintain the same height
        expect(
          Math.abs(collapsedRect.height - initialRect.height),
        ).toBeLessThan(5);

        // Also verify it's still close to container height
        expect(collapsedRect.height).toBeGreaterThan(700);
      }
    }
  });
});
