import { consume, provide } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { TWMixin } from "../gui/TWMixin.js";
import { panZoomTransformContext } from "../gui/panZoomTransformContext.js";
import type { PanZoomTransform } from "../elements/EFPanZoom.js";
import { SelectionController } from "./selection/SelectionController.js";
import { selectionContext } from "./selection/selectionContext.js";
import "./overlays/SelectionOverlay.js";
import { screenToCanvas, canvasToScreen } from "./coordinateTransform.js";
import { getElementBounds } from "./getElementBounds.js";
import type { CanvasElementData } from "./api/types.js";
import "../gui/EFOverlayLayer.js";
import "../gui/EFTransformHandles.js";
import type { EFOverlayLayer } from "../gui/EFOverlayLayer.js";
import type { EFTransformHandles } from "../gui/EFTransformHandles.js";
import type { TransformBounds } from "../gui/EFTransformHandles.js";
import type { SelectionOverlay } from "./overlays/SelectionOverlay.js";
import { getRotatedBoundingBox, parseRotationFromTransform } from "../gui/transformCalculations.js";
import { EFTargetable } from "../elements/TargetController.js";

/**
 * =============================================================================
 * COORDINATE SYSTEM AND DIMENSION CALCULATION PRINCIPLES
 * =============================================================================
 * 
 * This canvas system uses a unified approach for calculating element positions
 * and dimensions that works correctly regardless of CSS transforms (rotation,
 * scale, etc.), zoom level, or nesting depth.
 * 
 * TWO KEY DOM APIS WITH DIFFERENT BEHAVIORS:
 * 
 * 1. offsetWidth / offsetHeight
 *    - Returns the element's LAYOUT dimensions (CSS box model)
 *    - These are the dimensions BEFORE any CSS transforms are applied
 *    - UNAFFECTED by: rotation, scale, skew, or any other transform
 *    - UNAFFECTED by: parent transforms (including zoom scale)
 *    - AFFECTED by: CSS width/height properties, padding, border
 *    - Units: CSS pixels in the element's own coordinate space
 *    
 *    Example: A 200x100px element rotated 45° still has offsetWidth=200, offsetHeight=100
 *    Example: A 200x100px element in a 2x zoomed canvas still has offsetWidth=200, offsetHeight=100
 *    
 *    USE FOR: Getting the actual dimensions of an element in canvas coordinates
 *    
 * 2. getBoundingClientRect()
 *    - Returns the element's visual BOUNDING BOX on screen
 *    - This is the axis-aligned rectangle that fully contains the transformed element
 *    - AFFECTED by: rotation (bounding box grows), scale, all transforms
 *    - AFFECTED by: parent transforms (including zoom scale)
 *    - Units: Screen pixels (viewport coordinates)
 *    
 *    Example: A 200x100px element rotated 45° has bounding box ~212x212px
 *    Example: A 200x100px element in a 2x zoomed canvas has bounding rect 400x200px
 *    
 *    USE FOR: Getting the visual center position (center of bounding box = element center)
 *    NOT FOR: Getting actual dimensions (bounding box ≠ actual size when rotated)
 * 
 * THE UNIFIED CALCULATION METHOD:
 * 
 * For ANY element (rotated, scaled, nested, etc.):
 * 
 * 1. DIMENSIONS: Use offsetWidth/offsetHeight
 *    - These give us the true dimensions in canvas coordinates
 *    - No division by scale needed - they're already in canvas space
 *    
 * 2. CENTER POSITION: Use getBoundingClientRect() center
 *    - screenCenterX = rect.left + rect.width / 2
 *    - screenCenterY = rect.top + rect.height / 2
 *    - The center of the bounding box IS the element's center
 *    - This is true for ANY rotation (rotation around center keeps center fixed)
 *    
 * 3. TOP-LEFT POSITION: Calculate from center and dimensions
 *    - canvasX = canvasCenter.x - width / 2
 *    - canvasY = canvasCenter.y - height / 2
 * 
 * WHY THIS WORKS UNIVERSALLY:
 * 
 * - offsetWidth/Height are defined by CSS spec to be unaffected by transforms
 * - The center of any shape is preserved under rotation around that center
 * - This mathematical relationship holds for ALL transform combinations
 * - No special cases needed for rotation, scale, or nesting
 * 
 * COMMON MISTAKES TO AVOID:
 * 
 * ❌ Using getBoundingClientRect().width for dimensions (wrong when rotated)
 * ❌ Dividing offsetWidth by scale (offsetWidth is already in canvas coords)
 * ❌ Using getBoundingClientRect().left/top for position (wrong when rotated)
 * ❌ Having different code paths for rotated vs non-rotated elements
 * 
 * =============================================================================
 */

/**
 * Main canvas container element.
 * Manages existing elements (EF* elements, divs, etc.) and provides selection functionality.
 */
