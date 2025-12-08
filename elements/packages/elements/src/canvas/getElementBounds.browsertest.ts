import { describe, expect, test } from "vitest";
import { getElementBounds } from "./getElementBounds.js";
import type { CanvasElementBounds } from "./api/types.js";

describe("getElementBounds", () => {
  test("defaults to getBoundingClientRect", () => {
    const element = document.createElement("div");
    element.style.width = "100px";
    element.style.height = "50px";
    document.body.appendChild(element);

    const bounds = getElementBounds(element);
    expect(bounds.width).toBe(100);
    expect(bounds.height).toBe(50);

    element.remove();
  });

  test("uses custom getCanvasBounds when available", () => {
    const element = document.createElement("div") as HTMLElement & CanvasElementBounds;
    element.getCanvasBounds = () => {
      return new DOMRect(10, 20, 200, 100);
    };
    document.body.appendChild(element);

    const bounds = getElementBounds(element);
    expect(bounds.left).toBe(10);
    expect(bounds.top).toBe(20);
    expect(bounds.width).toBe(200);
    expect(bounds.height).toBe(100);

    element.remove();
  });
});

