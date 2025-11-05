import { observer } from "mobx-react-lite";
import { type InstanceLayer } from "./InstanceLayer";
import { StageComponent } from "../../components/LayerStage/StageComponent";

export const InstanceLayerOnStage = observer(
  ({ layer }: { layer: InstanceLayer }) => {
    const component = layer.component;
    if (!component) {
      return <></>;
    }

    <StageComponent layer={layer} />;
  }
);
