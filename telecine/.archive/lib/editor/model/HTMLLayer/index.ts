import { registerLayer } from "../registerLayer";
import { HTMLLayer } from "./HTMLLayer";
import { HTMLLayerOnStage } from "./HTMLLayerOnStage";

registerLayer(HTMLLayer, {
  stageComponent: HTMLLayerOnStage,
});
