import style, { temporalRoot } from "./LayerStage.module.css";

import {
  type RefObject,
  useRef,
  FC,
  useEffect,
  useState,
  useCallback,
} from "react";
import { observer } from "mobx-react-lite";
import { useEvent } from "../../useEvent";
import { LayersToolsOverlay } from "../LayersToolsOverlay/LayersToolsOverlay";
import { type Layer } from "../../model/Layer";
import { useAnimationframe } from "../useAnimationframe";
import { useEditor } from "../EditorContext";
import useResizeObserver from "@react-hook/resize-observer";
import { StageComponent } from "./StageComponent";
import { CanvasMode, StageMode } from "../../model/DevTools";
import { autorun } from "mobx";
import { request } from "playwright";
import { render } from "react-dom";

const Attentions = observer(() => {
  const editor = useEditor();
  const attentions = editor.attentions;
  return (
    <>
      {Object.entries(attentions).map(([session, attention]) => (
        <div
          key={session}
          style={{
            pointerEvents: "none",
            position: "absolute",
            left:
              attention.pointerPoint?.[0] * editor.panAndZoom.zoom +
              editor.panAndZoom.translateX,
            top:
              attention.pointerPoint?.[1] * editor.panAndZoom.zoom +
              editor.panAndZoom.translateY,
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 141.49007052233083 174.47374062062772"
            width="24"
            height="24"
            className={style.awarenessCursor}
          >
            <g
              strokeLinecap="round"
              transform="translate(5 5)"
              fillRule="evenodd"
            >
              <path
                d="M0 0 L25.16 156.78 L62.43 101.59 L132.54 99.39 L0 0"
                stroke="none"
                strokeWidth="0"
                fill="#e7f5ff"
                fillRule="evenodd"
              ></path>
              <path
                d="M0 0 C9.84 61.35, 19.69 122.69, 25.16 156.78 M0 0 C5.93 36.96, 11.86 73.92, 25.16 156.78 M25.16 156.78 C34.9 142.35, 44.65 127.92, 62.43 101.59 M25.16 156.78 C33.85 143.91, 42.54 131.04, 62.43 101.59 M62.43 101.59 C87.97 100.79, 113.51 99.99, 132.54 99.39 M62.43 101.59 C76.48 101.15, 90.53 100.71, 132.54 99.39 M132.54 99.39 C103.01 77.24, 73.48 55.1, 0 0 M132.54 99.39 C94.36 70.75, 56.17 42.12, 0 0 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0"
                stroke="#1e1e1e"
                strokeWidth="10"
                fill="none"
              ></path>
            </g>
          </svg>
          <span className={style.awarenessCursorLabel}>{attention.name}</span>
        </div>
      ))}
    </>
  );
});

export const LayerStage = observer(() => {
  const editor = useEditor();
  const stageOuter = useRef<HTMLDivElement>(null);
  const northMask = useRef<HTMLDivElement>(null);
  const southMask = useRef<HTMLDivElement>(null);
  const eastMask = useRef<HTMLDivElement>(null);
  const westMask = useRef<HTMLDivElement>(null);

  const drawMask = (): void => {
    if (
      !(
        editor.selectedTemporalLayer?.stageRef &&
        stageOuter.current &&
        northMask.current &&
        southMask.current &&
        eastMask.current &&
        westMask.current
      )
    ) {
      return;
    }

    const outerRect = stageOuter.current.getBoundingClientRect();
    const rect = editor.selectedTemporalLayer.stageRef.getBoundingClientRect();

    Object.assign(northMask.current.style, {
      top: "0px",
      left: "0px",
      right: "0px",
      height: `${Math.max(rect.top - outerRect.top, 0)}px`,
    });
    Object.assign(southMask.current.style, {
      top: `${rect.bottom - outerRect.top}px`,
      bottom: "0px",
      left: "0px",
      right: "0px",
    });
    Object.assign(westMask.current.style, {
      top: `${rect.top - outerRect.top}px`,
      left: "0px",
      width: `${Math.max(rect.left - outerRect.left, 0)}px`,
      height: `${rect.height}px`,
    });
    Object.assign(eastMask.current.style, {
      top: `${rect.top - outerRect.top}px`,
      right: "0px",
      width: `${Math.max(outerRect.right - rect.right, 0)}px`,
      height: `${rect.height}px`,
    });
  };

  useAnimationframe(drawMask);

  const stageRef = useRef<HTMLDivElement>(null);

  useResizeObserver(stageOuter, (entry) => {
    const rect = entry.target.getBoundingClientRect();
    editor.setStageOffset([rect.x, rect.y]);
  });

  useEvent(
    stageOuter,
    "wheel",
    (event) => {
      if (!stageRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      editor.panAndZoom.propagateWheelEvent(event, stageRef.current);
    },
    { passive: false },
  );

  useEvent(stageOuter, "pointermove", (event) => {
    editor.setPointerPoint([event.clientX, event.clientY]);
  });
  useEvent(stageOuter, "pointerenter", () => {
    editor.setShowPointer(true);
  });
  useEvent(stageOuter, "pointerleave", () => {
    editor.setShowPointer(false);
  });

  return (
    <editor.PointerModeComponent stageOuterRef={stageOuter}>
      <Attentions />
      <StageContents stageRef={stageRef} />
      <LayersToolsOverlay />
      <TemporalRootOutlines />
      {editor.selectedTemporalLayer && (
        <>
          <div ref={northMask} className={style.stageMask}></div>
          <div ref={eastMask} className={style.stageMask}></div>
          <div ref={southMask} className={style.stageMask}></div>
          <div ref={westMask} className={style.stageMask}></div>
        </>
      )}
    </editor.PointerModeComponent>
  );
});

type StageContentsFC = FC<{ stageRef: RefObject<HTMLDivElement> }>;
const StageContentsDOM: StageContentsFC = observer(({ stageRef }) => {
  const editor = useEditor();
  return (
    <>
      {/* <style>{KEYFRAMES}</style> */}
      <div
        ref={stageRef}
        className={style.layerStage}
        style={{
          transform: editor.panAndZoom.cssTransform,
        }}
      >
        {editor.rootTemporalLayers.map((layer) => {
          return <StageComponent key={layer.id} layer={layer} />;
        })}
      </div>
    </>
  );
});

const TemporalRootOnCanvas = observer(({ layer }: { layer: Layer }) => {
  const editor = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestedTimeRef = useRef(0);
  const renderRequestPromise = useRef<Promise<void> | null>(null);

  const drawToCanvas = useCallback(async (requestedTime: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    layer.clearFrameBuffer();
    // Calling trimAdjustedCurrentTimeMs is required to trigger the autorun
    // FIXME: this is a hack
    // console.log("rendering to canvas", layer.trimAdjustedCurrentTimeMs);
    if (editor.devTools.canvasMode === CanvasMode.SEPARATE_CANVAS) {
      await layer.renderToCanvas(layer.frameBufferCtx);
      // canvasRef.current.width = layer.fixedWidth;
      // canvasRef.current.height = layer.fixedHeight;
      ctx.drawImage(layer.frameBuffer, 0, 0);
    } else if (editor.devTools.canvasMode === CanvasMode.SHARED_CANVAS) {
      // canvasRef.current.width = layer.fixedWidth;
      // canvasRef.current.height = layer.fixedHeight;
      const containerRect =
        canvasRef.current.parentElement?.getBoundingClientRect();
      if (!containerRect) return;
      const frameBuffer = new OffscreenCanvas(
        containerRect.width * editor.devicePixelRatio,
        containerRect.height * editor.devicePixelRatio,
      );
      const frameBufferCtx = frameBuffer.getContext("2d");
      if (!frameBufferCtx) return;
      const zoom = editor.panAndZoom.zoom;
      const translateX = editor.panAndZoom.translateX;
      const translateY = editor.panAndZoom.translateY;
      frameBufferCtx.save();
      frameBufferCtx.scale(zoom, zoom);
      frameBufferCtx.translate(translateX, translateY);
      await layer.renderToCanvas(frameBufferCtx);
      frameBufferCtx.restore();
      // autrun DOES NOT track after the await, so any required observables
      // must be accessed before the await and stored in variables
      canvasRef.current.width = containerRect.width * editor.devicePixelRatio;
      canvasRef.current.height = containerRect.height * editor.devicePixelRatio;
      canvasRef.current.style.width = containerRect.width + "px";
      canvasRef.current.style.height = containerRect.height + "px";
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(frameBuffer, 0, 0);
    }

    renderRequestPromise.current = null;
    if (requestedTimeRef.current !== requestedTime) {
      renderRequestPromise.current = drawToCanvas(requestedTimeRef.current);
    }
  }, []);

  useEffect(() => {
    return autorun(async () => {
      editor.panAndZoom.zoom;
      editor.panAndZoom.translateX;
      editor.panAndZoom.translateY;
      const requestedTime = layer.trimAdjustedCurrentTimeMs;
      if (renderRequestPromise.current) {
        requestedTimeRef.current = requestedTime;
      } else {
        renderRequestPromise.current = drawToCanvas(requestedTime);
      }
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
});

const StageContentsCanvas: StageContentsFC = observer(({ stageRef }) => {
  const editor = useEditor();
  return (
    <div
      className={style.layerStage}
      ref={stageRef}
      style={{
        position: "absolute",
        inset: 0,
        // transform: editor.panAndZoom.cssTransform,
      }}
    >
      {editor.rootTemporalLayers.map((layer) => {
        return <TemporalRootOnCanvas key={layer.id} layer={layer} />;
      })}
    </div>
  );
});

export const StageContents: StageContentsFC = observer(({ stageRef }) => {
  const editor = useEditor();
  if (editor.devTools.stageMode === StageMode.DOM) {
    return <StageContentsDOM stageRef={stageRef} />;
  } else if (editor.devTools.stageMode === StageMode.CANVAS) {
    return <StageContentsCanvas stageRef={stageRef} />;
  }
});

const TemporalRootOutlines = observer(() => {
  const editor = useEditor();
  return editor.rootTemporalLayers.map((layer) =>
    layer.isSelected ? null : (
      <TemporalRootOutline key={layer.id} layer={layer} />
    ),
  );
});

const TemporalRootOutline = observer(({ layer }: { layer: Layer }) => {
  const outlineRef = useRef<HTMLDivElement>(null);
  useAnimationframe(() => {
    if (!outlineRef.current) return;
    if (!layer.stageRef) return;

    const rect = layer.stageRef.getBoundingClientRect();

    Object.assign(outlineRef.current.style, {
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
  });
  return <div ref={outlineRef} className={style.temporalRoot} />;
});
