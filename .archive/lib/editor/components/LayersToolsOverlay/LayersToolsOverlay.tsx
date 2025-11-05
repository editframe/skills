import style from "./LayersToolsOverlay.module.css";
import { observer } from "mobx-react-lite";
import { useRef } from "react";
import { type Layer } from "../../model/Layer";
import { useAnimationframe } from "../useAnimationframe";
import { useEditor } from "../EditorContext";

import { ResizeHandle, Handle } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";

const SingleLayerToolsOverlay = observer(({ layer }: { layer: Layer }) => {
  const toolRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();

  useAnimationframe(() => {
    if (!toolRef.current) return;
    if (!layer.stageRef) return;

    Object.assign(toolRef.current.style, {
      width: layer.scaledStageWidth * editor.panAndZoom.zoom + "px",
      height: layer.scaledStageHeight * editor.panAndZoom.zoom + "px",
      position: "absolute",
      top:
        layer.cumulativeTranslateY * editor.panAndZoom.zoom +
        editor.panAndZoom.translateY +
        "px",
      left:
        layer.cumulativeTranslateX * editor.panAndZoom.zoom +
        editor.panAndZoom.translateX +
        "px",
      transform: `rotateZ(${layer.rotateZ}deg)`,
    });
  });

  return (
    <>
      <div ref={toolRef} className={style.layersToolsOverlay}>
        <RotateHandle layer={layer} handle="rz" />
        {/* Top Left */}
        <ResizeHandle layer={layer} x={Handle.START} y={Handle.START} />
        {/* Top Center */}
        <ResizeHandle layer={layer} x={Handle.CENTER} y={Handle.START} />
        {/* Top Right */}
        <ResizeHandle layer={layer} x={Handle.END} y={Handle.START} />
        {/* Center Right */}
        <ResizeHandle layer={layer} x={Handle.END} y={Handle.CENTER} />
        {/* BottomRight */}
        <ResizeHandle layer={layer} x={Handle.END} y={Handle.END} />
        {/* BottomCenter */}
        <ResizeHandle layer={layer} x={Handle.CENTER} y={Handle.END} />
        {/* BottomLeft */}
        <ResizeHandle layer={layer} x={Handle.START} y={Handle.END} />
        {/* CenterLeft */}
        <ResizeHandle layer={layer} x={Handle.START} y={Handle.CENTER} />
      </div>
    </>
  );
});

export const LayersToolsOverlay = observer(() => {
  const editor = useEditor();
  const [selected] = editor.selectedLayers;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!selected) return null;
  return <SingleLayerToolsOverlay key={selected.id} layer={selected} />;
});
