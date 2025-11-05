import style from "./LayerTimeline.module.css";
import { observer } from "mobx-react-lite";
import type { Layer } from "../../model/Layer";
import classNames from "classnames";
import { usePointerDrag } from "../usePointerDrag";
import { TimeGroup } from "../../model/TimeGroup/TimeGroup";
import { useEditor } from "../EditorContext";
import { MIcon } from "../MIcon";
import { AudioLayer } from "../../model/AudioLayer/AudioLayer";
import { AudioTimeline } from "./AudioTimeline";

import { useRef } from "react";
import { DragHandleStart } from "./DragHandleStart";
import { DragHandleEnd } from "./DragHandleEnd";
import { CaptionLayer } from "../../model/CaptionLayer/CaptionLayer";
import { CaptionTimeline } from "../CaptionTimeline";
const LayerOnTimeline: React.FC<{ layer: Layer }> = observer(({ layer }) => {
  const editor = useEditor();
  const layerContainer = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={layerContainer}
      className={classNames({
        [style.layerOnTimeline]: true,
        [style.layerOnTimelineSelected]: layer.isSelected,
      })}
      {...usePointerDrag({
        onDrag(_pointerStart, _pointerLatest, movement) {
          layer.moveFixedStartMs(editor.pixelsToMs(movement.x));
        },
      }).eventHandlers}
      style={{
        width: editor.msToPixels(layer.durationMs),
        left: editor.msToPixels(layer.startMs),
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.shiftKey) {
          editor.toggleLayerSelection(layer);
        } else {
          editor.setLayerSelection(layer);
        }
      }}
    >
      {layer.canBeTrimmed && <DragHandleStart layer={layer} />}

      <label className={style.layerLabel}>
        <MIcon>{layer.iconName}</MIcon>
        {layer.oneLineTitle}
        {layer instanceof TimeGroup && ` (${layer.containerTimeMode})`}
      </label>

      {layer instanceof AudioLayer && (
        <AudioTimeline
          minPxPerSec={editor.pixelsPerSecond}
          url={layer.srcUrl}
        />
      )}
      {layer instanceof CaptionLayer && <CaptionTimeline layer={layer} />}

      <div className={style.layerTimelineTrack}>
        {layer instanceof TimeGroup &&
          layer.childLayers.map((layer) => {
            return <LayerOnTimeline key={layer.id} layer={layer} />;
          })}
      </div>

      {layer.canBeTrimmed && <DragHandleEnd layer={layer} />}
    </div>
  );
});

export const LayerTimeline = observer(() => {
  const editor = useEditor();
  const layer = editor.selectedTemporalRoot;
  return (
    <div
      className={style.layerTimeline}
      data-title={layer?.oneLineTitle}
      style={{ width: editor.msToPixels(layer?.durationMs ?? 0) }}
    >
      {layer && <LayerOnTimeline layer={layer} />}
    </div>
  );
});
