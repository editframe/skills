import { fireEvent } from "@testing-library/react";

export const pointerEvent = (
  target: Element,
  event: "pointerdown" | "pointermove" | "pointerup",
  options: PointerEventInit | Point2DTuple
): boolean => {
  if (Array.isArray(options)) {
    return fireEvent(
      target,
      new PointerEvent(event, {
        bubbles: true,
        cancelable: true,
        clientX: options[0],
        clientY: options[1],
      })
    );
  } else {
    return fireEvent(
      target,
      new PointerEvent(event, {
        bubbles: true,
        cancelable: true,
        ...options,
      })
    );
  }
};

export const tap = (
  element: Element,
  eventOptions: PointerEventInit | Point2DTuple
): void => {
  pointerEvents(element, eventOptions, eventOptions);
};

export const pointerEvents = (
  element: Element,
  ...eventOptions: Array<PointerEventInit | Point2DTuple>
): void => {
  for (let i = 0; i < eventOptions.length; i++) {
    if (i === 0) {
      pointerEvent(element, "pointerdown", eventOptions[i]);
    } else if (i < eventOptions.length - 1) {
      pointerEvent(element, "pointermove", eventOptions[i]);
    } else {
      pointerEvent(element, "pointerup", eventOptions[i]);
    }
  }
};
