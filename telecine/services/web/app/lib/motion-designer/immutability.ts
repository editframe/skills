/**
 * Immutability helpers for efficient state updates without structuredClone
 * Only clones what actually changes, using shallow copies where possible
 *
 * Usage Guidelines:
 * - Use `shallowClone` for top-level state objects (e.g., state, state.composition, state.ui)
 * - Use `merge` for nested object updates (e.g., element.props, canvasTransform)
 * - Use `setIn`/`updateIn` for deep nested path updates (rarely needed)
 * - Use `deepClone` only when you need a complete copy (e.g., for REPLACE_STATE)
 * - For array updates, create new arrays with spread: `[...array, item]` or `array.filter(...)`
 */

/**
 * Sets a value at a nested path, only cloning the objects along the path.
 * Use this when you need to update a deeply nested property.
 *
 * Example: setIn(state, ["composition", "elements", "id1", "props", "opacity"], 0.5)
 */
export function setIn<T extends Record<string, any>>(
  obj: T,
  path: string[],
  value: any,
): T {
  if (path.length === 0) {
    return value;
  }

  const [key, ...rest] = path;
  if (!key) return obj;
  
  const newObj = { ...obj };

  if (rest.length === 0) {
    (newObj as any)[key] = value;
  } else {
    (newObj as any)[key] = setIn((obj[key] as any) || {}, rest, value);
  }

  return newObj;
}

/**
 * Updates a nested value using a function, only cloning what changes.
 * Use this when you need to transform a deeply nested property.
 *
 * Example: updateIn(state, ["ui", "currentTime"], (time) => time + 100)
 */
export function updateIn<T extends Record<string, any>>(
  obj: T,
  path: string[],
  updater: (value: any) => any,
): T {
  if (path.length === 0) {
    return updater(obj);
  }

  const [key, ...rest] = path;
  if (!key) return obj;
  
  const newObj = { ...obj };

  if (rest.length === 0) {
    (newObj as any)[key] = updater((obj as any)[key]);
  } else {
    const currentValue = ((obj as any)[key] as any) || {};
    (newObj as any)[key] = updateIn(currentValue, rest, updater);
  }

  return newObj;
}

/**
 * Shallow clone an object or array.
 * Creates a new object/array with the same top-level properties/elements.
 * Nested objects/arrays are NOT cloned (they are references).
 *
 * Use this for:
 * - Cloning top-level state objects (state, state.composition, state.ui)
 * - Cloning arrays when you're replacing elements
 *
 * Do NOT use this for nested object updates - use `merge` instead.
 */
export function shallowClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return [...obj] as T;
  }

  return { ...obj };
}

/**
 * Deep clone an object or array recursively.
 * Creates completely new copies of all nested objects and arrays.
 *
 * Use this sparingly - it's expensive. Prefer shallowClone + merge for most cases.
 * Use this for:
 * - Complete state replacement (REPLACE_STATE action)
 * - When you need to mutate a copy without affecting the original
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Merge two objects, creating a new object with merged properties.
 * The top level is cloned, and nested objects are recursively merged.
 *
 * Use this for:
 * - Updating element props: merge(element.props, updates)
 * - Updating nested objects: merge(state.ui.canvasTransform, { scale: 2 })
 *
 * Arrays are replaced, not merged. For array updates, create new arrays.
 */
export function merge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = merge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

