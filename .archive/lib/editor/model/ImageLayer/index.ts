import { registerLayer } from "../registerLayer";
import { ImageLayer } from "./ImageLayer";
import { ImageLayerOnStage } from "./ImageLayerOnStage";

registerLayer(ImageLayer, {
  stageComponent: ImageLayerOnStage,
});
