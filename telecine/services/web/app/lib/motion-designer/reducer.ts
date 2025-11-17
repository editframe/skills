import type { MotionDesignerState } from "./types.js";
import type { MotionDesignerAction } from "./actions.js";
import { shallowClone, merge } from "./immutability.js";
import { validateAllInvariants } from "./invariants.js";
import { behaviorRegistry } from "./behaviors.js";
import { registerCoreBehaviors } from "./coreBehaviors.js";

// Register core behaviors on module load
registerCoreBehaviors();

function validateAndReturn(
  newState: MotionDesignerState,
  strict: boolean = false,
): MotionDesignerState {
  const validation = validateAllInvariants(newState, { strict });
  if (!validation.isValid) {
    if (strict) {
      throw new Error(
        `Invariant violation: ${validation.errors.join("; ")}`,
      );
    }
    console.warn("State validation errors:", validation.errors);
  }
  return newState;
}

function deleteElementRecursive(
  elements: Record<string, ElementNode>,
  id: string,
): void {
  const element = elements[id];
  if (!element) return;

  for (const childId of element.childIds) {
    deleteElementRecursive(elements, childId);
  }

  delete elements[id];
}

// Helper function to find the root timegroup for an element
function findRootTimegroupId(
  elementId: string,
  state: MotionDesignerState,
): string | null {
  const element = state.composition.elements[elementId];
  if (!element) return null;

  // Helper function to find parent of an element
  const findParent = (id: string): ElementNode | null => {
    for (const el of Object.values(state.composition.elements)) {
      if (el.childIds.includes(id)) {
        return el;
      }
    }
    return null;
  };

  // If element is a root timegroup, use it directly
  const isRootTimegroup = element.type === "timegroup" && 
    state.composition.rootTimegroupIds.includes(element.id);
  
  if (isRootTimegroup) {
    return element.id;
  }

  // Otherwise, find the root timegroup ancestor by traversing up the tree
  let currentElement: ElementNode | null = element;
  
  while (currentElement) {
    // Check if current element is a root timegroup
    if (currentElement.type === "timegroup" && 
        state.composition.rootTimegroupIds.includes(currentElement.id)) {
      return currentElement.id;
    }
    
    // Find parent
    const parent = findParent(currentElement.id);
    if (!parent) {
      // No parent found, stop searching
      break;
    }
    currentElement = parent;
  }
  
  return null;
}

