import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { autorun } from "mobx";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { type VideoLayer } from "./VideoLayer";
import { PIDController } from "./PIDController";

const TIMING_THRESHOLD = 500;

export const VideoLayerOnStage = observer(
  ({ layer }: { layer: VideoLayer }) => {
    const props = useLayerOnStageProps<HTMLVideoElement>(layer);

    useEffect(() => {
      const pid = new PIDController(0.3, 0.1, 0.3);
      return autorun(() => {
        if (!props.ref.current) return;
        if (layer.temporalRoot.isPlaying) {
          if (props.ref.current.paused) {
            props.ref.current.currentTime =
              layer.trimAdjustedCurrentTimeMs / 1000;
            props.ref.current.play().catch((error) => {
              console.error("Error playing video", error);
            });
          }
          const videoTimeMs = props.ref.current.currentTime * 1000;
          const errorMs = videoTimeMs - layer.trimAdjustedCurrentTimeMs;

          pid.setTarget(0);
          const adjustment = pid.calculate(errorMs);

          const currentRate = props.ref.current.playbackRate;
          const newRate = currentRate + adjustment / 1000;
          if (Math.abs(currentRate - newRate) > 0.01) {
            try {
              props.ref.current.playbackRate = 1 + adjustment / 1000;
            } catch (error) {
              props.ref.current.currentTime =
                layer.trimAdjustedCurrentTimeMs / 1000;
            }
          }
          if (errorMs > TIMING_THRESHOLD || errorMs < -TIMING_THRESHOLD) {
            props.ref.current.currentTime =
              layer.trimAdjustedCurrentTimeMs / 1000;
          }
        } else {
          if (!props.ref.current.paused) {
            props.ref.current.pause();
          }
          props.ref.current.currentTime =
            layer.trimAdjustedCurrentTimeMs / 1000;
        }
      });
    }, []);

    return <video {...props} src={layer.srcUrl} />;
  }
);
