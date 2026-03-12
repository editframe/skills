import { describe, test, expect } from "vitest";
import { generateLayoutStyles } from "./layoutStyles";
import type {
  ElementNode,
  MotionDesignerState,
} from "~/lib/motion-designer/types";

function createMockState(
  overrides: Partial<MotionDesignerState["composition"]> = {},
): MotionDesignerState {
  return {
    composition: {
      elements: {},
      rootTimegroupIds: [],
      ...overrides,
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

function createMockElement(
  overrides: Partial<ElementNode> & { parentId?: string } = {},
): ElementNode & { parentId?: string } {
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
  describe("boxSizing", () => {
    test("all elements get boxSizing border-box", () => {
      const element = createMockElement({ type: "text" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.boxSizing).toBe("border-box");
    });
  });

  describe("position", () => {
    test("root timegroup with position gets absolute positioning", () => {
      const element = createMockElement({
        type: "timegroup",
        id: "root-tg",
        props: { position: { x: 10, y: 20 } },
      });
      const state = createMockState({
        elements: { "root-tg": element as ElementNode },
        rootTimegroupIds: ["root-tg"],
      });

      const styles = generateLayoutStyles(element, state);

      expect(styles.position).toBe("absolute");
      expect(styles.left).toBe("10px");
      expect(styles.top).toBe("20px");
    });

    test("root timegroup uses positionMode when provided", () => {
      const element = createMockElement({
        type: "timegroup",
        id: "root-tg",
        props: { position: { x: 0, y: 0 }, positionMode: "relative" },
      });
      const state = createMockState({
        elements: { "root-tg": element as ElementNode },
        rootTimegroupIds: ["root-tg"],
      });

      const styles = generateLayoutStyles(element, state);

      expect(styles.position).toBe("relative");
    });

    test("element not in container gets position when set", () => {
      const element = createMockElement({
        id: "standalone",
        type: "div",
        props: { position: { x: 5, y: 15 } },
      });
      const state = createMockState({
        elements: { standalone: element as ElementNode },
      });

      const styles = generateLayoutStyles(element, state);

      expect(styles.position).toBe("absolute");
      expect(styles.left).toBe("5px");
      expect(styles.top).toBe("15px");
    });

    test("element in container does not get position", () => {
      const parent = createMockElement({
        id: "parent",
        type: "div",
        props: {},
      });
      const child = createMockElement({
        id: "child",
        parentId: "parent",
        type: "div",
        props: { position: { x: 10, y: 20 } },
      });
      const state = createMockState({
        elements: { parent, child },
      });

      const styles = generateLayoutStyles(child, state);

      expect(styles.position).toBeUndefined();
      expect(styles.left).toBeUndefined();
      expect(styles.top).toBeUndefined();
    });

    test("element without position prop does not get position styles", () => {
      const element = createMockElement({ type: "div", props: {} });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.position).toBeUndefined();
    });
  });

  describe("size - legacy format", () => {
    test("legacy size width and height produce pixel dimensions", () => {
      const element = createMockElement({
        type: "div",
        props: { size: { width: 200, height: 150 } },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("200px");
      expect(styles.height).toBe("150px");
    });

    test("legacy size with 0 treats dimension as not set", () => {
      const element = createMockElement({
        type: "div",
        props: { size: { width: 0, height: 100 } },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBeUndefined();
      expect(styles.height).toBe("100px");
    });
  });

  describe("size - fixed mode format", () => {
    test("fixed mode size produces pixel dimensions", () => {
      const element = createMockElement({
        type: "div",
        props: {
          size: {
            widthMode: "fixed",
            widthValue: 300,
            heightMode: "fixed",
            heightValue: 200,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("300px");
      expect(styles.height).toBe("200px");
    });

    test("fixed mode with 0 treats dimension as not set", () => {
      const element = createMockElement({
        type: "div",
        props: {
          size: {
            widthMode: "fixed",
            widthValue: 0,
            heightMode: "fixed",
            heightValue: 50,
          },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBeUndefined();
      expect(styles.height).toBe("50px");
    });
  });

  describe("size - timegroups", () => {
    test("timegroup defaults to 100px when no size set", () => {
      const element = createMockElement({
        type: "timegroup",
        props: {},
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("100px");
      expect(styles.height).toBe("100px");
    });

    test("timegroup uses size when set", () => {
      const element = createMockElement({
        type: "timegroup",
        props: { size: { width: 1920, height: 1080 } },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("1920px");
      expect(styles.height).toBe("1080px");
    });

    test("timegroup does not use direct width/height props as fallback", () => {
      const element = createMockElement({
        type: "timegroup",
        props: { width: 500, height: 500 },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("100px");
      expect(styles.height).toBe("100px");
    });
  });

  describe("size - direct width/height fallback", () => {
    test("non-timegroup uses direct width/height when size not set", () => {
      const element = createMockElement({
        type: "div",
        props: { width: 80, height: 60 },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.width).toBe("80px");
      expect(styles.height).toBe("60px");
    });
  });

  describe("size - grid container children", () => {
    test("container child in grid with no size gets 100% width and height", () => {
      const parent = createMockElement({ id: "parent", type: "div" });
      const child = createMockElement({
        id: "child",
        parentId: "parent",
        type: "div",
        props: {},
      });
      const state = createMockState({
        elements: { parent, child },
      });

      const styles = generateLayoutStyles(child, state);

      expect(styles.width).toBe("100%");
      expect(styles.height).toBe("100%");
    });

    test("non-media content in grid gets 100% width and height", () => {
      const parent = createMockElement({ id: "parent", type: "div" });
      const child = createMockElement({
        id: "child",
        parentId: "parent",
        type: "text",
        props: {},
      });
      const state = createMockState({
        elements: { parent, child },
      });

      const styles = generateLayoutStyles(child, state);

      expect(styles.width).toBe("100%");
      expect(styles.height).toBe("100%");
    });

    test("media element in grid does not set width or height for ef-fit-scale", () => {
      const parent = createMockElement({ id: "parent", type: "div" });
      const child = createMockElement({
        id: "child",
        parentId: "parent",
        type: "video",
        props: {},
      });
      const state = createMockState({
        elements: { parent, child },
      });

      const styles = generateLayoutStyles(child, state);

      expect(styles.width).toBeUndefined();
      expect(styles.height).toBeUndefined();
    });

    test("media element in grid with explicit size gets pixel dimensions", () => {
      const parent = createMockElement({ id: "parent", type: "div" });
      const child = createMockElement({
        id: "child",
        parentId: "parent",
        type: "image",
        props: { size: { width: 100, height: 100 } },
      });
      const state = createMockState({
        elements: { parent, child },
      });

      const styles = generateLayoutStyles(child, state);

      expect(styles.width).toBe("100px");
      expect(styles.height).toBe("100px");
    });
  });

  describe("container grid layout", () => {
    test("div gets display grid with vertical layout by default", () => {
      const element = createMockElement({ type: "div" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.display).toBe("grid");
      expect(styles.gridAutoFlow).toBe("row");
      expect(styles.gridAutoRows).toBe("1fr");
      expect(styles.gridTemplateColumns).toBe("1fr");
    });

    test("horizontal layoutDirection uses column flow", () => {
      const element = createMockElement({
        type: "div",
        props: { layoutDirection: "horizontal" },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.gridAutoFlow).toBe("column");
      expect(styles.gridAutoColumns).toBe("1fr");
      expect(styles.gridTemplateRows).toBe("1fr");
    });

    test("gap is applied when set", () => {
      const element = createMockElement({
        type: "div",
        props: { gap: 16 },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.gap).toBe("16px");
    });

    test("justifyItems and alignItems are applied when set", () => {
      const element = createMockElement({
        type: "div",
        props: {
          justifyItems: "center",
          alignItems: "stretch",
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.justifyItems).toBe("center");
      expect(styles.alignItems).toBe("stretch");
    });

    test("containers get overflow hidden", () => {
      const element = createMockElement({ type: "div" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.overflow).toBe("hidden");
    });
  });

  describe("container-type", () => {
    test("div elements have container-type size", () => {
      const element = createMockElement({ type: "div" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBe("size");
    });

    test("timegroup elements have container-type size", () => {
      const element = createMockElement({ type: "timegroup" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBe("size");
    });

    test("content elements do not have container-type", () => {
      const element = createMockElement({ type: "text" });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.containerType).toBeUndefined();
    });
  });

  describe("padding", () => {
    test("equal padding all sides uses shorthand", () => {
      const element = createMockElement({
        props: { padding: { top: 10, right: 10, bottom: 10, left: 10 } },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.padding).toBe("10px");
    });

    test("top/bottom and left/right equal uses two-value shorthand", () => {
      const element = createMockElement({
        props: { padding: { top: 8, right: 16, bottom: 8, left: 16 } },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.padding).toBe("8px 16px");
    });

    test("individual padding values use specific properties", () => {
      const element = createMockElement({
        props: {
          padding: { top: 4, right: 8, bottom: 12, left: 16 },
        },
      });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.paddingTop).toBe("4px");
      expect(styles.paddingRight).toBe("8px");
      expect(styles.paddingBottom).toBe("12px");
      expect(styles.paddingLeft).toBe("16px");
    });

    test("undefined padding returns no padding styles", () => {
      const element = createMockElement({ props: {} });
      const state = createMockState();

      const styles = generateLayoutStyles(element, state);

      expect(styles.padding).toBeUndefined();
      expect(styles.paddingTop).toBeUndefined();
    });
  });
});
