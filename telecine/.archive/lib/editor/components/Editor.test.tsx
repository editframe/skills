import { type RenderResult } from "@testing-library/react";
import { Editor as EditorModel } from "../model/Editor";
import layerStageClasses from "./LayerStage/LayerStage.module.css";
import { ContainerTimeMode, PointerModes, SizeMode } from "../model/types";
import { pointerEvents, tap } from "@test/pointerEvents";
import { TimeGroup } from "../model/TimeGroup/TimeGroup";
import { Editor } from "./Editor";
import { testRender } from "../@test/testRender";
import { getSnapshot } from "mobx-keystone";

let editor = new EditorModel({});

const renderTestEditor = (): RenderResult => {
  /**
   * This pins the stage to the top left corner of the screen.
   * This simplifies the tests because we don't have to worry about offsetting
   * the pointer events to account for the stage's position on screen.
   */
  const result = testRender(editor, <Editor />);
  const [stageOuter] = result.container.getElementsByClassName(
    layerStageClasses.stageOuter,
  );
  // @ts-expect-error - this is known to be a div
  Object.assign(stageOuter.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
  });
  return result;
};

describe("<Editor>", () => {
  beforeEach(() => {
    editor = new EditorModel({});
  });

  describe("PointerModes.Pointer", () => {
    describe("moving layers", () => {
      test("moves layers with a drag", async () => {
        const timeGroup = new TimeGroup({
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(timeGroup);
        editor.setLayerSelection(timeGroup);
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        pointerEvents(
          // This represents a drag starting from the center of the element.
          stageOuter, //
          [50, 50],
          // then moving far enough to get trigger the drag threshold
          [70, 70],
          // then dragging to a new location
          [0, 0],
          // And finally far away
          [100, 100],
          // The pointer is released
          {},
        );

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.include(editor.composition.childLayers[0], {
          translateY: 50,
          translateX: 50,
        });
      });

      test("selects and drags a layer if not already selected", () => {
        const timeGroup = new TimeGroup({
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(timeGroup);
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        pointerEvents(
          // This represents a drag starting from the center of the element.
          stageOuter, //
          [50, 50],
          // then moving far enough to get trigger the drag threshold
          [70, 70],
          // then dragging to a new location
          [0, 0],
          // And finally far away
          [100, 100],
          // The pointer is released
          {},
        );

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.include(editor.composition.childLayers[0], {
          translateY: 50,
          translateX: 50,
        });
      });

      test("layers retain their selection status when moved twice in a row", async () => {
        const timeGroup = new TimeGroup({
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(timeGroup);
        editor.setLayerSelection(timeGroup);
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        pointerEvents(
          // This represents a drag starting from the center of the element.
          stageOuter, //
          [50, 50],
          // then moving far enough to get trigger the drag threshold
          [70, 70],
          // then dragging to a new location
          [0, 0],
          // And finally far away
          [100, 100],
          // The pointer is released
          {},
        );

        pointerEvents(
          // This represents a drag starting from the center of the element.
          stageOuter, //
          [50, 50],
          // then moving far enough to get trigger the drag threshold
          [70, 70],
          // then dragging to a new location
          [0, 0],
          // And finally far away
          [100, 100],
          // The pointer is released
          {},
        );

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.isTrue(editor.composition.childLayers[0].isSelected);
        assert.include(editor.composition.childLayers[0], {
          translateY: 100,
          translateX: 100,
        });
      });

      test("drags must move far enough to trigger the drag threshold", async () => {
        const timeGroup = new TimeGroup({
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(timeGroup);
        editor.setLayerSelection(timeGroup);
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        pointerEvents(
          // This represents a drag starting from the center of the element.
          stageOuter, //
          [50, 50],
          // then moving just a little
          [51, 51],
          [48, 48],
          // then releasing
          {},
        );

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.include(editor.composition.childLayers[0], {
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
      });
    });
    describe("selecting layers", () => {
      test("selects layers with a tap", async () => {
        editor.composition.pushLayers(
          new TimeGroup({
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
        );
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        tap(stageOuter, [50, 50]);

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.isTrue(editor.composition.childLayers[0].isSelected);
      });

      test("keeps layers selected with a tap", async () => {
        editor.composition.pushLayers(
          new TimeGroup({
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
        );
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        tap(stageOuter, [50, 50]);
        tap(stageOuter, [50, 50]);

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.isTrue(editor.composition.childLayers[0].isSelected);
      });

      test("cycles through stacked sibling layers with a tap, and wraps around", async () => {
        editor.composition.pushLayers(
          new TimeGroup({
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
          new TimeGroup({
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
        );
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        tap(stageOuter, [50, 50]);
        assert.isTrue(editor.composition.childLayers[0].isSelected);
        assert.isFalse(editor.composition.childLayers[1].isSelected);

        tap(stageOuter, [50, 50]);
        assert.isFalse(editor.composition.childLayers[0].isSelected);
        assert.isTrue(editor.composition.childLayers[1].isSelected);

        tap(stageOuter, [50, 50]);
        assert.isTrue(editor.composition.childLayers[0].isSelected);
        assert.isFalse(editor.composition.childLayers[1].isSelected);
      });

      test("cyles through a group's children with a tap, and wraps around", async () => {
        const timeGroup = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fit,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        const timeGroup2 = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fixed,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(timeGroup, timeGroup2);
        timeGroup.pushLayers(
          new TimeGroup({
            containerTimeMode: ContainerTimeMode.Fixed,
            intrinsicDurationMs: 1000,
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
          new TimeGroup({
            containerTimeMode: ContainerTimeMode.Fixed,
            intrinsicDurationMs: 1000,
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
        );
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        // first tap, selects outer time group
        tap(stageOuter, [50, 50]);
        assert.isTrue(timeGroup.isSelected);
        assert.isFalse(timeGroup.childLayers[0].isSelected);
        assert.isFalse(timeGroup.childLayers[1].isSelected);
        assert.isFalse(timeGroup2.isSelected);

        // second tap, selects timegroup first child
        tap(stageOuter, [50, 50]);
        assert.isFalse(timeGroup.isSelected);
        assert.isTrue(timeGroup.childLayers[0].isSelected);
        assert.isFalse(timeGroup.childLayers[1].isSelected);
        assert.isFalse(timeGroup2.isSelected);

        // third tap, selects timegroup second child
        tap(stageOuter, [50, 50]);
        assert.isFalse(timeGroup.isSelected);
        assert.isFalse(timeGroup.childLayers[0].isSelected);
        assert.isTrue(timeGroup.childLayers[1].isSelected);
        assert.isFalse(timeGroup2.isSelected);

        // fourth tap, selects sibling of timegroup
        tap(stageOuter, [50, 50]);
        assert.isFalse(timeGroup.isSelected);
        assert.isFalse(timeGroup.childLayers[0].isSelected);
        assert.isFalse(timeGroup.childLayers[1].isSelected);
        assert.isTrue(timeGroup2.isSelected);
      });

      test("tap to select works through three levels", async () => {
        const grandParent = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fixed,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        const parent = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fixed,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        const child = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fixed,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        const child2 = new TimeGroup({
          intrinsicDurationMs: 1000,
          containerTimeMode: ContainerTimeMode.Fixed,
          widthMode: SizeMode.Fixed,
          heightMode: SizeMode.Fixed,
          fixedHeight: 100,
          fixedWidth: 100,
          translateY: 0,
          translateX: 0,
        });
        editor.composition.pushLayers(grandParent);
        grandParent.pushLayers(parent);
        parent.pushLayers(child, child2);

        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        // first tap, selects outer time group
        tap(stageOuter, [50, 50]);
        assert.isTrue(grandParent.isSelected);

        tap(stageOuter, [50, 50]);
        assert.isTrue(parent.isSelected);

        tap(stageOuter, [50, 50]);
        assert.isTrue(child.isSelected);

        tap(stageOuter, [50, 50]);
        assert.isTrue(child2.isSelected);
      });

      // TODO: re-implement this feature
      test.skip("shift click deselects layers", async () => {
        editor.composition.pushLayers(
          new TimeGroup({
            widthMode: SizeMode.Fixed,
            heightMode: SizeMode.Fixed,
            fixedHeight: 100,
            fixedWidth: 100,
            translateY: 0,
            translateX: 0,
          }),
        );
        const { container } = renderTestEditor();
        const [stageOuter] = container.getElementsByClassName(
          layerStageClasses.stageOuter,
        );

        tap(stageOuter, [50, 50]);
        tap(stageOuter, { clientX: 50, clientY: 50, shiftKey: true });

        assert.lengthOf(editor.composition.childLayers, 1);
        assert.isFalse(editor.composition.childLayers[0].isSelected);
      });
    });
  });

  describe("PointerModes.TimeGroup", () => {
    const HUNDRED_PIXEL_SQUARE = {
      fixedHeight: 100,
      fixedWidth: 100,
      translateY: 0,
      translateX: 0,
    };

    test("creates time groups dragged down/right", async () => {
      editor.setPointerMode(PointerModes.TimeGroup);
      const { container } = renderTestEditor();
      const [stageOuter] = container.getElementsByClassName(
        layerStageClasses.stageOuter,
      );

      pointerEvents(
        stageOuter, //
        [0, 0],
        [100, 100],
        [100, 100],
      );

      console.log(getSnapshot(editor.composition.layers));
      assert.lengthOf(editor.composition.childLayers, 1);
      assert.include(editor.composition.childLayers[0], HUNDRED_PIXEL_SQUARE);
    });

    test("creates time groups dragged up/right", async () => {
      editor.setPointerMode(PointerModes.TimeGroup);
      const { container } = renderTestEditor();
      const [stageOuter] = container.getElementsByClassName(
        layerStageClasses.stageOuter,
      );

      pointerEvents(
        stageOuter, //
        [0, 100],
        [100, 0],
        [100, 0],
      );

      assert.lengthOf(editor.composition.childLayers, 1);
      assert.include(editor.composition.childLayers[0], HUNDRED_PIXEL_SQUARE);
    });

    test("creates time groups dragged down/left", async () => {
      editor.setPointerMode(PointerModes.TimeGroup);
      const { container } = renderTestEditor();
      const [stageOuter] = container.getElementsByClassName(
        layerStageClasses.stageOuter,
      );

      pointerEvents(
        stageOuter, //
        [100, 0],
        [0, 100],
        [0, 100],
      );

      assert.lengthOf(editor.composition.childLayers, 1);
      assert.include(editor.composition.childLayers[0], HUNDRED_PIXEL_SQUARE);
    });

    test("creates time groups dragged up/left", async () => {
      editor.setPointerMode(PointerModes.TimeGroup);
      const { container } = renderTestEditor();
      const [stageOuter] = container.getElementsByClassName(
        layerStageClasses.stageOuter,
      );

      pointerEvents(
        stageOuter, //
        [100, 100],
        [0, 0],
        [0, 0],
      );

      assert.lengthOf(editor.composition.childLayers, 1);
      assert.include(editor.composition.childLayers[0], HUNDRED_PIXEL_SQUARE);
    });
  });
});
