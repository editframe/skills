import type { MotionDesignerState } from "./types";

export function getActiveRootTimegroupId(
  state: MotionDesignerState,
): string | null {
  return state.ui.activeRootTimegroupId;
}
