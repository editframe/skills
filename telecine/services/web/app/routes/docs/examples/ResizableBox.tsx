import clsx from "clsx"
import { useState, useCallback, useEffect } from "react"
import type React from "react"

// IMPLEMENTATION GUIDELINES: Keep math functions pure and separate from UI concerns
// This enables easier testing and maintainability

// Constants
const DEFAULT_MIN_SIZE = 10 as const
const CENTER_RESIZE_MULTIPLIER = 2 as const

export interface BoxBounds {
  x: number
  y: number
  width: number
  height: number
}

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type ResizeSide = 'top' | 'right' | 'bottom' | 'left'
type ResizeHandle = ResizeCorner | ResizeSide

interface Dimensions {
  width: number
  height: number
}

interface ResizeContext {
  readonly initialBounds: BoxBounds
  readonly container: Dimensions
  readonly constraints: {
    minSize: number
    aspectRatio?: number
  }
  readonly movement: {
    deltaX: number
    deltaY: number
  }
  readonly modifiers: {
    centerResize: boolean
    preserveAspectRatio: boolean
  }
}

// Movement constraint functions - constrain deltas, not final bounds
// IMPLEMENTATION GUIDELINES: Constrain movement to prevent going outside bounds,
// rather than snapping back after calculation. This creates smooth UX.

function constrainMovementDeltas(
  initialBounds: BoxBounds,
  deltaX: number,
  deltaY: number,
  container: Dimensions
): { deltaX: number; deltaY: number } {
  // Calculate the maximum movement allowed in each direction
  const maxLeftMovement = -initialBounds.x
  const maxRightMovement = container.width - (initialBounds.x + initialBounds.width)
  const maxUpMovement = -initialBounds.y
  const maxDownMovement = container.height - (initialBounds.y + initialBounds.height)

  return {
    deltaX: Math.max(maxLeftMovement, Math.min(maxRightMovement, deltaX)),
    deltaY: Math.max(maxUpMovement, Math.min(maxDownMovement, deltaY))
  }
}

function constrainResizeDeltas(
  initialBounds: BoxBounds,
  deltaX: number,
  deltaY: number,
  handle: ResizeHandle,
  container: Dimensions,
  minSize: number
): { deltaX: number; deltaY: number } {
  let constrainedDeltaX = deltaX
  let constrainedDeltaY = deltaY

  switch (handle) {
    case 'bottom-right':
      // Can't make smaller than minSize, can't go beyond container
      constrainedDeltaX = Math.max(minSize - initialBounds.width,
        Math.min(container.width - initialBounds.x - initialBounds.width, deltaX))
      constrainedDeltaY = Math.max(minSize - initialBounds.height,
        Math.min(container.height - initialBounds.y - initialBounds.height, deltaY))
      break

    case 'top-left':
      // Can't make smaller than minSize, can't go beyond 0
      constrainedDeltaX = Math.max(-initialBounds.x,
        Math.min(initialBounds.width - minSize, deltaX))
      constrainedDeltaY = Math.max(-initialBounds.y,
        Math.min(initialBounds.height - minSize, deltaY))
      break

    case 'top-right':
      constrainedDeltaX = Math.max(minSize - initialBounds.width,
        Math.min(container.width - initialBounds.x - initialBounds.width, deltaX))
      constrainedDeltaY = Math.max(-initialBounds.y,
        Math.min(initialBounds.height - minSize, deltaY))
      break

    case 'bottom-left':
      constrainedDeltaX = Math.max(-initialBounds.x,
        Math.min(initialBounds.width - minSize, deltaX))
      constrainedDeltaY = Math.max(minSize - initialBounds.height,
        Math.min(container.height - initialBounds.y - initialBounds.height, deltaY))
      break

    case 'right':
      constrainedDeltaX = Math.max(minSize - initialBounds.width,
        Math.min(container.width - initialBounds.x - initialBounds.width, deltaX))
      break

    case 'left':
      constrainedDeltaX = Math.max(-initialBounds.x,
        Math.min(initialBounds.width - minSize, deltaX))
      break

    case 'bottom':
      constrainedDeltaY = Math.max(minSize - initialBounds.height,
        Math.min(container.height - initialBounds.y - initialBounds.height, deltaY))
      break

    case 'top':
      constrainedDeltaY = Math.max(-initialBounds.y,
        Math.min(initialBounds.height - minSize, deltaY))
      break
  }

  return { deltaX: constrainedDeltaX, deltaY: constrainedDeltaY }
}

