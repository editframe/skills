import style from "./LayersToolsOverlay.module.css";

import { observer } from "mobx-react-lite";
import { type Layer } from "../../model/Layer";
import { useEditor } from "../EditorContext";
import { usePointerDrag } from "../usePointerDrag";
import { rotatePoint } from "../../rotatePoint";

export enum Handle {
  START = 0,
  CENTER = 0.5,
  END = 1,
}
const ADJACENT_HANDLES = {
  [Handle.START]: Handle.END,
  [Handle.CENTER]: Handle.CENTER,
  [Handle.END]: Handle.START,
};
const HANDLE_PLACEMENTS = {
  top: {
    [Handle.START]: -15,
    [Handle.CENTER]: "calc(50% - 5px)",
    [Handle.END]: "auto",
  },
  bottom: {
    [Handle.START]: "auto",
    [Handle.CENTER]: "calc(50% - 5px)",
    [Handle.END]: -15,
  },
  left: {
    [Handle.START]: -15,
    [Handle.CENTER]: "calc(50% - 5px)",
    [Handle.END]: "auto",
  },
  right: {
    [Handle.START]: "auto",
    [Handle.CENTER]: "calc(50% - 5px)",
    [Handle.END]: -15,
  },
};
export const ResizeHandle = observer(
  ({ layer, x, y }: { layer: Layer; x: Handle; y: Handle }) => {
    const editor = useEditor();
    return (
      <div
        className={style.resizeHandle}
        style={{
          top: HANDLE_PLACEMENTS.top[y],
          left: HANDLE_PLACEMENTS.left[x],
          bottom: HANDLE_PLACEMENTS.bottom[y],
          right: HANDLE_PLACEMENTS.right[x],
        }}
        {...usePointerDrag({
          onDrag(_pointerDown, _pointerLatest, movement) {
            const initialCorner = layer.cornerPoint(
              ADJACENT_HANDLES[x],
              ADJACENT_HANDLES[y]
            );

            const rotatedDelta = rotatePoint(
              0,
              0,
              movement.x / editor.panAndZoom.zoom,
              movement.y / editor.panAndZoom.zoom,
              -layer.zRadians
            );

            if (x === Handle.START) {
              layer.setFixedWidth(layer.scaledStageWidth - rotatedDelta.x);
            }
            if (x === Handle.END) {
              layer.setFixedWidth(layer.scaledStageWidth + rotatedDelta.x);
            }

            if (y === Handle.START) {
              layer.setFixedHeight(layer.scaledStageHeight - rotatedDelta.y);
            }
            if (y === Handle.END) {
              layer.setFixedHeight(layer.scaledStageHeight + rotatedDelta.y);
            }

            const newCorner = layer.cornerPoint(
              ADJACENT_HANDLES[x],
              ADJACENT_HANDLES[y]
            );

            layer.setTranslateX(
              layer.translateX + (initialCorner.x - newCorner.x)
            );
            layer.setTranslateY(
              layer.translateY + (initialCorner.y - newCorner.y)
            );
          },
        }).eventHandlers}
      />
    );
  }
);
