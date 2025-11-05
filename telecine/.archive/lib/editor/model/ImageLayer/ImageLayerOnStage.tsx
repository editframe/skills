import { observer } from "mobx-react-lite";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { type ImageLayer } from "./ImageLayer";

export const ImageLayerOnStage = observer(
  ({ layer }: { layer: ImageLayer }) => {
    const props = useLayerOnStageProps<HTMLImageElement>(layer);

    return <img {...props} src={layer.srcUrl} />;
  }
);
