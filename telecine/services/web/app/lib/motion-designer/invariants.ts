import type { MotionDesignerState } from "./types.js";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationContext {
  strict: boolean;
}

const DEFAULT_CONTEXT: ValidationContext = { strict: false };

function assertOrCollect(
  condition: boolean,
  message: string,
  errors: string[],
  strict: boolean,
): void {
  if (!condition) {
    if (strict) {
      throw new Error(`Invariant violation: ${message}`);
    }
    errors.push(message);
  }
}

export function validateElementTree(
  state: MotionDesignerState,
  context: ValidationContext = DEFAULT_CONTEXT,
): ValidationResult {
  const errors: string[] = [];
  const { elements, rootTimegroupIds } = state.composition;

  for (const elementId in elements) {
    const element = elements[elementId];
    if (!element) continue;

    if (element.parentId === null) {
      assertOrCollect(
        rootTimegroupIds.includes(elementId),
        `Root element ${elementId} must be in rootTimegroupIds`,
        errors,
        context.strict,
      );
    } else {
      assertOrCollect(
        elements[element.parentId] !== undefined,
        `Element ${elementId} has parentId ${element.parentId} that does not exist`,
        errors,
        context.strict,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateTimegroupRootLevel(
  state: MotionDesignerState,
  context: ValidationContext = DEFAULT_CONTEXT,
): ValidationResult {
  const errors: string[] = [];
  const { elements } = state.composition;

  for (const elementId in elements) {
    const element = elements[elementId];
    if (!element || element.type !== "timegroup") continue;

    assertOrCollect(
      element.parentId === null,
      `Timegroup ${elementId} must be at root level (parentId must be null)`,
      errors,
      context.strict,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateParentChildConsistency(
  state: MotionDesignerState,
  context: ValidationContext = DEFAULT_CONTEXT,
): ValidationResult {
  const errors: string[] = [];
  const { elements } = state.composition;

  for (const elementId in elements) {
    const element = elements[elementId];
    if (!element) continue;

    if (element.parentId !== null) {
      const parent = elements[element.parentId];
      assertOrCollect(
        parent !== undefined,
        `Element ${elementId} references non-existent parent ${element.parentId}`,
        errors,
        context.strict,
      );
      if (parent) {
        assertOrCollect(
          parent.childIds.includes(elementId),
          `Element ${elementId} has parent ${element.parentId} but parent's childIds doesn't include it`,
          errors,
          context.strict,
        );
      }
    }

    for (const childId of element.childIds) {
      const child = elements[childId];
      assertOrCollect(
        child !== undefined,
        `Element ${elementId} has childId ${childId} that does not exist`,
        errors,
        context.strict,
      );
      if (child) {
        assertOrCollect(
          child.parentId === elementId,
          `Element ${elementId} has childId ${childId} but child's parentId is ${child.parentId}`,
          errors,
          context.strict,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateAllInvariants(
  state: MotionDesignerState,
  context: ValidationContext = DEFAULT_CONTEXT,
): ValidationResult {
  const results = [
    validateElementTree(state, context),
    validateTimegroupRootLevel(state, context),
    validateParentChildConsistency(state, context),
  ];

  const allErrors = results.flatMap((r) => r.errors);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
