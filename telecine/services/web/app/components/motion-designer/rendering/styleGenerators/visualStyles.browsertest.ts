import { describe, test, expect } from "vitest";
import { generateVisualStyles } from "./visualStyles";
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

describe("generateVisualStyles", () => {
  describe("rotation handling", () => {
    test("applies design rotation when no rotate animations exist", () => {
      const element = createElement({ props: { rotation: 45 } });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.transform).toBe("rotate(45deg)");
      expect(styles.transformOrigin).toBe("center");
    });

    test("suppresses design rotation when rotate animations exist", () => {
      const element = createElement({
        props: { rotation: 45 },
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

      const styles = generateVisualStyles(element, false, true);
      expect(styles.transform).toBeUndefined();
      expect(styles.transformOrigin).toBeUndefined();
    });

    test("applies design rotation when other transform animations exist", () => {
      const element = createElement({
        props: { rotation: 45 },
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

      const styles = generateVisualStyles(element, false, true);
      expect(styles.transform).toBe("rotate(45deg)");
      expect(styles.transformOrigin).toBe("center");
    });

    test("does not apply rotation when rotation prop is 0", () => {
      const element = createElement({ props: { rotation: 0 } });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.transform).toBeUndefined();
      expect(styles.transformOrigin).toBeUndefined();
    });

    test("does not apply rotation when rotation prop is undefined", () => {
      const element = createElement();
      const styles = generateVisualStyles(element, false, false);

      expect(styles.transform).toBeUndefined();
      expect(styles.transformOrigin).toBeUndefined();
    });
  });

  describe("other visual styles", () => {
    test("applies opacity when no opacity animations", () => {
      const element = createElement({ props: { opacity: 0.5 } });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.opacity).toBe(0.5);
    });

    test("suppresses opacity when opacity animations exist", () => {
      const element = createElement({ props: { opacity: 0.5 } });
      const styles = generateVisualStyles(element, true, false);

      expect(styles.opacity).toBeUndefined();
    });

    test("applies corner radius", () => {
      const element = createElement({ props: { cornerRadius: 10 } });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.borderRadius).toBe("10px");
    });

    test("applies fill color for non-text elements", () => {
      const element = createElement({
        type: "div",
        props: { fill: { enabled: true, color: "#ff0000" } },
      });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.backgroundColor).toBe("#ff0000");
    });

    test("applies fill color as text color for text elements", () => {
      const element = createElement({
        type: "text",
        props: { fill: { enabled: true, color: "#0000ff" } },
      });
      const styles = generateVisualStyles(element, false, false);

      expect(styles.color).toBe("#0000ff");
    });
  });
});
