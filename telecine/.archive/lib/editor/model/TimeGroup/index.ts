import { registerLayer } from "../registerLayer";
import { TimeGroup } from "./TimeGroup";
import { TimeGroupOnStage } from "./TimeGroupOnStage";
import { TimeGroupPropertiesPanel } from "./TimeGroupPropertiesPanel";

registerLayer(TimeGroup, {
  stageComponent: TimeGroupOnStage,
  propertiesPanelComponent: TimeGroupPropertiesPanel,
});
