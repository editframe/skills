import style from "./DevTools.module.css";

import { observer } from "mobx-react-lite";
import { useEditor } from "./EditorContext";
import { MIcon } from "./MIcon";
import { getSnapshot } from "mobx-keystone";

export const DevTools = observer(() => {
  const editor = useEditor();
  const devTools = editor.devTools;
  if (!devTools.isOpen) return null;
  return (
    <div className={style.devTools}>
      <header>
        <button
          onClick={() => {
            editor.devTools.setIsOpen(false);
          }}
        >
          <MIcon>close</MIcon>
        </button>
      </header>
      <button
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              JSON.stringify(getSnapshot(editor.composition)),
            );
            console.log("Text copied to clipboard successfully.");
          } catch (err) {
            alert("Unable to copy text to clipboard.");
          }
        }}
      >
        Copy Composition JSON
      </button>
      {/* <main>
        <TPropField model={devTools} propName="stageMode" />
        {devTools.stageMode === StageMode.CANVAS && (
          <TPropField model={devTools} propName="canvasMode" />
        )}
        <TemporalRootCombinedPreview />
      </main> */}
    </div>
  );
});

// const TemporalRootCombinedPreview = observer(() => {
//   const editor = useEditor();

//   const temporalRoot = editor.selectedTemporalRoot;
//   if (!temporalRoot) return null;

//   const runExport = async (): Promise<void> => {
//     const exporter = new Encoder({
//       temporalRoot,
//       video: {
//         width: temporalRoot.cssWidth,
//         height: temporalRoot.cssHeight,
//         framerate: 30,
//         keyframeIntervalMs: 2_000,
//         muxer: {
//           codec: "avc",
//         },
//         encoder: {
//           codec: "avc1.42001f",
//           bitrate: 1_000_000,
//         },
//       },
//       audio: {
//         sampleRate: 48000,
//         muxer: {
//           codec: "aac",
//           numberOfChannels: 1,
//         },
//         encoder: {
//           codec: "mp4a.40.2",
//           numberOfChannels: 1,
//           bitrate: 128000,
//         },
//       },
//     });

//     exporter.addEventListener("audio-chunk", (chunk, metadata) => {
//       console.log("audio chunk", chunk, metadata);
//     });
//     exporter.addEventListener("video-chunk", (chunk, metadata) => {
//       console.log("video chunk", chunk, metadata);
//     });

//     for await (const progressEvent of exporter.encode()) {
//       console.log(progressEvent);
//     }
//   };

//   return (
//     <button
//       onClick={() => {
//         void runExport();
//       }}
//     >
//       Render and Mux
//     </button>
//   );
// });
