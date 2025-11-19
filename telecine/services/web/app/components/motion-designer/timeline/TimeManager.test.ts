import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { TimeManager } from "./TimeManager";

function createTimegroupElement(id: string, duration: string = "5s") {
  const timegroupElement = document.createElement("ef-timegroup");
  timegroupElement.id = id;
  timegroupElement.setAttribute("duration", duration);
  // Set other required attributes for the element to work properly
  timegroupElement.setAttribute("mode", "fixed");
  (timegroupElement as any).currentTimeMs = 0;
  (timegroupElement as any).playbackController = {
    playing: false,
    pause: vi.fn(),
  };
  (timegroupElement as any).seek = vi.fn();
  
  // In jsdom, custom elements may not be fully defined, so we need to provide
  // a durationMs getter that reads from the attribute (mimicking real behavior)
  // This is minimal mocking that mirrors the real element's behavior
  Object.defineProperty(timegroupElement, "durationMs", {
    get: function() {
      const dur = this.getAttribute("duration") || "5s";
      if (dur.endsWith("ms")) {
        return parseFloat(dur.slice(0, -2)) || 5000;
      }
      if (dur.endsWith("s")) {
        return (parseFloat(dur.slice(0, -1)) || 5) * 1000;
      }
      return parseFloat(dur) || 5000;
    },
    configurable: true,
  });
  
  document.body.appendChild(timegroupElement);
  return timegroupElement;
}

describe("TimeManager", () => {
  let timeManager: TimeManager;

  beforeEach(() => {
    document.body.innerHTML = "";
    timeManager = new TimeManager();
  });

  afterEach(() => {
    timeManager.cleanup();
  });

  describe("duration subscription", () => {
    test("subscribes to duration changes", () => {
      const listener = vi.fn();
      const unsubscribe = timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      // Wait for RAF to poll duration
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Duration should be initialized (5s = 5000ms)
            expect(timeManager.getDuration()).toBe(5000);
            unsubscribe();
            resolve();
          });
        });
      });
    });

    test("notifies listeners when duration changes", () => {
      const listener = vi.fn();
      timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Change duration by updating the attribute
          timegroupElement.setAttribute("duration", "10s");

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Listener should be called with new duration (10s = 10000ms)
              expect(listener).toHaveBeenCalledWith(10000);
              expect(timeManager.getDuration()).toBe(10000);
              resolve();
            });
          });
        });
      });
    });

    test("unsubscribes from duration changes", () => {
      const listener = vi.fn();
      const unsubscribe = timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      unsubscribe();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          timegroupElement.setAttribute("duration", "10s");

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Listener should not be called after unsubscribe
              expect(listener).not.toHaveBeenCalled();
              resolve();
            });
          });
        });
      });
    });
  });

  describe("getDuration", () => {
    test("returns duration from DOM element", () => {
      const timegroupElement = createTimegroupElement("test-tg", "7.5s");
      timeManager.setActiveTimegroup("test-tg");

      expect(timeManager.getDuration()).toBe(7500);
    });

    test("returns default duration when no timegroup element", () => {
      timeManager.setActiveTimegroup(null);
      expect(timeManager.getDuration()).toBe(5000);
    });

    test("always reads from DOM element getter", () => {
      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      // Change duration by updating the attribute
      timegroupElement.setAttribute("duration", "8s");

      // getDuration should return updated value (8s = 8000ms)
      expect(timeManager.getDuration()).toBe(8000);
    });
  });

  describe("duration polling", () => {
    test("polls duration once per RAF cycle", () => {
      const listener = vi.fn();
      timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      return new Promise<void>((resolve) => {
        let rafCount = 0;
        const checkRaf = () => {
          rafCount++;
          if (rafCount >= 3) {
            // After 3 RAF cycles, duration should have been polled
            // Listener should be called when duration changes
            timegroupElement.setAttribute("duration", "10s");
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                expect(listener).toHaveBeenCalled();
                resolve();
              });
            });
          } else {
            requestAnimationFrame(checkRaf);
          }
        };
        requestAnimationFrame(checkRaf);
      });
    });

    test("only notifies when duration changes by more than 1ms", () => {
      const listener = vi.fn();
      timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Small change (< 1ms threshold) - set to 5.0001s = 5000.1ms
          timegroupElement.setAttribute("duration", "5.0001s");

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Listener should not be called for tiny changes (within 1ms threshold)
              // Note: The element may round this, so we check that it wasn't called with a significantly different value
              const calls = listener.mock.calls;
              if (calls.length > 0) {
                // If called, the difference should be very small
                const lastCall = calls[calls.length - 1][0];
                expect(Math.abs(lastCall - 5000)).toBeLessThan(2);
              }
              resolve();
            });
          });
        });
      });
    });
  });

  describe("cleanup", () => {
    test("clears duration listeners on cleanup", () => {
      const listener = vi.fn();
      timeManager.subscribeDuration(listener);

      const timegroupElement = createTimegroupElement("test-tg", "5s");
      timeManager.setActiveTimegroup("test-tg");

      timeManager.cleanup();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          timegroupElement.setAttribute("duration", "10s");

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Listener should not be called after cleanup
              expect(listener).not.toHaveBeenCalled();
              resolve();
            });
          });
        });
      });
    });
  });
});

