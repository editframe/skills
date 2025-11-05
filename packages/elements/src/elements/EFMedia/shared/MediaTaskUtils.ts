import type { Task } from "@lit/task";
import type {
  AudioRendition,
  MediaEngine,
  VideoRendition,
} from "../../../transcoding/types";
import type { BufferedSeekingInput } from "../BufferedSeekingInput";

/**
 * Generic rendition type that can be either audio or video
 */
export type MediaRendition = AudioRendition | VideoRendition;

/**
 * Generic task type for init segment fetch
 */
export type InitSegmentFetchTask = Task<
  readonly [MediaEngine | undefined],
  ArrayBuffer
>;

/**
 * Generic task type for segment ID calculation
 */
export type SegmentIdTask = Task<
  readonly [MediaEngine | undefined, number],
  number | undefined
>;

/**
 * Generic task type for segment fetch
 */
export type SegmentFetchTask = Task<
  readonly [MediaEngine | undefined, number | undefined],
  ArrayBuffer
>;

/**
 * Generic task type for input creation
 */
export type InputTask = Task<
  readonly [ArrayBuffer, ArrayBuffer],
  BufferedSeekingInput | undefined
>;
