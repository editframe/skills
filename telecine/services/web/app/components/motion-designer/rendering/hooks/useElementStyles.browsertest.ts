import { describe, test, expect, vi, beforeEach } from "vitest";
import { useElementStyles } from "./useElementStyles";
import type { ElementNode, MotionDesignerState } from "~/lib/motion-designer/types";
import * as generateStylesModule from "../../animations/generateStyles";

vi.mock("../../animations/generateStyles", () => ({
  isTransformProperty: vi.fn(),
}));

vi.mock("../styleGenerators/visualStyles", () => ({
  generateVisualStyles: vi.fn((element, hasOpacity, hasTransform) => ({
    opacity: hasOpacity ? undefined : element.props.opacity,
    transform: hasTransform ? undefined : element.props.rotation ? `rotate(${element.props.rotation}deg)` : undefined,
  })),
}));

vi.mock("../styleGenerators/layoutStyles", () => ({
  generateLayoutStyles: vi.fn(() => ({})),
}));

vi.mock("../styleGenerators/textStyles", () => ({
  generateTextStyles: vi.fn(() => ({})),
}));

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

function createState(overrides: Partial<MotionDesignerState> = {}): MotionDesignerState {
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
      ...overrides.ui,
    },
    ...overrides,
  };
}

describe("useElementStyles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("detects opacity animations correctly", () => {
    const element = createElement({
      animations: [
        {
          id: "anim-1",
          property: "opacity",
          fromValue: "0",
          toValue: "1",
          duration: 1000,
          delay: 0,
          easing: "ease",
          fillMode: "both",
          name: "Fade",
        },
      ],
    });

    const { styles } = useElementStyles(element, createState());
    expect(styles.opacity).toBeUndefined();
  });

  test("detects transform animations using isTransformProperty", () => {
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

    vi.mocked(generateStylesModule.isTransformProperty).mockReturnValue(true);

    const { styles } = useElementStyles(element, createState());
    expect(generateStylesModule.isTransformProperty).toHaveBeenCalledWith("rotate");
    expect(styles.transform).toBeUndefined();
  });

  test("detects translateX as transform property", () => {
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
      ],
    });

    vi.mocked(generateStylesModule.isTransformProperty).mockReturnValue(true);

    useElementStyles(element, createState());
    expect(generateStylesModule.isTransformProperty).toHaveBeenCalledWith("translateX");
  });

  test("detects scale as transform property", () => {
    const element = createElement({
      animations: [
        {
          id: "anim-1",
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

    vi.mocked(generateStylesModule.isTransformProperty).mockReturnValue(true);

    useElementStyles(element, createState());
    expect(generateStylesModule.isTransformProperty).toHaveBeenCalledWith("scale");
  });

  test("does not detect non-transform animations", () => {
    const element = createElement({
      animations: [
        {
          id: "anim-1",
          property: "opacity",
          fromValue: "0",
          toValue: "1",
          duration: 1000,
          delay: 0,
          easing: "ease",
          fillMode: "both",
          name: "Fade",
        },
      ],
    });

    vi.mocked(generateStylesModule.isTransformProperty).mockReturnValue(false);

    const { styles } = useElementStyles(element, createState());
    expect(styles.opacity).toBeUndefined();
  });

  test("handles element with no animations", () => {
    const element = createElement({ props: { opacity: 0.5, rotation: 45 } });

    vi.mocked(generateStylesModule.isTransformProperty).mockReturnValue(false);

    const { styles } = useElementStyles(element, createState());
    expect(styles.opacity).toBe(0.5);
    expect(styles.transform).toBe("rotate(45deg)");
  });
});

