import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

// Constants
const DEFAULT_MIN_SIZE = 10;
const CENTER_RESIZE_MULTIPLIER = 2;

export interface BoxBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type ResizeSide = "top" | "right" | "bottom" | "left";
type ResizeHandle = ResizeCorner | ResizeSide;

interface Dimensions {
  width: number;
  height: number;
}

interface ResizeContext {
  readonly initialBounds: BoxBounds;
  readonly container: Dimensions;
  readonly constraints: {
    minSize: number;
    aspectRatio?: number;
  };
  readonly movement: {
    deltaX: number;
    deltaY: number;
  };
  readonly modifiers: {
    centerResize: boolean;
    preserveAspectRatio: boolean;
  };
}

// Pure calculation functions
function constrainMovementDeltas(
  initialBounds: BoxBounds,
  deltaX: number,
  deltaY: number,
  container: Dimensions,
): { deltaX: number; deltaY: number } {
  const maxLeftMovement = -initialBounds.x;
  const maxRightMovement =
    container.width - (initialBounds.x + initialBounds.width);
  const maxUpMovement = -initialBounds.y;
  const maxDownMovement =
    container.height - (initialBounds.y + initialBounds.height);

  return {
    deltaX: Math.max(maxLeftMovement, Math.min(maxRightMovement, deltaX)),
    deltaY: Math.max(maxUpMovement, Math.min(maxDownMovement, deltaY)),
  };
}

function calculateNormalResize(
  context: ResizeContext,
  handle: ResizeHandle,
): BoxBounds {
  const { initialBounds, movement } = context;
  const { deltaX, deltaY } = movement;

  switch (handle) {
    case "bottom-right":
      return {
        ...initialBounds,
        width: initialBounds.width + deltaX,
        height: initialBounds.height + deltaY,
      };

    case "top-left": {
      const rightEdge = initialBounds.x + initialBounds.width;
      const bottomEdge = initialBounds.y + initialBounds.height;
      const newX = initialBounds.x + deltaX;
      const newY = initialBounds.y + deltaY;

      return {
        x: newX,
        y: newY,
        width: rightEdge - newX,
        height: bottomEdge - newY,
      };
    }

    case "top-right": {
      const bottomEdge = initialBounds.y + initialBounds.height;
      const newY = initialBounds.y + deltaY;

      return {
        ...initialBounds,
        y: newY,
        width: initialBounds.width + deltaX,
        height: bottomEdge - newY,
      };
    }

    case "bottom-left": {
      const rightEdge = initialBounds.x + initialBounds.width;
      const newX = initialBounds.x + deltaX;

      return {
        ...initialBounds,
        x: newX,
        width: rightEdge - newX,
        height: initialBounds.height + deltaY,
      };
    }

    case "top": {
      const bottomEdge = initialBounds.y + initialBounds.height;
      const newY = initialBounds.y + deltaY;

      return {
        ...initialBounds,
        y: newY,
        height: bottomEdge - newY,
      };
    }

    case "right":
      return {
        ...initialBounds,
        width: initialBounds.width + deltaX,
      };

    case "bottom":
      return {
        ...initialBounds,
        height: initialBounds.height + deltaY,
      };

    case "left": {
      const rightEdge = initialBounds.x + initialBounds.width;
      const newX = initialBounds.x + deltaX;

      return {
        ...initialBounds,
        x: newX,
        width: rightEdge - newX,
      };
    }

    default:
      return initialBounds;
  }
}

