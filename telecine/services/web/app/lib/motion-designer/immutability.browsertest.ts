import { describe, test, expect } from "vitest";
import {
  shallowClone,
  deepClone,
  merge,
  setIn,
  updateIn,
} from "./immutability.js";

describe("shallowClone", () => {
  test("clones object", () => {
    const obj = { a: 1, b: 2 };
    const cloned = shallowClone(obj);

    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  test("clones array", () => {
    const arr = [1, 2, 3];
    const cloned = shallowClone(arr);

    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  test("does not clone nested objects", () => {
    const nested = { x: 1 };
    const obj = { a: nested, b: 2 };
    const cloned = shallowClone(obj);

    expect(cloned.a).toBe(nested);
    expect(cloned.a).toBe(obj.a);
  });

  test("returns primitives unchanged", () => {
    expect(shallowClone(null)).toBe(null);
    expect(shallowClone(42)).toBe(42);
    expect(shallowClone("string")).toBe("string");
  });
});

describe("deepClone", () => {
  test("clones nested objects", () => {
    const nested = { x: 1 };
    const obj = { a: nested, b: 2 };
    const cloned = deepClone(obj);

    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).not.toBe(nested);
    expect(cloned.a).toEqual(nested);
  });

  test("clones nested arrays", () => {
    const arr = [
      [1, 2],
      [3, 4],
    ];
    const cloned = deepClone(arr);

    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[0]).not.toBe(arr[0]);
  });

  test("returns primitives unchanged", () => {
    expect(deepClone(null)).toBe(null);
    expect(deepClone(42)).toBe(42);
    expect(deepClone("string")).toBe("string");
  });
});

describe("merge", () => {
  test("merges top-level properties", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const merged = merge(target, source);

    expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    expect(merged).not.toBe(target);
    expect(merged).not.toBe(source);
  });

  test("merges nested objects", () => {
    const target = { a: { x: 1, y: 2 }, b: 2 };
    const source = { a: { y: 3, z: 4 } };
    const merged = merge(target, source);

    expect(merged.a).toEqual({ x: 1, y: 3, z: 4 });
    expect(merged.a).not.toBe(target.a);
    expect(merged.a).not.toBe(source.a);
  });

  test("replaces arrays", () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    const merged = merge(target, source);

    expect(merged.arr).toEqual([4, 5]);
    expect(merged.arr).not.toBe(target.arr);
  });

  test("preserves original object", () => {
    const target = { a: 1, b: 2 };
    const source = { c: 3 };
    merge(target, source);

    expect(target).toEqual({ a: 1, b: 2 });
  });
});

describe("setIn", () => {
  test("sets value at path", () => {
    const obj = { a: { b: { c: 1 } } };
    const result = setIn(obj, ["a", "b", "c"], 2);

    expect(result.a.b.c).toBe(2);
    expect(obj.a.b.c).toBe(1);
    expect(result.a).not.toBe(obj.a);
    expect(result.a.b).not.toBe(obj.a.b);
  });

  test("creates missing intermediate objects", () => {
    const obj = { a: {} };
    const result = setIn(obj, ["a", "b", "c"], 1);

    expect(result.a.b.c).toBe(1);
  });

  test("handles empty path", () => {
    const obj = { a: 1 };
    const result = setIn(obj, [], 2);

    expect(result).toBe(2);
  });
});

describe("updateIn", () => {
  test("updates value at path", () => {
    const obj = { a: { b: { c: 1 } } };
    const result = updateIn(obj, ["a", "b", "c"], (val) => val * 2);

    expect(result.a.b.c).toBe(2);
    expect(obj.a.b.c).toBe(1);
    expect(result.a).not.toBe(obj.a);
    expect(result.a.b).not.toBe(obj.a.b);
  });

  test("handles empty path", () => {
    const obj = { a: 1 };
    const result = updateIn(obj, [], (val) => ({ b: 2 }));

    expect(result).toEqual({ b: 2 });
  });
});

describe("immutability guarantees", () => {
  test("original objects remain unchanged after shallowClone", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = shallowClone(original);

    cloned.a = 99;
    cloned.b.c = 99;

    expect(original.a).toBe(1);
    expect(original.b.c).toBe(99);
  });

  test("original objects remain unchanged after deepClone", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);

    cloned.a = 99;
    cloned.b.c = 99;

    expect(original.a).toBe(1);
    expect(original.b.c).toBe(2);
  });

  test("original objects remain unchanged after merge", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { a: 99, b: { d: 3 } };
    const merged = merge(target, source);

    expect(target.a).toBe(1);
    expect(target.b).toEqual({ c: 2 });
  });
});
