import type { MotionDesignerState } from "./types.js";

const STORAGE_KEY = "motion-designer-composition";

export function saveState(state: MotionDesignerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): MotionDesignerState | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function exportState(state: MotionDesignerState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): MotionDesignerState {
  return JSON.parse(json);
}
