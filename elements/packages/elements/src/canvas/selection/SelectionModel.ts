import type { SelectionState } from "../api/types.js";

/**
 * Create a DOMRect-like object. Polyfill for Node.js environments.
 */
function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
): DOMRect {
  if (typeof DOMRect !== "undefined") {
    return new DOMRect(x, y, width, height);
  }
  // Polyfill for Node.js
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect;
}

/**
 * Pure selection logic - semantics separate from mechanism.
 * Manages selection state and operations.
 */
export class SelectionModel extends EventTarget {
  private _selectedIds = new Set<string>();
  private _primaryId: string | null = null;
  private _selectionMode: SelectionState = "none";
  private _boxSelectStart: { x: number; y: number } | null = null;
  private _boxSelectCurrent: { x: number; y: number } | null = null;
  private _groups = new Map<string, Set<string>>();
  private _elementToGroup = new Map<string, string>();

  /**
   * Emit selectionchange event with current selection state.
   */
  private _emitSelectionChange(): void {
    // Convert Set to array with primary first
    const selectedIdsArray = this._primaryId && this._selectedIds.has(this._primaryId)
      ? [this._primaryId, ...Array.from(this._selectedIds).filter(id => id !== this._primaryId)]
      : Array.from(this._selectedIds);
    
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedIds: selectedIdsArray,
          selectionMode: this._selectionMode,
        },
        bubbles: false,
        composed: false,
      }),
    );
  }

  /**
   * Get current selection state.
   */
  get selectedIds(): ReadonlySet<string> {
    return this._selectedIds;
  }

  /**
   * Get current selection mode.
   */
  get selectionMode(): SelectionState {
    return this._selectionMode;
  }

  /**
   * Get current box selection bounds, if active.
   */
  get boxSelectBounds(): DOMRect | null {
    if (!this._boxSelectStart || !this._boxSelectCurrent) {
      return null;
    }
    const left = Math.min(this._boxSelectStart.x, this._boxSelectCurrent.x);
    const top = Math.min(this._boxSelectStart.y, this._boxSelectCurrent.y);
    const right = Math.max(this._boxSelectStart.x, this._boxSelectCurrent.x);
    const bottom = Math.max(this._boxSelectStart.y, this._boxSelectCurrent.y);
    return createRect(left, top, right - left, bottom - top);
  }

  /**
   * Select a single element.
   */
  select(id: string): void {
    this._selectedIds.clear();
    this._selectedIds.add(id);
    this._primaryId = id;
    this._selectionMode = "single";
    this._emitSelectionChange();
  }

  /**
   * Select multiple elements.
   */
  selectMultiple(ids: string[]): void {
    this._selectedIds.clear();
    for (const id of ids) {
      this._selectedIds.add(id);
    }
    this._primaryId = ids.length > 0 ? ids[0] : null;
    this._selectionMode = ids.length === 0 ? "none" : ids.length === 1 ? "single" : "multiple";
    this._emitSelectionChange();
  }

  /**
   * Add element to selection (for multi-select).
   */
  addToSelection(id: string): void {
    this._selectedIds.add(id);
    if (!this._primaryId) {
      this._primaryId = id;
    }
    this._updateSelectionMode();
    this._emitSelectionChange();
  }

  /**
   * Remove element from selection.
   */
  deselect(id: string): void {
    this._selectedIds.delete(id);
    if (this._primaryId === id) {
      // Set primary to first remaining, or null if none
      const remaining = Array.from(this._selectedIds);
      this._primaryId = remaining.length > 0 ? remaining[0] : null;
    }
    this._updateSelectionMode();
    this._emitSelectionChange();
  }

  /**
   * Toggle element selection state.
   */
  toggle(id: string): void {
    if (this._selectedIds.has(id)) {
      this.deselect(id);
    } else {
      this.addToSelection(id);
    }
  }

  /**
   * Clear all selections.
   */
  clear(): void {
    this._selectedIds.clear();
    this._primaryId = null;
    this._selectionMode = "none";
    this._boxSelectStart = null;
    this._boxSelectCurrent = null;
    this._emitSelectionChange();
  }

  /**
   * Start box selection.
   */
  startBoxSelect(x: number, y: number): void {
    this._boxSelectStart = { x, y };
    this._boxSelectCurrent = { x, y };
    this._selectionMode = "box-selecting";
  }

  /**
   * Update box selection.
   */
  updateBoxSelect(x: number, y: number): void {
    if (this._selectionMode !== "box-selecting") {
      return;
    }
    this._boxSelectCurrent = { x, y };
  }

  /**
   * End box selection and select elements within bounds.
   * @param hitTest - Function to find elements within bounds
   * @param addToSelection - If true, add to existing selection; if false, replace selection
   */
  endBoxSelect(hitTest: (bounds: DOMRect) => string[], addToSelection = false): void {
    if (this._selectionMode !== "box-selecting" || !this._boxSelectStart || !this._boxSelectCurrent) {
      return;
    }
    const bounds = this.boxSelectBounds;
    if (bounds) {
      const ids = hitTest(bounds);
      if (addToSelection) {
        // Add each element to selection
        for (const id of ids) {
          this.addToSelection(id);
        }
      } else {
        // Replace selection
        this.selectMultiple(ids);
      }
    }
    this._boxSelectStart = null;
    this._boxSelectCurrent = null;
    // Note: selectMultiple/addToSelection already emit events, so no need to emit again
  }

  /**
   * Create a group from selected elements.
   */
  createGroup(ids: string[]): string {
    if (ids.length === 0) {
      throw new Error("Cannot create group with no elements");
    }
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const groupSet = new Set(ids);
    this._groups.set(groupId, groupSet);
    for (const id of ids) {
      this._elementToGroup.set(id, groupId);
    }
    return groupId;
  }

  /**
   * Ungroup a group.
   */
  ungroup(groupId: string): void {
    const group = this._groups.get(groupId);
    if (!group) {
      return;
    }
    for (const id of group) {
      this._elementToGroup.delete(id);
    }
    this._groups.delete(groupId);
  }

  /**
   * Select all elements in a group.
   */
  selectGroup(groupId: string): void {
    const group = this._groups.get(groupId);
    if (!group) {
      return;
    }
    this.selectMultiple(Array.from(group));
    // Note: selectMultiple already emits event
  }

  /**
   * Get group ID for an element, if any.
   */
  getGroupId(elementId: string): string | undefined {
    return this._elementToGroup.get(elementId);
  }

  /**
   * Get all element IDs in a group.
   */
  getGroupElements(groupId: string): string[] {
    const group = this._groups.get(groupId);
    return group ? Array.from(group) : [];
  }

  /**
   * Update selection mode based on current selection count.
   */
  private _updateSelectionMode(): void {
    const count = this._selectedIds.size;
    if (count === 0) {
      this._selectionMode = "none";
    } else if (count === 1) {
      this._selectionMode = "single";
    } else {
      this._selectionMode = "multiple";
    }
  }
}

