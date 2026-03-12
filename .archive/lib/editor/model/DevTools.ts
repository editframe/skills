import { autorun } from "mobx";
import {
  Model,
  applySnapshot,
  getSnapshot,
  model,
  tProp,
  types,
} from "mobx-keystone";

export enum StageMode {
  DOM = "DOM",
  CANVAS = "CANVAS",
}

export enum CanvasMode {
  SHARED_CANVAS = "SHARED_CANVAS",
  SEPARATE_CANVAS = "SEPARATE_CANVAS",
}

@model("ef/DevTools")
export class DevTools extends Model({
  isOpen: tProp(types.boolean, false).withSetter(),
  renderMode: tProp(types.boolean, false).withSetter(),
  stageMode: tProp(types.enum(StageMode), StageMode.CANVAS).withSetter(),
  canvasMode: tProp(
    types.enum(CanvasMode),
    CanvasMode.SHARED_CANVAS,
  ).withSetter(),
}) {
  protected onAttachedToRootStore(): () => void {
    const maybeDevTools = localStorage.getItem("ef/DevTools");
    if (maybeDevTools !== null) {
      try {
        applySnapshot(this, JSON.parse(maybeDevTools));
      } catch (error) {
        console.error(
          "Failed to parse DevTools from localStorage. (using defaults)",
          maybeDevTools,
          error,
        );
      }
    }

    return autorun(
      () => {
        localStorage.setItem("ef/DevTools", JSON.stringify(getSnapshot(this)));
      },
      // Impose a throttle to prevent excessive writes to localStorage
      { delay: 1000 },
    );
  }
}
