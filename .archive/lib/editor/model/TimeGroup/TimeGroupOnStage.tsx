import { observer } from "mobx-react-lite";
import { type TimeGroup } from "./TimeGroup";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { StageComponent } from "../../components/LayerStage/StageComponent";

export const TimeGroupOnStage = observer(({ layer }: { layer: TimeGroup }) => {
  return (
    <div {...useLayerOnStageProps<HTMLDivElement>(layer)}>
      {layer.visibleLayers.map((layer) => {
        return <StageComponent key={layer.id} layer={layer} />;
      })}
    </div>
  );
});
