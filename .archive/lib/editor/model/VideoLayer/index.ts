import { registerLayer } from "../registerLayer";
import { VideoLayer } from "./VideoLayer";
import { VideoLayerOnStage } from "./VideoLayerOnStage";

registerLayer(VideoLayer, {
  stageComponent: VideoLayerOnStage,
});
