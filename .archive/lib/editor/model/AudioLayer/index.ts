import { registerLayer } from "../registerLayer";
import { AudioLayer } from "./AudioLayer";
import { AudioLayerOnStage } from "./AudioLayerOnStage";

registerLayer(AudioLayer, {
  stageComponent: AudioLayerOnStage,
});
