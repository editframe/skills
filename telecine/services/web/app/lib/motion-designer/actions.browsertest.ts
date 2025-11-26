import { describe, test, expect } from "vitest";
import { actionCreators } from "./actions.js";
import type { MotionDesignerAction } from "./actions.js";
import type { ElementNode, Animation } from "./types.js";

function createTimegroup(id: string): ElementNode {
  return {
    id,
    type: "timegroup",
    parentId: null,
    childIds: [],
    animations: [],
    props: {},
  };
}

function createAnimation(id: string): Animation {
  return {
    id,
    name: "Test Animation",
    property: "opacity",
    keyframes: [],
    duration: 1000,
    delay: 0,
    easing: "ease",
  };
}

describe("actionCreators", () => {
  describe("selectElement", () => {
    test("creates SELECT_ELEMENT action", () => {
      const action = actionCreators.selectElement("element1");

      expect(action).toEqual({
        type: "SELECT_ELEMENT",
        payload: { id: "element1" },
      });
    });

    test("handles null id", () => {
      const action = actionCreators.selectElement(null);

      expect(action.payload.id).toBeNull();
    });
  });

  describe("selectAnimation", () => {
    test("creates SELECT_ANIMATION action", () => {
      const action = actionCreators.selectAnimation("anim1", "element1");

      expect(action).toEqual({
        type: "SELECT_ANIMATION",
        payload: { animationId: "anim1", elementId: "element1" },
      });
    });
  });

  describe("addElement", () => {
    test("creates ADD_ELEMENT action", () => {
      const element = createTimegroup("tg1");
      const action = actionCreators.addElement(element, null);

      expect(action.type).toBe("ADD_ELEMENT");
      expect(action.payload.element).toBe(element);
      expect(action.payload.parentId).toBeNull();
    });
  });

  describe("deleteElement", () => {
    test("creates DELETE_ELEMENT action", () => {
      const action = actionCreators.deleteElement("element1");

      expect(action).toEqual({
        type: "DELETE_ELEMENT",
        payload: { id: "element1" },
      });
    });
  });

  describe("updateElement", () => {
    test("creates UPDATE_ELEMENT action", () => {
      const updates = { opacity: 0.5 };
      const action = actionCreators.updateElement("element1", updates);

      expect(action.type).toBe("UPDATE_ELEMENT");
      expect(action.payload.id).toBe("element1");
      expect(action.payload.updates).toBe(updates);
    });
  });

  describe("moveElement", () => {
    test("creates MOVE_ELEMENT action", () => {
      const action = actionCreators.moveElement("element1", "parent1", 0);

      expect(action.type).toBe("MOVE_ELEMENT");
      expect(action.payload.id).toBe("element1");
      expect(action.payload.newParentId).toBe("parent1");
      expect(action.payload.newIndex).toBe(0);
    });

    test("handles optional newIndex", () => {
      const action = actionCreators.moveElement("element1", "parent1");

      expect(action.payload.newIndex).toBeUndefined();
    });
  });

  describe("addAnimation", () => {
    test("creates ADD_ANIMATION action", () => {
      const animation = createAnimation("anim1");
      const action = actionCreators.addAnimation("element1", animation);

      expect(action.type).toBe("ADD_ANIMATION");
      expect(action.payload.elementId).toBe("element1");
      expect(action.payload.animation).toBe(animation);
    });
  });

  describe("updateAnimation", () => {
    test("creates UPDATE_ANIMATION action", () => {
      const updates = { duration: 2000 };
      const action = actionCreators.updateAnimation(
        "element1",
        "anim1",
        updates,
      );

      expect(action.type).toBe("UPDATE_ANIMATION");
      expect(action.payload.elementId).toBe("element1");
      expect(action.payload.animationId).toBe("anim1");
      expect(action.payload.updates).toBe(updates);
    });
  });

  describe("deleteAnimation", () => {
    test("creates DELETE_ANIMATION action", () => {
      const action = actionCreators.deleteAnimation("element1", "anim1");

      expect(action).toEqual({
        type: "DELETE_ANIMATION",
        payload: { elementId: "element1", animationId: "anim1" },
      });
    });
  });

  describe("reorderAnimation", () => {
    test("creates REORDER_ANIMATION action", () => {
      const action = actionCreators.reorderAnimation("element1", "anim1", 2);

      expect(action.type).toBe("REORDER_ANIMATION");
      expect(action.payload.elementId).toBe("element1");
      expect(action.payload.animationId).toBe("anim1");
      expect(action.payload.newIndex).toBe(2);
    });
  });

  describe("setActiveRootTimegroup", () => {
    test("creates SET_ACTIVE_ROOT_TIMEGROUP action", () => {
      const action = actionCreators.setActiveRootTimegroup("tg1");

      expect(action).toEqual({
        type: "SET_ACTIVE_ROOT_TIMEGROUP",
        payload: { id: "tg1" },
      });
    });
  });

  describe("setCurrentTime", () => {
    test("creates SET_CURRENT_TIME action", () => {
      const action = actionCreators.setCurrentTime(5000);

      expect(action).toEqual({
        type: "SET_CURRENT_TIME",
        payload: { time: 5000 },
      });
    });
  });

  describe("setPlacementMode", () => {
    test("creates SET_PLACEMENT_MODE action", () => {
      const action = actionCreators.setPlacementMode("text");

      expect(action).toEqual({
        type: "SET_PLACEMENT_MODE",
        payload: { mode: "text" },
      });
    });
  });

  describe("updateCanvasTransform", () => {
    test("creates UPDATE_CANVAS_TRANSFORM action", () => {
      const transform = { scale: 2 };
      const action = actionCreators.updateCanvasTransform(transform);

      expect(action.type).toBe("UPDATE_CANVAS_TRANSFORM");
      expect(action.payload.transform).toBe(transform);
    });
  });

  describe("replaceState", () => {
    test("creates REPLACE_STATE action", () => {
      const newState = {
        composition: { elements: {}, rootTimegroupIds: [] },
        ui: {
          selectedElementId: null,
          selectedAnimationId: null,
          currentTime: 0,
          placementMode: null,
          canvasTransform: { x: 0, y: 0, scale: 1 },
        },
      };

      const action = actionCreators.replaceState(newState);

      expect(action.type).toBe("REPLACE_STATE");
      expect(action.payload.newState).toBe(newState);
    });
  });

  describe("action type safety", () => {
    test("all actions have correct type", () => {
      const actions: MotionDesignerAction[] = [
        actionCreators.selectElement("id"),
        actionCreators.selectAnimation("anim", "elem"),
        actionCreators.addElement(createTimegroup("tg1"), null),
        actionCreators.deleteElement("id"),
        actionCreators.updateElement("id", {}),
        actionCreators.moveElement("id", "parent"),
        actionCreators.addAnimation("elem", createAnimation("anim")),
        actionCreators.updateAnimation("elem", "anim", {}),
        actionCreators.deleteAnimation("elem", "anim"),
        actionCreators.reorderAnimation("elem", "anim", 0),
        actionCreators.setActiveRootTimegroup("id"),
        actionCreators.setCurrentTime(0),
        actionCreators.setPlacementMode("text"),
        actionCreators.updateCanvasTransform({}),
        actionCreators.replaceState({
          composition: { elements: {}, rootTimegroupIds: [] },
          ui: {
            selectedElementId: null,
            selectedAnimationId: null,
            currentTime: 0,
            placementMode: null,
            canvasTransform: { x: 0, y: 0, scale: 1 },
          },
        }),
      ];

      expect(actions.length).toBeGreaterThan(0);
      actions.forEach((action) => {
        expect(action).toHaveProperty("type");
        expect(action).toHaveProperty("payload");
      });
    });
  });
});
