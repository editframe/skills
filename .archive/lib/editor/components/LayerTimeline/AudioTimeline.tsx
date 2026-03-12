import WaveSurfer, { type WaveSurferOptions } from "wavesurfer.js";
import { useRef, useState, useEffect, type RefObject } from "react";
type UseWaveSurferOptions = Omit<WaveSurferOptions, "container">;

const useWaveSurfer = (
  containerRef: RefObject<HTMLDivElement>,
  // We extract the url from the options because resetting it causes the WaveSurfer
  // instance to reload, which causes a little flicker in the UI.
  { url, ...options }: UseWaveSurferOptions,
): WaveSurfer | null => {
  const [waveSurfer, setWaveSurfer] = useState<WaveSurfer | null>(null);

  // We have to use an effect to create WaveSurfer because it requires a DOM node to attach to.
  useEffect(() => {
    if (containerRef.current === null) return;

    const ws = WaveSurfer.create({
      url,
      ...options,
      container: containerRef.current,
      fillParent: false,
      hideScrollbar: true,
    });

    setWaveSurfer(ws);

    return () => {
      ws.destroy();
    };
  }, [url, options.width]);

  // Then we have to use another effect to update WaveSurfer's options.
  // Using mapping the entries
  useEffect(() => {
    if (containerRef.current === null) return;
    if (waveSurfer === null) return;

    waveSurfer.setOptions(options);
  }, Object.entries(options).flat());

  return waveSurfer;
};

const WaveSurferPlayer: React.FC<{
  waveColor: string;
  url: string;
  height: number;
  minPxPerSec: number;
}> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useWaveSurfer(containerRef, props);

  return <div ref={containerRef} style={{ minHeight: "20px" }} />;
};

export const AudioTimeline: React.FC<{
  url: string;
  /**
   * Passing in a pre-computed width in pixes to WaveSurfer allows
   * for smooth re-drawing of the waveform when scaling the timeline.
   *
   * This can be computed from the duration of the layer and the msToPixels utility:
   *
   * ```
   * const widthPx = editor.msToPixels(layer.durationMs);
   * ```
   * */
  minPxPerSec: number;
}> = ({ url, minPxPerSec = 1 }) => {
  return (
    <div
      style={{
        width: "100%",
        pointerEvents: "none",
      }}
    >
      <WaveSurferPlayer
        waveColor="rgb(0, 0, 0)"
        url={url}
        height={20}
        minPxPerSec={minPxPerSec}
      />
    </div>
  );
};
