import style from "../LayerStage.module.css";
import { observer } from "mobx-react-lite";
import { PointerModeProps } from ".";
import { LayerRegistry } from "../../../model/registerLayer";
import { useEvent } from "../../../useEvent";
import { useEditor } from "../../EditorContext";
import { Layer } from "@/editor/model/Layer";
import { usePointerDrag } from "../../usePointerDrag";

export const PointerMode = observer(
  ({ stageOuterRef, children }: PointerModeProps) => {
    const editor = useEditor();

    const selectElementUnderPoint = (x: number, y: number): void => {
      const layers: Layer[] = document
        .elementsFromPoint(x, y)
        // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
        .filter((element) => element.layerObject)
        .sort((a, b) => {
          // This sort sorts layers first by document order, then by layer order within the same parent.
          // This is to ensure that the topmost layer is selected when multiple layers are stacked on top of each other.
          // and then selection can cycle through children of the same parent.
          if (a.contains(b)) {
            return 1;
          } else if (b.contains(a)) {
            return -1;
          } else {
            return (
              Array.from(b.parentElement?.children ?? []).indexOf(b) -
              Array.from(a.parentElement?.children ?? []).indexOf(a)
            );
          }
        })
        // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
        .map((element) => element.layerObject)
        .reverse();

      if (layers.length === 0) {
        editor.clearLayerSelection();
        return;
      }

      const firstSelectedIndex = layers.findIndex((layer) => layer.isSelected);
      if (
        firstSelectedIndex === -1 ||
        firstSelectedIndex === layers.length - 1
      ) {
        editor.setLayerSelection(layers[0]);
      } else {
        editor.setLayerSelection(layers[firstSelectedIndex + 1]);
      }
    };

    /**
     * Returns true if the selected layer is not under the given point.
     */
    const selectedLayerNotUnderPoint = (x: number, y: number): boolean => {
      return (
        document
          .elementsFromPoint(x, y)
          // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
          .filter((element) => element.layerObject)
          // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
          .map((element) => element.layerObject)
          .find((layer) => layer === editor.selectedLayers[0]) === undefined
      );
    };

    const pointerDrag = usePointerDrag({
      onDragStart(pointerDown, _pointerLatest) {
        // If the current selected layer is not under the pointer
        // OR if there is no selected layer, select the layer under the pointer.
        if (
          selectedLayerNotUnderPoint(pointerDown.x, pointerDown.y) ||
          editor.selectedLayers.length === 0
        ) {
          selectElementUnderPoint(pointerDown.x, pointerDown.y);
        }
      },
      onDrag(_pointerDown, _pointerLatest, movement) {
        editor.selectedLayers[0]?.moveBy(
          // movementX must be adjusted by devicePixelRatio to account for User Agent scaling
          // And then furtherh adjusted by the current zoom level to account for application scaling
          movement.x / editor.panAndZoom.zoom,
          movement.y / editor.panAndZoom.zoom,
        );
      },
      onDragEnd(_pointerDown, _pointerLatest) {
        // const dropTarget = timeGroupUnderPoint(
        //   pointerLatest.clientX,
        //   pointerLatest.clientY,
        // );
        // if (
        //   // Dragged over a time group
        //   dropTarget &&
        //   // There is a selection
        //   editor.selectedLayers[0] !== undefined &&
        //   // Not dropping onto itself
        //   dropTarget !== editor.selectedLayers[0] &&
        //   // Not dropping into a time group that already contains the selection
        //   editor.selectedLayers[0].timeGroup !== dropTarget &&
        //   !dropTarget.childLayers.includes(editor.selectedLayers[0])
        // ) {
        //   dropTarget.pushLayers(editor.selectedLayers[0]);
        // }
      },

      onPointerUp(pointerDown) {
        selectElementUnderPoint(pointerDown.x, pointerDown.y);
      },
    });

    const pointerDragHandlers = editor.controlledLayer
      ? {}
      : pointerDrag.eventHandlers;

    // Clear controlled layer if user clicks outside of it
    useEvent({ current: window }, "click", (event) => {
      if (!editor.controlledLayer) {
        return;
      }

      if (
        event.target === editor.controlledLayer.stageRef ||
        editor.controlledLayer.stageRef?.contains(event.target as Node) === true
      ) {
        return;
      }

      editor.clearControlledLayer();
    });

    return (
      <div
        ref={stageOuterRef}
        className={style.stageOuter}
        onDoubleClick={(event) => {
          const domNode = document
            .elementsFromPoint(event.clientX, event.clientY)
            // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
            .find((element) => element.layerObject);

          // @ts-expect-error - unsafe expando of layer elements with their associated Layer object
          const layer = domNode?.layerObject as Maybe<Layer>;

          if (layer && LayerRegistry.getControlledStageComponent(layer)) {
            editor.setLayerSelection(layer);
            editor.setControlledLayer(layer);
          }
        }}
        {...pointerDragHandlers}
      >
        {children}
      </div>
    );
  },
);
