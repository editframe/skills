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

type ParentType = "div" | "timegroup" | "root";
type ChildType = "div" | "text" | "image" | "video" | "audio" | "timegroup" | "captions" | "waveform" | "surface";

interface NestingRule {
  parent: ParentType;
  child: ChildType;
  allowed: boolean;
}

const NESTING_RULES: NestingRule[] = [
  { parent: "root", child: "timegroup", allowed: true },
  { parent: "root", child: "div", allowed: false },
  { parent: "root", child: "text", allowed: true },
  { parent: "root", child: "image", allowed: true },
  { parent: "root", child: "video", allowed: true },
  { parent: "root", child: "audio", allowed: true },
  { parent: "root", child: "captions", allowed: true },
  { parent: "root", child: "waveform", allowed: true },
  { parent: "root", child: "surface", allowed: true },
  { parent: "div", child: "timegroup", allowed: false },
  { parent: "div", child: "div", allowed: true },
  { parent: "div", child: "text", allowed: true },
  { parent: "div", child: "image", allowed: true },
  { parent: "div", child: "video", allowed: true },
  { parent: "div", child: "audio", allowed: true },
  { parent: "div", child: "captions", allowed: true },
  { parent: "div", child: "waveform", allowed: true },
  { parent: "div", child: "surface", allowed: true },
  { parent: "timegroup", child: "timegroup", allowed: false },
  { parent: "timegroup", child: "div", allowed: true },
  { parent: "timegroup", child: "text", allowed: true },
  { parent: "timegroup", child: "image", allowed: true },
  { parent: "timegroup", child: "video", allowed: true },
  { parent: "timegroup", child: "audio", allowed: true },
  { parent: "timegroup", child: "captions", allowed: true },
  { parent: "timegroup", child: "waveform", allowed: true },
  { parent: "timegroup", child: "surface", allowed: true },
];

function getParentType(parentId: string | null, state: MotionDesignerState): ParentType {
  if (parentId === null) {
    return "root";
  }
  const parent = state.composition.elements[parentId];
  if (!parent) return "root";
  if (parent.type === "div") return "div";
  if (parent.type === "timegroup") return "timegroup";
  return "root";
}

function getChildType(elementId: string, state: MotionDesignerState): ChildType | null {
  const element = state.composition.elements[elementId];
  if (!element) return null;
  const type = element.type;
  if (type === "div" || type === "text" || type === "image" || type === "video" || type === "audio" || type === "timegroup" || type === "captions" || type === "waveform" || type === "surface") {
    return type;
  }
  return null;
}

function isNestingAllowed(
  parentType: ParentType,
  childType: ChildType,
): boolean {
  const rule = NESTING_RULES.find(
    (r) => r.parent === parentType && r.child === childType,
  );
  return rule?.allowed ?? false;
}

const NestingRulesBehavior: MoveBehavior = {
  canMove(elementId, newParentId, newIndex, state) {
    const childType = getChildType(elementId, state);
    if (!childType) return false;

    const parentType = getParentType(newParentId, state);
    return isNestingAllowed(parentType, childType);
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
  behaviorRegistry.register("NestingRules", NestingRulesBehavior);
}

