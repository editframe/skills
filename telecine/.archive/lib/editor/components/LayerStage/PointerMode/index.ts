import { type PropsWithChildren, type RefObject } from "react";

export interface PointerModeProps extends PropsWithChildren {
  stageOuterRef: RefObject<HTMLDivElement>;
}
