import style from "./ControlledTextLayerOnStage.module.css";
import { observer } from "mobx-react-lite";
import { type TextLayer } from "./TextLayer";
import { TextEditor } from "../../components/TextEditor";
import { useLayerOnStageProps } from "../../components/useLayerOnStageProps";

export const ControlledTextLayerOnStage = observer(
  ({ layer }: { layer: TextLayer }) => {
    const props = useLayerOnStageProps<HTMLParagraphElement>(layer);
    return (
      <div
        className={style.controlledTextLayer}
        {...props}
        style={{ ...props.style, ...layer.typographyCSS }}
      >
        <TextEditor
          disableTools
          initializeSelection
          textContent={layer.text}
          setTextContent={(text) => {
            layer.setTextContent(text);
          }}
          setTextStyle={(styles) => {
            layer.setTextStyle(styles);
          }}
          textStyle={layer.typographyCSS}
        />
      </div>
    );
  },
);
