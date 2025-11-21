export type DropZone = "before" | "after" | "inside" | "none";

export type DropPosition = "before" | "after" | "inside";

const MIN_ZONE_SIZE = 8;
const HYSTERESIS_BUFFER = 2;
const BEFORE_AFTER_ZONE_RATIO = 0.2;

interface ZoneThresholds {
  before: number;
  after: number;
}

function calculateThresholds(elementHeight: number): ZoneThresholds {
  const beforeAfterZoneSize = Math.max(
    elementHeight * BEFORE_AFTER_ZONE_RATIO,
    MIN_ZONE_SIZE,
  );
  return {
    before: beforeAfterZoneSize,
    after: elementHeight - beforeAfterZoneSize,
  };
}

function determineRawZone(
  relativeY: number,
  elementHeight: number,
  canHaveChildren: boolean,
): DropZone {
  if (!canHaveChildren) {
    return relativeY < elementHeight / 2 ? "before" : "after";
  }

  const thresholds = calculateThresholds(elementHeight);
  if (relativeY < thresholds.before) {
    return "before";
  }
  if (relativeY > thresholds.after) {
    return "after";
  }
  return "inside";
}

type ZoneTransition = 
  | { from: "before"; to: "after" }
  | { from: "after"; to: "before" }
  | { from: "inside"; to: "before" }
  | { from: "inside"; to: "after" }
  | { from: DropZone; to: DropZone };

function shouldTransitionZone(
  transition: ZoneTransition,
  relativeY: number,
  elementHeight: number,
): boolean {
  const thresholds = calculateThresholds(elementHeight);
  const hysteresis = HYSTERESIS_BUFFER;

  if (transition.from === "before" && transition.to === "after") {
    return relativeY > thresholds.after + hysteresis;
  }
  if (transition.from === "after" && transition.to === "before") {
    return relativeY < thresholds.before - hysteresis;
  }
  if (transition.from === "inside") {
    if (transition.to === "before") {
      return relativeY < thresholds.before - hysteresis;
    }
    if (transition.to === "after") {
      return relativeY > thresholds.after + hysteresis;
    }
  }
  return true;
}

interface ElementZoneState {
  currentZone: DropZone;
  elementId: string;
}

export class DropZoneStateMachine {
  private states = new Map<string, ElementZoneState>();

  determineZone(
    elementId: string,
    cursorY: number,
    elementRect: DOMRect,
    canHaveChildren: boolean,
  ): DropZone {
    const relativeY = cursorY - elementRect.top;
    const rawZone = determineRawZone(relativeY, elementRect.height, canHaveChildren);

    const state = this.states.get(elementId);
    if (!state || state.elementId !== elementId) {
      const newState: ElementZoneState = {
        currentZone: rawZone,
        elementId,
      };
      this.states.set(elementId, newState);
      return rawZone;
    }

    if (rawZone === state.currentZone) {
      return rawZone;
    }

    const transition: ZoneTransition = {
      from: state.currentZone,
      to: rawZone,
    };

    if (shouldTransitionZone(transition, relativeY, elementRect.height)) {
      state.currentZone = rawZone;
      return rawZone;
    }

    return state.currentZone;
  }

  reset(): void {
    this.states.clear();
  }

  resetElement(elementId: string): void {
    this.states.delete(elementId);
  }
}



