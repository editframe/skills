import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { autorun } from "mobx";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { type AudioLayer } from "./AudioLayer";
import { PIDController } from "../VideoLayer/PIDController";

const TIMING_THRESHOLD = 500;
export const AudioLayerOnStage = observer(
  ({ layer }: { layer: AudioLayer }) => {
    const props = useLayerOnStageProps<HTMLCanvasElement>(layer);

    useEffect(() => {
      return autorun(async () => {
        if (!props.ref.current) {
          return;
        }
        const canvas = props.ref.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = layer.fixedWidth;
        canvas.height = layer.fixedHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        await layer.renderToCanvas(ctx);
      });
    }, [layer.fixedWidth, layer.fixedHeight]);

    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      const pid = new PIDController(0.3, 0.1, 0.3);
      return autorun(() => {
        if (!audioRef.current) return;
        if (layer.temporalRoot.isPlaying) {
          if (audioRef.current.paused) {
            audioRef.current.currentTime =
              layer.trimAdjustedCurrentTimeMs / 1000;
            audioRef.current.play().catch((error) => {
              console.error("Error playing audio", error);
            });
          }
          const videoTimeMs = audioRef.current.currentTime * 1000;
          const errorMs = videoTimeMs - layer.trimAdjustedCurrentTimeMs;

          pid.setTarget(0);
          const adjustment = pid.calculate(errorMs);

          const currentRate = audioRef.current.playbackRate;
          const newRate = currentRate + adjustment / 1000;
          if (Math.abs(currentRate - newRate) > 0.01) {
            try {
              audioRef.current.playbackRate = 1 + adjustment / 1000;
            } catch (error) {
              audioRef.current.currentTime =
                layer.trimAdjustedCurrentTimeMs / 1000;
            }
          }
          if (errorMs > TIMING_THRESHOLD || errorMs < -TIMING_THRESHOLD) {
            audioRef.current.currentTime =
              layer.trimAdjustedCurrentTimeMs / 1000;
          }
        } else {
          if (!audioRef.current.paused) {
            audioRef.current.pause();
          }
          audioRef.current.currentTime = layer.trimAdjustedCurrentTimeMs / 1000;
        }
      });
    }, []);

    return (
      <>
        <canvas {...props} />
        <audio src={layer.srcUrl} ref={audioRef} />
      </>
    );
  }
);