// Pure calculation functions for different resize modes
function calculateNormalResize(context: ResizeContext, handle: ResizeHandle): BoxBounds {
  const { initialBounds, movement } = context
  const { deltaX, deltaY } = movement

  switch (handle) {
    case 'bottom-right':
      return {
        ...initialBounds,
        width: initialBounds.width + deltaX,
        height: initialBounds.height + deltaY,
      }

    case 'top-left': {
      const rightEdge = initialBounds.x + initialBounds.width
      const bottomEdge = initialBounds.y + initialBounds.height
      const newX = initialBounds.x + deltaX
      const newY = initialBounds.y + deltaY

      return {
        x: newX,
        y: newY,
        width: rightEdge - newX,
        height: bottomEdge - newY,
      }
    }

    case 'top-right': {
      const bottomEdge = initialBounds.y + initialBounds.height
      const newY = initialBounds.y + deltaY

      return {
        ...initialBounds,
        y: newY,
        width: initialBounds.width + deltaX,
        height: bottomEdge - newY,
      }
    }

    case 'bottom-left': {
      const rightEdge = initialBounds.x + initialBounds.width
      const newX = initialBounds.x + deltaX

      return {
        ...initialBounds,
        x: newX,
        width: rightEdge - newX,
        height: initialBounds.height + deltaY,
      }
    }

    case 'top': {
      const bottomEdge = initialBounds.y + initialBounds.height
      const newY = initialBounds.y + deltaY

      return {
        ...initialBounds,
        y: newY,
        height: bottomEdge - newY,
      }
    }

    case 'right':
      return {
        ...initialBounds,
        width: initialBounds.width + deltaX,
      }

    case 'bottom':
      return {
        ...initialBounds,
        height: initialBounds.height + deltaY,
      }

    case 'left': {
      const rightEdge = initialBounds.x + initialBounds.width
      const newX = initialBounds.x + deltaX

      return {
        ...initialBounds,
        x: newX,
        width: rightEdge - newX,
      }
    }

    default:
      return initialBounds
  }
}

function calculateAspectRatioResize(context: ResizeContext, handle: ResizeHandle): BoxBounds {
  const { initialBounds, movement, constraints } = context
  const { deltaX, deltaY } = movement
  const aspectRatio = constraints.aspectRatio!

  const widthMovement = deltaX
  const heightMovement = deltaY * aspectRatio

  let movementValue: number
  switch (handle) {
    case 'bottom-right':
    case 'top-left':
      movementValue = (widthMovement + heightMovement) / 2
      break
    case 'top-right':
    case 'bottom-left':
      movementValue = (widthMovement - heightMovement) / 2
      break
    default:
      movementValue = widthMovement
  }

  const baseWidth = handle === 'top-left' || handle === 'bottom-left'
    ? initialBounds.width - movementValue
    : initialBounds.width + movementValue

  const width = Math.max(constraints.minSize, baseWidth)
  const height = width / aspectRatio

  const newBounds: BoxBounds = { ...initialBounds, width, height }

  // Adjust position for handles that move the origin
  switch (handle) {
    case 'top-left':
      newBounds.x = initialBounds.x + initialBounds.width - width
      newBounds.y = initialBounds.y + initialBounds.height - height
      break
    case 'top-right':
      newBounds.y = initialBounds.y + initialBounds.height - height
      break
    case 'bottom-left':
      newBounds.x = initialBounds.x + initialBounds.width - width
      break
  }

  return newBounds
}

