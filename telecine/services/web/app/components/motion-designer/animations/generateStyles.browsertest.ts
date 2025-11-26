import { describe, test, expect } from "vitest";
import { generateAnimationStyles } from "./generateStyles";
import type { ElementNode, Animation } from "~/lib/motion-designer/types";

function createElementNode(overrides: Partial<ElementNode> = {}): ElementNode {
  return {
    id: "test-element",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

function createAnimation(
  overrides: Partial<
    Animation & { keyframes?: Array<{ time: number; value: string }> }
  > = {},
): Animation & { keyframes?: Array<{ time: number; value: string }> } {
  return {
    id: "anim-1",
    property: "opacity",
    fromValue: "0",
    toValue: "1",
    duration: 1000,
    delay: 0,
    easing: "ease",
    fillMode: "both",
    name: "Test Animation",
    ...overrides,
  } as Animation & { keyframes?: Array<{ time: number; value: string }> };
}

describe("generateAnimationStyles", () => {
  describe("single translateX animation generates correct keyframes", () => {
    test("single translateX animation with fromValue/toValue produces keyframes with only one translateX per keyframe", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "-200%",
            toValue: "200%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Check that each keyframe has only one translateX
      const keyframeMatches = css!.match(/\{\s*transform:\s*([^}]+);/g);
      expect(keyframeMatches).toBeTruthy();

      keyframeMatches!.forEach((match) => {
        const transformValue = match.match(/transform:\s*([^;]+)/)?.[1];
        expect(transformValue).toBeTruthy();

        // Count translateX occurrences in this keyframe
        const translateXMatches = transformValue!.match(/translateX\([^)]+\)/g);
        expect(translateXMatches?.length).toBeLessThanOrEqual(1);
      });
    });

    test("single translateX animation generates expected keyframe values", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "-200%",
            toValue: "200%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Check for 0% keyframe with -200%
      expect(css).toMatch(/0%\s*\{\s*transform:\s*translateX\(-200%\)/);

      // Check for 100% keyframe with 200%
      expect(css).toMatch(/100%\s*\{\s*transform:\s*translateX\(200%\)/);
    });
  });

  describe("fill mode 'both' doesn't cause duplicates", () => {
    test("animation with fillMode 'both' doesn't add duplicate transform values when active", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "0%",
            toValue: "100%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Extract all transform values from keyframes
      const transformMatches = css!.match(/transform:\s*([^;]+)/g);
      expect(transformMatches).toBeTruthy();

      transformMatches!.forEach((match) => {
        const transformValue = match.replace("transform: ", "");

        // Count translateX occurrences - should be exactly 1
        const translateXMatches = transformValue.match(/translateX\([^)]+\)/g);
        expect(translateXMatches?.length).toBe(1);
      });
    });
  });

  describe("multiple translateX animations deduplicate", () => {
    test("when multiple animations target the same transform property, only one value per property type is included", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            id: "anim-1",
            property: "translateX",
            fromValue: "-200%",
            toValue: "0%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
          createAnimation({
            id: "anim-2",
            property: "translateX",
            fromValue: "0%",
            toValue: "200%",
            duration: 1000,
            delay: 1000,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Extract all transform values from keyframes
      const transformMatches = css!.match(/transform:\s*([^;]+)/g);
      expect(transformMatches).toBeTruthy();

      transformMatches!.forEach((match) => {
        const transformValue = match.replace("transform: ", "").trim();

        // Count translateX occurrences - should be exactly 1 per keyframe
        const translateXMatches = transformValue.match(/translateX\([^)]+\)/g);
        expect(translateXMatches?.length).toBe(1);
      });
    });
  });

  describe("reported case: -200%, 0%, 0%, 200% sequence", () => {
    test("keyframes contain expected translateX values without duplicates", () => {
      // Based on the reported case, this appears to be a single animation with keyframes
      // that should produce: -200%, 0%, 0%, 200%
      const element = createElementNode({
        id: "av7LDxHoXzqkGI96AAlQb",
        animations: [
          createAnimation({
            id: "anim-0",
            property: "translateX",
            fromValue: undefined,
            toValue: undefined,
            duration: 4192,
            delay: 0,
            fillMode: "both",
            easing: "ease",
            keyframes: [
              { time: 0, value: "-200%" },
              { time: 0.2385, value: "0%" },
              { time: 0.7615, value: "-200%" },
              { time: 1, value: "200%" },
            ],
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Check that there are no duplicate translateX values in any keyframe
      const keyframeMatches = css!.match(/\{\s*transform:\s*([^}]+);/g);
      expect(keyframeMatches).toBeTruthy();

      keyframeMatches!.forEach((match) => {
        const transformValue = match.match(/transform:\s*([^;]+)/)?.[1];
        expect(transformValue).toBeTruthy();

        // Count translateX occurrences - should be exactly 1
        const translateXMatches = transformValue!.match(/translateX\([^)]+\)/g);
        expect(translateXMatches?.length).toBe(1);
      });

      // Verify expected values are present (allowing for percentage rounding)
      expect(css).toMatch(/translateX\(-200%\)/);
      expect(css).toMatch(/translateX\(0%\)/);
      expect(css).toMatch(/translateX\(200%\)/);
    });
  });

  describe("fill mode boundaries work correctly", () => {
    test("backwards fill mode adds values only before animation starts", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "100%",
            toValue: "200%",
            duration: 1000,
            delay: 500,
            fillMode: "backwards",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // At 0% (before animation starts), should have backwards fill value
      // At 100% (after animation ends), should NOT have forwards fill value
      const cssLines = css!.split("\n");
      const zeroPercentLine = cssLines.find(
        (line) => line.includes("0%") && line.includes("transform"),
      );
      expect(zeroPercentLine).toBeTruthy();
      expect(zeroPercentLine).toMatch(/translateX\(100%\)/);
    });

    test("forwards fill mode adds values only after animation ends", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "100%",
            toValue: "200%",
            duration: 1000,
            delay: 0,
            fillMode: "forwards",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // At 100% (after animation ends), should have forwards fill value (toValue)
      // The generateKeyframes function always generates 0% and 100% keyframes
      expect(css).toMatch(/100%\s*\{\s*transform:\s*translateX\(200%\)/);
    });

    test("both fill mode doesn't cause duplicates at boundaries", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "0%",
            toValue: "100%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Extract all transform values from keyframes
      const transformMatches = css!.match(/transform:\s*([^;]+)/g);
      expect(transformMatches).toBeTruthy();

      transformMatches!.forEach((match) => {
        const transformValue = match.replace("transform: ", "").trim();

        // Count translateX occurrences - should be exactly 1
        const translateXMatches = transformValue.match(/translateX\([^)]+\)/g);
        expect(translateXMatches?.length).toBe(1);
      });
    });
  });

  describe("multiple transform properties combine correctly", () => {
    test("translateX and translateY combine without duplicates", () => {
      const element = createElementNode({
        animations: [
          createAnimation({
            id: "anim-1",
            property: "translateX",
            fromValue: "0%",
            toValue: "100%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
          createAnimation({
            id: "anim-2",
            property: "translateY",
            fromValue: "0%",
            toValue: "50%",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Should have both translateX and translateY in the transform
      expect(css).toMatch(/translateX\([^)]+\)/);
      expect(css).toMatch(/translateY\([^)]+\)/);

      // Each keyframe should have exactly one of each
      const keyframeMatches = css!.match(/\{\s*transform:\s*([^}]+);/g);
      expect(keyframeMatches).toBeTruthy();

      keyframeMatches!.forEach((match) => {
        const transformValue = match.match(/transform:\s*([^;]+)/)?.[1];
        expect(transformValue).toBeTruthy();

        const translateXMatches = transformValue!.match(/translateX\([^)]+\)/g);
        const translateYMatches = transformValue!.match(/translateY\([^)]+\)/g);

        expect(translateXMatches?.length).toBe(1);
        expect(translateYMatches?.length).toBe(1);
      });
    });
  });

  describe("base rotation in rotate animations", () => {
    test("base rotation is included in rotate animation keyframes", () => {
      const element = createElementNode({
        props: { rotation: 45 },
        animations: [
          createAnimation({
            property: "rotate",
            fromValue: "0deg",
            toValue: "90deg",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Base rotation (45deg) should be added to fromValue (0deg) = 45deg
      expect(css).toMatch(/0%\s*\{\s*transform:\s*rotate\(45deg\)/);
      // Base rotation (45deg) should be added to toValue (90deg) = 135deg
      expect(css).toMatch(/100%\s*\{\s*transform:\s*rotate\(135deg\)/);
    });

    test("base rotation is included in merged rotate animations", () => {
      const element = createElementNode({
        props: { rotation: 30 },
        animations: [
          createAnimation({
            id: "anim-1",
            property: "rotate",
            fromValue: "0deg",
            toValue: "90deg",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
          createAnimation({
            id: "anim-2",
            property: "rotate",
            fromValue: "90deg",
            toValue: "180deg",
            duration: 1000,
            delay: 1000,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // First animation: 0deg + 30deg = 30deg, 90deg + 30deg = 120deg
      expect(css).toMatch(/rotate\(30deg\)/);
      expect(css).toMatch(/rotate\(120deg\)/);
      // Second animation: 90deg + 30deg = 120deg, 180deg + 30deg = 210deg
      expect(css).toMatch(/rotate\(210deg\)/);
    });

    test("base rotation is included in rotate animation keyframes array", () => {
      const element = createElementNode({
        props: { rotation: 60 },
        animations: [
          createAnimation({
            property: "rotate",
            fromValue: undefined,
            toValue: undefined,
            duration: 1000,
            delay: 0,
            fillMode: "both",
            keyframes: [
              { time: 0, value: "0deg" },
              { time: 0.5, value: "45deg" },
              { time: 1, value: "90deg" },
            ],
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Base rotation (60deg) added to each keyframe value
      expect(css).toMatch(/rotate\(60deg\)/); // 0deg + 60deg
      expect(css).toMatch(/rotate\(105deg\)/); // 45deg + 60deg
      expect(css).toMatch(/rotate\(150deg\)/); // 90deg + 60deg
    });

    test("base rotation of 0 does not affect animation values", () => {
      const element = createElementNode({
        props: { rotation: 0 },
        animations: [
          createAnimation({
            property: "rotate",
            fromValue: "0deg",
            toValue: "90deg",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Values should remain unchanged
      expect(css).toMatch(/0%\s*\{\s*transform:\s*rotate\(0deg\)/);
      expect(css).toMatch(/100%\s*\{\s*transform:\s*rotate\(90deg\)/);
    });

    test("base rotation is not added to non-rotate animations", () => {
      const element = createElementNode({
        props: { rotation: 45 },
        animations: [
          createAnimation({
            property: "translateX",
            fromValue: "0px",
            toValue: "100px",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // translateX values should not be affected by base rotation
      expect(css).toMatch(/0%\s*\{\s*transform:\s*translateX\(0px\)/);
      expect(css).toMatch(/100%\s*\{\s*transform:\s*translateX\(100px\)/);
      // Should not have any rotation values
      expect(css).not.toMatch(/rotate\(/);
    });

    test("base rotation handles negative values", () => {
      const element = createElementNode({
        props: { rotation: -45 },
        animations: [
          createAnimation({
            property: "rotate",
            fromValue: "0deg",
            toValue: "90deg",
            duration: 1000,
            delay: 0,
            fillMode: "both",
          }),
        ],
      });

      const css = generateAnimationStyles(element);
      expect(css).toBeTruthy();

      // Base rotation (-45deg) added to fromValue (0deg) = -45deg
      expect(css).toMatch(/0%\s*\{\s*transform:\s*rotate\(-45deg\)/);
      // Base rotation (-45deg) added to toValue (90deg) = 45deg
      expect(css).toMatch(/100%\s*\{\s*transform:\s*rotate\(45deg\)/);
    });
  });
});