export function motionDesignerReducer(
  state: MotionDesignerState,
  action: MotionDesignerAction,
): MotionDesignerState {
  switch (action.type) {
    case "SELECT_ELEMENT": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.selectedElementId = action.payload.id;

      // Automatically set active root timegroup based on selected element
      if (action.payload.id) {
        newState.ui.activeRootTimegroupId = findRootTimegroupId(action.payload.id, state);
      } else {
        newState.ui.activeRootTimegroupId = null;
      }

      return newState;
    }

    case "SELECT_ANIMATION": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.selectedAnimationId = action.payload.animationId;

      if (action.payload.elementId !== null) {
        newState.ui.selectedElementId = action.payload.elementId;
        // Also set active root timegroup for the selected element
        newState.ui.activeRootTimegroupId = findRootTimegroupId(action.payload.elementId, state);
      }

      return newState;
    }

    case "ADD_ELEMENT": {
      const { element, parentId } = action.payload;

      if (element.type === "timegroup" && parentId !== null) {
        console.warn(
          "Cannot add nested timegroups. Timegroups must be at root level.",
        );
        return state;
      }

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      newElements[element.id] = { ...element, parentId };

      if (parentId === null) {
        newState.composition.elements = newElements;
        newState.composition.rootTimegroupIds = [
          ...newState.composition.rootTimegroupIds,
          element.id,
        ];
      } else {
        const parent = newElements[parentId];
        if (parent) {
          const updatedParent = {
            ...parent,
            childIds: [...parent.childIds, element.id],
          };
          newElements[parentId] = updatedParent;
        }
        newState.composition.elements = newElements;
      }

      return validateAndReturn(newState);
    }

    case "DELETE_ELEMENT": {
      const { id } = action.payload;
      const element = state.composition.elements[id];
      if (!element) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      newState.ui = shallowClone(state.ui);
      const newElements = { ...state.composition.elements };
      deleteElementRecursive(newElements, id);

      let newRootTimegroupIds = state.composition.rootTimegroupIds;
      if (element.parentId) {
        const parent = newElements[element.parentId];
        if (parent) {
          const updatedParent = {
            ...parent,
            childIds: parent.childIds.filter((childId) => childId !== id),
          };
          newElements[element.parentId] = updatedParent;
        }
      } else {
        newRootTimegroupIds = state.composition.rootTimegroupIds.filter(
          (rootId) => rootId !== id,
        );
      }

      newState.composition.elements = newElements;
      newState.composition.rootTimegroupIds = newRootTimegroupIds;

      if (newState.ui.selectedElementId === id) {
        newState.ui.selectedElementId = null;
      }

      return validateAndReturn(newState);
    }

    case "UPDATE_ELEMENT": {
      const { id, updates } = action.payload;
      const element = state.composition.elements[id];
      if (!element) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      
      // For "size" prop, replace completely instead of merging
      // because it can be either legacy format {width, height} or new format {widthMode, widthValue, ...}
      let mergedProps;
      if (updates.size !== undefined) {
        mergedProps = { ...element.props, size: updates.size };
        const { size: _, ...restUpdates } = updates;
        mergedProps = merge(mergedProps, restUpdates);
      } else {
        mergedProps = merge(element.props, updates);
      }
      
      newElements[id] = {
        ...element,
        props: mergedProps,
      };

      newState.composition.elements = newElements;
      return newState;
    }

    case "MOVE_ELEMENT": {
      const { id, newParentId, newIndex } = action.payload;
      const element = state.composition.elements[id];
      if (!element) return state;

      // Check if move is allowed by registered behaviors
      if (!behaviorRegistry.canMove(id, newParentId, newIndex, state)) {
        console.warn(
          `Move operation rejected by behavior system: element ${id} cannot move to parent ${newParentId ?? "root"} at index ${newIndex ?? "end"}`,
        );
        return state;
      }

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };

      if (element.parentId) {
        const oldParent = newElements[element.parentId];
        if (oldParent) {
          newElements[element.parentId] = {
            ...oldParent,
            childIds: oldParent.childIds.filter((childId) => childId !== id),
          };
        }
      }

      const updatedElement = { ...element, parentId: newParentId };
      newElements[id] = updatedElement;

      let newRootTimegroupIds = state.composition.rootTimegroupIds;
      if (newParentId === null) {
        if (element.parentId !== null) {
          newRootTimegroupIds = state.composition.rootTimegroupIds.filter(
            (rootId) => rootId !== id,
          );
        }
        if (newIndex !== undefined) {
          newRootTimegroupIds = [...newRootTimegroupIds];
          newRootTimegroupIds.splice(newIndex, 0, id);
        } else {
          newRootTimegroupIds = [...newRootTimegroupIds, id];
        }
      } else {
        if (element.parentId === null) {
          newRootTimegroupIds = state.composition.rootTimegroupIds.filter(
            (rootId) => rootId !== id,
          );
        }
        const newParent = newElements[newParentId];
        if (newParent) {
          const childIds = newParent.childIds.filter(
            (childId) => childId !== id,
          );
          if (newIndex !== undefined) {
            childIds.splice(newIndex, 0, id);
          } else {
            childIds.push(id);
          }
          newElements[newParentId] = {
            ...newParent,
            childIds,
          };
        }
      }

      newState.composition.elements = newElements;
      newState.composition.rootTimegroupIds = newRootTimegroupIds;

      const validatedState = validateAndReturn(newState);

      // Call onMove callbacks for registered behaviors
      behaviorRegistry.onMove(id, newParentId, newIndex, validatedState).catch(
        (error) => {
          console.error("Error in behavior onMove callbacks:", error);
        },
      );

      return validatedState;
    }

    case "ADD_ANIMATION": {
      const { elementId, animation } = action.payload;
      const element = state.composition.elements[elementId];
      if (!element) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      newElements[elementId] = {
        ...element,
        animations: [...element.animations, animation],
      };

      newState.composition.elements = newElements;
      return newState;
    }

    case "UPDATE_ANIMATION": {
      const { elementId, animationId, updates } = action.payload;
      const element = state.composition.elements[elementId];
      if (!element) return state;

      const animationIndex = element.animations.findIndex(
        (a) => a.id === animationId,
      );
      if (animationIndex === -1) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      const updatedAnimations = [...element.animations];
      const existingAnimation = updatedAnimations[animationIndex];
      if (!existingAnimation) return state;
      updatedAnimations[animationIndex] = {
        ...existingAnimation,
        ...updates,
      };

      newElements[elementId] = {
        ...element,
        animations: updatedAnimations,
      };

      newState.composition.elements = newElements;
      return newState;
    }

    case "DELETE_ANIMATION": {
      const { elementId, animationId } = action.payload;
      const element = state.composition.elements[elementId];
      if (!element) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      newElements[elementId] = {
        ...element,
        animations: element.animations.filter((a) => a.id !== animationId),
      };

      newState.composition.elements = newElements;
      return newState;
    }

    case "REORDER_ANIMATION": {
      const { elementId, animationId, newIndex } = action.payload;
      const element = state.composition.elements[elementId];
      if (!element) return state;

      const currentIndex = element.animations.findIndex(
        (a) => a.id === animationId,
      );
      if (currentIndex === -1) return state;

      const animation = element.animations[currentIndex];
      if (!animation) return state;

      const newState = shallowClone(state);
      newState.composition = shallowClone(state.composition);
      const newElements = { ...newState.composition.elements };
      const updatedAnimations = [...element.animations];
      updatedAnimations.splice(currentIndex, 1);
      updatedAnimations.splice(newIndex, 0, animation);

      newElements[elementId] = {
        ...element,
        animations: updatedAnimations,
      };

      newState.composition.elements = newElements;
      return newState;
    }

    case "SET_CURRENT_TIME": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.currentTime = action.payload.time;
      return newState;
    }

    case "SET_PLACEMENT_MODE": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.placementMode = action.payload.mode;
      return newState;
    }

    case "SET_ACTIVE_ROOT_TIMEGROUP": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.activeRootTimegroupId = action.payload.id;
      return newState;
    }

    case "UPDATE_CANVAS_TRANSFORM": {
      const newState = shallowClone(state);
      newState.ui = shallowClone(state.ui);
      newState.ui.canvasTransform = merge(
        state.ui.canvasTransform,
        action.payload.transform,
      );
      return newState;
    }

    case "REPLACE_STATE": {
      return { ...action.payload.newState };
    }

    default: {
      return state;
    }
  }
}

