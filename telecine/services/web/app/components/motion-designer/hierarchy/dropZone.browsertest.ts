import { describe, test, expect, beforeEach } from "vitest";
import { DropZoneStateMachine, type DropZone } from "./dropZone";

describe("DropZoneStateMachine", () => {
  let stateMachine: DropZoneStateMachine;

  beforeEach(() => {
    stateMachine = new DropZoneStateMachine();
  });

  describe("determineZone for elements that can have children", () => {
    const elementRect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    test("returns 'before' when cursor is in top 20% of element", () => {
      const cursorY = elementRect.top + 5;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        elementRect,
        true,
      );
      expect(zone).toBe("before");
    });

    test("returns 'after' when cursor is in bottom 20% of element", () => {
      const cursorY = elementRect.bottom - 5;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        elementRect,
        true,
      );
      expect(zone).toBe("after");
    });

    test("returns 'inside' when cursor is in middle 60% of element", () => {
      const cursorY = elementRect.top + elementRect.height / 2;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        elementRect,
        true,
      );
      expect(zone).toBe("inside");
    });

    test("uses minimum zone size for small elements", () => {
      const smallRect: DOMRect = {
        ...elementRect,
        height: 20,
        bottom: 120,
      };
      const cursorY = smallRect.top + 2;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        smallRect,
        true,
      );
      expect(zone).toBe("before");
    });
  });

  describe("determineZone for elements that cannot have children", () => {
    const elementRect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    test("returns 'before' when cursor is in top half", () => {
      const cursorY = elementRect.top + 10;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        elementRect,
        false,
      );
      expect(zone).toBe("before");
    });

    test("returns 'after' when cursor is in bottom half", () => {
      const cursorY = elementRect.top + 20;
      const zone = stateMachine.determineZone(
        "element1",
        cursorY,
        elementRect,
        false,
      );
      expect(zone).toBe("after");
    });
  });

  describe("zone transitions with hysteresis", () => {
    const elementRect: DOMRect = {
      top: 100,
      left: 0,
      right: 200,
      bottom: 132,
      width: 200,
      height: 32,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };

    test("maintains zone when cursor moves within same zone", () => {
      const cursorY1 = elementRect.top + 5;
      const zone1 = stateMachine.determineZone(
        "element1",
        cursorY1,
        elementRect,
        true,
      );
      expect(zone1).toBe("before");

      const cursorY2 = elementRect.top + 6;
      const zone2 = stateMachine.determineZone(
        "element1",
        cursorY2,
        elementRect,
        true,
      );
      expect(zone2).toBe("before");
    });

    test("transitions from before to after only when crossing threshold plus buffer", () => {
      const beforeThreshold = Math.max(elementRect.height * 0.2, 8);
      const afterThreshold = elementRect.height - beforeThreshold;
      const hysteresis = 2;

      stateMachine.determineZone(
        "element1",
        elementRect.top + beforeThreshold - 1,
        elementRect,
        true,
      );

      const zoneNearBoundary = stateMachine.determineZone(
        "element1",
        elementRect.top + afterThreshold + hysteresis - 1,
        elementRect,
        true,
      );
      expect(zoneNearBoundary).toBe("before");

      const zonePastBuffer = stateMachine.determineZone(
        "element1",
        elementRect.top + afterThreshold + hysteresis + 1,
        elementRect,
        true,
      );
      expect(zonePastBuffer).toBe("after");
    });

    test("transitions from inside to before when crossing threshold minus buffer", () => {
      const beforeThreshold = Math.max(elementRect.height * 0.2, 8);
      const hysteresis = 2;

      stateMachine.determineZone(
        "element1",
        elementRect.top + elementRect.height / 2,
        elementRect,
        true,
      );

      const zoneNearBoundary = stateMachine.determineZone(
        "element1",
        elementRect.top + beforeThreshold - hysteresis + 1,
        elementRect,
        true,
      );
      expect(zoneNearBoundary).toBe("inside");

      const zonePastBuffer = stateMachine.determineZone(
        "element1",
        elementRect.top + beforeThreshold - hysteresis - 1,
        elementRect,
        true,
      );
      expect(zonePastBuffer).toBe("before");
    });
  });

  describe("state management", () => {
    test("maintains separate state for each element", () => {
      const rect1: DOMRect = {
        top: 100,
        left: 0,
        right: 200,
        bottom: 132,
        width: 200,
        height: 32,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      };
      const rect2: DOMRect = {
        top: 200,
        left: 0,
        right: 200,
        bottom: 232,
        width: 200,
        height: 32,
        x: 0,
        y: 200,
        toJSON: () => ({}),
      };

      const zone1 = stateMachine.determineZone(
        "element1",
        rect1.top + 5,
        rect1,
        true,
      );
      const zone2 = stateMachine.determineZone(
        "element2",
        rect2.top + rect2.height / 2,
        rect2,
        true,
      );

      expect(zone1).toBe("before");
      expect(zone2).toBe("inside");

      const zone1Again = stateMachine.determineZone(
        "element1",
        rect1.top + 6,
        rect1,
        true,
      );
      expect(zone1Again).toBe("before");
    });

    test("reset clears all element states", () => {
      const rect: DOMRect = {
        top: 100,
        left: 0,
        right: 200,
        bottom: 132,
        width: 200,
        height: 32,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      };

      stateMachine.determineZone("element1", rect.top + 5, rect, true);
      stateMachine.reset();

      const zoneAfterReset = stateMachine.determineZone(
        "element1",
        rect.top + rect.height / 2,
        rect,
        true,
      );
      expect(zoneAfterReset).toBe("inside");
    });

    test("resetElement clears state for specific element only", () => {
      const rect: DOMRect = {
        top: 100,
        left: 0,
        right: 200,
        bottom: 132,
        width: 200,
        height: 32,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      };

      stateMachine.determineZone("element1", rect.top + 5, rect, true);
      stateMachine.determineZone("element2", rect.top + 5, rect, true);
      stateMachine.resetElement("element1");

      const zone1 = stateMachine.determineZone(
        "element1",
        rect.top + rect.height / 2,
        rect,
        true,
      );
      const zone2 = stateMachine.determineZone(
        "element2",
        rect.top + 6,
        rect,
        true,
      );

      expect(zone1).toBe("inside");
      expect(zone2).toBe("before");
    });
  });
});

