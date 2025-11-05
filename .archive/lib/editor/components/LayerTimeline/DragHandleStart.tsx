import style from "./LayerTimeline.module.css";
import { FC } from "react";
import { Layer } from "../../model/Layer";
import { usePointerDrag } from "../usePointerDrag";
import { useEditor } from "../EditorContext";

export const DragHandleStart: FC<{ layer: Layer }> = ({ layer }): any => {
  const editor = useEditor();
  return (
    <div
      className={style.dragHandleStart}
      {...usePointerDrag({
        onDrag(_pointerStart, _pointerLatest, movement) {
          layer.trimStartByMs(editor.pixelsToMs(movement.x));
        },
      }).eventHandlers}
    />
  );
};
