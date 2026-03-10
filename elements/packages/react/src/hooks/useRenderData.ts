import { getRenderData } from "@editframe/elements";
import { useMemo } from "react";

export function useRenderData<T = unknown>(): T | undefined {
  return useMemo(() => getRenderData<T>(), []);
}
