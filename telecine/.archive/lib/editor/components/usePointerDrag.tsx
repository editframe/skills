import { useState } from "react";

interface PointerDragHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: React.PointerEvent<HTMLElement>) => void;
}

export interface PointerDragConfig {
  eventHandlers: PointerDragHandlers;
  pointerDown: Maybe<Point2D>;
  pointerLatest: Maybe<Point2D>;
  dragging: boolean;
}

interface PointerDragOptions {
  dragStartThreshold?: number;
  onDragStart?: (
    pointerDown: Point2D,
    pointerLatest: Point2D,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onDrag?: (
    pointerDown: Point2D,
    pointerLatest: Point2D,
    movement: Point2D,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onDragEnd?: (
    pointerDown: Point2D,
    pointerLatest: Point2D,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onPointerUp?: (
    pointerDown: Point2D,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<HTMLElement>) => void;
}

const DRAG_START_THRESHOLD = 10;
export const usePointerDrag = (
  dragConfig: PointerDragOptions = {}
): PointerDragConfig => {
  const [pointerDown, setPointerDown] = useState<Maybe<Point2D>>();
  const [pointerLatest, setPointerLatest] = useState<Maybe<Point2D>>();
  const [dragging, setDragging] = useState(false);

  return {
    pointerDown,
    pointerLatest,
    dragging,
    eventHandlers: {
      onPointerDown(event: React.PointerEvent<HTMLElement>) {
        event.stopPropagation();
        event.preventDefault();

        if (event.isTrusted) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setPointerDown({ x: event.clientX, y: event.clientY });
        setPointerLatest({ x: event.clientX, y: event.clientY });
        dragConfig.onPointerDown?.(event);
      },
      onPointerMove(event: React.PointerEvent<HTMLElement>) {
        if (!pointerDown) {
          return;
        }
        if (event.isTrusted) {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            console.info("lost pointer capture, but pointer is moving");
            return;
          }
        }
        dragConfig.onPointerMove?.(event);
        if (!dragging) {
          const distance = Math.hypot(
            event.clientX - pointerDown.x,
            event.clientY - pointerDown.y
          );
          if (
            distance > (dragConfig.dragStartThreshold ?? DRAG_START_THRESHOLD)
          ) {
            setDragging(true);
            // On the first drag, we want to use the pointerDown position as the
            // starting point for the drag.
            setPointerLatest({ x: event.clientX, y: event.clientY });
            dragConfig.onDragStart?.(
              pointerDown,
              {
                x: event.clientX,
                y: event.clientY,
              },
              event
            );
            dragConfig.onDrag?.(
              pointerDown,
              {
                x: event.clientX,
                y: event.clientY,
              },
              {
                x: event.clientX - pointerDown.x,
                y: event.clientY - pointerDown.y,
              },
              event
            );
          }
        } else {
          const movement: Point2D = pointerLatest
            ? {
                x: event.clientX - pointerLatest.x,
                y: event.clientY - pointerLatest.y,
              }
            : { x: 0, y: 0 };
          setPointerLatest({ x: event.clientX, y: event.clientY });
          dragConfig.onDrag?.(
            pointerDown,
            {
              x: event.clientX,
              y: event.clientY,
            },
            movement,
            event
          );
        }
      },
      onPointerCancel(event: React.PointerEvent<HTMLElement>) {
        if (event.isTrusted) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }
        dragConfig.onPointerCancel?.(event);
      },
      onLostPointerCapture(event: React.PointerEvent<HTMLElement>) {
        if (event.isTrusted) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }
        if (!pointerDown) {
          return;
        }
        setPointerDown(undefined);
        setPointerLatest(undefined);
        setDragging(false);
        if (dragging && pointerLatest) {
          dragConfig.onDragEnd?.(pointerDown, pointerLatest, event);
        } else {
          dragConfig.onPointerUp?.(pointerDown, event);
        }
      },
      onPointerUp(event: React.PointerEvent<HTMLElement>) {
        if (event.isTrusted) {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }
        if (!pointerDown) {
          return;
        }
        setPointerDown(undefined);
        setPointerLatest(undefined);
        setDragging(false);
        if (dragging && pointerLatest) {
          dragConfig.onDragEnd?.(pointerDown, pointerLatest, event);
        } else {
          dragConfig.onPointerUp?.(pointerDown, event);
        }
      },
    },
  };
};
