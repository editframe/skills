import { observer } from "mobx-react-lite";
import { autorun } from "mobx";
import { useEffect, useRef } from "react";

import { HTMLLayer } from "../../model/HTMLLayer/HTMLLayer";
import { htmlToImage } from "@/util/drawHtml";
import { KEYFRAMES } from "@/util/KEYFRAMES";
import { useEditor } from "../EditorContext";

export const LayerCanvas = observer(() => {
  const editor = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    canvas.width = canvasRect.width * window.devicePixelRatio;
    canvas.height = canvasRect.height * window.devicePixelRatio;

    return autorun(async () => {
      if (!canvasRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const layers = [];
      for (const layer of editor.visibleLayers) {
        if (layer instanceof HTMLLayer) {
          layers.push(
            await htmlToImage(
              `
            <style>${KEYFRAMES}</style>
            <div
              style="
                animation-name: ${layer.animation ?? "none"};
                animation-duration: ${layer.durationMs}ms;
                animation-delay: -${editor.currentTimeMs - layer.startMs}ms;
                animation-play-state: paused;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                transform-origin: center;
              "
            >
              ${layer.html}
            </div>
          `,
              [],
            ),
          );
        }
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const layer of layers) {
        ctx.drawImage(layer, 0, 0, width, height, 0, 0, width, height);
      }
    });
  }, []);

  return (
    <>
      <canvas className="aspect-video w-96" ref={canvasRef} />
    </>
  );
});
