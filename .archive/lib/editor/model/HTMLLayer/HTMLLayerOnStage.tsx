import { observer } from "mobx-react-lite";
import { type HTMLLayer } from "./HTMLLayer";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";

export const HTMLLayerOnStage = observer(({ layer }: { layer: HTMLLayer }) => {
  return (
    <div
      {...useLayerOnStageProps<HTMLDivElement>(layer)}
      dangerouslySetInnerHTML={{ __html: layer.html }}
    />
  );
});
