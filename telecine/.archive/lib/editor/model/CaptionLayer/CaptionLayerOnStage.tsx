import { observer } from "mobx-react-lite";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";
import { type CaptionLayer } from "./CaptionLayer";

export const CaptionLayerOnStage = observer(
  ({ layer }: { layer: CaptionLayer }) => {
    const props = useLayerOnStageProps<HTMLDivElement>(layer);
    return (
      <div
        style={{
          ...props.style,
          width: "100%",
          position: "relative",
          overflowWrap: "break-word",
        }}
      >
        {layer.currentSegment?.words.map((word, index) => {
          const current = layer.isCurrentWord(word);
          return (
            <span
              key={word.text + index}
              style={current ? layer.activeWordCSS : layer.wordCSS}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    );
  }
);
