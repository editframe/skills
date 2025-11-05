import { registerLayer } from "../registerLayer";
import { TextLayer } from "./TextLayer";
import { ControlledTextLayerOnStage } from "./ControlledTextLayerOnStage";
import { TextLayerOnStage } from "./TextLayerOnStage";
import { TextLayerPropertiesPanel } from "./TextLayerPropertiesPanel";

registerLayer(TextLayer, {
  stageComponent: TextLayerOnStage,
  controlledStageComponent: ControlledTextLayerOnStage,
  propertiesPanelComponent: TextLayerPropertiesPanel,
});
