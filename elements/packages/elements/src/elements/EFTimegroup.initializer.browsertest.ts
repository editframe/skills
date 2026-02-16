/**
 * Tests for EFTimegroup initializer behavior.
 * Ensures initializer runs once on prime timeline and once on each clone.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EFTimegroup } from "./EFTimegroup.js";

describe("EFTimegroup initializer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("should run initializer on prime timeline when set before connection", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    const initializerFn = vi.fn();
    
    // Set initializer BEFORE connecting
    tg.initializer = initializerFn;
    
    // Connect to DOM
    container.appendChild(tg);
    await tg.updateComplete;
    
    // Initializer should have run once
    expect(initializerFn).toHaveBeenCalledTimes(1);
    expect(initializerFn).toHaveBeenCalledWith(tg);
  });

  it("should NOT run initializer on prime timeline when set after connection", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    const initializerFn = vi.fn();
    
    // Connect to DOM FIRST
    container.appendChild(tg);
    await tg.updateComplete;
    
    // Set initializer AFTER connection
    tg.initializer = initializerFn;
    await tg.updateComplete;
    
    // Initializer should NOT run on prime timeline (already connected)
    // It's stored for createRenderClone to use
    expect(initializerFn).toHaveBeenCalledTimes(0);
  });

  it("should only run initializer once even if set multiple times", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    const initializerFn1 = vi.fn();
    const initializerFn2 = vi.fn();
    
    // Set first initializer before connection
    tg.initializer = initializerFn1;
    container.appendChild(tg);
    await tg.updateComplete;
    
    // First initializer ran on connection
    expect(initializerFn1).toHaveBeenCalledTimes(1);
    
    // Set second initializer after connection - replaces first but doesn't run
    tg.initializer = initializerFn2;
    await tg.updateComplete;
    
    // First initializer still only called once, second not called (set after connection)
    expect(initializerFn1).toHaveBeenCalledTimes(1);
    expect(initializerFn2).toHaveBeenCalledTimes(0);
  });

  it("should use initializer set after connection for createRenderClone", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    const initializerFn = vi.fn();
    
    // Connect to DOM FIRST
    container.appendChild(tg);
    await tg.updateComplete;
    
    // Set initializer AFTER connection (doesn't run on prime)
    tg.initializer = initializerFn;
    await tg.updateComplete;
    
    expect(initializerFn).toHaveBeenCalledTimes(0);
    
    // Create render clone - initializer should run on the clone
    const { clone, cleanup } = await tg.createRenderClone();
    
    // Initializer should have run on clone
    expect(initializerFn).toHaveBeenCalledTimes(1);
    expect(initializerFn).toHaveBeenCalledWith(clone);
    
    cleanup();
  });

  it("should run initializer on render clones", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    const initializerFn = vi.fn();
    
    tg.initializer = initializerFn;
    container.appendChild(tg);
    await tg.updateComplete;
    
    // Prime timeline ran initializer
    expect(initializerFn).toHaveBeenCalledTimes(1);
    const primeTimeline = initializerFn.mock.calls[0]![0];
    expect(primeTimeline).toBe(tg);
    
    // Create render clone
    const { clone, cleanup } = await tg.createRenderClone();
    
    // Clone should have run initializer too (total 2 calls)
    expect(initializerFn).toHaveBeenCalledTimes(2);
    const cloneInstance = initializerFn.mock.calls[1]![0];
    expect(cloneInstance).toBe(clone);
    expect(cloneInstance).not.toBe(tg);
    
    cleanup();
  });

  it("should work with React-style initializers that replace the DOM", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    let cloneReplaced = false;
    
    // Simulate React-style initializer that replaces the clone
    tg.initializer = (instance) => {
      if (instance !== tg) {
        // This is a clone - simulate React replacing it
        const container = instance.parentElement;
        instance.remove();
        const newTg = document.createElement("ef-timegroup") as EFTimegroup;
        container?.appendChild(newTg);
        cloneReplaced = true;
      }
    };
    
    container.appendChild(tg);
    await tg.updateComplete;
    
    // Create render clone
    const { clone, cleanup } = await tg.createRenderClone();
    
    // Clone should have been replaced
    expect(cloneReplaced).toBe(true);
    expect(clone).toBeInstanceOf(EFTimegroup);
    
    cleanup();
  });

  it("should handle initializer that throws error", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;

    tg.initializer = () => {
      throw new Error("Initializer error");
    };

    // Initializer errors fire asynchronously via updateComplete.then(),
    // so they become unhandled rejections rather than rejecting updateComplete.
    const errorPromise = new Promise<Error>((resolve) => {
      const handler = (e: PromiseRejectionEvent) => {
        e.preventDefault();
        window.removeEventListener("unhandledrejection", handler);
        resolve(e.reason);
      };
      window.addEventListener("unhandledrejection", handler);
    });

    container.appendChild(tg);
    await tg.updateComplete;

    const error = await errorPromise;
    expect(error.message).toContain("Initializer error");
  });

  it("should reject async initializers", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;

    // @ts-expect-error - intentionally testing invalid usage
    tg.initializer = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    };

    const errorPromise = new Promise<Error>((resolve) => {
      const handler = (e: PromiseRejectionEvent) => {
        e.preventDefault();
        window.removeEventListener("unhandledrejection", handler);
        resolve(e.reason);
      };
      window.addEventListener("unhandledrejection", handler);
    });

    container.appendChild(tg);
    await tg.updateComplete;

    const error = await errorPromise;
    expect(error.message).toContain("must be synchronous");
  });
});