function calculateAspectRatioResize(
  context: ResizeContext,
  handle: ResizeHandle,
): BoxBounds {
  const { initialBounds, movement, constraints } = context;
  const { deltaX, deltaY } = movement;
  if (!constraints.aspectRatio) {
    return initialBounds;
  }
  const aspectRatio = constraints.aspectRatio;

  const widthMovement = deltaX;
  const heightMovement = deltaY * aspectRatio;

  let movementValue: number;
  switch (handle) {
    case "bottom-right":
    case "top-left":
      movementValue = (widthMovement + heightMovement) / 2;
      break;
    case "top-right":
    case "bottom-left":
      movementValue = (widthMovement - heightMovement) / 2;
      break;
    default:
      movementValue = widthMovement;
  }

  const baseWidth =
    handle === "top-left" || handle === "bottom-left"
      ? initialBounds.width - movementValue
      : initialBounds.width + movementValue;

  const width = Math.max(constraints.minSize, baseWidth);
  const height = width / aspectRatio;

  const newBounds: BoxBounds = { ...initialBounds, width, height };

  // Adjust position for handles that move the origin
  switch (handle) {
    case "top-left":
      newBounds.x = initialBounds.x + initialBounds.width - width;
      newBounds.y = initialBounds.y + initialBounds.height - height;
      break;
    case "top-right":
      newBounds.y = initialBounds.y + initialBounds.height - height;
      break;
    case "bottom-left":
      newBounds.x = initialBounds.x + initialBounds.width - width;
      break;
  }

  return newBounds;
}

