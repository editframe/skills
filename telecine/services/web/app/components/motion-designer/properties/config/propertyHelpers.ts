import type { ElementNode } from "~/lib/motion-designer/types";

export function getNestedValue(obj: any, path: string): any {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

export function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result;
}
