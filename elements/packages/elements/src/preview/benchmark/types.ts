/**
 * Core types for the sync strategy benchmarking system.
 * 
 * The system has ONE job: make clones visually match their sources.
 * All strategies are combinations of what to read × how to write.
 */

import type { SyncState, CloneNode } from "../renderTimegroupPreview.js";

/** The three phases of sync - where time is spent */
export type SyncPhase = "read" | "write" | "copy";

/** How styles are applied to clones */
export type WriteMechanism =
  | "inline"      // clone.style.prop = value
  | "cssText"     // clone.style.cssText = "..."
  | "stylesheet"  // inject CSS rules via CSSOM
  | "variables"   // CSS custom properties on container
  | "skip";       // don't write (native path renders source directly)

/** Timing breakdown - one number per phase */
export interface SyncTiming {
  readMs: number;      // Time spent in getComputedStyle
  writeMs: number;     // Time spent applying styles to clones
  copyMs: number;      // Time spent copying canvas pixels
  totalMs: number;     // readMs + writeMs + copyMs
  elementCount: number;
}

/** Strategy = name + sync function that returns timing */
export interface SyncStrategy {
  readonly name: string;
  readonly description: string;
  readonly writeMechanism: WriteMechanism;

  /** Execute sync and return timing breakdown */
  sync(state: SyncState, timeMs: number): SyncTiming;
}

/** Evaluation: determine what styles the clone needs (pure, no side effects) */
export interface StyleEvaluation {
  pairIndex: number;
  visible: boolean;
  computedStyle: CSSStyleDeclaration | null;
  shadowCanvasSource: HTMLCanvasElement | null;
  shadowImgSource: HTMLImageElement | null;
}

/** Re-export SyncState for convenience */
export type { SyncState, CloneNode };