function calculateCenterResize(context: ResizeContext, handle: ResizeHandle): BoxBounds {
  const { initialBounds, movement } = context
  const { deltaX, deltaY } = movement

  const centerX = initialBounds.x + initialBounds.width / 2
  const centerY = initialBounds.y + initialBounds.height / 2

  let widthChange = 0
  let heightChange = 0

  switch (handle) {
    case 'bottom-right':
      widthChange = deltaX * CENTER_RESIZE_MULTIPLIER
      heightChange = deltaY * CENTER_RESIZE_MULTIPLIER
      break
    case 'top-left':
      widthChange = -deltaX * CENTER_RESIZE_MULTIPLIER
      heightChange = -deltaY * CENTER_RESIZE_MULTIPLIER
      break
    case 'top-right':
      widthChange = deltaX * CENTER_RESIZE_MULTIPLIER
      heightChange = -deltaY * CENTER_RESIZE_MULTIPLIER
      break
    case 'bottom-left':
      widthChange = -deltaX * CENTER_RESIZE_MULTIPLIER
      heightChange = deltaY * CENTER_RESIZE_MULTIPLIER
      break
    case 'top':
    case 'bottom':
      heightChange = (handle === 'bottom' ? deltaY : -deltaY) * CENTER_RESIZE_MULTIPLIER
      break
    case 'left':
    case 'right':
      widthChange = (handle === 'right' ? deltaX : -deltaX) * CENTER_RESIZE_MULTIPLIER
      break
  }

  const newWidth = initialBounds.width + widthChange
  const newHeight = initialBounds.height + heightChange

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  }
}

function calculateCenterResizeWithAspectRatio(context: ResizeContext, handle: ResizeHandle): BoxBounds {
  const { initialBounds, movement, constraints } = context
  const { deltaX, deltaY } = movement
  const aspectRatio = constraints.aspectRatio!

  const centerX = initialBounds.x + initialBounds.width / 2
  const centerY = initialBounds.y + initialBounds.height / 2

  let movementValue: number
  switch (handle) {
    case 'bottom-right':
      movementValue = Math.max(deltaX, deltaY)
      break
    case 'top-left':
      movementValue = -Math.max(-deltaX, -deltaY)
      break
    case 'top-right':
      movementValue = Math.max(deltaX, -deltaY)
      break
    case 'bottom-left':
      movementValue = Math.max(-deltaX, deltaY)
      break
    case 'top':
    case 'bottom':
      movementValue = handle === 'bottom' ? deltaY : -deltaY
      break
    case 'left':
    case 'right':
      movementValue = handle === 'right' ? deltaX : -deltaX
      break
    default:
      movementValue = Math.max(deltaX, deltaY)
  }

  const newWidth = Math.max(constraints.minSize, initialBounds.width + movementValue * CENTER_RESIZE_MULTIPLIER)
  const newHeight = newWidth / aspectRatio

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  }
}

// Smart constraint system that respects resize modes
function calculateBoundsWithModeAwareConstraints(context: ResizeContext, handle: ResizeHandle): BoxBounds {
  const { modifiers, constraints, container, initialBounds } = context

  // For normal resize, use the simple delta constraint approach
  if (!modifiers.centerResize && !modifiers.preserveAspectRatio) {
    const constrainedMovement = constrainResizeDeltas(
      initialBounds,
      context.movement.deltaX,
      context.movement.deltaY,
      handle,
      container,
      constraints.minSize
    )

    return calculateNormalResize({
      ...context,
      movement: constrainedMovement
    }, handle)
  }

  // For modifier-based resizes, calculate ideal bounds then constrain smartly
  let idealBounds: BoxBounds

  if (modifiers.centerResize && modifiers.preserveAspectRatio) {
    idealBounds = calculateCenterResizeWithAspectRatio(context, handle)
  } else if (modifiers.centerResize) {
    idealBounds = calculateCenterResize(context, handle)
  } else {
    idealBounds = calculateAspectRatioResize(context, handle)
  }

  // Smart constraint that preserves the resize mode's behavior
  return constrainBoundsForMode(idealBounds, context, handle)
}

