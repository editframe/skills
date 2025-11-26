import { describe, test, expect } from "vitest";
import { motionDesignerReducer } from "./reducer.js";
import { actionCreators } from "./actions.js";
import type { MotionDesignerState, ElementNode } from "./types.js";
import { getActiveRootTimegroupId } from "./utils.js";
import { nanoid } from "nanoid";

function createInitialState(): MotionDesignerState {
  return {
    composition: {
      elements: {},
      rootTimegroupIds: [],
    },
    ui: {
      selectedElementId: null,
      selectedAnimationId: null,
      currentTime: 0,
      placementMode: null,
      canvasTransform: { x: 0, y: 0, scale: 1 },
    },
  };
}

function createTimegroup(
  id: string,
  parentId: string | null = null,
): ElementNode {
  return {
    id,
    type: "timegroup",
    parentId,
    childIds: [],
    animations: [],
    props: {},
  };
}

function createTextElement(id: string, parentId: string | null): ElementNode {
  return {
    id,
    type: "text",
    parentId,
    childIds: [],
    animations: [],
    props: { content: "Test" },
  };
}

describe("motionDesignerReducer", () => {
  describe("SELECT_ELEMENT", () => {
    test("sets selectedElementId", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.selectElement("tg1"),
      );

      expect(newState.ui.selectedElementId).toBe("tg1");
      expect(getActiveRootTimegroupId(newState)).toBe("tg1");
      expect(state.ui.selectedElementId).toBeNull();
    });

    test("clears selection when null", () => {
      const state = createInitialState();
      state.ui.selectedElementId = "tg1";

      const newState = motionDesignerReducer(
        state,
        actionCreators.selectElement(null),
      );

      expect(newState.ui.selectedElementId).toBeNull();
    });

    test("computes activeRootTimegroupId when selecting nested element", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      tg1.childIds = ["text1"];
      state.composition.elements = { tg1, text1 };
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.selectElement("text1"),
      );

      expect(newState.ui.selectedElementId).toBe("text1");
      expect(getActiveRootTimegroupId(newState)).toBe("tg1");
    });
  });

  describe("SELECT_ANIMATION", () => {
    test("sets selectedAnimationId and elementId", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.selectAnimation("anim1", "tg1"),
      );

      expect(newState.ui.selectedAnimationId).toBe("anim1");
      expect(newState.ui.selectedElementId).toBe("tg1");
      expect(getActiveRootTimegroupId(newState)).toBe("tg1");
    });
  });

  describe("ADD_ELEMENT", () => {
    test("adds root timegroup", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(tg1, null),
      );

      expect(newState.composition.elements["tg1"]).toBeDefined();
      expect(newState.composition.rootTimegroupIds).toContain("tg1");
      expect(newState.composition.elements["tg1"].parentId).toBeNull();
    });

    test("adds non-timegroup element as root", () => {
      const state = createInitialState();
      const text1 = createTextElement("text1", null);

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(text1, null),
      );

      expect(newState.composition.elements["text1"]).toBeDefined();
      expect(newState.composition.rootTimegroupIds).toContain("text1");
      expect(newState.composition.elements["text1"].parentId).toBeNull();
    });

    test("adds element to parent", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(text1, "tg1"),
      );

      expect(newState.composition.elements["text1"]).toBeDefined();
      expect(newState.composition.elements["tg1"].childIds).toContain("text1");
      expect(newState.composition.elements["text1"].parentId).toBe("tg1");
    });

    test("rejects nested timegroup", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const tg2 = createTimegroup("tg2");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(tg2, "tg1"),
      );

      expect(newState.composition.elements["tg2"]).toBeUndefined();
      expect(newState).toBe(state);
    });

    test("maintains immutability", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(tg1, null),
      );

      expect(newState).not.toBe(state);
      expect(newState.composition).not.toBe(state.composition);
      expect(newState.composition.elements).not.toBe(
        state.composition.elements,
      );
    });
  });

  describe("DELETE_ELEMENT", () => {
    test("deletes element and removes from parent", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      tg1.childIds = ["text1"];
      state.composition.elements = { tg1, text1 };
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteElement("text1"),
      );

      expect(newState.composition.elements["text1"]).toBeUndefined();
      expect(newState.composition.elements["tg1"].childIds).not.toContain(
        "text1",
      );
    });

    test("deletes root timegroup", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteElement("tg1"),
      );

      expect(newState.composition.elements["tg1"]).toBeUndefined();
      expect(newState.composition.rootTimegroupIds).not.toContain("tg1");
    });

    test("deletes recursively", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      const text2 = createTextElement("text2", "text1");
      tg1.childIds = ["text1"];
      text1.childIds = ["text2"];
      state.composition.elements = { tg1, text1, text2 };
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteElement("text1"),
      );

      expect(newState.composition.elements["text1"]).toBeUndefined();
      expect(newState.composition.elements["text2"]).toBeUndefined();
    });

    test("clears selection if deleted element was selected", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];
      state.ui.selectedElementId = "tg1";

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteElement("tg1"),
      );

      expect(newState.ui.selectedElementId).toBeNull();
    });
  });

  describe("UPDATE_ELEMENT", () => {
    test("updates element props", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      tg1.props = { opacity: 0.5 };
      state.composition.elements["tg1"] = tg1;

      const newState = motionDesignerReducer(
        state,
        actionCreators.updateElement("tg1", { opacity: 0.8 }),
      );

      expect(newState.composition.elements["tg1"].props.opacity).toBe(0.8);
      expect(newState.composition.elements["tg1"].props).not.toBe(tg1.props);
    });

    test("merges props without replacing", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      tg1.props = { opacity: 0.5, position: { x: 10, y: 20 } };
      state.composition.elements["tg1"] = tg1;

      const newState = motionDesignerReducer(
        state,
        actionCreators.updateElement("tg1", { opacity: 0.8 }),
      );

      expect(newState.composition.elements["tg1"].props.opacity).toBe(0.8);
      expect(newState.composition.elements["tg1"].props.position).toEqual({
        x: 10,
        y: 20,
      });
    });
  });

  describe("MOVE_ELEMENT", () => {
    test("moves element to new parent", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const tg2 = createTimegroup("tg2");
      const text1 = createTextElement("text1", "tg1");
      tg1.childIds = ["text1"];
      state.composition.elements = { tg1, tg2, text1 };
      state.composition.rootTimegroupIds = ["tg1", "tg2"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.moveElement("text1", "tg2"),
      );

      expect(newState.composition.elements["text1"].parentId).toBe("tg2");
      expect(newState.composition.elements["tg1"].childIds).not.toContain(
        "text1",
      );
      expect(newState.composition.elements["tg2"].childIds).toContain("text1");
    });

    test("moves element to root", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      tg1.childIds = ["text1"];
      state.composition.elements = { tg1, text1 };
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.moveElement("text1", null),
      );

      expect(newState.composition.elements["text1"].parentId).toBeNull();
      expect(newState.composition.rootTimegroupIds).toContain("text1");
    });
  });

  describe("ADD_ANIMATION", () => {
    test("adds animation to element", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;

      const animation = {
        id: "anim1",
        name: "Fade in",
        property: "opacity",
        keyframes: [],
        duration: 1000,
        delay: 0,
        easing: "ease-in-out",
      };

      const newState = motionDesignerReducer(
        state,
        actionCreators.addAnimation("tg1", animation),
      );

      expect(newState.composition.elements["tg1"].animations).toContain(
        animation,
      );
      expect(newState.composition.elements["tg1"].animations.length).toBe(1);
    });
  });

  describe("UPDATE_ANIMATION", () => {
    test("updates animation properties", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      tg1.animations = [
        {
          id: "anim1",
          name: "Fade in",
          property: "opacity",
          keyframes: [],
          duration: 1000,
          delay: 0,
          easing: "ease-in-out",
        },
      ];
      state.composition.elements["tg1"] = tg1;

      const newState = motionDesignerReducer(
        state,
        actionCreators.updateAnimation("tg1", "anim1", { duration: 2000 }),
      );

      expect(newState.composition.elements["tg1"].animations[0].duration).toBe(
        2000,
      );
      expect(newState.composition.elements["tg1"].animations[0].name).toBe(
        "Fade in",
      );
    });
  });

  describe("DELETE_ANIMATION", () => {
    test("removes animation from element", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      tg1.animations = [
        {
          id: "anim1",
          name: "Fade in",
          property: "opacity",
          keyframes: [],
          duration: 1000,
          delay: 0,
          easing: "ease-in-out",
        },
      ];
      state.composition.elements["tg1"] = tg1;

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteAnimation("tg1", "anim1"),
      );

      expect(newState.composition.elements["tg1"].animations.length).toBe(0);
    });
  });

  describe("REORDER_ANIMATION", () => {
    test("reorders animations", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      tg1.animations = [
        {
          id: "anim1",
          name: "Anim 1",
          property: "opacity",
          keyframes: [],
          duration: 1000,
          delay: 0,
          easing: "ease",
        },
        {
          id: "anim2",
          name: "Anim 2",
          property: "opacity",
          keyframes: [],
          duration: 1000,
          delay: 0,
          easing: "ease",
        },
      ];
      state.composition.elements["tg1"] = tg1;

      const newState = motionDesignerReducer(
        state,
        actionCreators.reorderAnimation("tg1", "anim2", 0),
      );

      expect(newState.composition.elements["tg1"].animations[0].id).toBe(
        "anim2",
      );
      expect(newState.composition.elements["tg1"].animations[1].id).toBe(
        "anim1",
      );
    });
  });

  describe("UI actions", () => {
    test("SET_CURRENT_TIME", () => {
      const state = createInitialState();
      const newState = motionDesignerReducer(
        state,
        actionCreators.setCurrentTime(5000),
      );

      expect(newState.ui.currentTime).toBe(5000);
      expect(state.ui.currentTime).toBe(0);
    });

    test("SET_PLACEMENT_MODE", () => {
      const state = createInitialState();
      const newState = motionDesignerReducer(
        state,
        actionCreators.setPlacementMode("text"),
      );

      expect(newState.ui.placementMode).toBe("text");
      expect(state.ui.placementMode).toBeNull();
    });

    test("UPDATE_CANVAS_TRANSFORM", () => {
      const state = createInitialState();
      const newState = motionDesignerReducer(
        state,
        actionCreators.updateCanvasTransform({ scale: 2 }),
      );

      expect(newState.ui.canvasTransform.scale).toBe(2);
      expect(newState.ui.canvasTransform.x).toBe(0);
      expect(newState.ui.canvasTransform.y).toBe(0);
    });
  });

  describe("REPLACE_STATE", () => {
    test("replaces entire state", () => {
      const state = createInitialState();
      const newStateData: MotionDesignerState = {
        composition: {
          elements: { tg1: createTimegroup("tg1") },
          rootTimegroupIds: ["tg1"],
        },
        ui: {
          selectedElementId: "tg1",
          selectedAnimationId: null,
          currentTime: 1000,
          placementMode: null,
          canvasTransform: { x: 10, y: 20, scale: 1.5 },
        },
      };

      const newState = motionDesignerReducer(
        state,
        actionCreators.replaceState(newStateData),
      );

      expect(newState).toEqual(newStateData);
      expect(newState).not.toBe(state);
    });
  });

  describe("invariant validation", () => {
    test("validates state after ADD_ELEMENT", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");

      const newState = motionDesignerReducer(
        state,
        actionCreators.addElement(tg1, null),
      );

      expect(newState.composition.elements["tg1"]).toBeDefined();
      expect(newState.composition.rootTimegroupIds).toContain("tg1");
    });

    test("validates state after DELETE_ELEMENT", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];

      const newState = motionDesignerReducer(
        state,
        actionCreators.deleteElement("tg1"),
      );

      expect(newState.composition.elements["tg1"]).toBeUndefined();
      expect(newState.composition.rootTimegroupIds).not.toContain("tg1");
    });
  });

  describe("getActiveRootTimegroupId utility", () => {
    test("returns null when no element is selected", () => {
      const state = createInitialState();
      expect(getActiveRootTimegroupId(state)).toBeNull();
    });

    test("returns timegroup id when timegroup is selected", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      state.composition.elements["tg1"] = tg1;
      state.composition.rootTimegroupIds = ["tg1"];
      state.ui.selectedElementId = "tg1";

      expect(getActiveRootTimegroupId(state)).toBe("tg1");
    });

    test("returns timegroup id when child of timegroup is selected", () => {
      const state = createInitialState();
      const tg1 = createTimegroup("tg1");
      const text1 = createTextElement("text1", "tg1");
      tg1.childIds = ["text1"];
      state.composition.elements = { tg1, text1 };
      state.composition.rootTimegroupIds = ["tg1"];
      state.ui.selectedElementId = "text1";

      expect(getActiveRootTimegroupId(state)).toBe("tg1");
    });

    test("returns null when non-timegroup root is selected", () => {
      const state = createInitialState();
      const text1 = createTextElement("text1", null);
      state.composition.elements["text1"] = text1;
      state.composition.rootTimegroupIds = ["text1"];
      state.ui.selectedElementId = "text1";

      expect(getActiveRootTimegroupId(state)).toBeNull();
    });
  });
});
