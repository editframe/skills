import { observer } from "mobx-react-lite";
import { TextEditor } from "../../components/TextEditor";
import { type TextLayer } from "./TextLayer";

export const TextLayerPropertiesPanel: React.FC<{ layer: TextLayer }> =
  observer(({ layer }) => {
    return (
      <div>
        <label>Text</label>
        <TextEditor
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
  });
