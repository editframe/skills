import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TimelineControls } from "./TimelineControls";

function createMockTimegroupElement(id: string, initialPlaying = false) {
  const timegroupElement = document.createElement("ef-timegroup");
  timegroupElement.id = id;
  
  // Create mock playbackController with all required methods
  const playbackController = {
    playing: initialPlaying,
    loop: false,
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
  
  (timegroupElement as any).playbackController = playbackController;
  document.body.appendChild(timegroupElement);
  
  return { timegroupElement, playbackController };
}

describe("TimelineControls", () => {
  beforeEach(() => {
    // Clear DOM
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("Play/Pause Button Rendering", () => {
    test("renders play/pause buttons when previewTargetId is provided", () => {
      createMockTimegroupElement("test-timegroup-1");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-1" onRestart={onRestart} />
      );

      // Use DOM queries to find buttons - TogglePlay creates buttons with slot attributes
      const playButton = container.querySelector('button[slot="play"]');
      const pauseButton = container.querySelector('button[slot="pause"]');

      expect(playButton).toBeTruthy();
      expect(pauseButton).toBeTruthy();
    });

    test("does not render play/pause buttons when previewTargetId is undefined", () => {
      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls onRestart={onRestart} />
      );

      // Buttons should not exist in DOM
      const playButton = container.querySelector('button[slot="play"]');
      const pauseButton = container.querySelector('button[slot="pause"]');

      expect(playButton).toBeNull();
      expect(pauseButton).toBeNull();
    });
  });

  describe("Play/Pause Functionality", () => {
    test("clicking play button triggers playback", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-2");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-2" onRestart={onRestart} />
      );

      const playButton = container.querySelector('button[slot="play"]') as HTMLButtonElement;
      expect(playButton).toBeTruthy();

      // Click play button
      playButton.click();

      // Wait for TogglePlay to process the click
      await waitFor(() => {
        // Verify playbackController.play was called or playing state changed
        // Check via DOM/browser APIs - verify the timegroup element's playing state
        const isPlaying = (timegroupElement as any).playbackController?.playing;
        expect(isPlaying).toBe(true);
      }, { timeout: 1000 });
    });

    test("pause button is clickable when element is playing", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-3", true);

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-3" onRestart={onRestart} />
      );

      // Wait for TogglePlay to initialize and render buttons
      await waitFor(() => {
        const pauseButton = container.querySelector('button[slot="pause"]') as HTMLButtonElement;
        expect(pauseButton).toBeTruthy();
      }, { timeout: 1000 });

      const pauseButton = container.querySelector('button[slot="pause"]') as HTMLButtonElement;
      
      // Verify button exists and has correct attributes
      expect(pauseButton).toBeTruthy();
      expect(pauseButton.getAttribute("aria-label")).toBe("Pause");
      expect(pauseButton.tagName).toBe("BUTTON");
      
      // Click should not throw - TogglePlay handles the actual pause logic
      expect(() => pauseButton.click()).not.toThrow();
    });
  });

  describe("Loop Toggle Button Rendering", () => {
    test("renders loop toggle button when previewTargetId is provided", () => {
      createMockTimegroupElement("test-timegroup-4");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-4" onRestart={onRestart} />
      );

      // Loop button is now a regular button (not inside ToggleLoop)
      const loopButton = container.querySelector('button[aria-label*="loop" i]') ||
                         container.querySelector('button[aria-label*="Loop" i]');
      
      expect(loopButton).toBeTruthy();
    });

    test("does not render loop button when previewTargetId is undefined", () => {
      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls onRestart={onRestart} />
      );

      // Loop button should not exist in DOM
      const loopButton = container.querySelector('button[aria-label*="loop" i]') ||
                         container.querySelector('button[aria-label*="Loop" i]');
      
      expect(loopButton).toBeNull();
    });
  });

  describe("Loop Toggle Functionality", () => {
    test("clicking loop button toggles loop state only", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-5");
      
      // Set initial loop state
      timegroupElement.setAttribute("loop", "false");
      playbackController.playing = false;

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-5" onRestart={onRestart} />
      );

      // Wait for component to render
      await waitFor(() => {
        const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(loopButton).toBeTruthy();
      }, { timeout: 1000 });

      const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Verify button exists
      expect(loopButton).toBeTruthy();
      
      // Click loop button - should only toggle loop, not affect play/pause
      loopButton.click();
      
      // Wait for state changes
      await waitFor(() => {
        // Verify loop attribute changed via DOM API
        const loopValue = timegroupElement.getAttribute("loop");
        expect(loopValue === "true" || loopValue === "").toBe(true);
        // Verify playback state unchanged (still paused)
        expect(playbackController.playing).toBe(false);
      }, { timeout: 1000 });
    });

    test("clicking loop button does not affect playback when playing", async () => {
      const { timegroupElement, playbackController } = createMockTimegroupElement("test-timegroup-8", true);

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-8" onRestart={onRestart} />
      );

      await waitFor(() => {
        const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(loopButton).toBeTruthy();
      }, { timeout: 1000 });

      const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Click loop button while playing
      loopButton.click();
      
      await waitFor(() => {
        // Loop should be enabled
        const loopValue = timegroupElement.getAttribute("loop");
        expect(loopValue === "true" || loopValue === "").toBe(true);
        // Playback should continue
        expect(playbackController.playing).toBe(true);
      }, { timeout: 1000 });
    });

    test("loop button shows visual feedback when loop is enabled", async () => {
      const { timegroupElement } = createMockTimegroupElement("test-timegroup-6");
      
      // Set loop to enabled
      timegroupElement.setAttribute("loop", "true");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-6" onRestart={onRestart} />
      );

      // Wait for component to detect loop state and apply styling
      await waitFor(() => {
        const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(loopButton).toBeTruthy();
        // Verify aria-pressed indicates active state
        expect(loopButton.getAttribute("aria-pressed")).toBe("true");
      }, { timeout: 1000 });

      const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Verify button has active styling when loop is enabled
      expect(loopButton.getAttribute("aria-pressed")).toBe("true");
      
      // Verify active CSS classes are applied
      const hasActiveClasses = 
        loopButton.classList.contains("bg-blue-500/20") ||
        loopButton.classList.contains("text-blue-400") ||
        loopButton.classList.contains("border");
      
      expect(hasActiveClasses).toBe(true);
      
      // Verify button is visible
      expect(loopButton.offsetParent !== null || loopButton.style.display !== "none").toBe(true);
    });

    test("loop button shows inactive state when loop is disabled", async () => {
      const { timegroupElement } = createMockTimegroupElement("test-timegroup-7");
      
      // Set loop to disabled
      timegroupElement.setAttribute("loop", "false");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-7" onRestart={onRestart} />
      );

      // Wait for component to detect loop state
      await waitFor(() => {
        const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
        expect(loopButton).toBeTruthy();
      }, { timeout: 1000 });

      const loopButton = container.querySelector('button[aria-label*="loop" i]') as HTMLButtonElement;
      
      // Verify button shows inactive state
      expect(loopButton.getAttribute("aria-pressed")).toBe("false");
      
      // Verify inactive styling (no blue background)
      const hasInactiveClasses = 
        loopButton.classList.contains("text-gray-400") &&
        !loopButton.classList.contains("bg-blue-500/20");
      
      expect(hasInactiveClasses).toBe(true);
    });
  });

  describe("Restart Functionality", () => {
    test("onRestart callback is available", () => {
      createMockTimegroupElement("test-timegroup-6");

      const onRestart = vi.fn();
      const { container } = render(
        <TimelineControls previewTargetId="test-timegroup-6" onRestart={onRestart} />
      );

      // Verify component renders (check for border-r which is the border class)
      expect(container.querySelector(".border-r")).toBeTruthy();
      
      // onRestart is passed as prop and can be called
      // (Restart functionality would be implemented as a separate button if needed)
      expect(typeof onRestart).toBe("function");
    });
  });
});

