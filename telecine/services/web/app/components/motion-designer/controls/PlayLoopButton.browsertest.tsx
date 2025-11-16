import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PlayLoopButton } from "./PlayLoopButton";

function createMockTimegroupElement(id: string, initialLoop = false, initialPlaying = false) {
  const timegroupElement = document.createElement("ef-timegroup");
  timegroupElement.id = id;
  
  const playbackController = {
    playing: initialPlaying,
    loop: initialLoop,
    play: vi.fn(() => {
      playbackController.playing = true;
    }),
    pause: vi.fn(() => {
      playbackController.playing = false;
    }),
    remove: vi.fn(),
    setPendingAudioContext: vi.fn(),
    setLoop: vi.fn((value: boolean) => {
      playbackController.loop = value;
    }),
  };
  
  if (initialLoop) {
    timegroupElement.setAttribute("loop", "true");
  } else {
    timegroupElement.setAttribute("loop", "false");
  }
  
  (timegroupElement as any).playbackController = playbackController;
  document.body.appendChild(timegroupElement);
  
  return { timegroupElement, playbackController };
}

describe("PlayLoopButton", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders loop button", () => {
      createMockTimegroupElement("test-timegroup-1");

      const { container } = render(
        <PlayLoopButton targetId="test-timegroup-1" />
      );

      const button = container.querySelector('button[aria-label*="loop" i]');
      expect(button).toBeTruthy();
    });

    test("applies custom className", () => {
      createMockTimegroupElement("test-timegroup-2");

      const { container } = render(
        <PlayLoopButton 
          targetId="test-timegroup-2" 
          className="custom-class test-class"
        />
      );

      const button = container.querySelector('button[aria-label*="loop" i]');
      expect(button?.classList.contains("custom-class")).toBe(true);
      expect(button?.classList.contains("test-class")).toBe(true);
    });

    test("applies activeClassName when loop is enabled", async () => {
      createMockTimegroupElement("test-timegroup-3", true);

      const { container } = render(
        <PlayLoopButton 
          targetId="test-timegroup-3"
          className="base-class"
          activeClassName="active-class"
        />
      );

      await waitFor(() => {
        const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(button?.classList.contains("active-class")).toBe(true);
      }, { timeout: 1000 });
    });
  });

  describe("Functionality", () => {
    test("clicking button toggles loop state only", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-4", false, false);

      const { container } = render(
        <PlayLoopButton targetId="test-timegroup-4" />
      );

      await waitFor(() => {
        const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(button).toBeTruthy();
      }, { timeout: 1000 });

      const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Click button - should only toggle loop, not affect play/pause
      button.click();

      // Wait for state changes
      await waitFor(() => {
        const loopValue = timegroupElement.getAttribute("loop");
        expect(loopValue === "true" || loopValue === "").toBe(true);
        // Playback state should remain unchanged
        expect(playbackController.playing).toBe(false);
      }, { timeout: 1000 });
    });

    test("clicking button does not affect playback state when playing", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-5", false, true);

      const { container } = render(
        <PlayLoopButton targetId="test-timegroup-5" />
      );

      await waitFor(() => {
        const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(button).toBeTruthy();
      }, { timeout: 1000 });

      const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Click button - should only toggle loop, keep playing
      button.click();

      await waitFor(() => {
        const loopValue = timegroupElement.getAttribute("loop");
        expect(loopValue === "true" || loopValue === "").toBe(true);
        // Playback should continue
        expect(playbackController.playing).toBe(true);
      }, { timeout: 1000 });
    });

    test("updates aria-pressed based on loop state", async () => {
      const { timegroupElement } = createMockTimegroupElement("test-timegroup-6", true);

      const { container } = render(
        <PlayLoopButton targetId="test-timegroup-6" />
      );

      await waitFor(() => {
        const button = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(button?.getAttribute("aria-pressed")).toBe("true");
      }, { timeout: 1000 });
    });
  });
});

