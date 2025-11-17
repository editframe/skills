import { describe, test, expect } from "vitest";
import { hasRotateAnimations, parseRotationFromTransform, getBaseRotation } from "./rotationUtils";
import type { ElementNode } from "~/lib/motion-designer/types";

function createElement(overrides: Partial<ElementNode> = {}): ElementNode {
  return {
    id: "test-element",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

describe("rotationUtils", () => {
  describe("hasRotateAnimations", () => {
    test("returns true when element has rotate animation", () => {
      const element = createElement({
        animations: [
          {
            id: "anim-1",
            property: "rotate",
            fromValue: "0deg",
            toValue: "360deg",
            duration: 1000,
            delay: 0,
            easing: "ease",
            fillMode: "both",
            name: "Rotate",
          },
        ],
      });

      expect(hasRotateAnimations(element)).toBe(true);
    });

    test("returns false when element has no animations", () => {
      const element = createElement();
      expect(hasRotateAnimations(element)).toBe(false);
    });

    test("returns false when element has other transform animations", () => {
      const element = createElement({
        animations: [
          {
            id: "anim-1",
            property: "translateX",
            fromValue: "0px",
            toValue: "100px",
            duration: 1000,
            delay: 0,
            easing: "ease",
            fillMode: "both",
            name: "Translate",
          },
          {
            id: "anim-2",
            property: "scale",
            fromValue: "1",
            toValue: "2",
            duration: 1000,
            delay: 0,
            easing: "ease",
            fillMode: "both",
            name: "Scale",
          },
        ],
      });

      expect(hasRotateAnimations(element)).toBe(false);
    });

    test("returns true when element has rotate animation among others", () => {
      const element = createElement({
        animations: [
          {
            id: "anim-1",
            property: "translateX",
            fromValue: "0px",
            toValue: "100px",
            duration: 1000,
            delay: 0,
            easing: "ease",
            fillMode: "both",
            name: "Translate",
          },
          {
            id: "anim-2",
            property: "rotate",
            fromValue: "0deg",
            toValue: "360deg",
            duration: 1000,
            delay: 0,
            easing: "ease",
            fillMode: "both",
            name: "Rotate",
          },
        ],
      });

      expect(hasRotateAnimations(element)).toBe(true);
    });
  });

  describe("parseRotationFromTransform", () => {
    test("parses rotate() function with degrees", () => {
      expect(parseRotationFromTransform("rotate(45deg)")).toBe(45);
      expect(parseRotationFromTransform("rotate(90deg)")).toBe(90);
      expect(parseRotationFromTransform("rotate(-45deg)")).toBe(-45);
      expect(parseRotationFromTransform("rotate(180deg)")).toBe(180);
    });

    test("parses rotate() function with radians", () => {
      const radians = Math.PI / 4; // 45 degrees
      expect(parseRotationFromTransform(`rotate(${radians}rad)`)).toBeCloseTo(45, 5);
    });

    test("parses rotate() from complex transform string", () => {
      expect(parseRotationFromTransform("translateX(10px) rotate(45deg) scale(2)")).toBe(45);
      expect(parseRotationFromTransform("rotate(90deg) translateY(20px)")).toBe(90);
    });

    test("parses rotation from matrix() transform", () => {
      // matrix(cos(45°), sin(45°), -sin(45°), cos(45°), 0, 0)
      // cos(45°) = sin(45°) ≈ 0.707
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      const matrix = `matrix(${cos45}, ${sin45}, ${-sin45}, ${cos45}, 0, 0)`;
      expect(parseRotationFromTransform(matrix)).toBeCloseTo(45, 1);
    });

    test("parses rotation from matrix3d() transform", () => {
      const cos45 = Math.cos(Math.PI / 4);
      const sin45 = Math.sin(Math.PI / 4);
      const matrix3d = `matrix3d(${cos45}, ${sin45}, 0, 0, ${-sin45}, ${cos45}, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)`;
      expect(parseRotationFromTransform(matrix3d)).toBeCloseTo(45, 1);
    });

    test("returns 0 for null or undefined", () => {
      expect(parseRotationFromTransform(null)).toBe(0);
      expect(parseRotationFromTransform(undefined)).toBe(0);
    });

    test("returns 0 for 'none'", () => {
      expect(parseRotationFromTransform("none")).toBe(0);
    });

    test("returns 0 for transform without rotation", () => {
      expect(parseRotationFromTransform("translateX(10px) scale(2)")).toBe(0);
      expect(parseRotationFromTransform("scale(1.5)")).toBe(0);
    });
  });

  describe("getBaseRotation", () => {
    test("returns rotation from element props", () => {
      const element = createElement({ props: { rotation: 45 } });
      expect(getBaseRotation(element)).toBe(45);
    });

    test("returns 0 when rotation is not set", () => {
      const element = createElement();
      expect(getBaseRotation(element)).toBe(0);
    });

    test("returns 0 when rotation is null", () => {
      const element = createElement({ props: { rotation: null } });
      expect(getBaseRotation(element)).toBe(0);
    });

    test("returns 0 when rotation is undefined", () => {
      const element = createElement({ props: { rotation: undefined } });
      expect(getBaseRotation(element)).toBe(0);
    });

    test("handles negative rotation", () => {
      const element = createElement({ props: { rotation: -90 } });
      expect(getBaseRotation(element)).toBe(-90);
    });
  });
});

