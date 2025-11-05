import { registerLayer } from "../registerLayer";
import { CaptionLayer } from "./CaptionLayer";
import { CaptionLayerOnStage } from "./CaptionLayerOnStage";

registerLayer(CaptionLayer, {
  stageComponent: CaptionLayerOnStage,
});
