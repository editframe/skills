import type { TemporalMixinInterface } from "../../elements/EFTemporal.js";

export interface TrimConstraints {
  minStartMs: 0;
  maxStartMs: number;
  minEndMs: 0;
  maxEndMs: number;
}

export function getTrimConstraints(element: TemporalMixinInterface): TrimConstraints {
  const intrinsicDuration = element.intrinsicDurationMs ?? element.durationMs;
  const trimStartMs = element.trimStartMs ?? 0;
  const trimEndMs = element.trimEndMs ?? 0;

  return {
    minStartMs: 0,
    maxStartMs: Math.max(0, intrinsicDuration - trimEndMs),
    minEndMs: 0,
    maxEndMs: Math.max(0, intrinsicDuration - trimStartMs),
  };
}
