import { FC } from "react";
import { observer } from "mobx-react-lite";
import { type Layer } from "../../model/Layer";
import { LayerRegistry } from "../../model/registerLayer";
import { useEditor } from "../EditorContext";

export const StageComponent: FC<{ layer: Layer }> = observer(({ layer }) => {
  const editor = useEditor();
  if (editor.controlledLayer === layer) {
    const ControlledStageComponent =
      LayerRegistry.getControlledStageComponent(layer);
    if (ControlledStageComponent === undefined) {
      throw new Error(
        `no controlled stage component for ${layer.$modelType}. You need to register it in the LayerRegistry`
      );
    }
    return <ControlledStageComponent layer={layer} />;
  }

  const StageComponent = LayerRegistry.getStageComponent(layer);
  if (StageComponent === undefined) {
    throw new Error(
      `no stage component for ${layer.$modelType}. You need to register it in the LayerRegistry`
    );
  }
  return <StageComponent layer={layer} />;
});