function constrainBoundsForMode(
  idealBounds: BoxBounds,
  context: ResizeContext,
  handle: ResizeHandle
): BoxBounds {
  const { container, constraints, modifiers } = context

  // Check if bounds are already valid
  if (isValidBounds(idealBounds, container, constraints.minSize)) {
    return idealBounds
  }

  // For combined center + aspect ratio, need special handling
  if (modifiers.centerResize && modifiers.preserveAspectRatio && constraints.aspectRatio) {
    return constrainCenterResizeWithAspectRatio(idealBounds, context)
  }

  // For aspect ratio modes, we need to scale the bounds proportionally
  if (modifiers.preserveAspectRatio && constraints.aspectRatio) {
    return constrainWithAspectRatio(idealBounds, context, handle)
  }

  // For center resize, we need to adjust from the center
  if (modifiers.centerResize) {
    return constrainCenterResize(idealBounds, context)
  }

  // Fallback to simple constraint
  return simpleConstrainBounds(idealBounds, container, constraints.minSize)
}

function isValidBounds(bounds: BoxBounds, container: Dimensions, minSize: number): boolean {
  return bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width >= minSize &&
    bounds.height >= minSize &&
    bounds.x + bounds.width <= container.width &&
    bounds.y + bounds.height <= container.height
}

function constrainWithAspectRatio(
  idealBounds: BoxBounds,
  context: ResizeContext,
  handle: ResizeHandle
): BoxBounds {
  const { container, constraints, initialBounds } = context
  const aspectRatio = constraints.aspectRatio!

  // Calculate maximum allowed dimensions
  const maxWidth = container.width - Math.max(0, idealBounds.x)
  const maxHeight = container.height - Math.max(0, idealBounds.y)

  // Find the largest size that fits both constraints
  let constrainedWidth = Math.max(constraints.minSize, Math.min(maxWidth, idealBounds.width))
  let constrainedHeight = constrainedWidth / aspectRatio

  // If height is too big, constrain by height instead
  if (constrainedHeight > maxHeight) {
    constrainedHeight = Math.max(constraints.minSize, maxHeight)
    constrainedWidth = constrainedHeight * aspectRatio
  }

  // Ensure we don't go smaller than minimum
  if (constrainedWidth < constraints.minSize) {
    constrainedWidth = constraints.minSize
    constrainedHeight = constrainedWidth / aspectRatio
  }

  let result: BoxBounds = {
    ...idealBounds,
    width: constrainedWidth,
    height: constrainedHeight
  }

  // Adjust position for handles that move the origin
  switch (handle) {
    case 'top-left':
      result.x = initialBounds.x + initialBounds.width - constrainedWidth
      result.y = initialBounds.y + initialBounds.height - constrainedHeight
      break
    case 'top-right':
      result.y = initialBounds.y + initialBounds.height - constrainedHeight
      break
    case 'bottom-left':
      result.x = initialBounds.x + initialBounds.width - constrainedWidth
      break
  }

  // Ensure position is within bounds
  result.x = Math.max(0, Math.min(container.width - result.width, result.x))
  result.y = Math.max(0, Math.min(container.height - result.height, result.y))

  return result
}

function constrainCenterResize(
  idealBounds: BoxBounds,
  context: ResizeContext
): BoxBounds {
  const { container, constraints, initialBounds } = context

  const centerX = initialBounds.x + initialBounds.width / 2
  const centerY = initialBounds.y + initialBounds.height / 2

  // Calculate maximum dimensions from center
  const maxWidthFromCenter = Math.min(centerX * 2, (container.width - centerX) * 2)
  const maxHeightFromCenter = Math.min(centerY * 2, (container.height - centerY) * 2)

  const constrainedWidth = Math.max(constraints.minSize, Math.min(maxWidthFromCenter, idealBounds.width))
  const constrainedHeight = Math.max(constraints.minSize, Math.min(maxHeightFromCenter, idealBounds.height))

  return {
    x: centerX - constrainedWidth / 2,
    y: centerY - constrainedHeight / 2,
    width: constrainedWidth,
    height: constrainedHeight
  }
}

