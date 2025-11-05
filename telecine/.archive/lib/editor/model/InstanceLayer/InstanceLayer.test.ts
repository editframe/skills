import { Editor } from "../Editor";
import { Layer } from "../Layer";
import { InstanceLayer } from "./InstanceLayer";

let editor: Editor = new Editor({});

describe.skip("InstanceLayer", () => {
  beforeEach(() => {
    editor = new Editor({});
  });

  describe("createFromLayer", () => {
    it("Throws an error if the layer is not a component", () => {
      const layer = new Layer({});
      expect(() => InstanceLayer.createFromLayer(layer)).toThrow();
    });

    it("Connects the instance to its component", () => {
      const component = new Layer({ isComponent: true });
      editor.composition.pushLayers(component);
      const instance = InstanceLayer.createFromLayer(component);
      assert.strictEqual(instance.component, component);
    });
  });

  describe.skip("Video instance", () => {});
});
