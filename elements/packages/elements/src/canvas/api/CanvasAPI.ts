import type { EFCanvas } from "../EFCanvas.js";
import type { CanvasElementData, CanvasData } from "./types.js";
import { SelectionModel } from "../selection/SelectionModel.js";

/**
 * Programmatic API/SDK for canvas operations.
 */
export class CanvasAPI {
  constructor(private canvas: EFCanvas) {}

  /**
   * Register an existing element for canvas management.
   * @param element - The HTML element to register
   * @param id - Optional custom ID, otherwise auto-generated
   * @returns The element ID
   */
  registerElement(element: HTMLElement, id?: string): string {
    return (this.canvas as any).registerElement(element, id);
  }

  /**
   * Unregister an element from canvas management.
   * @param id - Element ID or element itself
   */
  unregisterElement(id: string | HTMLElement): void {
    (this.canvas as any).unregisterElement(id);
  }

  /**
   * Update element position/transform in canvas coordinates.
   * @param id - Element ID
   * @param updates - Partial element data to update
   */
  updateElement(id: string, updates: Partial<CanvasElementData>): void {
    const current = this.getElement(id);
    if (!current) {
      throw new Error(`Element ${id} not found`);
    }

    if (updates.x !== undefined || updates.y !== undefined) {
      const x = updates.x !== undefined ? updates.x : current.x;
      const y = updates.y !== undefined ? updates.y : current.y;
      (this.canvas as any).updateElementPosition(id, x, y);
    }

    if (updates.width !== undefined || updates.height !== undefined) {
      const element = current.element;
      const width = updates.width !== undefined ? updates.width : current.width;
      const height =
        updates.height !== undefined ? updates.height : current.height;
      // Set size in canvas coordinates (parent transform handles scaling)
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    }

    if (updates.rotation !== undefined) {
      const element = current.element;
      element.style.transform = `rotate(${updates.rotation}deg)`;
    }
  }

  /**
   * Get element data by ID.
   * @param id - Element ID
   * @returns Element data or null if not found
   */
  getElement(id: string): CanvasElementData | null {
    return (this.canvas as any).getElementData(id);
  }

  /**
   * Get all registered elements.
   * @returns Array of all element data
   */
  getAllElements(): CanvasElementData[] {
    return (this.canvas as any).getAllElementsData();
  }

  /**
   * Get the number of registered elements.
   * @returns The count of registered elements
   */
  get elementCount(): number {
    return this.getAllElements().length;
  }

  /**
   * Get all registered elements (getter alias for getAllElements).
   * @returns Array of all element data
   */
  get elements(): CanvasElementData[] {
    return this.getAllElements();
  }

  /**
   * Convert screen coordinates to canvas coordinates.
   * @param screenX - X coordinate in screen space
   * @param screenY - Y coordinate in screen space
   * @returns Canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return (this.canvas as any).screenToCanvasCoords(screenX, screenY);
  }

  /**
   * Convert canvas coordinates to screen coordinates.
   * @param canvasX - X coordinate in canvas space
   * @param canvasY - Y coordinate in canvas space
   * @returns Screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return (this.canvas as any).canvasToScreenCoords(canvasX, canvasY);
  }

  /**
   * Select an element.
   * @param id - Element ID
   */
  select(id: string): void {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    controller.getModel().select(id);
    this.canvas.requestUpdate();
  }

  /**
   * Select multiple elements.
   * @param ids - Array of element IDs
   */
  selectMultiple(ids: string[]): void {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    controller.getModel().selectMultiple(ids);
    this.canvas.requestUpdate();
  }

  /**
   * Deselect an element.
   * @param id - Element ID
   */
  deselect(id: string): void {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    controller.getModel().deselect(id);
    this.canvas.requestUpdate();
  }

  /**
   * Get currently selected element IDs.
   * @returns Set of selected IDs
   */
  getSelectedIds(): string[] {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    return Array.from(controller.getModel().selectedIds);
  }

  /**
   * Create a group from element IDs.
   * @param ids - Array of element IDs to group
   * @returns Group ID
   */
  group(ids: string[]): string {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    const groupId = controller.getModel().createGroup(ids);
    this.canvas.requestUpdate();
    return groupId;
  }

  /**
   * Ungroup a group.
   * @param groupId - Group ID
   */
  ungroup(groupId: string): void {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    controller.getModel().ungroup(groupId);
    this.canvas.requestUpdate();
  }

  /**
   * Export canvas data.
   * @returns Canvas data structure
   */
  export(): CanvasData {
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    const model = controller.getModel();
    const groups: Array<{ id: string; elementIds: string[] }> = [];

    // Collect all groups
    const processedGroups = new Set<string>();
    for (const elementId of this.getAllElements().map((e) => e.id)) {
      const groupId = model.getGroupId(elementId);
      if (groupId && !processedGroups.has(groupId)) {
        processedGroups.add(groupId);
        groups.push({
          id: groupId,
          elementIds: model.getGroupElements(groupId),
        });
      }
    }

    return {
      elements: this.getAllElements(),
      groups,
    };
  }

  /**
   * Import canvas data.
   * @param data - Canvas data structure
   */
  import(data: CanvasData): void {
    // Clear existing
    for (const element of this.getAllElements()) {
      this.unregisterElement(element.id);
    }

    // Import elements
    for (const elementData of data.elements) {
      const element = elementData.element;
      this.registerElement(element, elementData.id);
      this.updateElement(elementData.id, elementData);
    }

    // Import groups
    const controller = (this.canvas as any).selectionController as {
      getModel(): SelectionModel;
    };
    for (const group of data.groups) {
      controller.getModel().createGroup(group.elementIds);
    }
  }
}
