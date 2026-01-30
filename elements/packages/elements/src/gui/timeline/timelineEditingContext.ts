import { createContext } from "@lit/context";

export type TimelineEditingState =
  | { mode: "idle" }
  | { mode: "scrubbing"; startTimeMs: number }
  | { mode: "trimming"; elementId: string; handle: "start" | "end" }
  | { mode: "dragging"; elementIds: string[]; startPositions: Map<string, number> }
  | { mode: "selecting"; box: DOMRect };

export interface TimelineEditingContext {
  state: TimelineEditingState;
  setState: (state: TimelineEditingState) => void;
  
  /**
   * Returns true if any editing operation is in progress (not idle).
   */
  isEditing: () => boolean;
  
  /**
   * Returns true if hover and other passive interactions should be allowed.
   * False when an active editing operation would be disrupted by hover feedback.
   */
  canInteract: () => boolean;
}

export const timelineEditingContext = createContext<TimelineEditingContext>(
  Symbol("timelineEditingContext"),
);

/**
 * Create a timeline editing context with helper methods.
 */
export function createTimelineEditingContext(): TimelineEditingContext {
  const context: TimelineEditingContext = {
    state: { mode: "idle" },
    setState: (state: TimelineEditingState) => {
      context.state = state;
    },
    isEditing: () => context.state.mode !== "idle",
    canInteract: () => {
      // Block interactions during active drag operations
      return context.state.mode === "idle";
    },
  };
  return context;
}
