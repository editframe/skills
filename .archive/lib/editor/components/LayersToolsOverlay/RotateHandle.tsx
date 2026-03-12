import style from "./LayersToolsOverlay.module.css";
import { type FC } from "react";
import { type Layer } from "../../model/Layer";
import { usePointerDrag } from "../usePointerDrag";
import { pinToNearest } from "../../pinToNearest";

export const RotateHandle: FC<{ layer: Layer; handle: "rz" }> = ({ layer }) => {
  return (
    <div
      className={style.rotateHandle}
      data-handle="rz"
      {...usePointerDrag({
        onDrag(_pointerDown, pointerLatest, _movement, event) {
          const rect = layer.stageRef?.getBoundingClientRect();
          if (!rect) return;
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = pointerLatest.x - centerX;
          const dy = pointerLatest.y - centerY;
          const radians = Math.atan2(dy, dx);
          const degrees = radians * (180 / Math.PI) + 90;

          layer.setRotateZ(
            event.shiftKey ? pinToNearest(degrees, 45) : degrees,
          );
        },
      }).eventHandlers}
    />
  );
};
