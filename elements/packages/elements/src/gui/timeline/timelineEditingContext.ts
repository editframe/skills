import { createContext } from "@lit/context";

export type TimelineEditingState =
  | { mode: "idle" }
  | { mode: "scrubbing"; startTimeMs: number }
  | { mode: "trimming"; elementId: string; handle: "start" | "end" }
  | { mode: "selecting"; box: DOMRect };

export interface TimelineEditingContext {
  state: TimelineEditingState;
  setState: (state: TimelineEditingState) => void;
}

export const timelineEditingContext = createContext<TimelineEditingContext>(
  Symbol("timelineEditingContext"),
);

export function determineEditingState(
  context: TimelineEditingContext,
): TimelineEditingState {
  return context.state;
}



