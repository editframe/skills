import { describe, test, expect } from "vitest";
import { generateLayoutStyles } from "./layoutStyles";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import type { ElementSize } from "~/lib/motion-designer/sizingTypes";

function createMockState(): MotionDesignerState {
  return {
    composition: {
      elements: {},
      rootTimegroupIds: [],
    },
    ui: {
      selectedElementId: null,
      selectedAnimationId: null,
      selectedElementAnimationId: null,
      activeRootTimegroupId: null,
      currentTime: 0,
      placementMode: null,
      canvasTransform: { x: 0, y: 0, scale: 1 },
    },
  };
}

function createMockElement(overrides: Partial<ElementNode> = {}): ElementNode {
  return {
    id: "test-element",
    type: "div",
    props: {},
    animations: [],
    childIds: [],
    ...overrides,
  };
}

describe("generateLayoutStyles", () => {
  describe("flex spacing values", () => {
    test("justifyContent space-between produces correct CSS", () => {
      const element = createMockElement({
        props: {
          display: "flex",
          justifyContent: "space-between",
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.justifyContent).toBe("space-between");
    });

    test("justifyContent space-around produces correct CSS", () => {
      const element = createMockElement({
        props: {
          display: "flex",
          justifyContent: "space-around",
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.justifyContent).toBe("space-around");
    });

    test("justifyContent space-evenly produces correct CSS", () => {
      const element = createMockElement({
        props: {
          display: "flex",
          justifyContent: "space-evenly",
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.justifyContent).toBe("space-evenly");
    });
  });

  describe("fraction sizing", () => {
    test("fraction 1/2 produces width 50%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 2 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("50%");
    });

    test("fraction 1/3 produces width 33.333%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 3 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("33.333%");
    });

    test("fraction 1/4 produces width 25%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 4 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("25%");
    });

    test("fraction 1/5 produces width 20%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 5 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("20%");
    });

    test("fraction 1/6 produces width 16.667%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 6 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("16.667%");
    });

    test("fraction 2/3 produces width 66.667%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 2, denominator: 3 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("66.667%");
    });

    test("fraction 3/4 produces width 75%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 3, denominator: 4 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("75%");
    });

    test("fraction 2/5 produces width 40%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 2, denominator: 5 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("40%");
    });

    test("fraction 3/5 produces width 60%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 3, denominator: 5 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("60%");
    });

    test("fraction 4/5 produces width 80%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 4, denominator: 5 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("80%");
    });

    test("fraction 5/6 produces width 83.333%", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 5, denominator: 6 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("83.333%");
    });

    test("fraction height produces correct percentage", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fixed",
            widthValue: 100,
            heightMode: "fraction",
            heightValue: { numerator: 1, denominator: 2 },
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.height).toBe("50%");
    });

    test("fraction sizing in flex containers produces percentage CSS", () => {
      const parentElement = createMockElement({
        id: "parent",
        props: {
          display: "flex",
          flexDirection: "row",
        },
      });
      const childElement = createMockElement({
        id: "child",
        parentId: "parent",
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 3 },
            heightMode: "fixed",
            heightValue: 100,
          },
        },
      });
      const state = createMockState();
      state.composition.elements = {
        parent: parentElement,
        child: childElement,
      };

      const styles = generateLayoutStyles(childElement, state);

      expect(styles.width).toBe("33.333%");
      expect(styles.flex).toBe("0 0 auto");
    });

    test("both dimensions fraction sets aspect-ratio", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 2, denominator: 3 },
            heightMode: "fraction",
            heightValue: { numerator: 1, denominator: 2 },
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      // aspect-ratio = (2/3) / (1/2) = 4/3 = 1.333...
      expect(styles.width).toBe("66.667%");
      expect(styles.height).toBe("50%");
      expect(styles.aspectRatio).toBe("1.3333333333333333");
    });

    test("both dimensions fraction 1/2 sets aspect-ratio 1", () => {
      const element = createMockElement({
        props: {
          size: {
            widthMode: "fraction",
            widthValue: { numerator: 1, denominator: 2 },
            heightMode: "fraction",
            heightValue: { numerator: 1, denominator: 2 },
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("50%");
      expect(styles.height).toBe("50%");
      expect(styles.aspectRatio).toBe("1");
    });
  });

  describe("container-type", () => {
    test("div elements have container-type: size", () => {
      const element = createMockElement({
        type: "div",
        props: {},
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBe("size");
    });

    test("timegroup elements have container-type: size", () => {
      const element = createMockElement({
        type: "timegroup",
        props: {},
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBe("size");
    });

    test("other element types do not have container-type", () => {
      const element = createMockElement({
        type: "text",
        props: {},
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBeUndefined();
    });
  });

  describe("hug mode for media elements", () => {
    test("video elements in hug mode do not set width and height", () => {
      const element = createMockElement({
        type: "video",
        props: {
          size: {
            widthMode: "hug",
            widthValue: 0,
            heightMode: "hug",
            heightValue: 0,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      // Media elements should not have width/height set in hug mode
      // Web components like ef-video set canvas dimensions internally and size themselves
      expect(styles.width).toBeUndefined();
      expect(styles.height).toBeUndefined();
      // Should not set display to inline-block for media elements
      expect(styles.display).toBeUndefined();
    });

    test("image elements in hug mode do not set width and height", () => {
      const element = createMockElement({
        type: "image",
        props: {
          size: {
            widthMode: "hug",
            widthValue: 0,
            heightMode: "hug",
            heightValue: 0,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      // Media elements should not have width/height set in hug mode
      // Web components like ef-image set canvas dimensions internally and size themselves
      expect(styles.width).toBeUndefined();
      expect(styles.height).toBeUndefined();
      // Should not set display to inline-block for media elements
      expect(styles.display).toBeUndefined();
    });

    test("div elements in hug mode use fit-content and inline-block", () => {
      const element = createMockElement({
        type: "div",
        props: {
          size: {
            widthMode: "hug",
            widthValue: 0,
            heightMode: "hug",
            heightValue: 0,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("fit-content");
      expect(styles.height).toBe("fit-content");
      expect(styles.display).toBe("inline-block");
    });
  });
});

