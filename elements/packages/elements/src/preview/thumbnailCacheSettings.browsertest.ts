import { beforeEach, describe, test, afterEach } from "vitest";
import {
  getThumbnailCacheMaxSize,
  setThumbnailCacheMaxSize,
  onThumbnailCacheSettingsChanged,
} from "./thumbnailCacheSettings.js";

describe("thumbnailCacheSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getThumbnailCacheMaxSize", () => {
    test("returns default value when no setting exists", ({ expect }) => {
      const size = getThumbnailCacheMaxSize();
      expect(size).toBe(1000);
    });

    test("returns stored value from localStorage", ({ expect }) => {
      localStorage.setItem("ef-thumbnail-cache-max-size", "500");
      const size = getThumbnailCacheMaxSize();
      expect(size).toBe(500);
    });

    test("returns default for invalid stored value", ({ expect }) => {
      localStorage.setItem("ef-thumbnail-cache-max-size", "invalid");
      const size = getThumbnailCacheMaxSize();
      expect(size).toBe(1000);
    });

    test("returns default for negative values", ({ expect }) => {
      localStorage.setItem("ef-thumbnail-cache-max-size", "-100");
      const size = getThumbnailCacheMaxSize();
      expect(size).toBe(1000);
    });

    test("handles localStorage unavailable gracefully", ({ expect }) => {
      // Mock localStorage to throw
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error("localStorage unavailable");
      };

      const size = getThumbnailCacheMaxSize();
      expect(size).toBe(1000);

      localStorage.getItem = originalGetItem;
    });
  });

  describe("setThumbnailCacheMaxSize", () => {
    test("stores value in localStorage", ({ expect }) => {
      setThumbnailCacheMaxSize(500);
      const stored = localStorage.getItem("ef-thumbnail-cache-max-size");
      expect(stored).toBe("500");
    });

    test("dispatches settings changed event", ({ expect }) => {
      return new Promise<void>((resolve) => {
        window.addEventListener(
          "ef-thumbnail-cache-settings-changed",
          (event) => {
            const detail = (event as CustomEvent).detail;
            expect(detail.maxSize).toBe(500);
            resolve();
          },
          { once: true },
        );

        setThumbnailCacheMaxSize(500);
      });
    });

    test("handles localStorage unavailable gracefully", ({ expect }) => {
      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error("localStorage unavailable");
      };

      // Should not throw
      expect(() => setThumbnailCacheMaxSize(500)).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe("onThumbnailCacheSettingsChanged", () => {
    test("calls callback when settings change", ({ expect }) => {
      return new Promise<void>((resolve) => {
        const unsubscribe = onThumbnailCacheSettingsChanged((detail) => {
          expect(detail.maxSize).toBe(750);
          unsubscribe();
          resolve();
        });

        setThumbnailCacheMaxSize(750);
      });
    });

    test("unsubscribe prevents further callbacks", ({ expect }) => {
      let callCount = 0;

      const unsubscribe = onThumbnailCacheSettingsChanged(() => {
        callCount++;
      });

      setThumbnailCacheMaxSize(500);
      unsubscribe();
      setThumbnailCacheMaxSize(600);

      // Wait a bit to ensure no additional calls
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(callCount).toBe(1);
          resolve();
        }, 50);
      });
    });
  });
});