function constrainCenterResizeWithAspectRatio(
  idealBounds: BoxBounds,
  context: ResizeContext
): BoxBounds {
  const { container, constraints, initialBounds } = context
  const aspectRatio = constraints.aspectRatio!

  const centerX = initialBounds.x + initialBounds.width / 2
  const centerY = initialBounds.y + initialBounds.height / 2

  // Calculate maximum dimensions from center while maintaining aspect ratio
  const maxWidthFromCenter = Math.min(centerX * 2, (container.width - centerX) * 2)
  const maxHeightFromCenter = Math.min(centerY * 2, (container.height - centerY) * 2)

  // Start with the ideal width, then constrain
  let constrainedWidth = Math.max(constraints.minSize, Math.min(maxWidthFromCenter, idealBounds.width))
  let constrainedHeight = constrainedWidth / aspectRatio

  // If height doesn't fit, constrain by height instead
  if (constrainedHeight > maxHeightFromCenter) {
    constrainedHeight = Math.max(constraints.minSize, maxHeightFromCenter)
    constrainedWidth = constrainedHeight * aspectRatio
  }

  // Ensure minimum size
  if (constrainedWidth < constraints.minSize) {
    constrainedWidth = constraints.minSize
    constrainedHeight = constrainedWidth / aspectRatio
  }

  if (constrainedHeight < constraints.minSize) {
    constrainedHeight = constraints.minSize
    constrainedWidth = constrainedHeight * aspectRatio
  }

  return {
    x: centerX - constrainedWidth / 2,
    y: centerY - constrainedHeight / 2,
    width: constrainedWidth,
    height: constrainedHeight
  }
}

function simpleConstrainBounds(bounds: BoxBounds, container: Dimensions, minSize: number): BoxBounds {
  return {
    x: Math.max(0, Math.min(container.width - bounds.width, bounds.x)),
    y: Math.max(0, Math.min(container.height - bounds.height, bounds.y)),
    width: Math.max(minSize, Math.min(container.width - bounds.x, bounds.width)),
    height: Math.max(minSize, Math.min(container.height - bounds.y, bounds.height))
  }
}

// Fact-based drag state architecture
// IMPLEMENTATION GUIDELINES: Store only immutable facts about what happened.
// Derive all behavior from these facts using pure functions. This eliminates
// state synchronization bugs and makes the logic easier to test and reason about.

interface DragFacts {
  // What interaction started (null = no interaction)
  interaction: {
    startPoint: { x: number; y: number }
    target: { mode: 'move' | 'resize'; handle?: ResizeHandle }
    initialBounds: BoxBounds
    pointerId: number
  } | null

  // Where the pointer currently is (null = not tracking)
  currentPoint: { x: number; y: number } | null

  // Current modifier key state
  modifiers: { shift: boolean; alt: boolean }
}

// Pure functions to derive state from facts
function deriveDragState(facts: DragFacts) {
  const isDragging = facts.interaction !== null && facts.currentPoint !== null

  const movement = facts.currentPoint && facts.interaction
    ? {
      deltaX: facts.currentPoint.x - facts.interaction.startPoint.x,
      deltaY: facts.currentPoint.y - facts.interaction.startPoint.y
    }
    : null

  const dragMode = facts.interaction?.target.mode
  const resizeHandle = facts.interaction?.target.handle
  const hasMovedEnoughToBeConsideredDrag = movement &&
    (Math.abs(movement.deltaX) > 2 || Math.abs(movement.deltaY) > 2)

  return {
    isDragging,
    dragMode,
    resizeHandle,
    movement,
    hasMovedEnoughToBeConsideredDrag,
    pointerId: facts.interaction?.pointerId,
    initialBounds: facts.interaction?.initialBounds,
  }
}

