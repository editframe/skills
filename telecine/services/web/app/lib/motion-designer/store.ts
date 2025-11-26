import { useReducer, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import type { MotionDesignerState, ElementNode, Animation } from "./types.js";
import { motionDesignerReducer } from "./reducer.js";
import { actionCreators } from "./actions.js";
import { loadState, saveState } from "./persistence.js";

function getInitialState(): MotionDesignerState {
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

export function useMotionDesigner() {
  const [state, dispatch] = useReducer(
    motionDesignerReducer,
    getInitialState(),
  );
  const [isHydrated, setIsHydrated] = useReducer(() => true, false);

  // Load from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      const initialState = getInitialState();
      const mergedState: MotionDesignerState = {
        composition: {
          elements:
            saved.composition?.elements ?? initialState.composition.elements,
          rootTimegroupIds:
            saved.composition?.rootTimegroupIds ??
            initialState.composition.rootTimegroupIds,
        },
        ui: {
          ...initialState.ui,
          ...saved.ui,
          canvasTransform:
            saved.ui?.canvasTransform ?? initialState.ui.canvasTransform,
        },
      };
      dispatch(actionCreators.replaceState(mergedState));
    }
    setIsHydrated();
  }, []);

  // Auto-save on state changes (debounced) - only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    const timeoutId = setTimeout(() => saveState(state), 200);
    return () => clearTimeout(timeoutId);
  }, [state, isHydrated]);

  const actions = {
    selectElement: useCallback((id: string | null) => {
      dispatch(actionCreators.selectElement(id));
    }, []),

    selectAnimation: useCallback(
      (animationId: string | null, elementId: string | null) => {
        dispatch(actionCreators.selectAnimation(animationId, elementId));
      },
      [],
    ),

    addElement: useCallback(
      (element: Omit<ElementNode, "id">, parentId: string | null) => {
        dispatch(
          actionCreators.addElement({ ...element, id: nanoid() }, parentId),
        );
      },
      [],
    ),

    deleteElement: useCallback((id: string) => {
      dispatch(actionCreators.deleteElement(id));
    }, []),

    updateElement: useCallback(
      (id: string, updates: Partial<ElementNode["props"]>) => {
        dispatch(actionCreators.updateElement(id, updates));
      },
      [],
    ),

    moveElement: useCallback(
      (id: string, newParentId: string | null, newIndex?: number) => {
        dispatch(actionCreators.moveElement(id, newParentId, newIndex));
      },
      [],
    ),

    addAnimation: useCallback(
      (elementId: string, animation: Omit<Animation, "id">) => {
        dispatch(
          actionCreators.addAnimation(elementId, {
            ...animation,
            id: nanoid(),
          }),
        );
      },
      [],
    ),

    updateAnimation: useCallback(
      (elementId: string, animationId: string, updates: Partial<Animation>) => {
        dispatch(
          actionCreators.updateAnimation(elementId, animationId, updates),
        );
      },
      [],
    ),

    deleteAnimation: useCallback((elementId: string, animationId: string) => {
      dispatch(actionCreators.deleteAnimation(elementId, animationId));
    }, []),

    reorderAnimation: useCallback(
      (elementId: string, animationId: string, newIndex: number) => {
        dispatch(
          actionCreators.reorderAnimation(elementId, animationId, newIndex),
        );
      },
      [],
    ),

    setCurrentTime: useCallback((time: number) => {
      dispatch(actionCreators.setCurrentTime(time));
    }, []),

    setPlacementMode: useCallback((mode: string | null) => {
      dispatch(actionCreators.setPlacementMode(mode));
    }, []),

    updateCanvasTransform: useCallback(
      (transform: Partial<MotionDesignerState["ui"]["canvasTransform"]>) => {
        dispatch(actionCreators.updateCanvasTransform(transform));
      },
      [],
    ),

    replaceState: useCallback((newState: MotionDesignerState) => {
      dispatch(actionCreators.replaceState(newState));
    }, []),
  };

  return [state, actions, { isHydrated }] as const;
}