@customElement("ef-canvas")
export class EFCanvas extends EFTargetable(TWMixin(LitElement)) {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
      }
      .canvas-content {
        position: relative;
        width: 100%;
        height: 100%;
      }
    `,
  ];

  @consume({ context: panZoomTransformContext, subscribe: true })
  panZoomTransform?: PanZoomTransform;

  @property({ type: String, attribute: "data-element-id-attribute" })
  elementIdAttribute = "data-element-id";

  @property({ type: Boolean, attribute: "enable-transform-handles" })
  enableTransformHandles = true;

  @state()
  private elementRegistry = new Map<string, HTMLElement>();

  @state()
  private elementMetadata = new Map<string, CanvasElementData>();

  private selectionController: SelectionController;
  private overlayLayer: EFOverlayLayer | null = null;
  private selectionOverlay: SelectionOverlay | null = null;
  private transformHandlesMap = new Map<string, EFTransformHandles>();
  private overlayRafId: number | null = null;
  private isDragging = false;
  private dragStarted = false; // True once threshold is crossed
  private dragStartPos: { x: number; y: number } | null = null;
  private dragStartCanvasPos: { x: number; y: number } | null = null;
  private dragStartElementPositions = new Map<string, { x: number; y: number }>(); // Store initial positions for all selected elements
  private draggedElementId: string | null = null;
  private capturedPointerId: number | null = null;
  private readonly DRAG_THRESHOLD = 5; // pixels of movement before drag starts
  private isBoxSelecting = false;
  private boxSelectStart: { x: number; y: number } | null = null;
  private boxSelectModifierKeys = false; // Track if modifier keys were pressed when box select started
  private emptySpaceClickPos: { x: number; y: number } | null = null;

  @provide({ context: selectionContext })
  @state()
  selectionContext!: import("./selection/selectionContext.js").SelectionContext;

  constructor() {
    super();
    this.selectionController = new SelectionController(this);
    this.selectionController.setHitTest((bounds) => this.hitTest(bounds));
    // Initialize selectionContext after controller is created
    this.selectionContext = this.selectionController.selectionContext;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setupElementTracking();
    this.setupOverlayLayer();
    this.setupSelectionOverlay();
    this.addEventListener("pointerdown", this.handlePointerDown);
    this.addEventListener("pointermove", this.handlePointerMove);
    this.addEventListener("pointerup", this.handlePointerUp);
    this.addEventListener("pointercancel", this.handlePointerUp);
    this.startOverlayRafLoop();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopOverlayRafLoop();
    this.cleanupOverlayLayer();
    this.cleanupSelectionOverlay();
    this.cleanupTransformHandles();
    this.removeEventListener("pointerdown", this.handlePointerDown);
    this.removeEventListener("pointermove", this.handlePointerMove);
    this.removeEventListener("pointerup", this.handlePointerUp);
    this.removeEventListener("pointercancel", this.handlePointerUp);
  }

  /**
   * Setup mutation observer to track element additions/removals.
   */
  private setupElementTracking(): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            this.tryRegisterElement(node);
          }
        }
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof HTMLElement) {
            this.unregisterElement(node);
          }
        }
      }
    });

    observer.observe(this, {
      childList: true,
      subtree: true, // Watch all descendants - any element can be selectable
    });

    // Register all elements in the canvas (including nested ones)
    const registerAllElements = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        if (child instanceof HTMLElement) {
          this.tryRegisterElement(child);
          // Recursively register nested elements
          if (child.children.length > 0) {
            registerAllElements(child);
          }
        }
      }
    };
    
    registerAllElements(this);
  }

  /**
   * Try to register an element, auto-generating an ID if needed.
   * Public method for external use (e.g., hierarchy selection).
   */
  tryRegisterElement(element: HTMLElement): void {
    // Skip if already registered
    const existingId = element.getAttribute(this.elementIdAttribute) || element.id;
    if (existingId && this.elementRegistry.has(existingId)) {
      return;
    }
    
    try {
      // Use existing id if available, otherwise generate one
      let elementId = element.id && element.id.trim() !== '' 
        ? element.id 
        : element.getAttribute(this.elementIdAttribute);
      
      if (!elementId) {
        // Generate a unique ID based on tag name and index
        const tagName = element.tagName.toLowerCase();
        const index = Array.from(element.parentElement?.children || []).indexOf(element);
        elementId = `${tagName}-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Set id if not already set
      if (!element.id || element.id.trim() === '') {
        element.id = elementId;
      }
      // Set data-element-id if not already set
      if (!element.getAttribute(this.elementIdAttribute)) {
        element.setAttribute(this.elementIdAttribute, elementId);
      }
      
      this.registerElement(element, elementId);
    } catch (error) {
      // Silently ignore registration errors (e.g., duplicate ID)
      // This allows the canvas to work with mixed content
    }
  }

  /**
   * Register an element for canvas management.
   * @throws Error if element does not have an ID
   */
  registerElement(element: HTMLElement, id?: string): string {
    // Determine the element ID - can come from parameter, attribute, or element.id
    const elementId =
      id ||
      element.getAttribute(this.elementIdAttribute) ||
      (element.id && element.id.trim() !== '' ? element.id : null);

    if (!elementId) {
      throw new Error(
        `Element must have an ID. Provide either the 'id' parameter, set the '${this.elementIdAttribute}' attribute, or set the 'id' attribute on the element.`,
      );
    }

    // Check for duplicate IDs (but allow re-registering the same element)
    if (this.elementRegistry.has(elementId)) {
      const existing = this.elementRegistry.get(elementId);
      if (existing !== element) {
        throw new Error(
          `Element with ID '${elementId}' is already registered. Each element must have a unique ID.`,
        );
      }
      // Same element, already registered - return early
      return elementId;
    }

    // Set the data-element-id attribute if not already set
    if (!element.getAttribute(this.elementIdAttribute)) {
      element.setAttribute(this.elementIdAttribute, elementId);
    }
    
    // Ensure element.id matches if not already set
    if (!element.id || element.id.trim() === '') {
      element.id = elementId;
    }

    this.elementRegistry.set(elementId, element);
    
    // Ensure direct children have default styling (only for direct children)
    if (element.parentElement === this) {
      if (!element.style.position) {
        element.style.position = "absolute";
      }
      if (!element.style.display || element.style.display === 'none') {
        element.style.display = "block";
      }
    }
    
    // Update metadata immediately - if layout isn't ready, it will be updated on next frame
    this.updateElementMetadata(elementId);

    return elementId;
  }

  /**
   * Unregister an element.
   */
  unregisterElement(element: HTMLElement | string): void {
    const elementId =
      typeof element === "string" ? element : element.getAttribute(this.elementIdAttribute);

    if (elementId) {
      this.elementRegistry.delete(elementId);
      this.elementMetadata.delete(elementId);
      this.selectionController.selectionContext.deselect(elementId);
    }
  }

  /**
   * Update element metadata from DOM.
   * 
   * UNIFIED APPROACH - works for ALL elements regardless of rotation, scale, or nesting:
   * 
   * 1. DIMENSIONS: Always use offsetWidth/offsetHeight
   *    - These are layout dimensions in the element's coordinate space
   *    - Unaffected by CSS transforms (rotation, scale, etc.)
   *    - Already in canvas coordinates (no scale division needed)
   * 
   * 2. CENTER POSITION: Always use getBoundingClientRect() center
   *    - The center of the bounding box IS the element's center (transform-origin: center)
   *    - Works correctly for rotated elements (center is rotation-invariant)
   *    - Convert to canvas coordinates using screenToCanvas()
   * 
   * 3. TOP-LEFT POSITION: Calculate from center and dimensions
   *    - x = centerX - width/2
   *    - y = centerY - height/2
   */
  private updateElementMetadata(elementId: string): void {
    const element = this.elementRegistry.get(elementId);
    if (!element) {
      return;
    }
    
    const shadowRoot = this.shadowRoot;
    const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
    
    // STEP 1: Get dimensions from offsetWidth/offsetHeight (unified, no special cases)
    // These are layout dimensions, unaffected by ANY transforms
    let actualWidth = element.offsetWidth;
    let actualHeight = element.offsetHeight;
    
    // Fallback for elements where offsetWidth/Height are 0 (e.g., inline elements)
    if (actualWidth === 0 || actualHeight === 0) {
      const elementRect = getElementBounds(element);
      const scale = this.panZoomTransform?.scale || 1;
      actualWidth = elementRect.width / scale;
      actualHeight = elementRect.height / scale;
    }
    
    // STEP 2: Get center position from getBoundingClientRect() (unified, no special cases)
    // The center is rotation-invariant - it's always correct
    const elementRect = getElementBounds(element);
    const screenCenterX = elementRect.left + elementRect.width / 2;
    const screenCenterY = elementRect.top + elementRect.height / 2;
    
    let canvasX: number;
    let canvasY: number;
    
    if (!canvasContent) {
      const existingMetadata = this.elementMetadata.get(elementId);
      canvasX = existingMetadata?.x ?? 0;
      canvasY = existingMetadata?.y ?? 0;
    } else {
      const referenceRect = canvasContent.getBoundingClientRect();
      
      // Convert center to canvas coordinates
      const canvasCenter = screenToCanvas(
        screenCenterX,
        screenCenterY,
        referenceRect,
        this.panZoomTransform,
      );
      
      // STEP 3: Calculate top-left from center and dimensions
      canvasX = canvasCenter.x - actualWidth / 2;
      canvasY = canvasCenter.y - actualHeight / 2;
    }
    
    // Parse rotation from element's transform
    const existingMetadata = this.elementMetadata.get(elementId);
    let rotation: number | undefined = existingMetadata?.rotation;
    
    if (rotation === undefined) {
      const computedStyle = window.getComputedStyle(element);
      rotation = parseRotationFromTransform(computedStyle.transform);
      if (rotation === 0) {
        rotation = undefined;
      }
    }
    
    this.elementMetadata.set(elementId, {
      id: elementId,
      element,
      x: canvasX,
      y: canvasY,
      width: actualWidth,
      height: actualHeight,
      rotation,
    });
  }

  /**
   * Hit test - find elements intersecting with bounds.
   * @param bounds - DOMRect in canvas coordinate space (from SelectionModel.boxSelectBounds)
   */
  private hitTest(bounds: DOMRect): string[] {
    // bounds is already in canvas coordinates (from SelectionModel.boxSelectBounds)
    // which is created from canvas coordinates stored in _boxSelectStart and _boxSelectCurrent
    const testRect = bounds;
    const canvasRect = this.getBoundingClientRect();

    const hitIds: string[] = [];
    for (const [elementId, element] of this.elementRegistry.entries()) {
      const elementBounds = getElementBounds(element);
      const elementCanvasPos = screenToCanvas(
        elementBounds.left,
        elementBounds.top,
        canvasRect,
        this.panZoomTransform,
      );
      const elementCanvasWidth = elementBounds.width / (this.panZoomTransform?.scale || 1);
      const elementCanvasHeight = elementBounds.height / (this.panZoomTransform?.scale || 1);

      const elementRect = new DOMRect(
        elementCanvasPos.x,
        elementCanvasPos.y,
        elementCanvasWidth,
        elementCanvasHeight,
      );

      if (
        testRect.left < elementRect.right &&
        testRect.right > elementRect.left &&
        testRect.top < elementRect.bottom &&
        testRect.bottom > elementRect.top
      ) {
        hitIds.push(elementId);
      }
    }

    return hitIds;
  }

  /**
   * Handle pointer down events.
   * Only handles events when clicking on elements. Otherwise, lets panzoom handle it.
   */
  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) {
      return;
    }

    // Use elementsFromPoint to get elements in z-order (topmost first)
    // This ensures we select the element that's actually on top, not one behind it
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
    
    // Find the topmost selectable element (not overlay/transform handles)
    let topmostElement: HTMLElement | null = null;
    let topmostElementId: string | null = null;
    
    for (const el of elementsAtPoint) {
      // Skip overlay layer and transform handles
      if (
        el.tagName === "EF-OVERLAY-LAYER" ||
        el.tagName === "EF-TRANSFORM-HANDLES" ||
        el.closest("ef-overlay-layer") ||
        el.closest("ef-transform-handles")
      ) {
        continue;
      }
      
      // Skip if not an HTMLElement
      if (!(el instanceof HTMLElement)) {
        continue;
      }
      
      // Skip the canvas element itself
      if (el === this) {
        continue;
      }
      
      // Check if element is within canvas
      if (!this.contains(el)) {
        continue;
      }
      
      // Try to register and get element ID (auto-generates if needed)
      try {
        this.tryRegisterElement(el);
        const elementId = el.id || el.getAttribute(this.elementIdAttribute);
        
        if (elementId && this.elementRegistry.has(elementId)) {
          topmostElement = el;
          topmostElementId = elementId;
          break;
        }
      } catch {
        // Registration failed, try parent
      }
      
      // Walk up DOM tree to find first registerable parent
      let current: HTMLElement | null = el.parentElement;
      while (current && current !== this) {
        try {
          this.tryRegisterElement(current);
          const elementId = current.id || current.getAttribute(this.elementIdAttribute);
          
          if (elementId && this.elementRegistry.has(elementId)) {
            topmostElement = current;
            topmostElementId = elementId;
            break;
          }
        } catch {
          // Registration failed, try next parent
        }
        
        current = current.parentElement;
      }
      
      if (topmostElementId) {
        break;
      }
    }

    if (topmostElementId) {
      // Clicking on an element - handle it
      const elementId = topmostElementId;
      const isSelected = this.selectionController
        .getModel()
        .selectedIds.has(elementId);

      if (e.shiftKey) {
        // Shift + Click: Add to selection (never remove)
        this.selectionController.selectionContext.addToSelection(elementId);
        e.stopPropagation();
        // Don't prevent default or capture pointer for multi-select clicks
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Click: Toggle selection (add if not selected, remove if selected)
        this.selectionController.selectionContext.toggle(elementId);
        e.preventDefault();
        e.stopPropagation();
        // Don't capture pointer for multi-select clicks
      } else {
        // Normal click: Select single element (clear others) if not already selected
        if (!isSelected) {
          this.selectionController.selectionContext.select(elementId);
        }
        // Prepare for potential drag - store initial state but don't start dragging yet
        // Drag will only start after threshold distance is crossed
        // Store initial positions for all selected elements (for multi-selection dragging)
        // After selection change, get current selected IDs
        const selectedIds = Array.from(this.selectionController.getModel().selectedIds);
        
        // Update metadata for all selected elements that will be dragged
        for (const id of selectedIds) {
          this.updateElementMetadata(id);
          const metadata = this.elementMetadata.get(id);
          if (metadata) {
            this.dragStartElementPositions.set(id, { x: metadata.x, y: metadata.y });
          }
        }
        
        this.isDragging = false; // Not dragging yet, just preparing
        this.dragStarted = false; // Haven't crossed threshold yet
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.draggedElementId = elementId; // Track which element was clicked (for single-element drag fallback)
        this.capturedPointerId = e.pointerId;
        
        // Capture pointer to receive all pointer events even when over the element
        // Only capture for drag operations, not multi-select
        try {
          this.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore pointer capture errors (e.g., in test environments)
          console.warn('[EFCanvas] Failed to capture pointer:', err);
        }
        
        // Calculate drag start position in canvas coordinates once
        // Use .canvas-content as reference to match metadata calculation
        const shadowRoot = this.shadowRoot;
        const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
        const canvasRect = canvasContent?.getBoundingClientRect() || this.getBoundingClientRect();
        this.dragStartCanvasPos = screenToCanvas(
          e.clientX,
          e.clientY,
          canvasRect,
          this.panZoomTransform,
        );
        // Stop propagation to prevent panzoom from handling this as a pan gesture
        e.stopPropagation();
      }
    } else {
      // Clicking on empty space - start box selection by default
      // Use .canvas-content as reference to match metadata calculation
      const shadowRoot = this.shadowRoot;
      const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
      const canvasRect = canvasContent?.getBoundingClientRect() || this.getBoundingClientRect();
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        canvasRect,
        this.panZoomTransform,
      );

      // Track if modifier keys were pressed (for adding to selection)
      this.boxSelectModifierKeys = e.shiftKey || e.ctrlKey || e.metaKey;
      
      // Start box selection (works by default, modifier keys determine if we add to selection)
      this.isBoxSelecting = true;
      this.boxSelectStart = canvasPos;
      this.selectionController.selectionContext.startBoxSelect(canvasPos.x, canvasPos.y);
      
      // Capture pointer for box selection
      this.capturedPointerId = e.pointerId;
      try {
        this.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('[EFCanvas] Failed to capture pointer:', err);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /**
   * Handle pointer move events.
   */
  private handlePointerMove = (e: PointerEvent): void => {
    
    // If pointer is not down, clean up any drag state
    if (e.buttons === 0) {
      if (this.capturedPointerId !== null) {
        try {
          this.releasePointerCapture(e.pointerId);
        } catch (err) {
          // Ignore release errors
        }
        this.capturedPointerId = null;
      }
      if (this.isDragging || this.dragStarted || this.draggedElementId !== null) {
        this.isDragging = false;
        this.dragStarted = false;
        this.dragStartPos = null;
        this.dragStartCanvasPos = null;
        this.dragStartElementPositions.clear();
        this.draggedElementId = null;
      }
      if (this.isBoxSelecting) {
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectModifierKeys = false;
      }
      return;
    }

    // Use .canvas-content as reference to match metadata calculation
    const shadowRoot = this.shadowRoot;
    const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
    const canvasRect = canvasContent?.getBoundingClientRect() || this.getBoundingClientRect();

    // Check if we're preparing for a drag (pointerdown on element but threshold not crossed)
    if (!this.dragStarted && this.draggedElementId && this.dragStartPos && this.dragStartCanvasPos && this.dragStartElementPositions.size > 0) {
      // Check if we've moved enough to start dragging
      const distance = Math.sqrt(
        Math.pow(e.clientX - this.dragStartPos.x, 2) + 
        Math.pow(e.clientY - this.dragStartPos.y, 2)
      );
      
      if (distance >= this.DRAG_THRESHOLD) {
        // Threshold crossed - start dragging
        this.dragStarted = true;
        this.isDragging = true;
        // Continue to process this move event (don't return)
      } else {
        // Haven't crossed threshold yet, don't do anything
        return;
      }
    }

    // Process drag update (either already dragging, or just crossed threshold)
    if (this.isDragging && this.dragStarted && this.dragStartCanvasPos && this.dragStartElementPositions.size > 0) {
      // Drag all selected elements - use pre-calculated canvas start position to avoid quantization
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        canvasRect,
        this.panZoomTransform,
      );
      
      // Calculate delta using pre-calculated start position (avoids rounding errors)
      const deltaX = canvasPos.x - this.dragStartCanvasPos.x;
      const deltaY = canvasPos.y - this.dragStartCanvasPos.y;

      // Move all elements that were selected when drag started
      for (const [elementId, startPos] of this.dragStartElementPositions.entries()) {
        const newX = startPos.x + deltaX;
        const newY = startPos.y + deltaY;
        this.updateElementPosition(elementId, newX, newY);
      }
      e.stopPropagation();
    } else if (this.isBoxSelecting && this.boxSelectStart) {
      // Update box select
      const canvasPos = screenToCanvas(
        e.clientX,
        e.clientY,
        canvasRect,
        this.panZoomTransform,
      );
      this.selectionController.selectionContext.updateBoxSelect(canvasPos.x, canvasPos.y);
      e.stopPropagation();
    }
  };

  /**
   * Handle pointer up events.
   */
  private handlePointerUp = (e: PointerEvent): void => {
    // Store state before clearing (for empty space click check)
    const wasDragging = this.isDragging || this.dragStarted;
    const wasBoxSelecting = this.isBoxSelecting;
    
    // Release pointer capture if we have it
    if (this.capturedPointerId !== null) {
      try {
        this.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore release errors
      }
      this.capturedPointerId = null;
    }
    
    // Always clean up drag state if we have any drag-related state set
    // This ensures drag always stops on pointer up, regardless of threshold
    if (this.draggedElementId !== null || this.dragStartPos !== null) {
      this.isDragging = false;
      this.dragStarted = false;
      this.dragStartPos = null;
      this.dragStartCanvasPos = null;
      this.dragStartElementPositions.clear();
      this.draggedElementId = null;
    }

    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      // Pass modifier key state to endBoxSelect to determine if we add to selection
      this.selectionController.selectionContext.endBoxSelect(
        (bounds) => this.hitTest(bounds),
        this.boxSelectModifierKeys,
      );
      this.boxSelectStart = null;
      this.boxSelectModifierKeys = false;
    }

    // Clear selection if we clicked on empty space and didn't drag
    if (this.emptySpaceClickPos) {
      if (!wasDragging && !wasBoxSelecting) {
        const moved = Math.abs(e.clientX - this.emptySpaceClickPos.x) > 2 || 
                      Math.abs(e.clientY - this.emptySpaceClickPos.y) > 2;
        if (!moved) {
          this.selectionController.selectionContext.clear();
        }
      }
      this.emptySpaceClickPos = null;
    }
  };

  /**
   * Update element position in canvas coordinates.
   * Unified approach: Always calculate relative to parent (or .canvas-content for direct children).
   * For direct children, parent position is (0, 0), so relative = absolute (no-op).
   * 
   * For nested elements, we read parent's current position from DOM (not metadata) to ensure
   * we're always calculating relative to the actual current position.
   */
  updateElementPosition(elementId: string, x: number, y: number): void {
    const element = this.elementRegistry.get(elementId);
    if (!element) {
      console.warn('[EFCanvas] updateElementPosition: element not found', elementId);
      return;
    }

    const metadata = this.elementMetadata.get(elementId);
    if (!metadata) {
      return;
    }

    metadata.x = x;
    metadata.y = y;

    // Unified approach: Find parent and calculate relative position
    // Uses the same unified method as updateElementMetadata for consistency
    
    let parentX = 0;
    let parentY = 0;
    let parent: HTMLElement | null = element.parentElement;
    
    // Walk up to find registered parent (or canvas itself)
    while (parent && parent !== this) {
      const parentId = parent.id || parent.getAttribute(this.elementIdAttribute);
      if (parentId && this.elementRegistry.has(parentId)) {
        // Use SAME unified calculation as updateElementMetadata:
        // 1. Get dimensions from offsetWidth/offsetHeight
        // 2. Get center from getBoundingClientRect()
        // 3. Calculate top-left from center - dimensions/2
        const parentWidth = parent.offsetWidth;
        const parentHeight = parent.offsetHeight;
        const parentRect = getElementBounds(parent);
        const parentScreenCenterX = parentRect.left + parentRect.width / 2;
        const parentScreenCenterY = parentRect.top + parentRect.height / 2;
        
        const shadowRoot = this.shadowRoot;
        const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
        if (canvasContent) {
          const referenceRect = canvasContent.getBoundingClientRect();
          const parentCanvasCenter = screenToCanvas(
            parentScreenCenterX,
            parentScreenCenterY,
            referenceRect,
            this.panZoomTransform,
          );
          parentX = parentCanvasCenter.x - parentWidth / 2;
          parentY = parentCanvasCenter.y - parentHeight / 2;
        }
        break;
      }
      parent = parent.parentElement;
    }
    
    // Calculate relative position: absolute position - parent absolute position
    // For direct children (no registered parent found), parentX/Y remain 0, so relative = absolute
    const relativeX = x - parentX;
    const relativeY = y - parentY;
    
    element.style.position = "absolute";
    element.style.left = `${relativeX}px`;
    element.style.top = `${relativeY}px`;
  }

  /**
   * Get element metadata.
   */
  getElementData(elementId: string): CanvasElementData | null {
    return this.elementMetadata.get(elementId) || null;
  }

  /**
   * Get all element data.
   */
  getAllElementsData(): CanvasElementData[] {
    return Array.from(this.elementMetadata.values());
  }

  /**
   * Convert screen coordinates to canvas coordinates (for API).
   */
  screenToCanvasCoords(screenX: number, screenY: number): { x: number; y: number } {
    const canvasRect = this.getBoundingClientRect();
    return screenToCanvas(screenX, screenY, canvasRect, this.panZoomTransform);
  }

  /**
   * Convert canvas coordinates to screen coordinates (for API).
   */
  canvasToScreenCoords(canvasX: number, canvasY: number): { x: number; y: number } {
    const canvasRect = this.getBoundingClientRect();
    return canvasToScreen(canvasX, canvasY, canvasRect, this.panZoomTransform);
  }

  /**
   * Setup overlay layer as sibling of panzoom (outside panzoom, same level as panzoom).
   */
  private setupOverlayLayer(): void {
    // Find panzoom element (canvas is inside panzoom)
    const panZoom = this.closest("ef-pan-zoom") as HTMLElement | null;
    if (!panZoom) {
      return;
    }

    // Check if overlay layer already exists (application provided it)
    const panZoomParent = panZoom.parentElement;
    if (panZoomParent) {
      const existing = panZoomParent.querySelector("ef-overlay-layer") as EFOverlayLayer | null;
      if (existing) {
        this.overlayLayer = existing;
        return;
      }
    }

    // Create overlay layer as sibling of panzoom
    if (panZoomParent) {
      const overlayLayer = document.createElement("ef-overlay-layer") as EFOverlayLayer;
      overlayLayer.style.position = "absolute";
      overlayLayer.style.inset = "0";
      overlayLayer.style.zIndex = "1";
      overlayLayer.style.pointerEvents = "none";
      
      // Insert after panzoom (so it's a sibling of panzoom, not canvas)
      panZoomParent.insertBefore(overlayLayer, panZoom.nextSibling);
      this.overlayLayer = overlayLayer;
    }
  }

  /**
   * Cleanup overlay layer if we created it.
   */
  private cleanupOverlayLayer(): void {
    if (this.overlayLayer && this.overlayLayer.parentElement) {
      // Only remove if we created it (check if it's a sibling)
      const parent = this.parentElement;
      if (parent && parent.contains(this.overlayLayer)) {
        // Check if it's actually a sibling (not the canvas itself)
        if (this.overlayLayer.tagName !== "EF-CANVAS") {
          this.overlayLayer.remove();
        }
      }
    }
    this.overlayLayer = null;
  }

  /**
   * Setup selection overlay as sibling of panzoom (outside panzoom, same level as panzoom).
   * This ensures the overlay maintains 1:1 pixel ratio regardless of zoom level.
   */
  private setupSelectionOverlay(): void {
    // Find panzoom element (canvas is inside panzoom)
    const panZoom = this.closest("ef-pan-zoom") as HTMLElement | null;
    if (!panZoom) {
      return;
    }

    // Check if selection overlay already exists (application provided it)
    const panZoomParent = panZoom.parentElement;
    if (panZoomParent) {
      const existing = panZoomParent.querySelector("ef-canvas-selection-overlay") as SelectionOverlay | null;
      if (existing) {
        this.selectionOverlay = existing;
        return;
      }
    }

    // Create selection overlay as sibling of panzoom (outside transform)
    if (panZoomParent) {
      const selectionOverlay = document.createElement("ef-canvas-selection-overlay") as SelectionOverlay;
      
      // Pass contexts and canvas element as properties since overlay is outside context providers
      selectionOverlay.selection = this.selectionContext;
      selectionOverlay.canvas = this; // Pass canvas element directly
      if (this.panZoomTransform) {
        selectionOverlay.panZoomTransform = this.panZoomTransform;
      }
      
      // Insert after panzoom (so it's a sibling of panzoom, not canvas)
      panZoomParent.insertBefore(selectionOverlay, panZoom.nextSibling);
      this.selectionOverlay = selectionOverlay;
    }
  }

  /**
   * Cleanup selection overlay if we created it.
   */
  private cleanupSelectionOverlay(): void {
    if (this.selectionOverlay && this.selectionOverlay.parentElement) {
      // Only remove if we created it (check if it's a sibling)
      const panZoom = this.closest("ef-pan-zoom") as HTMLElement | null;
      if (panZoom && panZoom.parentElement?.contains(this.selectionOverlay)) {
        // Check if it's actually a sibling (not the canvas itself)
        this.selectionOverlay.remove();
      }
      this.selectionOverlay = null;
    }
  }

  /**
   * Start RAF loop for overlay layer sync and transform handles updates.
   */
  private startOverlayRafLoop(): void {
    if (this.overlayRafId !== null) {
      return;
    }

    const update = () => {
      // Sync overlay layer transform
      if (this.overlayLayer && this.panZoomTransform) {
        this.overlayLayer.panZoomTransform = this.panZoomTransform;
      }

      // Update transform handles
      if (this.enableTransformHandles) {
        this.updateTransformHandles();
      }

      this.overlayRafId = requestAnimationFrame(update);
    };

    this.overlayRafId = requestAnimationFrame(update);
  }

  /**
   * Stop RAF loop.
   */
  private stopOverlayRafLoop(): void {
    if (this.overlayRafId !== null) {
      cancelAnimationFrame(this.overlayRafId);
      this.overlayRafId = null;
    }
  }


  /**
   * Update transform handles for selected elements.
   * For multiple selections, shows a single set of handles for the bounding box.
   */
  private updateTransformHandles(): void {
    if (!this.overlayLayer) {
      return;
    }

    const selectedIds = Array.from(this.selectionController.getModel().selectedIds);

    // Remove handles for unselected elements and old multi-selection handles
    // When switching between single/multi, we need to clean up the old handle key
    this.transformHandlesMap.forEach((handles, id) => {
      const isMultiSelectionHandle = id === "multi-selection";
      const isMultiSelection = selectedIds.length > 1;
      
      // Determine if we should keep this handle
      let shouldKeep: boolean;
      if (isMultiSelectionHandle) {
        // Keep multi-selection handle only if we're in multi-selection mode
        shouldKeep = isMultiSelection;
      } else {
        // Keep single element handle only if it's the selected element AND we're not in multi-selection
        shouldKeep = selectedIds.includes(id) && !isMultiSelection;
      }
      
      if (!shouldKeep) {
        handles.remove();
        this.transformHandlesMap.delete(id);
      }
    });

    if (selectedIds.length === 0) {
      return;
    }

    // Use a single handle set for multi-selection (keyed by "multi-selection")
    // For single selection, use the element ID as the key
    const handleKey = selectedIds.length > 1 ? "multi-selection" : (selectedIds[0] ?? "none");
    
    if (handleKey === "none") {
      return;
    }
    
    let handles = this.transformHandlesMap.get(handleKey);

    if (!handles) {
      // Create handles
      handles = document.createElement("ef-transform-handles") as EFTransformHandles;
      handles.setAttribute("enable-rotation", "true");
      handles.setAttribute("enable-resize", "true");
      handles.setAttribute("enable-drag", "false");
      // Multi-selection: always lock aspect ratio for proportional scaling
      if (selectedIds.length > 1) {
        handles.setAttribute("lock-aspect-ratio", "true");
      }
      handles.style.pointerEvents = "none";

      // Listen for bounds-change events
      handles.addEventListener("bounds-change", (e: Event) => {
        const customEvent = e as CustomEvent<{ bounds: TransformBounds }>;
        const bounds = customEvent.detail.bounds;
        // Get current selection (not from closure)
        const currentSelectedIds = Array.from(this.selectionController.getModel().selectedIds);
        if (currentSelectedIds.length > 1) {
          this.handleMultiSelectionTransformHandlesBoundsChange(currentSelectedIds, bounds);
        } else if (currentSelectedIds[0]) {
          this.handleTransformHandlesBoundsChange(currentSelectedIds[0], bounds);
        }
      });

      // Listen for rotation-change events
      handles.addEventListener("rotation-change", (e: Event) => {
        const customEvent = e as CustomEvent<{ rotation: number }>;
        const rotation = customEvent.detail.rotation;
        // Get current selection (not from closure)
        const currentSelectedIds = Array.from(this.selectionController.getModel().selectedIds);
        if (currentSelectedIds.length > 1) {
          this.handleMultiSelectionTransformHandlesRotationChange(currentSelectedIds, rotation);
        } else if (currentSelectedIds[0]) {
          this.handleTransformHandlesRotationChange(currentSelectedIds[0], rotation);
        }
      });

      this.overlayLayer.appendChild(handles);
      this.transformHandlesMap.set(handleKey, handles);
    }

    // Calculate bounding box for all selected elements
    if (selectedIds.length > 1) {
      // Multi-selection: calculate bounding box from element metadata
      // Account for rotation - use rotated bounding box for each element
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasElements = false;

      for (const id of selectedIds) {
        // Refresh metadata first
        this.updateElementMetadata(id);
        const metadata = this.elementMetadata.get(id);
        if (metadata) {
          // Get the axis-aligned bounding box that contains the rotated element
          const rotatedBounds = getRotatedBoundingBox(
            metadata.x,
            metadata.y,
            metadata.width,
            metadata.height,
            metadata.rotation ?? 0,
          );
          minX = Math.min(minX, rotatedBounds.minX);
          minY = Math.min(minY, rotatedBounds.minY);
          maxX = Math.max(maxX, rotatedBounds.maxX);
          maxY = Math.max(maxY, rotatedBounds.maxY);
          hasElements = true;
        }
      }

      if (hasElements && this.overlayLayer) {
        // For multi-selection, we need a target element for rotation calculation
        // Use the first selected element as the target (EFTransformHandles will calculate rotation
        // relative to that element's center, but our handler will apply it around bounding box center)
        const firstElementId = selectedIds[0];
        if (firstElementId) {
          const firstElement = this.elementRegistry.get(firstElementId);
          if (firstElement) {
            // Pass element directly to avoid shadow DOM selector issues
            handles.target = firstElement as any;
          }
        }
        
        // Calculate screen coordinates for the bounding box
        const panZoomElement = this.closest("ef-pan-zoom") as any;
        const overlayRect = this.overlayLayer.getBoundingClientRect();
        
        let screenX: number;
        let screenY: number;
        let screenWidth: number;
        let screenHeight: number;

        if (panZoomElement && typeof panZoomElement.canvasToScreen === 'function' && this.panZoomTransform) {
          // Use EFPanZoom.canvasToScreen for consistency
          const topLeft = panZoomElement.canvasToScreen(minX, minY);
          const bottomRight = panZoomElement.canvasToScreen(maxX, maxY);
          screenX = topLeft.x;
          screenY = topLeft.y;
          screenWidth = bottomRight.x - topLeft.x;
          screenHeight = bottomRight.y - topLeft.y;
        } else {
          // Fallback: use canvasToScreen helper
          const canvasRect = this.getBoundingClientRect();
          const topLeft = canvasToScreen(minX, minY, canvasRect, this.panZoomTransform);
          const bottomRight = canvasToScreen(maxX, maxY, canvasRect, this.panZoomTransform);
          screenX = topLeft.x;
          screenY = topLeft.y;
          screenWidth = bottomRight.x - topLeft.x;
          screenHeight = bottomRight.y - topLeft.y;
        }

        // During rotation or resize, don't recalculate bounds from elements
        // (the interaction handler manages bounds directly to avoid feedback loops)
        if (handles.interactionMode === "rotating" || handles.interactionMode === "resizing") {
          // Just update canvas scale if needed
          const newScale = this.panZoomTransform?.scale || 1;
          if (handles.canvasScale !== newScale) {
            handles.canvasScale = newScale;
          }
        } else {
          // EFTransformHandles renders bounds.width/height directly as CSS pixels, so it expects screen pixels.
          // Calculate relative position to overlay layer
          // Multi-selection always uses rotation: 0 when idle (rotation is baked into element positions)
          const currentBounds = handles.bounds;
          const newBounds: TransformBounds = {
            x: screenX - overlayRect.left,
            y: screenY - overlayRect.top,
            width: screenWidth,
            height: screenHeight,
            rotation: 0,
          };

          // Only update if bounds actually changed (including rotation)
          if (
            !currentBounds ||
            Math.abs(currentBounds.x - newBounds.x) > 0.1 ||
            Math.abs(currentBounds.y - newBounds.y) > 0.1 ||
            Math.abs(currentBounds.width - newBounds.width) > 0.1 ||
            Math.abs(currentBounds.height - newBounds.height) > 0.1 ||
            Math.abs((currentBounds.rotation ?? 0) - (newBounds.rotation ?? 0)) > 0.1
          ) {
            handles.bounds = newBounds;
          }

          // Set canvas scale
          const newScale = this.panZoomTransform?.scale || 1;
          if (handles.canvasScale !== newScale) {
            handles.canvasScale = newScale;
          }
          
          // Reset tracking when handle is idle (interaction ended)
          if (handles.interactionMode === "idle") {
            this.lastMultiSelectionRotation = null;
            this.multiSelectionRotationCenter = null;
            this.multiSelectionResizeInitial = null;
            // Re-enable resize handles after rotation ends
            handles.enableResize = true;
          }
        }
      }
    } else if (selectedIds[0]) {
      // Single selection: use element data directly
      // Refresh metadata to ensure it's up-to-date (especially after rotation)
      this.updateElementMetadata(selectedIds[0]);
      const elementData = this.elementMetadata.get(selectedIds[0]);
      if (elementData && elementData.element) {
        // Set target for rotation calculation
        // Use the element directly instead of a selector since it might be in shadow DOM
        // EFTransformHandles accepts either a string selector or an HTMLElement
        handles.target = elementData.element as any;
        this.updateTransformHandlesBounds(selectedIds[0], handles, elementData);
      }
    }
  }

  /**
   * Update transform handles bounds for an element.
   */
  private updateTransformHandlesBounds(
    _elementId: string,
    handles: EFTransformHandles,
    elementData: CanvasElementData,
  ): void {
    if (!this.overlayLayer) {
      return;
    }

    const overlayRect = this.overlayLayer.getBoundingClientRect();
    // Use .canvas-content as reference to match metadata calculation
    const shadowRoot = this.shadowRoot;
    const canvasContent = shadowRoot?.querySelector('.canvas-content') as HTMLElement;
    if (!canvasContent) {
      return;
    }
    const canvasRect = canvasContent.getBoundingClientRect();
    const scale = this.panZoomTransform?.scale || 1;
    
    // Calculate element's CENTER in canvas coordinates (center is stable during rotation)
    const centerCanvasX = elementData.x + elementData.width / 2;
    const centerCanvasY = elementData.y + elementData.height / 2;
    
    // Convert center to screen coordinates
    const centerScreen = canvasToScreen(
      centerCanvasX,
      centerCanvasY,
      canvasRect,
      this.panZoomTransform,
    );
    
    // Overlay size in screen pixels (use actual element size, NOT bounding box)
    const screenWidth = elementData.width * scale;
    const screenHeight = elementData.height * scale;
    
    // Overlay position: center minus half size (overlay-relative)
    const newBounds: TransformBounds = {
      x: centerScreen.x - overlayRect.left - screenWidth / 2,
      y: centerScreen.y - overlayRect.top - screenHeight / 2,
      width: screenWidth,
      height: screenHeight,
      rotation: elementData.rotation || 0,
    };

    // Only update if bounds actually changed (to avoid unnecessary renders)
    const currentBounds = handles.bounds;
    if (
      !currentBounds ||
      Math.abs(currentBounds.x - newBounds.x) > 0.1 ||
      Math.abs(currentBounds.y - newBounds.y) > 0.1 ||
      Math.abs(currentBounds.width - newBounds.width) > 0.1 ||
      Math.abs(currentBounds.height - newBounds.height) > 0.1 ||
      (currentBounds.rotation || 0) !== (newBounds.rotation || 0)
    ) {
      handles.bounds = newBounds;
    }

    // Set canvas scale so handles know the zoom level
    if (handles.canvasScale !== scale) {
      handles.canvasScale = scale;
    }
  }

  /**
   * Handle transform handles bounds-change event for multi-selection.
   * Updates all selected elements proportionally.
   */
  private handleMultiSelectionTransformHandlesBoundsChange(
    elementIds: string[],
    bounds: TransformBounds,
  ): void {
    if (!this.overlayLayer) {
      return;
    }

    // Bounds are already in canvas coordinates (dispatched by EFTransformHandles)
    const newCanvasPos = { x: bounds.x, y: bounds.y };
    const newCanvasWidth = bounds.width;
    const newCanvasHeight = bounds.height;

    // On first call, capture INITIAL element positions
    // This prevents feedback loops from re-reading updated positions
    // Use getRotatedBoundingBox to match how the overlay calculates bounds
    if (!this.multiSelectionResizeInitial) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const elements = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();

      for (const id of elementIds) {
        const metadata = this.elementMetadata.get(id);
        if (metadata) {
          elements.set(id, {
            x: metadata.x,
            y: metadata.y,
            width: metadata.width,
            height: metadata.height,
            rotation: metadata.rotation ?? 0,
          });
          
          // Use rotated bounding box to match overlay calculation
          const rotatedBounds = getRotatedBoundingBox(
            metadata.x,
            metadata.y,
            metadata.width,
            metadata.height,
            metadata.rotation ?? 0,
          );
          minX = Math.min(minX, rotatedBounds.minX);
          minY = Math.min(minY, rotatedBounds.minY);
          maxX = Math.max(maxX, rotatedBounds.maxX);
          maxY = Math.max(maxY, rotatedBounds.maxY);
        }
      }

      this.multiSelectionResizeInitial = { elements, minX, minY, maxX, maxY };
    }

    // Use INITIAL positions for all calculations (prevents feedback loops)
    const { elements: initialElements, minX, minY, maxX, maxY } = this.multiSelectionResizeInitial;
    const oldWidth = maxX - minX;
    const oldHeight = maxY - minY;

    if (oldWidth === 0 || oldHeight === 0) {
      return;
    }

    // Calculate scale factors for each dimension
    const scaleX = newCanvasWidth / oldWidth;
    const scaleY = newCanvasHeight / oldHeight;

    // Ensure scales are positive (no flipping)
    const safeScaleX = Math.max(0.01, scaleX);
    const safeScaleY = Math.max(0.01, scaleY);

    // The bounds position (newCanvasPos) represents where the fixed corner should be
    // For proper corner pinning, use the position from bounds directly
    // Update all elements proportionally using INITIAL positions
    for (const [id, initialData] of initialElements.entries()) {
      // Calculate relative position within the INITIAL bounding box (0-1 range)
      const relX = (initialData.x - minX) / oldWidth;
      const relY = (initialData.y - minY) / oldHeight;

      // Apply new position and size
      // Position relative to the new bounds position
      const newX = newCanvasPos.x + relX * newCanvasWidth;
      const newY = newCanvasPos.y + relY * newCanvasHeight;
      const newWidth = initialData.width * safeScaleX;
      const newHeight = initialData.height * safeScaleY;

      // Update element position
      this.updateElementPosition(id, newX, newY);

      // Update element size
      const element = this.elementRegistry.get(id);
      if (!element) {
        console.warn('[EFCanvas] handleMultiSelectionTransformHandlesBoundsChange: element not found', id);
        continue;
      }
      
      // Set size in canvas coordinates (parent transform handles scaling)
      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
      
      // Update metadata
      const metadata = this.elementMetadata.get(id);
      if (metadata) {
        this.elementMetadata.set(id, {
          ...metadata,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
    }
    
    // Update handle overlay to match elements in real-time
    const handles = this.transformHandlesMap.get("multi-selection");
    if (handles && this.overlayLayer) {
      const overlayRect = this.overlayLayer.getBoundingClientRect();
      const canvasRect = this.getBoundingClientRect();
      const scale = this.panZoomTransform?.scale || 1;
      
      // Calculate center of new bounding box
      const centerCanvasX = newCanvasPos.x + newCanvasWidth / 2;
      const centerCanvasY = newCanvasPos.y + newCanvasHeight / 2;
      
      // Convert center to screen coordinates
      const centerScreen = canvasToScreen(
        centerCanvasX,
        centerCanvasY,
        canvasRect,
        this.panZoomTransform,
      );
      
      // Overlay size in screen pixels
      const screenWidth = newCanvasWidth * scale;
      const screenHeight = newCanvasHeight * scale;
      
      // Overlay position: center minus half size (overlay-relative)
      const newBounds: TransformBounds = {
        x: centerScreen.x - overlayRect.left - screenWidth / 2,
        y: centerScreen.y - overlayRect.top - screenHeight / 2,
        width: screenWidth,
        height: screenHeight,
        rotation: 0,
      };
      
      handles.bounds = newBounds;
    }
  }

  // Track multi-selection rotation state (only during active rotation drag)
  private lastMultiSelectionRotation: number | null = null;
  private multiSelectionRotationCenter: { x: number; y: number } | null = null;
  
  // Track multi-selection resize state (initial positions at start of resize)
  private multiSelectionResizeInitial: {
    elements: Map<string, { x: number; y: number; width: number; height: number; rotation: number }>;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null = null;

  /**
   * Handle transform handles rotation-change event for multiple selected elements.
   * Rotates all elements around the center of the bounding box.
   */
  private handleMultiSelectionTransformHandlesRotationChange(
    elementIds: string[],
    rotation: number,
  ): void {
    // On first call, calculate and store the initial group center
    // This ensures we always rotate around the same point (no drift)
    const isFirstCall = this.lastMultiSelectionRotation === null;
    
    if (isFirstCall) {
      // Calculate initial bounding box center
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const id of elementIds) {
        const metadata = this.elementMetadata.get(id);
        if (metadata) {
          minX = Math.min(minX, metadata.x);
          minY = Math.min(minY, metadata.y);
          maxX = Math.max(maxX, metadata.x + metadata.width);
          maxY = Math.max(maxY, metadata.y + metadata.height);
        }
      }

      this.multiSelectionRotationCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
      };
    }

    // Calculate delta rotation
    const deltaRotation = isFirstCall ? 0 : rotation - this.lastMultiSelectionRotation!;
    this.lastMultiSelectionRotation = rotation;

    // Use the fixed center (calculated at start of rotation)
    const groupCenterX = this.multiSelectionRotationCenter!.x;
    const groupCenterY = this.multiSelectionRotationCenter!.y;

    // Rotate each element around the group center
    const deltaRadians = (deltaRotation * Math.PI) / 180;
    const cos = Math.cos(deltaRadians);
    const sin = Math.sin(deltaRadians);

    for (const id of elementIds) {
      const metadata = this.elementMetadata.get(id);
      const element = this.elementRegistry.get(id);
      if (!metadata || !element) continue;
      
      const data = {
        id,
        element,
        x: metadata.x,
        y: metadata.y,
        width: metadata.width,
        height: metadata.height,
        rotation: metadata.rotation ?? 0,
      };
      
      // Skip position updates if no actual rotation delta
      if (Math.abs(deltaRotation) < 0.001) continue;
      // Calculate element's center relative to group center
      const elementCenterX = data.x + data.width / 2;
      const elementCenterY = data.y + data.height / 2;
      const relX = elementCenterX - groupCenterX;
      const relY = elementCenterY - groupCenterY;

      // Rotate the relative position by delta
      const rotatedRelX = relX * cos - relY * sin;
      const rotatedRelY = relX * sin + relY * cos;

      // Calculate new top-left position from rotated center
      const newX = groupCenterX + rotatedRelX - data.width / 2;
      const newY = groupCenterY + rotatedRelY - data.height / 2;

      // Update element position
      this.updateElementPosition(data.id, newX, newY);

      // Update element's individual rotation
      const newRotation = data.rotation + deltaRotation;
      data.element.style.transform = `rotate(${newRotation}deg)`;
      data.element.style.transformOrigin = 'center';

      // Update metadata
      this.elementMetadata.set(data.id, {
        id: data.id,
        element: data.element,
        x: newX,
        y: newY,
        width: data.width,
        height: data.height,
        rotation: newRotation,
      });
    }
    
    // Update handles to show current rotation during drag
    // On release, rotation resets to 0 (rotation is "baked" into element positions)
    const handles = this.transformHandlesMap.get("multi-selection");
    if (handles) {
      // Hide resize handles during rotation (only show rotation handle)
      handles.enableResize = false;
      
      const currentBounds = handles.bounds;
      if (currentBounds) {
        // Show rotation during drag (will reset to 0 on release via updateTransformHandles)
        handles.bounds = {
          ...currentBounds,
          rotation: this.lastMultiSelectionRotation ?? 0,
        };
        handles.requestUpdate();
      }
    }
  }

  /**
   * Handle transform handles bounds-change event for single element.
   * Converts bounds from overlay-relative screen coordinates to canvas coordinates.
   */
  private handleTransformHandlesBoundsChange(
    elementId: string,
    bounds: TransformBounds,
  ): void {
    if (!this.overlayLayer) {
      return;
    }

    // Bounds are now in canvas coordinates (one-way data flow: resize calculates in canvas, updates element, handles read from element)
    const canvasPos = { x: bounds.x, y: bounds.y };
    const canvasWidth = bounds.width;
    const canvasHeight = bounds.height;

    // Update element directly in canvas coordinates
    const element = this.elementRegistry.get(elementId);
    if (element) {
      // Update position
      this.updateElementPosition(elementId, canvasPos.x, canvasPos.y);

      // Update size - set in canvas coordinates (parent transform handles scaling)
      const metadata = this.elementMetadata.get(elementId);
      if (metadata) {
        element.style.width = `${canvasWidth}px`;
        element.style.height = `${canvasHeight}px`;
        metadata.width = canvasWidth;
        metadata.height = canvasHeight;
      }

      // Note: Rotation is handled separately via rotation-change event
      // Only update rotation here if it's explicitly set (for initial sync)
      if (bounds.rotation !== undefined && bounds.rotation !== (metadata?.rotation || 0)) {
        element.style.transform = `rotate(${bounds.rotation}deg)`;
        if (metadata) {
          metadata.rotation = bounds.rotation;
        }
      }
    }

    // Element is now updated. Immediately update handle bounds prop (one-way flow: element → bounds prop)
    // Use the SAME calculation as updateTransformHandlesBounds for consistency
    const handles = this.transformHandlesMap.get(elementId);
    if (handles && this.overlayLayer) {
      const overlayRect = this.overlayLayer.getBoundingClientRect();
      const canvasRect = this.getBoundingClientRect();
      const scale = this.panZoomTransform?.scale || 1;
      
      // Calculate element's CENTER from the canvas coordinates we just applied
      const centerCanvasX = canvasPos.x + canvasWidth / 2;
      const centerCanvasY = canvasPos.y + canvasHeight / 2;
      
      // Convert center to screen coordinates
      const centerScreen = canvasToScreen(
        centerCanvasX,
        centerCanvasY,
        canvasRect,
        this.panZoomTransform,
      );
      
      // Overlay size in screen pixels (use actual element size, NOT bounding box)
      const screenWidth = canvasWidth * scale;
      const screenHeight = canvasHeight * scale;
      
      // Overlay position: center minus half size (overlay-relative)
      const newBounds: TransformBounds = {
        x: centerScreen.x - overlayRect.left - screenWidth / 2,
        y: centerScreen.y - overlayRect.top - screenHeight / 2,
        width: screenWidth,
        height: screenHeight,
        rotation: bounds.rotation || 0,
      };
      
      handles.bounds = newBounds;
      handles.requestUpdate();
    }
  }

  /**
   * Handle transform handles rotation-change event for single element.
   */
  private handleTransformHandlesRotationChange(
    elementId: string,
    rotation: number,
  ): void {
    const element = this.elementRegistry.get(elementId);
    if (!element) {
      console.warn('[EFCanvas] handleTransformHandlesRotationChange: element not found', elementId);
      return;
    }
    
    // Apply rotation transform
    // Elements use left/top for positioning, so transform is safe to use for rotation
    element.style.transform = `rotate(${rotation}deg)`;
    element.style.transformOrigin = 'center';
    
    // Update metadata to preserve rotation
    const metadata = this.elementMetadata.get(elementId);
    if (metadata) {
      this.elementMetadata.set(elementId, {
        ...metadata,
        rotation,
      });
    } else {
      // If metadata doesn't exist, create it (shouldn't happen, but be safe)
      this.updateElementMetadata(elementId);
      const updatedMetadata = this.elementMetadata.get(elementId);
      if (updatedMetadata) {
        this.elementMetadata.set(elementId, {
          ...updatedMetadata,
          rotation,
        });
      }
    }
  }

  /**
   * Cleanup transform handles.
   */
  private cleanupTransformHandles(): void {
    this.transformHandlesMap.forEach((handles) => {
      handles.remove();
    });
    this.transformHandlesMap.clear();
  }

  render() {
    return html`
      <div class="canvas-content">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-canvas": EFCanvas;
  }
}

