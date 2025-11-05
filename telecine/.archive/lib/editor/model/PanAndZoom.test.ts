import { describe, it, assert, beforeEach } from "vitest";
import { PanAndZoom } from "./PanAndZoom";

describe("PanAndZoom", () => {
  beforeEach(() => {
    localStorage.removeItem(PanAndZoom.LOCAL_STORAGE_KEY);
  });

  it("initializes with defaults", () => {
    const panAndZoom = new PanAndZoom({});
    assert.equal(panAndZoom.cssTransform, "translate(0px, 0px) scale(1)");
  });

  it("sets transform with a model action", () => {
    const panAndZoom = new PanAndZoom({});
    panAndZoom.setTransform({
      zoom: 3,
      translateX: 200,
      translateY: 200,
    });
    assert.equal(panAndZoom.cssTransform, "translate(200px, 200px) scale(3)");
  });

  /**
   * This test verifies that the pan and zoom values are persisted between instances.
   * Currently this is done with localStorage, but the implementation could change.
   * */
  it("persists transform", () => {
    const panAndZoom = new PanAndZoom({});
    panAndZoom.setTransform({
      zoom: 4,
      translateX: 300,
      translateY: 300,
    });

    const panAndZoom2 = new PanAndZoom({});
    assert.equal(panAndZoom2.cssTransform, "translate(300px, 300px) scale(4)");
  });
});
