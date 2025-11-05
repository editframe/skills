import style from "../LayerStage.module.css";
import { observer } from "mobx-react-lite";
import { usePointerDrag } from "../../usePointerDrag";
import { TimeGroup } from "../../../model/TimeGroup/TimeGroup";
import {
  ContainerTimeMode,
  PointerModes,
  SizeMode,
} from "../../../model/types";
import { PointerModeProps } from ".";
import { useEditor } from "../../EditorContext";

export const TimeGroupMode = observer(
  ({ stageOuterRef, children }: PointerModeProps) => {
    const editor = useEditor();
    const { pointerDown, pointerLatest, eventHandlers } = usePointerDrag({
      onDragEnd(pointerDown, pointerLatest) {
        const stageRect = stageOuterRef.current?.getBoundingClientRect();
        if (!stageRect) {
          return;
        }

        const timeGroup = new TimeGroup({
          containerTimeMode: ContainerTimeMode.Fit,
          widthMode: SizeMode.Fixed,
          fixedHeight:
            Math.abs(pointerDown.y - pointerLatest.y) / editor.panAndZoom.zoom,
          heightMode: SizeMode.Fixed,
          fixedWidth:
            Math.abs(pointerDown.x - pointerLatest.x) / editor.panAndZoom.zoom,
          translateX:
            (Math.min(pointerDown.x, pointerLatest.x) - stageRect.left) /
              editor.panAndZoom.zoom -
            editor.panAndZoom.translateX / editor.panAndZoom.zoom,
          translateY:
            (Math.min(pointerDown.y, pointerLatest.y) - stageRect.top) /
              editor.panAndZoom.zoom -
            editor.panAndZoom.translateY / editor.panAndZoom.zoom,
        });

        editor.composition.pushLayers(timeGroup);
        editor.setLayerSelection(timeGroup);
        editor.setPointerMode(PointerModes.Pointer);
      },
    });
    return (
      <div className={style.stageOuter} ref={stageOuterRef} {...eventHandlers}>
        {children}
        {pointerDown && pointerLatest && (
          <div
            style={{
              position: "fixed",
              background: "#ccf",
              opacity: 0.5,
              pointerEvents: "none",
              top: Math.min(pointerDown.y, pointerLatest.y),
              left: Math.min(pointerDown.x, pointerLatest.x),
              width: Math.abs(pointerDown.x - pointerLatest.x),
              height: Math.abs(pointerDown.y - pointerLatest.y),
            }}
          ></div>
        )}
      </div>
    );
  },
);
