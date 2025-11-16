import type { MotionDesignerState, ElementNode } from "./types.js";
import type { MoveBehavior } from "./behaviors.js";
import { behaviorRegistry } from "./behaviors.js";
import { isTemporalElement } from "./temporalUtils.js";

/**
 * Helper to check if an element is a descendant of another element.
 */
function isDescendant(
  ancestorId: string,
  descendantId: string,
  state: MotionDesignerState,
): boolean {
  const ancestor = state.composition.elements[ancestorId];
  if (!ancestor) return false;

  if (ancestor.childIds.includes(descendantId)) return true;

  for (const childId of ancestor.childIds) {
    if (isDescendant(childId, descendantId, state)) return true;
  }

  return false;
}

/**
 * Helper to find the parent of an element.
 */
function findParent(
  elementId: string,
  state: MotionDesignerState,
): ElementNode | null {
  for (const element of Object.values(state.composition.elements)) {
    if (element.childIds.includes(elementId)) {
      return element;
    }
  }
  return null;
}

/**
 * Prevents moving an element into its own descendants (circular reference).
 */
const PreventCircularReference: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    if (newParentId === null) {
      return true;
    }

    if (isDescendant(elementId, newParentId, state)) {
      return false;
    }

    return true;
  },
};

/**
 * Ensures timegroups remain at root level only.
 */
const TimegroupRootOnly: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    const element = state.composition.elements[elementId];
    if (!element) return false;

    if (element.type === "timegroup") {
      if (newParentId !== null) {
        return false;
      }
    }

    return true;
  },
};

/**
 * Allows div elements to accept children.
 * This behavior doesn't need to reject moves - it's just documenting that divs can have children.
 */
const DivCanHaveChildren: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    if (newParentId === null) {
      return true;
    }

    const newParent = state.composition.elements[newParentId];
    if (!newParent) return false;

    if (newParent.type === "div") {
      return true;
    }

    return true;
  },
};

/**
 * Allows temporal elements to move to root context.
 */
const TemporalCanMoveToRoot: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    const element = state.composition.elements[elementId];
    if (!element) return false;

    if (isTemporalElement(element)) {
      if (newParentId === null) {
        return true;
      }
    }

    return true;
  },
};

/**
 * Ensures non-temporal elements can only be children of timegroups (or root if temporal).
 */
const NonTemporalInTimegroup: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    const element = state.composition.elements[elementId];
    if (!element) return false;

    if (!isTemporalElement(element)) {
      if (newParentId === null) {
        return false;
      }

      const newParent = state.composition.elements[newParentId];
      if (!newParent) return false;

      if (newParent.type !== "timegroup") {
        return false;
      }
    }

    return true;
  },
};

/**
 * Registers all core behaviors with the default registry.
 */
export function registerCoreBehaviors(): void {
  behaviorRegistry.register("PreventCircularReference", PreventCircularReference);
  behaviorRegistry.register("TimegroupRootOnly", TimegroupRootOnly);
  behaviorRegistry.register("DivCanHaveChildren", DivCanHaveChildren);
  behaviorRegistry.register("TemporalCanMoveToRoot", TemporalCanMoveToRoot);
  behaviorRegistry.register("NonTemporalInTimegroup", NonTemporalInTimegroup);
}

