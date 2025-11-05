import { observer } from "mobx-react-lite";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { type TextLayer } from "./TextLayer";
export const TextLayerOnStage = observer(({ layer }: { layer: TextLayer }) => {
  const props = useLayerOnStageProps<HTMLParagraphElement>(layer);
  return (
    <p
      {...props}
      style={{
        ...props.style,
        ...layer.typographyCSS,
      }}
    >
      {layer.text}
    </p>
  );
});