function calculateNewBoundsFromFacts(
  facts: DragFacts,
  containerDimensions: Dimensions,
  minSize: number
): BoxBounds | null {
  const derived = deriveDragState(facts)

  if (!derived.isDragging || !derived.movement || !derived.initialBounds) {
    return null
  }

  if (derived.dragMode === 'move') {
    // Constrain movement deltas to keep bounds within container
    const constrainedMovement = constrainMovementDeltas(
      derived.initialBounds,
      derived.movement.deltaX,
      derived.movement.deltaY,
      containerDimensions
    )

    return {
      ...derived.initialBounds,
      x: derived.initialBounds.x + constrainedMovement.deltaX,
      y: derived.initialBounds.y + constrainedMovement.deltaY,
    }
  }

  if (derived.dragMode === 'resize' && derived.resizeHandle) {
    const aspectRatio = derived.initialBounds.width / derived.initialBounds.height

    const context: ResizeContext = {
      initialBounds: derived.initialBounds,
      container: containerDimensions,
      constraints: {
        minSize,
        aspectRatio: facts.modifiers.shift ? aspectRatio : undefined,
      },
      movement: derived.movement,
      modifiers: {
        centerResize: facts.modifiers.alt,
        preserveAspectRatio: facts.modifiers.shift,
      },
    }

    // Calculate bounds with mode-aware constraints
    return calculateBoundsWithModeAwareConstraints(context, derived.resizeHandle)
  }

  return null
}

// Custom hook for drag handling (fact-based) with global event handling
function useResizeDrag(
  bounds: BoxBounds,
  containerDimensions: Dimensions,
  minSize: number,
  onBoundsChange: (bounds: BoxBounds) => void,
  onInteractionStart?: () => void,
  onInteractionEnd?: () => void
) {
  const [facts, setFacts] = useState<DragFacts>({
    interaction: null,
    currentPoint: null,
    modifiers: { shift: false, alt: false }
  })

  const derived = deriveDragState(facts)

  // Global event handlers for reliable drag tracking outside bounds
  const globalPointerMove = useCallback((e: PointerEvent) => {
    if (!facts.interaction || e.pointerId !== facts.interaction.pointerId) return

    e.preventDefault()

    // Update facts: current pointer position and modifier keys
    setFacts(current => ({
      ...current,
      currentPoint: { x: e.clientX, y: e.clientY },
      modifiers: { shift: e.shiftKey, alt: e.altKey }
    }))

    // Calculate and apply new bounds from updated facts
    const updatedFacts: DragFacts = {
      ...facts,
      currentPoint: { x: e.clientX, y: e.clientY },
      modifiers: { shift: e.shiftKey, alt: e.altKey }
    }

    const newBounds = calculateNewBoundsFromFacts(updatedFacts, containerDimensions, minSize)
    if (newBounds) {
      onBoundsChange(newBounds)
    }
  }, [facts, containerDimensions, minSize, onBoundsChange])

  const globalPointerUp = useCallback((e: PointerEvent) => {
    if (!facts.interaction || e.pointerId !== facts.interaction.pointerId) return

    e.preventDefault()

    // Clear facts - interaction is over
    setFacts({
      interaction: null,
      currentPoint: null,
      modifiers: { shift: false, alt: false }
    })

    onInteractionEnd?.()
  }, [facts.interaction, onInteractionEnd])

  // Set up global listeners when dragging starts
  useEffect(() => {
    if (!derived.isDragging) return

    // IMPLEMENTATION GUIDELINES: Use global document listeners during drag to handle
    // pointer events outside the component bounds. This eliminates the need for
    // pointer capture and local event handlers.

    document.addEventListener('pointermove', globalPointerMove, { passive: false })
    document.addEventListener('pointerup', globalPointerUp, { passive: false })
    document.addEventListener('pointercancel', globalPointerUp, { passive: false })

    return () => {
      document.removeEventListener('pointermove', globalPointerMove)
      document.removeEventListener('pointerup', globalPointerUp)
      document.removeEventListener('pointercancel', globalPointerUp)
    }
  }, [derived.isDragging, globalPointerMove, globalPointerUp])

  const handlePointerDown = useCallback((e: React.PointerEvent, mode: 'move' | 'resize', resizeHandle?: ResizeHandle) => {
    e.preventDefault()

    // Set facts: interaction started (no pointer capture needed)
    setFacts({
      interaction: {
        startPoint: { x: e.clientX, y: e.clientY },
        target: { mode, handle: resizeHandle },
        initialBounds: { ...bounds },
        pointerId: e.pointerId
      },
      currentPoint: { x: e.clientX, y: e.clientY },
      modifiers: { shift: e.shiftKey, alt: e.altKey }
    })

    onInteractionStart?.()
  }, [bounds, onInteractionStart])

  return {
    isDragging: derived.isDragging,
    dragMode: derived.dragMode,
    handlePointerDown,
  }
}

