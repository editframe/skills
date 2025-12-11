import { describe, expect, test } from "vitest";
import { SelectionModel } from "./SelectionModel.js";

describe("SelectionModel", () => {
  test("initializes with no selection", () => {
    const model = new SelectionModel();
    expect(model.selectedIds.size).toBe(0);
    expect(model.selectionMode).toBe("none");
  });

  test("selects a single element", () => {
    const model = new SelectionModel();
    model.select("element-1");
    expect(model.selectedIds.has("element-1")).toBe(true);
    expect(model.selectedIds.size).toBe(1);
    expect(model.selectionMode).toBe("single");
  });

  test("selects multiple elements", () => {
    const model = new SelectionModel();
    model.selectMultiple(["element-1", "element-2", "element-3"]);
    expect(model.selectedIds.size).toBe(3);
    expect(model.selectedIds.has("element-1")).toBe(true);
    expect(model.selectedIds.has("element-2")).toBe(true);
    expect(model.selectedIds.has("element-3")).toBe(true);
    expect(model.selectionMode).toBe("multiple");
  });

  test("selecting single element sets mode to single", () => {
    const model = new SelectionModel();
    model.selectMultiple(["element-1"]);
    expect(model.selectionMode).toBe("single");
  });

  test("selecting empty array sets mode to none", () => {
    const model = new SelectionModel();
    model.selectMultiple([]);
    expect(model.selectionMode).toBe("none");
  });

  test("deselects an element", () => {
    const model = new SelectionModel();
    model.selectMultiple(["element-1", "element-2"]);
    model.deselect("element-1");
    expect(model.selectedIds.has("element-1")).toBe(false);
    expect(model.selectedIds.has("element-2")).toBe(true);
    expect(model.selectedIds.size).toBe(1);
    expect(model.selectionMode).toBe("single");
  });

  test("adds to selection", () => {
    const model = new SelectionModel();
    model.select("element-1");
    model.addToSelection("element-2");
    expect(model.selectedIds.size).toBe(2);
    expect(model.selectionMode).toBe("multiple");
  });

  test("toggles element selection", () => {
    const model = new SelectionModel();
    model.select("element-1");
    model.toggle("element-1");
    expect(model.selectedIds.has("element-1")).toBe(false);
    model.toggle("element-1");
    expect(model.selectedIds.has("element-1")).toBe(true);
  });

  test("clears selection", () => {
    const model = new SelectionModel();
    model.selectMultiple(["element-1", "element-2"]);
    model.clear();
    expect(model.selectedIds.size).toBe(0);
    expect(model.selectionMode).toBe("none");
  });

  test("starts box selection", () => {
    const model = new SelectionModel();
    model.startBoxSelect(10, 20);
    expect(model.selectionMode).toBe("box-selecting");
    expect(model.boxSelectBounds).toBeTruthy();
  });

  test("updates box selection", () => {
    const model = new SelectionModel();
    model.startBoxSelect(10, 20);
    model.updateBoxSelect(50, 60);
    const bounds = model.boxSelectBounds;
    expect(bounds).toBeTruthy();
    expect(bounds!.left).toBe(10);
    expect(bounds!.top).toBe(20);
    expect(bounds!.right).toBe(50);
    expect(bounds!.bottom).toBe(60);
  });

  test("ends box selection and selects elements", () => {
    const model = new SelectionModel();
    model.startBoxSelect(10, 10);
    model.updateBoxSelect(50, 50);
    model.endBoxSelect((bounds) => {
      // Mock hit test - return elements within bounds
      if (bounds.left < 30 && bounds.top < 30 && bounds.right > 20 && bounds.bottom > 20) {
        return ["element-1", "element-2"];
      }
      return [];
    });
    expect(model.selectionMode).toBe("multiple");
    expect(model.selectedIds.size).toBe(2);
    expect(model.boxSelectBounds).toBeNull();
  });

  test("creates a group", () => {
    const model = new SelectionModel();
    const groupId = model.createGroup(["element-1", "element-2", "element-3"]);
    expect(groupId).toBeTruthy();
    expect(model.getGroupElements(groupId).length).toBe(3);
    expect(model.getGroupId("element-1")).toBe(groupId);
    expect(model.getGroupId("element-2")).toBe(groupId);
    expect(model.getGroupId("element-3")).toBe(groupId);
  });

  test("throws error when creating group with no elements", () => {
    const model = new SelectionModel();
    expect(() => model.createGroup([])).toThrow();
  });

  test("ungroups a group", () => {
    const model = new SelectionModel();
    const groupId = model.createGroup(["element-1", "element-2"]);
    model.ungroup(groupId);
    expect(model.getGroupId("element-1")).toBeUndefined();
    expect(model.getGroupId("element-2")).toBeUndefined();
    expect(model.getGroupElements(groupId).length).toBe(0);
  });

  test("selects all elements in a group", () => {
    const model = new SelectionModel();
    const groupId = model.createGroup(["element-1", "element-2", "element-3"]);
    model.selectGroup(groupId);
    expect(model.selectedIds.size).toBe(3);
    expect(model.selectedIds.has("element-1")).toBe(true);
    expect(model.selectedIds.has("element-2")).toBe(true);
    expect(model.selectedIds.has("element-3")).toBe(true);
  });

  test("box selection bounds are null when not selecting", () => {
    const model = new SelectionModel();
    expect(model.boxSelectBounds).toBeNull();
  });

  test("box selection handles reversed coordinates", () => {
    const model = new SelectionModel();
    model.startBoxSelect(50, 60);
    model.updateBoxSelect(10, 20);
    const bounds = model.boxSelectBounds;
    expect(bounds!.left).toBe(10);
    expect(bounds!.top).toBe(20);
    expect(bounds!.right).toBe(50);
    expect(bounds!.bottom).toBe(60);
  });
});






