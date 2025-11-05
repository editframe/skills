import { registerLayer } from "../registerLayer";
import { InstanceLayer } from "./InstanceLayer";
import { InstanceLayerOnStage } from "./InstanceLayerOnStage";

registerLayer(InstanceLayer, {
  stageComponent: InstanceLayerOnStage,
});
