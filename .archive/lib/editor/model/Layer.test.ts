import { Editor } from "./Editor";
import { Layer } from "./Layer";
import { TimeGroup } from "./TimeGroup/TimeGroup";
import { ContainerTimeMode, TimeMode } from "./types";

let editor = new Editor({});

describe("Layer", () => {
  beforeEach(() => {
    editor = new Editor({});
  });

  describe("TimeMode.Fill", () => {
    test("Expands to duration of the containing TimeGroup", () => {
      const timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fixed,
        intrinsicDurationMs: 1400,
      });

      const layer = new Layer({
        timeMode: TimeMode.Fill,
      });

      editor.composition.pushLayers(timeGroup);
      timeGroup.pushLayers(layer);

      assert.equal(layer.durationMs, 1400);
    });

    test("If the layer is a temporal root, it acts as-if it was a TimeMode.Fixed layer", () => {
      const layer = new Layer({
        timeMode: TimeMode.Fill,
        intrinsicDurationMs: 250,
      });

      editor.composition.pushLayers(layer);

      assert.equal(layer.durationMs, 250);
    });
  });

  describe("TimeMode.Fixed", () => {
    test("Does not expand to duration of the containing TimeGroup", () => {
      const timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fixed,
        intrinsicDurationMs: 1400,
      });

      const layer = new Layer({
        timeMode: TimeMode.Fixed,
        intrinsicDurationMs: 250,
      });

      editor.composition.pushLayers(timeGroup);
      timeGroup.pushLayers(layer);

      assert.equal(layer.durationMs, 250);
    });

    test("If the layer is a temporal root, it's duration is it's intrinsic duration", () => {
      const layer = new Layer({
        timeMode: TimeMode.Fixed,
        intrinsicDurationMs: 250,
      });

      editor.composition.pushLayers(layer);

      assert.equal(layer.durationMs, 250);
    });
  });
});
