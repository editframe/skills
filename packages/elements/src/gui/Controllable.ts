import type { LitElement } from "lit";

import {
  isEFTemporal,
  type TemporalMixinInterface,
} from "../elements/EFTemporal.js";
import { type ContextMixinInterface, isContextMixin } from "./ContextMixin.js";

export declare class ControllableInterface extends LitElement {
  playing: boolean;
  loop: boolean;
  currentTimeMs: number;
  durationMs: number;
  play(): void | Promise<void>;
  pause(): void;
}

export function isControllable(value: any): value is ControllableInterface {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (isContextMixin(value)) {
    return true;
  }

  if (isEFTemporal(value)) {
    const temporal = value as TemporalMixinInterface;
    return temporal.playbackController !== undefined;
  }

  return false;
}

export type ControllableElement =
  | ContextMixinInterface
  | (TemporalMixinInterface & {
      playbackController: NonNullable<
        TemporalMixinInterface["playbackController"]
      >;
    });
