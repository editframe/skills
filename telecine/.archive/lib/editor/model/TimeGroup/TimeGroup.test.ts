import { ContainerTimeMode, TimeMode } from "../types";
import { TimeGroup } from "./TimeGroup";
import { LayerComposition } from "../LayerComposition";
import { Layer } from "../Layer";

describe("TimeGroup", () => {
  describe("pushLayers", () => {
    test("adds layers to the end of the child layers", () => {
      const composition = new LayerComposition({});
      const timeGroup = new TimeGroup({});
      composition.pushLayers(timeGroup);
      const layer1 = new Layer({});
      const layer2 = new Layer({});
      timeGroup.pushLayers(layer1, layer2);
      assert.equal(timeGroup.childLayers.length, 2);
      assert.equal(timeGroup.childLayers[0], layer1);
      assert.equal(timeGroup.childLayers[1], layer2);
    });

    test("steals layers from other time groups", () => {
      const composition = new LayerComposition({});
      const timeGroup1 = new TimeGroup({});
      const timeGroup2 = new TimeGroup({});
      composition.pushLayers(timeGroup1, timeGroup2);
      const layer1 = new Layer({});
      const layer2 = new Layer({});
      timeGroup1.pushLayers(layer1, layer2);
      timeGroup2.pushLayers(layer1);
      assert.equal(timeGroup1.childLayers.length, 1);
      assert.equal(timeGroup2.childLayers.length, 1);
      assert.equal(timeGroup1.childLayers[0], layer2);
      assert.equal(timeGroup2.childLayers[0], layer1);
    });

    test("Steals layers from composition", () => {
      const composition = new LayerComposition({});
      const timeGroup = new TimeGroup({});
      const layer1 = new Layer({});
      composition.pushLayers(layer1, timeGroup);
      assert.equal(composition.childLayers.length, 2);
      assert.equal(composition.childLayers[0], layer1);
      assert.equal(composition.childLayers[1], timeGroup);
      timeGroup.pushLayers(layer1);
      assert.equal(timeGroup.childLayers.length, 1);
      assert.equal(timeGroup.childLayers[0], layer1);
      assert.equal(composition.childLayers.length, 1);
    });
  });

  describe("removeLayer", () => {
    test("removes layers from the child layers", () => {
      const composition = new LayerComposition({});
      const timeGroup = new TimeGroup({});
      composition.pushLayers(timeGroup);
      const layer1 = new Layer({});
      const layer2 = new Layer({});
      timeGroup.pushLayers(layer1, layer2);
      timeGroup.removeLayer(layer1);
      assert.equal(timeGroup.childLayers.length, 1);
      assert.equal(timeGroup.childLayers[0], layer2);
    });
  });

  describe("composition", () => {
    test("returns the composition", () => {
      const composition = new LayerComposition({});
      const timeGroup = new TimeGroup({});
      composition.pushLayers(timeGroup);
      assert.equal(timeGroup.composition, composition);
    });

    test("returns composition through multiple time group layers", () => {
      const composition = new LayerComposition({});
      const timeGroup = new TimeGroup({});
      const nestedTimeGroup = new TimeGroup({});
      composition.pushLayers(timeGroup);
      timeGroup.pushLayers(nestedTimeGroup);
      assert.equal(nestedTimeGroup.composition, composition);
    });
  });

  describe("selectedLayers", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fit,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("returns selected layers", () => {
      layer1.isSelected = true;
      assert.equal(timeGroup.selectedLayers.length, 1);
    });

    test("returns selected layers", () => {
      layer1.isSelected = true;
      layer2.isSelected = true;
      assert.equal(timeGroup.selectedLayers.length, 2);
    });

    describe("nested time groups", () => {
      let nestedTimeGroup: TimeGroup;
      let nestedLayer1: Layer;
      let nestedLayer2: Layer;

      beforeEach(() => {
        nestedTimeGroup = new TimeGroup({
          containerTimeMode: ContainerTimeMode.Fit,
        });
        timeGroup.pushLayers(nestedTimeGroup);
        nestedLayer1 = new Layer({ intrinsicDurationMs: 1000 });
        nestedLayer2 = new Layer({ intrinsicDurationMs: 2000 });
        nestedTimeGroup.pushLayers(nestedLayer1, nestedLayer2);
      });

      test("returns nested selected layers", () => {
        nestedLayer1.isSelected = true;
        assert.equal(timeGroup.selectedLayers.length, 1);
      });

      test("returns selected layers combined with own selected layers", () => {
        layer1.isSelected = true;
        nestedLayer1.isSelected = true;
        nestedLayer2.isSelected = true;
        assert.equal(timeGroup.selectedLayers.length, 3);
      });
    });
  });

  describe("visibleLayers", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fit,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("returns layers that are visible at the current time", () => {
      timeGroup.setCurrentTimeMs(500);
      assert.equal(timeGroup.visibleLayers.length, 2);
    });

    test("returns layers that are visible at the current time", () => {
      timeGroup.setCurrentTimeMs(1500);
      assert.equal(timeGroup.visibleLayers.length, 1);
    });

    test("returns layers that are visible at the current time", () => {
      timeGroup.setCurrentTimeMs(2500);
      assert.equal(timeGroup.visibleLayers.length, 0);
    });
  });
  describe("setCurrentTimeMs", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Sequence,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("sets the current time of all child layers when in sequence mode", () => {
      timeGroup.setCurrentTimeMs(500);
      assert.equal(layer1.currentTimeMs, 500);
      assert.equal(layer2.currentTimeMs, 0);
    });

    test("sets the current time of all child layers when in fit mode", () => {
      layer2.setFixedStartMs(250);
      timeGroup.setContainerTimeMode(ContainerTimeMode.Fit);
      timeGroup.setCurrentTimeMs(500);
      assert.equal(layer1.currentTimeMs, 500);
      assert.equal(layer2.currentTimeMs, 250);
    });

    test("clamps the max current time to the duration of the time group", () => {
      timeGroup.setCurrentTimeMs(5000);
      assert.equal(timeGroup.currentTimeMs, 3000);
    });

    test("clamps the minimum current time to the duration of the time group", () => {
      timeGroup.setCurrentTimeMs(-5000);
      assert.equal(timeGroup.currentTimeMs, 0);
    });
  });

  describe("ContainerTimeMode.Fixed", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fixed,
        intrinsicDurationMs: 1000,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("duration is the intrinsic duration", () => {
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("doesn't change duration if furthest extant layer doesnt' change", () => {
      layer1.setIntrinsicDurationMs(500);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("doesn't change if early child layers are removed", () => {
      timeGroup.removeLayer(layer1);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("doesn't change if early child layers are added", () => {
      const layer3 = new Layer({ intrinsicDurationMs: 500 });
      timeGroup.pushLayers(layer3);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Doesn't change if early child layers are trimmed", () => {
      layer1.trim.setStartMs(500);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Changes if late child intrinsic duration changes", () => {
      layer2.setIntrinsicDurationMs(1000);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Changes if later child layers are removed", () => {
      timeGroup.removeLayer(layer2);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Doesn't change if all children are removed", () => {
      timeGroup.removeLayer(layer1);
      timeGroup.removeLayer(layer2);
      assert.equal(timeGroup.durationMs, 1000);
    });
  });

  describe("ContainerTimeMode.Fit", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Fit,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("duration is the max of child durations", () => {
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("doesn't change duration if furthest extant layer doesnt' change", () => {
      layer1.setIntrinsicDurationMs(500);
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("doesn't change if early child layers are removed", () => {
      timeGroup.removeLayer(layer1);
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("doesn't change if early child layers are added", () => {
      const layer3 = new Layer({ intrinsicDurationMs: 500 });
      timeGroup.pushLayers(layer3);
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("Doesn't change if early child layers are trimmed", () => {
      layer1.trim.setStartMs(500);
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("Changes if late child intrinsic duration changes", () => {
      layer2.setIntrinsicDurationMs(1000);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Changes if later child layers are removed", () => {
      timeGroup.removeLayer(layer2);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("Changes if later child layers are added", () => {
      const layer3 = new Layer({
        fixedStartMs: 2500,
        intrinsicDurationMs: 500,
      });
      timeGroup.pushLayers(layer3);
      assert.equal(timeGroup.durationMs, 3000);
    });

    test("Changes if later child layers are trimmed", () => {
      layer2.trim.setEndMs(500);
      assert.equal(timeGroup.durationMs, 1500);
    });

    test("Is affected by children with time mode Fill", () => {
      layer2.setTimeMode(TimeMode.Fill);
      assert.equal(timeGroup.durationMs, 1000);
    });

    test("is not affected by children with time mode Fixed", () => {
      layer2.setTimeMode(TimeMode.Fixed);
      assert.equal(timeGroup.durationMs, 2000);
    });
  });

  describe("ContainerTimeMode.Sequence", () => {
    let timeGroup: TimeGroup;
    let layer1: Layer;
    let layer2: Layer;

    beforeEach(() => {
      const composition = new LayerComposition({});
      timeGroup = new TimeGroup({
        containerTimeMode: ContainerTimeMode.Sequence,
      });

      composition.pushLayers(timeGroup);
      layer1 = new Layer({ intrinsicDurationMs: 1000 });
      layer2 = new Layer({ intrinsicDurationMs: 2000 });

      timeGroup.pushLayers(layer1, layer2);
    });

    test("duration is the sum of child durations", () => {
      assert.equal(timeGroup.durationMs, 3000);
    });

    test("responds to child duration changes", () => {
      layer1.setIntrinsicDurationMs(500);
      assert.equal(timeGroup.durationMs, 2500);
    });

    test("responds to child removal", () => {
      timeGroup.removeLayer(layer1);
      assert.equal(timeGroup.durationMs, 2000);
    });

    test("responds to child addition", () => {
      const layer3 = new Layer({ intrinsicDurationMs: 500 });
      timeGroup.pushLayers(layer3);
      assert.equal(timeGroup.durationMs, 3500);
    });

    test("responds to child trimIn changes", () => {
      layer1.trim.setStartMs(500);
      assert.equal(timeGroup.durationMs, 2500);
    });

    test("responds to child trimOut changes", () => {
      layer1.trim.setEndMs(500);
      assert.equal(timeGroup.durationMs, 2500);
    });

    test("is not affected by children with time mode Fill", () => {
      layer1.setTimeMode(TimeMode.Fill);
      assert.equal(timeGroup.durationMs, 3000);
    });

    test("is not affected by children with time mode Fixed", () => {
      layer1.setTimeMode(TimeMode.Fixed);
      assert.equal(timeGroup.durationMs, 3000);
    });
  });
});
