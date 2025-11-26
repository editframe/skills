import style from "./Editor.module.css";
import { observer } from "mobx-react-lite";
import { useRef, useState } from "react";
import { CurrentTimeIndicator } from "./CurrentTimeIndicator";
import { AwarenessTimeIndicators } from "./AwarenessTimeIndicators";
import { LayerStage } from "./LayerStage/LayerStage";
import { LayerTimeline } from "./LayerTimeline/LayerTimeline";
import { SelectedLayerEditor } from "./SelectedLayerEditor";
import { TimeCode } from "./TimeCode";
import { useEvent } from "../useEvent";
import { Layer } from "../model/Layer";
import { TimeGroup } from "../model/TimeGroup/TimeGroup";
import { ContainerTimeMode, PointerModes, SizeMode } from "../model/types";
import { useEditor } from "./EditorContext";
import { MIcon } from "./MIcon";
import { PointerPoint } from "./PointerPoint";

const SUPPORTED_FILES = [
  "video/mp4",
  "video/webm",
  "audio/mp3",
  "image/jpeg",
  "image/png",
  "image/gif",
];

const dataTransferContainsSupportedFiles = (
  dataTransfer: DataTransfer | null,
): boolean => {
  if (dataTransfer) {
    return Array.from(dataTransfer.items).some(
      (item) => item.kind === "file" && SUPPORTED_FILES.includes(item.type),
    );
  }
  return false;
};