function calculateCenterResize(
  context: ResizeContext,
  handle: ResizeHandle,
): BoxBounds {
  const { initialBounds, movement } = context;
  const { deltaX, deltaY } = movement;

  const centerX = initialBounds.x + initialBounds.width / 2;
  const centerY = initialBounds.y + initialBounds.height / 2;

  let widthChange = 0;
  let heightChange = 0;

  switch (handle) {
    case "bottom-right":
      widthChange = deltaX * CENTER_RESIZE_MULTIPLIER;
      heightChange = deltaY * CENTER_RESIZE_MULTIPLIER;
      break;
    case "top-left":
      widthChange = -deltaX * CENTER_RESIZE_MULTIPLIER;
      heightChange = -deltaY * CENTER_RESIZE_MULTIPLIER;
      break;
    case "top-right":
      widthChange = deltaX * CENTER_RESIZE_MULTIPLIER;
      heightChange = -deltaY * CENTER_RESIZE_MULTIPLIER;
      break;
    case "bottom-left":
      widthChange = -deltaX * CENTER_RESIZE_MULTIPLIER;
      heightChange = deltaY * CENTER_RESIZE_MULTIPLIER;
      break;
    case "top":
    case "bottom":
      heightChange =
        (handle === "bottom" ? deltaY : -deltaY) * CENTER_RESIZE_MULTIPLIER;
      break;
    case "left":
    case "right":
      widthChange =
        (handle === "right" ? deltaX : -deltaX) * CENTER_RESIZE_MULTIPLIER;
      break;
  }

  const newWidth = initialBounds.width + widthChange;
  const newHeight = initialBounds.height + heightChange;

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

function calculateCenterResizeWithAspectRatio(
  context: ResizeContext,
  handle: ResizeHandle,
): BoxBounds {
  const { initialBounds, movement, constraints } = context;
  const { deltaX, deltaY } = movement;
  if (!constraints.aspectRatio) {
    return initialBounds;
  }
  const aspectRatio = constraints.aspectRatio;

  const centerX = initialBounds.x + initialBounds.width / 2;
  const centerY = initialBounds.y + initialBounds.height / 2;

  let movementValue: number;
  switch (handle) {
    case "bottom-right":
      movementValue = Math.max(deltaX, deltaY);
      break;
    case "top-left":
      movementValue = -Math.max(-deltaX, -deltaY);
      break;
    case "top-right":
      movementValue = Math.max(deltaX, -deltaY);
      break;
    case "bottom-left":
      movementValue = Math.max(-deltaX, deltaY);
      break;
    case "top":
    case "bottom":
      movementValue = handle === "bottom" ? deltaY : -deltaY;
      break;
    case "left":
    case "right":
      movementValue = handle === "right" ? deltaX : -deltaX;
      break;
    default:
      movementValue = Math.max(deltaX, deltaY);
  }

  const newWidth = Math.max(
    constraints.minSize,
    initialBounds.width + movementValue * CENTER_RESIZE_MULTIPLIER,
  );
  const newHeight = newWidth / aspectRatio;

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

@customElement("ef-resizable-box")
export class EFResizableBox extends LitElement {
  @property({ type: Object })
  bounds: BoxBounds = { x: 0, y: 0, width: 100, height: 100 };

  @state()
  private containerWidth = 0;

  @state()
  private containerHeight = 0;

  @property({ type: Number })
  minSize = DEFAULT_MIN_SIZE;

  @state()
  private isDragging = false;

  @state()
  private dragMode: "move" | "resize" | null = null;

  private interaction: {
    startPoint: { x: number; y: number };
    target: { mode: "move" | "resize"; handle?: ResizeHandle };
    initialBounds: BoxBounds;
    pointerId: number;
  } | null = null;

  private modifiers = { shift: false, alt: false };

  static styles = css`
    .box {
      position: absolute;
      border: 2px solid var(--ef-resizable-box-border-color, #3b82f6);
      background-color: var(--ef-resizable-box-bg-color, rgba(59, 130, 246, 0.2));
      cursor: grab;
    }
    .box.dragging {
      border-color: var(--ef-resizable-box-dragging-border-color, #2563eb);
      background-color: var(--ef-resizable-box-dragging-bg-color, rgba(37, 99, 235, 0.3));
    }
    .handle {
      position: absolute;
      background-color: var(--ef-resizable-box-handle-color, #3b82f6);
      touch-action: none;
    }
    .top-left { top: -4px; left: -4px; width: 8px; height: 8px; cursor: nwse-resize; }
    .top-right { top: -4px; right: -4px; width: 8px; height: 8px; cursor: nesw-resize; }
    .bottom-left { bottom: -4px; left: -4px; width: 8px; height: 8px; cursor: nesw-resize; }
    .bottom-right { bottom: -4px; right: -4px; width: 8px; height: 8px; cursor: nwse-resize; }
    .top { top: -4px; left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .right { top: 4px; bottom: 4px; right: -4px; width: 8px; cursor: ew-resize; }
    .bottom { bottom: -4px; left: 4px; right: 4px; height: 8px; cursor: ns-resize; }
    .left { top: 4px; bottom: 4px; left: -4px; width: 8px; cursor: ew-resize; }
  `;

  private resizeObserver?: ResizeObserver;

  connectedCallback() {
    super.connectedCallback();
    if (this.offsetParent) {
      this.containerWidth = this.offsetParent.clientWidth;
      this.containerHeight = this.offsetParent.clientHeight;
    }
    this.resizeObserver = new ResizeObserver(() => {
      if (this.offsetParent) {
        this.containerWidth = this.offsetParent.clientWidth;
        this.containerHeight = this.offsetParent.clientHeight;
      }
    });
    if (this.offsetParent) {
      this.resizeObserver.observe(this.offsetParent);
    }
  }

  private handlePointerDown(
    e: PointerEvent,
    mode: "move" | "resize",
    handle?: ResizeHandle,
  ) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.dragMode = mode;

    this.interaction = {
      startPoint: { x: e.clientX, y: e.clientY },
      target: { mode, handle },
      initialBounds: { ...this.bounds },
      pointerId: e.pointerId,
    };
    this.modifiers = { shift: e.shiftKey, alt: e.altKey };

    document.addEventListener("pointermove", this.handlePointerMove, { passive: false });
    document.addEventListener("pointerup", this.handlePointerUp, { passive: false });
  }

  private handlePointerMove = (e: PointerEvent) => {
    if (
      !this.isDragging ||
      !this.interaction ||
      e.pointerId !== this.interaction.pointerId
    )
      return;
    
    e.preventDefault();

    const deltaX = e.clientX - this.interaction.startPoint.x;
    const deltaY = e.clientY - this.interaction.startPoint.y;

    this.modifiers = { shift: e.shiftKey, alt: e.altKey };

    if (this.dragMode === "move") {
      const constrainedMovement = constrainMovementDeltas(
        this.interaction.initialBounds,
        deltaX,
        deltaY,
        { width: this.containerWidth, height: this.containerHeight },
      );
      this.bounds = {
        ...this.interaction.initialBounds,
        x: this.interaction.initialBounds.x + constrainedMovement.deltaX,
        y: this.interaction.initialBounds.y + constrainedMovement.deltaY,
      };
    } else if (this.dragMode === "resize" && this.interaction.target.handle) {
      const context: ResizeContext = {
        initialBounds: this.interaction.initialBounds,
        container: { width: this.containerWidth, height: this.containerHeight },
        constraints: {
          minSize: this.minSize,
          aspectRatio: this.modifiers.shift
            ? this.interaction.initialBounds.width /
              this.interaction.initialBounds.height
            : undefined,
        },
        movement: { deltaX, deltaY },
        modifiers: {
          centerResize: this.modifiers.alt,
          preserveAspectRatio: this.modifiers.shift,
        },
      };
      this.bounds = this.calculateBoundsWithModeAwareConstraints(
        context,
        this.interaction.target.handle,
      );
    }

    this.dispatchBoundsChange();
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.interaction && e.pointerId !== this.interaction.pointerId) {
      return;
    }
    e.preventDefault();
    this.isDragging = false;
    this.dragMode = null;
    this.interaction = null;
    document.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointerup", this.handlePointerUp);
  };

  private calculateBoundsWithModeAwareConstraints(
    context: ResizeContext,
    handle: ResizeHandle,
  ): BoxBounds {
    const { modifiers, constraints, container, initialBounds } = context;

    // For normal resize, use the simple delta constraint approach
    if (!modifiers.centerResize && !modifiers.preserveAspectRatio) {
      const constrainedMovement = this.constrainResizeDeltas(
        initialBounds,
        context.movement.deltaX,
        context.movement.deltaY,
        handle,
        container,
        constraints.minSize,
      );

      return calculateNormalResize(
        {
          ...context,
          movement: constrainedMovement,
        },
        handle,
      );
    }

    // For modifier-based resizes, calculate ideal bounds then constrain smartly
    let idealBounds: BoxBounds;

    if (modifiers.centerResize && modifiers.preserveAspectRatio) {
      idealBounds = calculateCenterResizeWithAspectRatio(context, handle);
    } else if (modifiers.centerResize) {
      idealBounds = calculateCenterResize(context, handle);
    } else {
      idealBounds = calculateAspectRatioResize(context, handle);
    }

    // Smart constraint that preserves the resize mode's behavior
    return this.constrainBoundsForMode(idealBounds, context, handle);
  }

  private constrainBoundsForMode(
    idealBounds: BoxBounds,
    context: ResizeContext,
    handle: ResizeHandle,
  ): BoxBounds {
    const { container, constraints, modifiers } = context;

    // Check if bounds are already valid
    if (this.isValidBounds(idealBounds, container, constraints.minSize)) {
      return idealBounds;
    }

    // For combined center + aspect ratio, need special handling
    if (
      modifiers.centerResize &&
      modifiers.preserveAspectRatio &&
      constraints.aspectRatio
    ) {
      return this.constrainCenterResizeWithAspectRatio(idealBounds, context);
    }

    // For aspect ratio modes, we need to scale the bounds proportionally
    if (modifiers.preserveAspectRatio && constraints.aspectRatio) {
      return this.constrainWithAspectRatio(idealBounds, context, handle);
    }

    // For center resize, we need to adjust from the center
    if (modifiers.centerResize) {
      return this.constrainCenterResize(idealBounds, context);
    }

    // Fallback to simple constraint
    return this.simpleConstrainBounds(
      idealBounds,
      container,
      constraints.minSize,
    );
  }

  private isValidBounds(
    bounds: BoxBounds,
    container: Dimensions,
    minSize: number,
  ): boolean {
    return (
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.width >= minSize &&
      bounds.height >= minSize &&
      bounds.x + bounds.width <= container.width &&
      bounds.y + bounds.height <= container.height
    );
  }

  private constrainWithAspectRatio(
    idealBounds: BoxBounds,
    context: ResizeContext,
    handle: ResizeHandle,
  ): BoxBounds {
    const { container, constraints, initialBounds } = context;
    if (!constraints.aspectRatio) {
      return initialBounds;
    }
    const aspectRatio = constraints.aspectRatio;

    // Calculate maximum allowed dimensions
    const maxWidth = container.width - Math.max(0, idealBounds.x);
    const maxHeight = container.height - Math.max(0, idealBounds.y);

    // Find the largest size that fits both constraints
    let constrainedWidth = Math.max(
      constraints.minSize,
      Math.min(maxWidth, idealBounds.width),
    );
    let constrainedHeight = constrainedWidth / aspectRatio;

    // If height is too big, constrain by height instead
    if (constrainedHeight > maxHeight) {
      constrainedHeight = Math.max(constraints.minSize, maxHeight);
      constrainedWidth = constrainedHeight * aspectRatio;
    }

    // Ensure we don't go smaller than minimum
    if (constrainedWidth < constraints.minSize) {
      constrainedWidth = constraints.minSize;
      constrainedHeight = constrainedWidth / aspectRatio;
    }

    const result: BoxBounds = {
      ...idealBounds,
      width: constrainedWidth,
      height: constrainedHeight,
    };

    // Adjust position for handles that move the origin
    switch (handle) {
      case "top-left":
        result.x = initialBounds.x + initialBounds.width - constrainedWidth;
        result.y = initialBounds.y + initialBounds.height - constrainedHeight;
        break;
      case "top-right":
        result.y = initialBounds.y + initialBounds.height - constrainedHeight;
        break;
      case "bottom-left":
        result.x = initialBounds.x + initialBounds.width - constrainedWidth;
        break;
    }

    // Ensure position is within bounds
    result.x = Math.max(0, Math.min(container.width - result.width, result.x));
    result.y = Math.max(
      0,
      Math.min(container.height - result.height, result.y),
    );

    return result;
  }

  private constrainCenterResize(
    idealBounds: BoxBounds,
    context: ResizeContext,
  ): BoxBounds {
    const { container, constraints, initialBounds } = context;

    const centerX = initialBounds.x + initialBounds.width / 2;
    const centerY = initialBounds.y + initialBounds.height / 2;

    // Calculate maximum dimensions from center
    const maxWidthFromCenter = Math.min(
      centerX * 2,
      (container.width - centerX) * 2,
    );
    const maxHeightFromCenter = Math.min(
      centerY * 2,
      (container.height - centerY) * 2,
    );

    const constrainedWidth = Math.max(
      constraints.minSize,
      Math.min(maxWidthFromCenter, idealBounds.width),
    );
    const constrainedHeight = Math.max(
      constraints.minSize,
      Math.min(maxHeightFromCenter, idealBounds.height),
    );

    return {
      x: centerX - constrainedWidth / 2,
      y: centerY - constrainedHeight / 2,
      width: constrainedWidth,
      height: constrainedHeight,
    };
  }

  private constrainCenterResizeWithAspectRatio(
    idealBounds: BoxBounds,
    context: ResizeContext,
  ): BoxBounds {
    const { container, constraints, initialBounds } = context;
    if (!constraints.aspectRatio) {
      return initialBounds;
    }
    const aspectRatio = constraints.aspectRatio;

    const centerX = initialBounds.x + initialBounds.width / 2;
    const centerY = initialBounds.y + initialBounds.height / 2;

    // Calculate maximum dimensions from center while maintaining aspect ratio
    const maxWidthFromCenter = Math.min(
      centerX * 2,
      (container.width - centerX) * 2,
    );
    const maxHeightFromCenter = Math.min(
      centerY * 2,
      (container.height - centerY) * 2,
    );

    // Start with the ideal width, then constrain
    let constrainedWidth = Math.max(
      constraints.minSize,
      Math.min(maxWidthFromCenter, idealBounds.width),
    );
    let constrainedHeight = constrainedWidth / aspectRatio;

    // If height doesn't fit, constrain by height instead
    if (constrainedHeight > maxHeightFromCenter) {
      constrainedHeight = Math.max(constraints.minSize, maxHeightFromCenter);
      constrainedWidth = constrainedHeight * aspectRatio;
    }

    // Ensure minimum size
    if (constrainedWidth < constraints.minSize) {
      constrainedWidth = constraints.minSize;
      constrainedHeight = constrainedWidth / aspectRatio;
    }

    if (constrainedHeight < constraints.minSize) {
      constrainedHeight = constraints.minSize;
      constrainedWidth = constrainedHeight * aspectRatio;
    }

    return {
      x: centerX - constrainedWidth / 2,
      y: centerY - constrainedHeight / 2,
      width: constrainedWidth,
      height: constrainedHeight,
    };
  }

  private simpleConstrainBounds(
    bounds: BoxBounds,
    container: Dimensions,
    minSize: number,
  ): BoxBounds {
    return {
      x: Math.max(0, Math.min(container.width - bounds.width, bounds.x)),
      y: Math.max(0, Math.min(container.height - bounds.height, bounds.y)),
      width: Math.max(
        minSize,
        Math.min(container.width - bounds.x, bounds.width),
      ),
      height: Math.max(
        minSize,
        Math.min(container.height - bounds.y, bounds.height),
      ),
    };
  }

  private constrainResizeDeltas(
    initialBounds: BoxBounds,
    deltaX: number,
    deltaY: number,
    handle: ResizeHandle,
    container: Dimensions,
    minSize: number,
  ): { deltaX: number; deltaY: number } {
    let constrainedDeltaX = deltaX;
    let constrainedDeltaY = deltaY;

    switch (handle) {
      case "bottom-right":
        // Can't make smaller than minSize, can't go beyond container
        constrainedDeltaX = Math.max(
          minSize - initialBounds.width,
          Math.min(
            container.width - initialBounds.x - initialBounds.width,
            deltaX,
          ),
        );
        constrainedDeltaY = Math.max(
          minSize - initialBounds.height,
          Math.min(
            container.height - initialBounds.y - initialBounds.height,
            deltaY,
          ),
        );
        break;

      case "top-left":
        // Can't make smaller than minSize, can't go beyond 0
        constrainedDeltaX = Math.max(
          -initialBounds.x,
          Math.min(initialBounds.width - minSize, deltaX),
        );
        constrainedDeltaY = Math.max(
          -initialBounds.y,
          Math.min(initialBounds.height - minSize, deltaY),
        );
        break;

      case "top-right":
        constrainedDeltaX = Math.max(
          minSize - initialBounds.width,
          Math.min(
            container.width - initialBounds.x - initialBounds.width,
            deltaX,
          ),
        );
        constrainedDeltaY = Math.max(
          -initialBounds.y,
          Math.min(initialBounds.height - minSize, deltaY),
        );
        break;

      case "bottom-left":
        constrainedDeltaX = Math.max(
          -initialBounds.x,
          Math.min(initialBounds.width - minSize, deltaX),
        );
        constrainedDeltaY = Math.max(
          minSize - initialBounds.height,
          Math.min(
            container.height - initialBounds.y - initialBounds.height,
            deltaY,
          ),
        );
        break;

      case "right":
        constrainedDeltaX = Math.max(
          minSize - initialBounds.width,
          Math.min(
            container.width - initialBounds.x - initialBounds.width,
            deltaX,
          ),
        );
        break;

      case "left":
        constrainedDeltaX = Math.max(
          -initialBounds.x,
          Math.min(initialBounds.width - minSize, deltaX),
        );
        break;

      case "bottom":
        constrainedDeltaY = Math.max(
          minSize - initialBounds.height,
          Math.min(
            container.height - initialBounds.y - initialBounds.height,
            deltaY,
          ),
        );
        break;

      case "top":
        constrainedDeltaY = Math.max(
          -initialBounds.y,
          Math.min(initialBounds.height - minSize, deltaY),
        );
        break;
    }

    return { deltaX: constrainedDeltaX, deltaY: constrainedDeltaY };
  }

  private dispatchBoundsChange() {
    this.dispatchEvent(
      new CustomEvent("bounds-change", {
        detail: { bounds: this.bounds },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const boxStyles = {
      left: `${this.bounds.x}px`,
      top: `${this.bounds.y}px`,
      width: `${this.bounds.width}px`,
      height: `${this.bounds.height}px`,
    };

    return html`
      <div
        class="box ${this.isDragging ? "dragging" : ""}"
        style=${styleMap(boxStyles)}
        @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "move")}
      >
        ${this.renderHandles()}
        <slot></slot>
      </div>
    `;
  }

  private renderHandles() {
    const handles: ResizeHandle[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "top",
      "right",
      "bottom",
      "left",
    ];
    return handles.map(
      (handle) => html`
        <div
          class="handle ${handle}"
          @pointerdown=${(e: PointerEvent) => this.handlePointerDown(e, "resize", handle)}
        ></div>
      `,
    );
  }
}
