import style from "./LayerTimeline.module.css";
import { FC, useRef } from "react";
import { Layer } from "../../model/Layer";
import { useEditor } from "../EditorContext";
import { usePointerDrag } from "../usePointerDrag";
export const DragHandleEnd: FC<{ layer: Layer }> = ({ layer }): any => {
  const editor = useEditor();
  const handleRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={handleRef}
      className={style.dragHandleEnd}
      {...usePointerDrag({
        onDrag(_pointerStart, _pointerLatest, movement, event) {
          if (editor.selectedTemporalRoot?.isPlaying === true) {
            editor.selectedTemporalRoot?.pause();
          }
          if (!handleRef.current) return;
          const timeline = handleRef.current.closest("#ef-timeline-gutter");
          if (!timeline) return;

          const rect = timeline.getBoundingClientRect();
          const offsetX = event.clientX - rect.left + timeline.scrollLeft;
          const ms = editor.pixelsToMs(offsetX);

          editor.selectedTemporalRoot?.setCurrentTimeMs(ms);
          layer.trimEndByMs(editor.pixelsToMs(movement.x));
        },
      }).eventHandlers}
    />
  );
};
