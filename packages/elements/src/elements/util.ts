import { EFTimegroup } from "./EFTimegroup.js";

export const getRootTimeGroup = (element: Element): EFTimegroup | null => {
  let bestCandidate: EFTimegroup | null = null;

  let currentElement: Element | null = element;
  while (currentElement) {
    if (currentElement instanceof EFTimegroup) {
      bestCandidate = currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return bestCandidate;
};

export const getStartTimeMs = (element: Element): number => {
  const nearestTimeGroup = element.closest("ef-timegroup");
  if (!(nearestTimeGroup instanceof EFTimegroup)) {
    return 0;
  }

  return nearestTimeGroup.startTimeMs;
};