const getSupportedFilesFromDataTransfer = (
  dataTransfer: DataTransfer | null,
): File[] => {
  const files: File[] = [];
  if (!dataTransfer) return files;
  for (const item of dataTransfer.items) {
    if (item.kind === "file" && SUPPORTED_FILES.includes(item.type)) {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
};

const PlayPauseButton = observer(() => {
  const editor = useEditor();
  return (
    <>
      {(editor.selectedTemporalRoot?.isPlaying ?? false) ? (
        <button
          className={style.playButton}
          onClick={() => editor.selectedTemporalLayer?.pause()}
        >
          <MIcon>pause</MIcon>
        </button>
      ) : (
        <button
          className={style.playButton}
          onClick={() => editor.selectedTemporalLayer?.play()}
        >
          <MIcon>play_arrow</MIcon>
        </button>
      )}
    </>
  );
});

export const Editor = observer(() => {
  const editor = useEditor();
  if (editor.devTools.renderMode) {
    return null;
  }
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragCaptured, setDragCaptured] = useState(false);

  useEvent({ current: window }, "keyup", (event) => {
    const SKIP_KEYBINDINGS = "input, textarea, select, [contenteditable]";
    if (
      event.target instanceof HTMLElement &&
      event.target.matches(SKIP_KEYBINDINGS)
    ) {
      return;
    }

    if (event.key === "Escape") {
      editor.setPointerMode(PointerModes.Pointer);
    } else if (event.key === "Delete") {
      // editor.deleteSelectedLayers();
    } else if (event.key === " ") {
      editor.selectedTemporalLayer?.togglePlay();
    }
  });
  useEvent({ current: window }, "dragover", (event) => {
    if (dataTransferContainsSupportedFiles(event.dataTransfer)) {
      event.stopPropagation();
      event.preventDefault();
      setDragCaptured(true);
    }
  });
  useEvent({ current: window }, "dragleave", (event) => {
    if (event.currentTarget === window) {
      setDragCaptured(false);
    }
  });
  useEvent({ current: window }, "drop", (event) => {
    if (dataTransferContainsSupportedFiles(event.dataTransfer)) {
      event.stopPropagation();
      event.preventDefault();
      setDragCaptured(false);
      const files = getSupportedFilesFromDataTransfer(event.dataTransfer);
      Layer.createFromFiles(files, editor.composition);
    }
  });

  useEvent(
    { current: window },
    "pointermove",
    (event) => {
      editor.setPointerPoint([event.clientX, event.clientY]);
    },
    {
      capture: true,
    },
  );

  return (
    <>
      <PointerPoint />
      <div
        className={style.editor}
        style={{
          // @ts-expect-error - css vars
          "--ef-stageZoom": editor.panAndZoom.zoom,
        }}
      >
        <div className={style.topbar}>
          <button
            onClick={() => {
              const layer = new TimeGroup({
                containerTimeMode: ContainerTimeMode.Fit,
                widthMode: SizeMode.Fixed,
                fixedWidth: 1920,
                heightMode: SizeMode.Fixed,
                fixedHeight: 1080,
              });
              editor.composition.pushLayers(layer);
              editor.setLayerSelection(layer);
            }}
          >
            Add 16/9
          </button>
          <button
            onClick={() => {
              const layer = new TimeGroup({
                containerTimeMode: ContainerTimeMode.Fit,
                widthMode: SizeMode.Fixed,
                fixedWidth: 1080,
                heightMode: SizeMode.Fixed,
                fixedHeight: 1920,
              });
              editor.composition.pushLayers(layer);
              editor.setLayerSelection(layer);
            }}
          >
            Add 9/16
          </button>
          <p>{editor.pointerMode}</p>
          <button
            onClick={() => {
              editor.setPointerMode(PointerModes.Pointer);
            }}
          >
            Pointer
          </button>
          <button
            onClick={() => {
              editor.setPointerMode(PointerModes.Text);
            }}
          >
            Text
          </button>
          <button
            onClick={() => {
              editor.setPointerMode(PointerModes.TimeGroup);
            }}
          >
            Time Group
          </button>
          {/* <button
            style={{ marginLeft: "auto" }}
            onClick={() => {
              editor.devTools.setIsOpen(true);
            }}
          >
            <MIcon>settings</MIcon>
          </button> */}
        </div>
        <div className={style.stage}>
          <LayerStage />
        </div>
        <div className={style.timeline}>
          <div className={style.timelineControls}>
            <TimeCode ms={editor.selectedTemporalRoot?.currentTimeMs ?? 0} />
            /
            <TimeCode ms={editor.composition.durationMs} />
            <PlayPauseButton />
            <input
              type="range"
              value={editor.pixelsPerSecond}
              min={0.1}
              max={100}
              step={0.1}
              onChange={(event) => {
                editor.setPixelsPerSecond(event.target.valueAsNumber);
              }}
            />
            <input
              type="range"
              value={editor.panAndZoom.zoom}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(event) => {
                editor.panAndZoom.setTransform({
                  zoom: event.target.valueAsNumber,
                });
              }}
            />
          </div>
          <div
            className={style.timelineGutter}
            id="ef-timeline-gutter"
            ref={timelineRef}
            onClickCapture={(e) => {
              if (!timelineRef.current) return;
              const rect = timelineRef.current.getBoundingClientRect();
              const offsetX =
                e.clientX - rect.left + timelineRef.current.scrollLeft;
              const ms = editor.pixelsToMs(offsetX);
              editor.selectedLayers[0]?.temporalRoot.setCurrentTimeMs(ms);
            }}
            onMouseMoveCapture={(e) => {
              if (!timelineRef.current) return;
              if (editor.selectedTemporalLayer?.isPlaying === true) return;
              const rect = timelineRef.current.getBoundingClientRect();
              const offsetX =
                e.clientX - rect.left + timelineRef.current.scrollLeft;
              const ms = editor.pixelsToMs(offsetX);
              editor.selectedLayers[0]?.temporalRoot.setCurrentTimeMs(ms);
            }}
          >
            <LayerTimeline />
            <AwarenessTimeIndicators />
            <CurrentTimeIndicator />
          </div>
        </div>
        <div className={style.properties}>
          <SelectedLayerEditor />
        </div>
      </div>
      {dragCaptured && (
        <div className={style.acceptFiles}>Drop audio/video files here.</div>
      )}
    </>
  );
});
