import type { MotionDesignerState, ElementNode, Animation } from "./types.js";

export type MotionDesignerAction =
  | { type: "SELECT_ELEMENT"; payload: { id: string | null } }
  | {
      type: "SELECT_ANIMATION";
      payload: { animationId: string | null; elementId: string | null };
    }
  | {
      type: "ADD_ELEMENT";
      payload: { element: ElementNode; parentId: string | null };
    }
  | { type: "DELETE_ELEMENT"; payload: { id: string } }
  | {
      type: "UPDATE_ELEMENT";
      payload: { id: string; updates: Partial<ElementNode["props"]> };
    }
  | {
      type: "MOVE_ELEMENT";
      payload: {
        id: string;
        newParentId: string | null;
        newIndex?: number;
      };
    }
  | {
      type: "ADD_ANIMATION";
      payload: { elementId: string; animation: Animation };
    }
  | {
      type: "UPDATE_ANIMATION";
      payload: {
        elementId: string;
        animationId: string;
        updates: Partial<Animation>;
      };
    }
  | {
      type: "DELETE_ANIMATION";
      payload: { elementId: string; animationId: string };
    }
  | {
      type: "REORDER_ANIMATION";
      payload: {
        elementId: string;
        animationId: string;
        newIndex: number;
      };
    }
  | { type: "SET_CURRENT_TIME"; payload: { time: number } }
  | { type: "SET_PLACEMENT_MODE"; payload: { mode: string | null } }
  | {
      type: "UPDATE_CANVAS_TRANSFORM";
      payload: {
        transform: Partial<MotionDesignerState["ui"]["canvasTransform"]>;
      };
    }
  | { type: "REPLACE_STATE"; payload: { newState: MotionDesignerState } };

export const actionCreators = {
  selectElement: (id: string | null): MotionDesignerAction => ({
    type: "SELECT_ELEMENT",
    payload: { id },
  }),

  selectAnimation: (
    animationId: string | null,
    elementId: string | null,
  ): MotionDesignerAction => ({
    type: "SELECT_ANIMATION",
    payload: { animationId, elementId },
  }),

  addElement: (
    element: ElementNode,
    parentId: string | null,
  ): MotionDesignerAction => ({
    type: "ADD_ELEMENT",
    payload: { element, parentId },
  }),

  deleteElement: (id: string): MotionDesignerAction => ({
    type: "DELETE_ELEMENT",
    payload: { id },
  }),

  updateElement: (
    id: string,
    updates: Partial<ElementNode["props"]>,
  ): MotionDesignerAction => ({
    type: "UPDATE_ELEMENT",
    payload: { id, updates },
  }),

  moveElement: (
    id: string,
    newParentId: string | null,
    newIndex?: number,
  ): MotionDesignerAction => ({
    type: "MOVE_ELEMENT",
    payload: { id, newParentId, newIndex },
  }),

  addAnimation: (
    elementId: string,
    animation: Animation,
  ): MotionDesignerAction => ({
    type: "ADD_ANIMATION",
    payload: { elementId, animation },
  }),

  updateAnimation: (
    elementId: string,
    animationId: string,
    updates: Partial<Animation>,
  ): MotionDesignerAction => ({
    type: "UPDATE_ANIMATION",
    payload: { elementId, animationId, updates },
  }),

  deleteAnimation: (
    elementId: string,
    animationId: string,
  ): MotionDesignerAction => ({
    type: "DELETE_ANIMATION",
    payload: { elementId, animationId },
  }),

  reorderAnimation: (
    elementId: string,
    animationId: string,
    newIndex: number,
  ): MotionDesignerAction => ({
    type: "REORDER_ANIMATION",
    payload: { elementId, animationId, newIndex },
  }),

  setCurrentTime: (time: number): MotionDesignerAction => ({
    type: "SET_CURRENT_TIME",
    payload: { time },
  }),

  setPlacementMode: (mode: string | null): MotionDesignerAction => ({
    type: "SET_PLACEMENT_MODE",
    payload: { mode },
  }),

  updateCanvasTransform: (
    transform: Partial<MotionDesignerState["ui"]["canvasTransform"]>,
  ): MotionDesignerAction => ({
    type: "UPDATE_CANVAS_TRANSFORM",
    payload: { transform },
  }),

  replaceState: (newState: MotionDesignerState): MotionDesignerAction => ({
    type: "REPLACE_STATE",
    payload: { newState },
  }),
};
