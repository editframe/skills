import { observer } from "mobx-react-lite";
import { type Layer } from "../model/Layer";
import { useEditor } from "./EditorContext";
import { LayerRegistry } from "../model/registerLayer";
import { TPropField } from "./TPropField";

const LayerEditor: React.FC<{ layer: Layer }> = observer(({ layer }) => {
  const LayerPanelComponent = LayerRegistry.getPropertiesPanelComponent(layer);
  return (
    <>
      {LayerPanelComponent && <LayerPanelComponent layer={layer} />}
      <CommonLayerEditor layer={layer} />
    </>
  );
});

export const SelectedLayerEditor = observer(() => {
  const editor = useEditor();
  const [layer] = editor.selectedLayers;
  return (
    <>
      {/* <LayerCompositionEditor composition={editor.composition} /> */}
      {/* Eslint is wrong about this */}
      {/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */}
      {layer && <LayerEditor key={layer.id} layer={layer} />}
      <hr />
      <label>Root Temporal Layers</label>
      {editor.rootTemporalLayers.map((layer) => {
        return (
          <div
            key={layer.id}
            onClick={() => {
              editor.setLayerSelection(layer);
            }}
          >
            {layer.id} {layer.isSelected.toString()}
          </div>
        );
      })}
    </>
  );
});

const CommonLayerEditor: React.FC<{ layer: Layer }> = observer(({ layer }) => {
  return (
    <>
      <TPropField model={layer} propName="heightMode" />
      <TPropField model={layer} propName="fixedHeight" />
      <TPropField model={layer} propName="widthMode" />
      <TPropField model={layer} propName="fixedWidth" />
      <TPropField model={layer} propName="translateX" />
      <TPropField model={layer} propName="translateY" />
      {/* <TPropField model={layer} propName="timeMode" />
      <TPropField model={layer} propName="rotateZ" />
      <TPropField model={layer} propName="opacity" /> */}
    </>
  );
});