// Reusable handle component
interface HandleProps {
  type: ResizeHandle
  className: string
  onPointerDown: (e: React.PointerEvent, mode: 'move' | 'resize', handle?: ResizeHandle) => void
}

function Handle({ type, className, onPointerDown }: HandleProps) {
  return (
    <div
      className={className}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPointerDown(e, 'resize', type)
      }}
    />
  )
}

// Handle configuration for cleaner rendering
const HANDLE_CONFIGS = [
  { type: 'top-left' as ResizeHandle, className: 'absolute top-0 left-0 w-3 h-3 bg-blue-400 cursor-nw-resize touch-none -translate-x-1/2 -translate-y-1/2' },
  { type: 'top-right' as ResizeHandle, className: 'absolute top-0 right-0 w-3 h-3 bg-blue-400 cursor-ne-resize touch-none translate-x-1/2 -translate-y-1/2' },
  { type: 'bottom-left' as ResizeHandle, className: 'absolute bottom-0 left-0 w-3 h-3 bg-blue-400 cursor-sw-resize touch-none -translate-x-1/2 translate-y-1/2' },
  { type: 'bottom-right' as ResizeHandle, className: 'absolute bottom-0 right-0 w-3 h-3 bg-blue-400 cursor-se-resize touch-none translate-x-1/2 translate-y-1/2' },
  { type: 'top' as ResizeHandle, className: 'absolute top-0 left-0 w-full h-2 cursor-n-resize touch-none -translate-y-1' },
  { type: 'right' as ResizeHandle, className: 'absolute top-0 right-0 w-2 h-full cursor-e-resize touch-none translate-x-1' },
  { type: 'bottom' as ResizeHandle, className: 'absolute bottom-0 left-0 w-full h-2 cursor-s-resize touch-none translate-y-1' },
  { type: 'left' as ResizeHandle, className: 'absolute top-0 left-0 w-2 h-full cursor-w-resize touch-none -translate-x-1' },
] as const

export interface ResizableBoxProps {
  bounds: BoxBounds
  onBoundsChange: (bounds: BoxBounds) => void
  containerWidth: number
  containerHeight: number
  minSize?: number
  className?: string
  children?: React.ReactNode
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

export function ResizableBox({
  bounds,
  onBoundsChange,
  containerWidth,
  containerHeight,
  minSize = DEFAULT_MIN_SIZE,
  className = "",
  children,
  onInteractionStart,
  onInteractionEnd,
}: ResizableBoxProps) {
  const containerDimensions: Dimensions = { width: containerWidth, height: containerHeight }

  const {
    isDragging,
    dragMode,
    handlePointerDown
  } = useResizeDrag(
    bounds,
    containerDimensions,
    minSize,
    onBoundsChange,
    onInteractionStart,
    onInteractionEnd
  )

  const containerStyle = {
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    cursor: isDragging && dragMode === 'move' ? 'grabbing' : 'grab'
  }

  return (
    <div
      className={clsx("absolute border-2 touch-none", {
        "border-blue-500 bg-blue-500/30": isDragging,
        "border-blue-400 bg-blue-400/20": !isDragging,
        className
      })}
      style={containerStyle}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
    >
      {children}

      {HANDLE_CONFIGS.map(({ type, className }) => (
        <Handle
          key={type}
          type={type}
          className={className}
          onPointerDown={handlePointerDown}
        />
      ))}
    </div>
  )
}
