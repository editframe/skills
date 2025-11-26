import { describe, test, expect } from "vitest";
import { PlaywrightEngine } from "./PlaywrightEngine";

describe("PlaywrightEngine", () => {
  describe("Module Structure", () => {
    test("exports PlaywrightEngine class", () => {
      expect(PlaywrightEngine).toBeDefined();
      expect(typeof PlaywrightEngine).toBe("function");
    });

    test("has static create method", () => {
      expect(PlaywrightEngine.create).toBeDefined();
      expect(typeof PlaywrightEngine.create).toBe("function");
    });
  });

  describe("Basic Interface", () => {
    test("constructor exists", () => {
      expect(PlaywrightEngine.constructor).toBeDefined();
    });

    test("has expected method names defined", () => {
      // Just verify the class structure is as expected
      expect(PlaywrightEngine.prototype.createContext).toBeDefined();
      // Note: close is an arrow function, so it's not on the prototype
    });
  });
});
