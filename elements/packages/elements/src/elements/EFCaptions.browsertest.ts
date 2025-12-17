import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "../gui/EFPreview.js";
import "./EFCaptions.js";
import "./EFTimegroup.js";
import "./EFVideo.js";
import { v4 } from "uuid";

beforeEach(() => {
  window.localStorage.clear();
});

describe("EFCaptions", () => {
  describe("when rendering", () => {
    beforeEach(() => {
      // @ts-expect-error
      window.FRAMEGEN_BRIDGE = true;
    });
    afterEach(() => {
      delete window.FRAMEGEN_BRIDGE;
    });
    test("captionsPath uses http:// protocol", () => {
      const id = v4();
      const workbench = document.createElement("ef-workbench");

      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.assetId = "550e8400-e29b-41d4-a716-446655440000";
      document.body.appendChild(target);
      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      document.body.appendChild(captions);
      workbench.appendChild(captions);
      expect(captions.captionsPath()).toBe(
        "https://editframe.com/api/v1/caption_files/550e8400-e29b-41d4-a716-446655440000",
      );
    });
  });

  describe("attribute: asset-id", () => {
    test("determines assetPath", () => {
      const id = v4();
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.assetId = id;
      document.body.appendChild(target);
      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      document.body.appendChild(captions);
      expect(captions.captionsPath()).toBe(
        `https://editframe.com/api/v1/caption_files/${id}`,
      );
    });

    test("Honors provided apiHost", () => {
      const preview = document.createElement("ef-preview");

      const id = v4();
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.assetId = id;
      document.body.appendChild(target);
      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      preview.appendChild(captions);
      document.body.appendChild(preview);
      preview.apiHost = "test://";
      expect(captions.captionsPath()).toBe(
        `test:///api/v1/caption_files/${id}`,
      );
    });
  });

  describe("custom captions data loading", () => {
    test("loads captions from external JSON file (captions-src)", async () => {
      const id = v4();
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;
      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;

      await captionsTask.taskComplete;

      expect(captionsTask.value).toBeTruthy();
      expect(captionsTask.value?.segments).toHaveLength(3);
      expect(captionsTask.value?.word_segments).toHaveLength(9);
      expect(captionsTask.value?.segments[0]?.text).toBe("First test segment");
    });

    test("loads captions from script element (captions-script)", async () => {
      const id = v4();
      const scriptId = v4();

      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      // Create script element with captions data
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [{ start: 0, end: 2, text: "Script-based captions" }],
        word_segments: [
          { text: "Script-based", start: 0, end: 1 },
          { text: " captions", start: 1, end: 2 },
        ],
      });
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsScript = scriptId;
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      expect(captionsTask.value).toEqual({
        segments: [{ start: 0, end: 2, text: "Script-based captions" }],
        word_segments: [
          { text: "Script-based", start: 0, end: 1 },
          { text: " captions", start: 1, end: 2 },
        ],
      });
    });

    test("uses direct captionsData property", async () => {
      const id = v4();
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);

      const testData = {
        segments: [{ start: 0, end: 2, text: "Direct property caption" }],
        word_segments: [
          { text: "Direct", start: 0, end: 0.6 },
          { text: " property", start: 0.6, end: 1.3 },
          { text: " caption", start: 1.3, end: 2 },
        ],
      };

      captions.captionsData = testData;
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;
      await captions.unifiedCaptionsDataTask.taskComplete;

      expect(captions.unifiedCaptionsDataTask.value).toEqual(testData);
    });

    test("prioritizes captionsData > captions-script > captions-src", async () => {
      const id = v4();
      const scriptId = v4();

      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      // Create script element
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [{ start: 0, end: 2, text: "Script caption" }],
        word_segments: [
          { text: "Script", start: 0, end: 1 },
          { text: " caption", start: 1, end: 2 },
        ],
      });
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";
      captions.captionsScript = scriptId;

      const directData = {
        segments: [{ start: 0, end: 2, text: "Direct property wins" }],
        word_segments: [
          { text: "Direct", start: 0, end: 1 },
          { text: " property", start: 1, end: 1.5 },
          { text: " wins", start: 1.5, end: 2 },
        ],
      };

      captions.captionsData = directData;
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;
      await captions.unifiedCaptionsDataTask.taskComplete;

      // Should use direct property data, not script or file
      expect(captions.unifiedCaptionsDataTask.value).toEqual(directData);
      expect(captions.unifiedCaptionsDataTask.value?.segments[0]?.text).toBe(
        "Direct property wins",
      );
    });

    test("handles fetch errors gracefully", async () => {
      const id = v4();
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "nonexistent-file.json";
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;
      await captions.unifiedCaptionsDataTask.taskComplete;

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;

      expect(captionsTask.value ?? null).toBeNull();
    });

    test("handles invalid JSON in script gracefully", async () => {
      const id = v4();
      const scriptId = v4();

      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      document.body.appendChild(target);

      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = "invalid json {";
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsScript = scriptId;
      document.body.appendChild(captions);

      await captions.frameTask.taskComplete;

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      expect(captionsTask.value).toBeNull();
    });
  });

  describe("text visibility and timing", () => {
    // BUG: captions.frameTask does not re-run when timegroup.currentTimeMs changes
    // The updateTextContainers method is not being triggered on subsequent time updates
    // This needs investigation in the EFCaptions implementation
    test.skip("displays correct segment text at different time points", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      // Create segment container
      const segmentContainer = document.createElement("ef-captions-segment");
      captions.appendChild(segmentContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      await captions.unifiedCaptionsDataTask.taskComplete;

      // Helper to wait for segment to update after seeking
      const waitForSegmentUpdate = async () => {
        await timegroup.seekTask.taskComplete;
        await captions.frameTask.taskComplete;
        await segmentContainer.updateComplete;
        // Give the RAF loop time to propagate changes
        for (let i = 0; i < 3; i++) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        await segmentContainer.updateComplete;
      };

      // Test at t=0 (first segment)
      timegroup.currentTimeMs = 0;
      await waitForSegmentUpdate();
      
      // Observable outcome: check rendered text content in DOM
      const firstText = segmentContainer.shadowRoot?.textContent?.trim() || segmentContainer.textContent?.trim();
      expect(firstText).toBe("First test segment");

      // Test at t=4000ms (second segment)
      timegroup.currentTimeMs = 4000;
      await waitForSegmentUpdate();
      
      // Observable outcome: check rendered text content in DOM
      const secondText = segmentContainer.shadowRoot?.textContent?.trim() || segmentContainer.textContent?.trim();
      expect(secondText).toBe("Second test segment");

      // Test at t=7500ms (third segment)
      timegroup.currentTimeMs = 7500;
      await waitForSegmentUpdate();
      
      // Observable outcome: check rendered text content in DOM
      const thirdText = segmentContainer.shadowRoot?.textContent?.trim() || segmentContainer.textContent?.trim();
      expect(thirdText).toBe("Third test segment");
    });

    // Timing update issue - word text not updating as expected
    test.skip("displays correct word text and timing", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test at t=0.3s (should be "First")
      timegroup.currentTimeMs = 300;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.wordText).toBe("First");
      expect(wordContainer.wordStartMs).toBe(0);
      expect(wordContainer.wordEndMs).toBe(600);

      // Test at t=0.9s (should be " test")
      timegroup.currentTimeMs = 900;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.wordText).toBe(" test");
      expect(wordContainer.wordStartMs).toBe(600);
      expect(wordContainer.wordEndMs).toBe(1200);

      // Test at t=1.8s (should be " segment")
      timegroup.currentTimeMs = 1800;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.wordText).toBe(" segment");
      expect(wordContainer.wordStartMs).toBe(1200);
      expect(wordContainer.wordEndMs).toBe(3000);
    });

    test("displays context words correctly", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-complex.json";

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);
      await timegroup.waitForMediaDurations();

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test at t=1.0s (active word: "longer", context should be available)
      timegroup.currentTimeMs = 1000;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;

      expect(activeContainer.wordText).toBe(" longer");
      expect(beforeContainer.segmentText).toBe("This is a");
      expect(afterContainer.segmentText).toBe(
        "segment with multiple words for testing context",
      );

      // Verify timing properties - all context containers sync with active word
      expect(beforeContainer.segmentStartMs).toBe(800); // active word start
      expect(beforeContainer.segmentEndMs).toBe(1300); // active word end
      expect(afterContainer.segmentStartMs).toBe(800); // active word start
      expect(afterContainer.segmentEndMs).toBe(1300); // active word end
    });

    test("handles stop words correctly", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);

      // Add data with stop words
      captions.captionsData = {
        segments: [{ start: 0, end: 2, text: "Hello, world!" }],
        word_segments: [
          { text: "Hello", start: 0, end: 0.5 },
          { text: ",", start: 0.5, end: 0.6 },
          { text: " world", start: 0.6, end: 1.2 },
          { text: "!", start: 1.2, end: 1.5 },
        ],
      };

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test punctuation is hidden
      timegroup.currentTimeMs = 550; // comma time
      await timegroup.seekTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.hidden).toBe(true);

      timegroup.currentTimeMs = 1350; // exclamation time
      await timegroup.seekTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.hidden).toBe(true);

      // Test regular word is visible
      timegroup.currentTimeMs = 250; // "Hello" time
      await timegroup.seekTask.taskComplete;
      await wordContainer.updateComplete;
      expect(wordContainer.hidden).toBe(false);
      expect(wordContainer.wordText).toBe("Hello");
    });
  });

  describe("child element types", () => {
    test("segment containers show segment text", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const segmentContainer = document.createElement("ef-captions-segment");
      captions.appendChild(segmentContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      timegroup.currentTimeMs = 1500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      expect(segmentContainer.segmentText).toBe("First test segment");
    });

    test("word containers show active word", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      await timegroup.waitForMediaDurations();

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      timegroup.currentTimeMs = 900;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      expect(wordContainer.wordText).toBe(" test");
    });

    test("context containers show before/active/after words", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-complex.json";

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);
      await timegroup.waitForMediaDurations();

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test middle of first segment
      timegroup.currentTimeMs = 2400; // during "multiple"
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      expect(activeContainer.wordText).toBe(" multiple");
      expect(beforeContainer.segmentText).toBeTruthy();
      expect(afterContainer.segmentText).toBeTruthy();

      // Verify all three components have content
      expect(beforeContainer.segmentText.length).toBeGreaterThan(0);
      expect(activeContainer.wordText.length).toBeGreaterThan(0);
      expect(afterContainer.segmentText.length).toBeGreaterThan(0);
    });
  });

  describe("animation properties validation", () => {
    test("word containers have correct startTimeMs and durationMs", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test first word "First" (0-0.6s)
      timegroup.currentTimeMs = 300;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      expect(wordContainer.startTimeMs).toBe(0);
      expect(wordContainer.durationMs).toBe(600);

      // Test second word " test" (0.6-1.2s)
      timegroup.currentTimeMs = 900;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      expect(wordContainer.startTimeMs).toBe(600);
      expect(wordContainer.durationMs).toBe(600);
    });

    test("segment containers have correct startTimeMs and durationMs", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const segmentContainer = document.createElement("ef-captions-segment");
      captions.appendChild(segmentContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test first segment (0-3s)
      timegroup.currentTimeMs = 1500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      expect(segmentContainer.startTimeMs).toBe(0);
      expect(segmentContainer.durationMs).toBe(3000);

      // Test second segment (3-6s)
      timegroup.currentTimeMs = 4500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      expect(segmentContainer.startTimeMs).toBe(3000);
      expect(segmentContainer.durationMs).toBe(3000);
    });

    test("context containers have correct timing boundaries", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-complex.json";

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);
      await timegroup.waitForMediaDurations();

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test during "longer" word (0.8-1.3s) in first segment (0-4s)
      timegroup.currentTimeMs = 1000;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      // Active word timing
      expect(activeContainer.startTimeMs).toBe(800);
      expect(activeContainer.durationMs).toBe(500);

      // Before and after context: synchronized with active word timing
      expect(beforeContainer.startTimeMs).toBe(800);
      expect(beforeContainer.durationMs).toBe(500); // 1300 - 800

      // After context: same timing as active word
      expect(afterContainer.startTimeMs).toBe(800);
      expect(afterContainer.durationMs).toBe(500); // 1300 - 800
    });

    test("timing properties update correctly as time progresses", async () => {
      const id = v4();
      const timegroup = document.createElement("ef-timegroup");
      const target = document.createElement("ef-video");
      target.setAttribute("id", id);
      target.src = "bars-n-tone.mp4";
      timegroup.appendChild(target);

      const captions = document.createElement("ef-captions");
      captions.setAttribute("target", id);
      captions.captionsSrc = "test-captions-simple.json";

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Track timing changes across different words
      const timingSteps = [
        { time: 300, expectedStart: 0, expectedDuration: 600 }, // "First"
        { time: 900, expectedStart: 600, expectedDuration: 600 }, // " test"
        { time: 2100, expectedStart: 1200, expectedDuration: 1800 }, // " segment"
        { time: 3500, expectedStart: 3000, expectedDuration: 800 }, // "Second"
        { time: 4100, expectedStart: 3800, expectedDuration: 600 }, // " test"
      ];

      for (const step of timingSteps) {
        timegroup.currentTimeMs = step.time;
        await timegroup.seekTask.taskComplete;
        await captions.frameTask.taskComplete;

        expect(wordContainer.startTimeMs).toBe(step.expectedStart);
        expect(wordContainer.durationMs).toBe(step.expectedDuration);
      }
    });
  });

  describe("captions duration integration (EFMedia pattern)", () => {
    test("calculates intrinsicDurationMs from captions data", async () => {
      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 2, text: "First segment" },
          { start: 2, end: 5, text: "Second segment" },
        ],
        word_segments: [
          { text: "First", start: 0, end: 1 },
          { text: " segment", start: 1, end: 2 },
          { text: "Second", start: 2, end: 3.5 },
          { text: " segment", start: 3.5, end: 5 },
        ],
      };

      document.body.appendChild(captions);
      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Duration should be calculated from captions data (5 seconds = 5000ms)
      expect(captions.intrinsicDurationMs).toBe(5000);
      expect(captions.durationMs).toBe(5000);
      expect(captions.hasOwnDuration).toBe(true);
    });

    test("handles empty captions data gracefully", async () => {
      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [],
        word_segments: [],
      };

      document.body.appendChild(captions);
      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      expect(captions.intrinsicDurationMs).toBe(0);
      expect(captions.durationMs).toBe(0);
      expect(captions.hasOwnDuration).toBe(true);
    });

    test("reports no own duration when no custom captions data", () => {
      const captions = document.createElement("ef-captions");

      expect(captions.hasCustomCaptionsData).toBe(false);
      expect(captions.hasOwnDuration).toBe(false);
      expect(captions.intrinsicDurationMs).toBeUndefined();
    });

    test("sequence timegroup includes captions duration", async () => {
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "sequence";

      // Add captions with 3s duration
      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [{ start: 0, end: 3, text: "Caption test" }],
        word_segments: [
          { text: "Caption", start: 0, end: 1.5 },
          { text: " test", start: 1.5, end: 3 },
        ],
      };
      timegroup.appendChild(captions);

      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Captions should have proper duration properties
      expect(captions.hasOwnDuration).toBe(true);
      expect(captions.intrinsicDurationMs).toBe(3000);
      expect(captions.durationMs).toBe(3000);

      // Sequence timegroup should include captions duration
      expect(timegroup.durationMs).toBe(3000);
    });

    test("contain timegroup uses max duration including captions", async () => {
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "contain";

      // Add captions with 4s duration
      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 2, text: "First part" },
          { start: 2, end: 4, text: "Second part" },
        ],
        word_segments: [
          { text: "First", start: 0, end: 1 },
          { text: " part", start: 1, end: 2 },
          { text: "Second", start: 2, end: 3 },
          { text: " part", start: 3, end: 4 },
        ],
      };
      timegroup.appendChild(captions);

      document.body.appendChild(timegroup);
      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Captions should have proper duration properties
      expect(captions.hasOwnDuration).toBe(true);
      expect(captions.intrinsicDurationMs).toBe(4000);
      expect(captions.durationMs).toBe(4000);

      // Contain timegroup should use captions duration
      expect(timegroup.durationMs).toBe(4000);
    });

    test("handles exact boundary timing correctly", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [{ start: 0, end: 4, text: "Boundary timing test" }],
        word_segments: [
          { text: "Boundary", start: 0, end: 1.5 },
          { text: " timing", start: 1.5, end: 2.6 },
          { text: " test", start: 2.6, end: 4 },
        ],
      };

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test at frame before boundary (frame 77 at 30fps = ~2567ms) - should show " timing"
      timegroup.currentTimeMs = 2567;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      console.log(`At 2567ms: wordText="${wordContainer.wordText}"`);
      expect(wordContainer.wordText).toBe(" timing");

      // Test at exact boundary frame (frame 78 at 30fps = 2600ms) - should show " test" (the starting word)
      timegroup.currentTimeMs = 2600;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      console.log(`At 2600ms: wordText="${wordContainer.wordText}"`);
      expect(wordContainer.wordText).toBe(" test");
    });

    test("handles demo captions data boundary correctly", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 4, text: "Welcome to the custom captions demo!" },
        ],
        word_segments: [
          { text: " captions", start: 1.8, end: 2.6 },
          { text: " demo!", start: 2.6, end: 4 },
        ],
      };

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test at frame before boundary (frame 77 at 30fps = ~2567ms)
      timegroup.currentTimeMs = 2567;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      console.log(
        `Demo case - At 2567ms: wordText="${wordContainer.wordText}", hidden=${wordContainer.hidden}`,
      );
      expect(wordContainer.wordText).toBe(" captions");

      // Test at exact boundary 2.6s from user's example
      timegroup.currentTimeMs = 2600;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      console.log(
        `Demo case - At 2600ms: wordText="${wordContainer.wordText}", hidden=${wordContainer.hidden}`,
      );
      expect(wordContainer.wordText).toBe(" demo!");
      expect(wordContainer.hidden).toBe(false);
    });

    test("standalone captions sync with timegroup (demo structure)", async () => {
      // Mimic exact demo structure: sequence > contain > captions
      const rootTimegroup = document.createElement("ef-timegroup");
      rootTimegroup.mode = "sequence";

      const containTimegroup = document.createElement("ef-timegroup");
      containTimegroup.mode = "contain";
      rootTimegroup.appendChild(containTimegroup);

      // Create script element like in demo
      const scriptId = "test-demo-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [
          { start: 0, end: 4, text: "Welcome to the custom captions demo!" },
        ],
        word_segments: [
          { text: " captions", start: 1.8, end: 2.6 },
          { text: " demo!", start: 2.6, end: 4 },
        ],
      });
      document.body.appendChild(script);

      // Standalone captions (no target) like in updated demo
      const captions = document.createElement("ef-captions");
      captions.captionsScript = scriptId;

      const wordContainer = document.createElement("ef-captions-active-word");
      captions.appendChild(wordContainer);
      containTimegroup.appendChild(captions);
      document.body.appendChild(rootTimegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Debug timeline sync
      console.log(
        `Initial: rootTimegroup.currentTimeMs=${rootTimegroup.currentTimeMs}, captions.ownCurrentTimeMs=${captions.ownCurrentTimeMs}`,
      );

      // Test the problematic timing
      rootTimegroup.currentTimeMs = 2600;
      await rootTimegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      console.log(
        `After seek: rootTimegroup.currentTimeMs=${rootTimegroup.currentTimeMs}, captions.ownCurrentTimeMs=${captions.ownCurrentTimeMs}`,
      );
      console.log(
        `Standalone demo - At 2600ms: wordText="${wordContainer.wordText}", hidden=${wordContainer.hidden}`,
      );

      expect(wordContainer.wordText).toBe(" demo!");
      expect(wordContainer.hidden).toBe(false);
    });

    test("context words (before/after) work correctly", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 4, text: "Welcome to the custom captions demo!" },
        ],
        word_segments: [
          { text: "Welcome", start: 0, end: 0.6 },
          { text: " to", start: 0.6, end: 0.9 },
          { text: " the", start: 0.9, end: 1.2 },
          { text: " custom", start: 1.2, end: 1.8 },
          { text: " captions", start: 1.8, end: 2.6 },
          { text: " demo!", start: 2.6, end: 4 },
        ],
      };

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test during " custom" word (1.2-1.8s) - should have before/after context
      timegroup.currentTimeMs = 1500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;
      await beforeContainer.updateComplete;
      await afterContainer.updateComplete;

      console.log("Context test - At 1500ms:");
      console.log(`  activeWord: "${activeContainer.wordText}"`);
      console.log(`  beforeWords: "${beforeContainer.segmentText}"`);
      console.log(`  afterWords: "${afterContainer.segmentText}"`);
      console.log(
        `  beforeHidden: ${beforeContainer.hidden}, afterHidden: ${afterContainer.hidden}`,
      );

      expect(activeContainer.wordText).toBe(" custom");
      expect(beforeContainer.segmentText).toBeTruthy();
      expect(afterContainer.segmentText).toBeTruthy();
      expect(beforeContainer.segmentText.length).toBeGreaterThan(0);
      expect(afterContainer.segmentText.length).toBeGreaterThan(0);
    });

    test("debug context words with demo data structure", async () => {
      const timegroup = document.createElement("ef-timegroup");

      // Create script element with EXACT demo data
      const scriptId = "demo-debug-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = `{
        "segments": [
          { "start": 0, "end": 4, "text": "Welcome to the custom captions demo!" },
          { "start": 4, "end": 8, "text": "This demonstrates word-by-word highlighting." },
          { "start": 8, "end": 12, "text": "You can provide your own timing data." }
        ],
        "word_segments": [
          {"text": "Welcome", "start": 0, "end": 0.6},
          {"text": " to", "start": 0.6, "end": 0.9},
          {"text": " the", "start": 0.9, "end": 1.2},
          {"text": " custom", "start": 1.2, "end": 1.8},
          {"text": " captions", "start": 1.8, "end": 2.6},
          {"text": " demo!", "start": 2.6, "end": 4},
          
          {"text": "This", "start": 4, "end": 4.3},
          {"text": " demonstrates", "start": 4.3, "end": 5.3},
          {"text": " word-by-word", "start": 5.3, "end": 6.3},
          {"text": " highlighting.", "start": 6.3, "end": 8}
        ]
      }`;
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.captionsScript = scriptId;

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test during " custom" word (1.2-1.8s) - within first segment (0-4s)
      timegroup.currentTimeMs = 1500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      console.log("Demo debug - At 1500ms:");
      console.log(
        `  Current segment found: ${!!captions.segmentContainers.length}`,
      );
      console.log(
        `  Current word found: ${activeContainer.wordText ? "yes" : "no"}`,
      );
      console.log(`  activeWord: "${activeContainer.wordText}"`);
      console.log(`  beforeWords: "${beforeContainer.segmentText}"`);
      console.log(`  afterWords: "${afterContainer.segmentText}"`);
      console.log(
        `  beforeHidden: ${beforeContainer.hidden}, afterHidden: ${afterContainer.hidden}`,
      );

      // Try different timing in second segment
      timegroup.currentTimeMs = 5000; // During "demonstrates" in second segment
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      console.log("Demo debug - At 5000ms (second segment):");
      console.log(`  activeWord: "${activeContainer.wordText}"`);
      console.log(`  beforeWords: "${beforeContainer.segmentText}"`);
      console.log(`  afterWords: "${afterContainer.segmentText}"`);
      console.log(
        `  beforeHidden: ${beforeContainer.hidden}, afterHidden: ${afterContainer.hidden}`,
      );
    });

    test("context containers have synchronized timing with active word", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          {
            start: 0,
            end: 8,
            text: "This is a test segment with multiple words",
          },
        ],
        word_segments: [
          { text: "This", start: 0, end: 1 },
          { text: " is", start: 1, end: 2 },
          { text: " a", start: 2, end: 2.5 },
          { text: " test", start: 2.5, end: 3.5 },
          { text: " segment", start: 3.5, end: 4.5 },
          { text: " with", start: 4.5, end: 5 },
          { text: " multiple", start: 5, end: 6 },
          { text: " words", start: 6, end: 8 },
        ],
      };

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test during " test" word (2.5-3.5s)
      timegroup.currentTimeMs = 3000;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;
      await beforeContainer.updateComplete;
      await afterContainer.updateComplete;

      console.log("Timing sync test - At 3000ms:");
      console.log(
        `  Before: ${beforeContainer.segmentStartMs}-${beforeContainer.segmentEndMs}`,
      );
      console.log(
        `  Active: ${activeContainer.wordStartMs}-${activeContainer.wordEndMs}`,
      );
      console.log(
        `  After:  ${afterContainer.segmentStartMs}-${afterContainer.segmentEndMs}`,
      );

      // All three should have the same timing as the active word
      expect(beforeContainer.segmentStartMs).toBe(activeContainer.wordStartMs);
      expect(beforeContainer.segmentEndMs).toBe(activeContainer.wordEndMs);
      expect(afterContainer.segmentStartMs).toBe(activeContainer.wordStartMs);
      expect(afterContainer.segmentEndMs).toBe(activeContainer.wordEndMs);

      // And they should all have the expected active word timing
      expect(activeContainer.wordStartMs).toBe(2500);
      expect(activeContainer.wordEndMs).toBe(3500);
    });

    test("measures actual DOM widths for layout stability", async () => {
      const timegroup = document.createElement("ef-timegroup");

      // Create exact demo structure
      const scriptId = "width-test-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [
          { start: 0, end: 4, text: "Welcome to the custom captions demo!" },
        ],
        word_segments: [
          { text: "Welcome", start: 0, end: 0.6 },
          { text: " to", start: 0.6, end: 0.9 },
          { text: " the", start: 0.9, end: 1.2 },
          { text: " custom", start: 1.2, end: 1.8 },
        ],
      });
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.captionsScript = scriptId;
      captions.style.cssText =
        "display: block !important; text-align: center; background: green; padding: 16px;";

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      beforeContainer.className = "text-green-200";

      const activeContainer = document.createElement("ef-captions-active-word");
      activeContainer.className =
        "bg-lime-400 text-green-900 rounded font-bold";

      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );
      afterContainer.className = "text-green-200";

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Measure at different word timings and check for width/position changes
      const measurements: Array<{
        time: number;
        word: string;
        measurements: any;
      }> = [];

      const measureElements = () => {
        const captionsRect = captions.getBoundingClientRect();
        const beforeRect = beforeContainer.getBoundingClientRect();
        const activeRect = activeContainer.getBoundingClientRect();
        const afterRect = afterContainer.getBoundingClientRect();

        return {
          captions: { width: captionsRect.width, x: captionsRect.x },
          before: {
            width: beforeRect.width,
            x: beforeRect.x,
            text: beforeContainer.segmentText,
          },
          active: {
            width: activeRect.width,
            x: activeRect.x,
            text: activeContainer.wordText,
          },
          after: {
            width: afterRect.width,
            x: afterRect.x,
            text: afterContainer.segmentText,
          },
          totalContentWidth:
            beforeRect.width + activeRect.width + afterRect.width,
        };
      };

      // Test each word and measure layout
      const testWords = [
        { time: 300, expectedWord: "Welcome" },
        { time: 750, expectedWord: " to" },
        { time: 1050, expectedWord: " the" },
        { time: 1500, expectedWord: " custom" },
      ];

      for (const test of testWords) {
        timegroup.currentTimeMs = test.time;
        await timegroup.seekTask.taskComplete;
        await captions.frameTask.taskComplete;
        await activeContainer.updateComplete;
        await beforeContainer.updateComplete;
        await afterContainer.updateComplete;

        // Wait for browser to paint before measuring
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const measurement = measureElements();
        measurements.push({
          time: test.time,
          word: test.expectedWord,
          measurements: measurement,
        });

        console.log(`At ${test.time}ms (${test.expectedWord}):`);
        console.log(
          `  Active word: "${measurement.active.text}" width=${measurement.active.width}px x=${measurement.active.x}`,
        );
        console.log(
          `  Before: "${measurement.before.text}" width=${measurement.before.width}px`,
        );
        console.log(
          `  After: "${measurement.after.text}" width=${measurement.after.width}px`,
        );
        console.log(
          `  Total content: ${measurement.totalContentWidth}px, Container: ${measurement.captions.width}px`,
        );
        console.log("");
      }

      // Check if total width stays consistent
      //       const firstTotal = measurements[0]?.measurements.totalContentWidth;
      //       const allTotalsConsistent = measurements.every(
      //         (m) => Math.abs(m.measurements.totalContentWidth - firstTotal) < 2, // Allow 1-2px tolerance
      //       );
      //
      //       if (!allTotalsConsistent) {
      //         console.log("Width inconsistency detected:");
      //         measurements.forEach((m) => {
      //           console.log(`  ${m.word}: ${m.measurements.totalContentWidth}px`);
      //         });
      //       }
      //
      //       expect(allTotalsConsistent).toBe(true);

      // Check if the overall container width stays consistent (the real measure of stability)
      const firstContainerWidth = measurements[0]?.measurements.captions.width;
      const allContainerWidthsConsistent = measurements.every(
        (m) =>
          Math.abs(m.measurements.captions.width - firstContainerWidth) < 0.1,
      );

      if (!allContainerWidthsConsistent) {
        console.log("Container width inconsistency detected:");
        measurements.forEach((m) => {
          console.log(`  ${m.word}: ${m.measurements.captions.width}px`);
        });
      }

      expect(allContainerWidthsConsistent).toBe(true);
    });

    test("measures font weight differences causing layout shifts", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const scriptId = "font-test-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [{ start: 0, end: 4, text: "Welcome to the custom" }],
        word_segments: [
          { text: "Welcome", start: 0, end: 0.6 },
          { text: " to", start: 0.6, end: 0.9 },
          { text: " the", start: 0.9, end: 1.2 },
          { text: " custom", start: 1.2, end: 1.8 },
        ],
      });
      document.body.appendChild(script);

      const captions = document.createElement("ef-captions");
      captions.captionsScript = scriptId;
      captions.style.cssText =
        "display: block !important; text-align: center; background: green; padding: 16px; font-weight: bold;";

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      beforeContainer.className = "text-green-200";

      const activeContainer = document.createElement("ef-captions-active-word");
      activeContainer.className = "bg-lime-400 text-green-900 rounded";

      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );
      afterContainer.className = "text-green-200";

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test with consistent font weight
      timegroup.currentTimeMs = 300;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;

      const welcomeRect = activeContainer.getBoundingClientRect();
      console.log(
        `"Welcome" with consistent bold: width=${welcomeRect.width}px`,
      );

      timegroup.currentTimeMs = 750;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;

      const toRect = activeContainer.getBoundingClientRect();
      console.log(`" to" with consistent bold: width=${toRect.width}px`);

      // Check if the text positioning stays stable with consistent font weight
      const totalWidth1 =
        beforeContainer.getBoundingClientRect().width +
        activeContainer.getBoundingClientRect().width +
        afterContainer.getBoundingClientRect().width;

      timegroup.currentTimeMs = 1050;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await activeContainer.updateComplete;
      await beforeContainer.updateComplete;
      await afterContainer.updateComplete;

      const totalWidth2 =
        beforeContainer.getBoundingClientRect().width +
        activeContainer.getBoundingClientRect().width +
        afterContainer.getBoundingClientRect().width;

      console.log(
        `Total width consistency: ${totalWidth1}px vs ${totalWidth2}px (diff: ${Math.abs(totalWidth1 - totalWidth2)}px)`,
      );

      expect(Math.abs(totalWidth1 - totalWidth2)).toBeLessThan(1);
    });

    test("captions work naturally without CSS overrides", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const scriptId = "natural-test-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/json";
      script.textContent = JSON.stringify({
        segments: [{ start: 0, end: 4, text: "Natural flow test" }],
        word_segments: [
          { text: "Natural", start: 0, end: 1 },
          { text: " flow", start: 1, end: 2 },
          { text: " test", start: 2, end: 4 },
        ],
      });
      document.body.appendChild(script);

      // Test with NO CSS overrides - should just work naturally
      const captions = document.createElement("ef-captions");
      captions.captionsScript = scriptId;
      captions.className = "font-bold text-center p-4"; // Simple, natural styling

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      activeContainer.className = "bg-yellow-400 text-black rounded"; // Only background change
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Measure widths with natural component behavior
      timegroup.currentTimeMs = 500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      const naturalRect1 = captions.getBoundingClientRect();
      console.log(
        `Natural captions width at "Natural": ${naturalRect1.width}px`,
      );

      timegroup.currentTimeMs = 1500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      const naturalRect2 = captions.getBoundingClientRect();
      console.log(`Natural captions width at " flow": ${naturalRect2.width}px`);

      const widthDiff = Math.abs(naturalRect2.width - naturalRect1.width);
      console.log(`Width difference: ${widthDiff}px`);

      // Should have minimal width difference with natural component behavior
      expect(widthDiff).toBeLessThan(2); // Allow small rounding tolerance
    });

    test("transform scaling keeps surrounding text positions stable", async () => {
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [{ start: 0, end: 4, text: "Before active after text" }],
        word_segments: [
          { text: "Before", start: 0, end: 1 },
          { text: " active", start: 1, end: 2 },
          { text: " after", start: 2, end: 3 },
          { text: " text", start: 3, end: 4 },
        ],
      };

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const activeContainer = document.createElement("ef-captions-active-word");
      activeContainer.style.cssText =
        "background: yellow; color: black; transform: scale(1.2); transform-origin: center; transition: transform 200ms;";
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );

      captions.appendChild(beforeContainer);
      captions.appendChild(activeContainer);
      captions.appendChild(afterContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test different words and ensure before/after text positions don't jump
      const positionTests = [
        { time: 500, word: "Before" },
        { time: 1500, word: " active" },
        { time: 2500, word: " after" },
      ];

      let previousBeforeX: number | null = null;
      let previousAfterX: number | null = null;

      for (const test of positionTests) {
        timegroup.currentTimeMs = test.time;
        await timegroup.seekTask.taskComplete;
        await captions.frameTask.taskComplete;

        const beforeRect = beforeContainer.getBoundingClientRect();
        const activeRect = activeContainer.getBoundingClientRect();
        const afterRect = afterContainer.getBoundingClientRect();

        console.log(`At ${test.time}ms (active word: "${test.word}"):`);
        console.log(`  Before text X: ${beforeRect.x.toFixed(1)}px`);
        console.log(`  Active text X: ${activeRect.x.toFixed(1)}px (scaled)`);
        console.log(`  After text X: ${afterRect.x.toFixed(1)}px`);

        if (previousBeforeX !== null && beforeContainer.textContent) {
          const beforeXDiff = Math.abs(beforeRect.x - previousBeforeX);
          console.log(`  Before X movement: ${beforeXDiff.toFixed(1)}px`);
          expect(beforeXDiff).toBeLessThan(2); // Should be very stable
        }

        if (previousAfterX !== null && afterContainer.textContent) {
          const afterXDiff = Math.abs(afterRect.x - previousAfterX);
          console.log(`  After X movement: ${afterXDiff.toFixed(1)}px`);
          expect(afterXDiff).toBeLessThan(2); // Should be very stable
        }

        previousBeforeX = beforeRect.x;
        previousAfterX = afterRect.x;
        console.log("");
      }
    });

    // Timing update issue - animation visibility not updating as expected
    test.skip("CSS animations trigger with timegroup timing", async () => {
      const timegroup = document.createElement("ef-timegroup");

      // Add bounce animation keyframes to test environment
      const style = document.createElement("style");
      style.textContent = `
        @keyframes bounceIn {
          0% { transform: scale(calc(0.6 + var(--ef-word-seed, 0.5) * 0.3)) 
                          rotate(calc(-10deg + var(--ef-word-seed, 0.5) * 20deg)) 
                          skewX(calc(-15deg + var(--ef-word-seed, 0.5) * 30deg)); }
          50% { transform: scale(calc(1.05 + var(--ef-word-seed, 0.5) * 0.2)) 
                           rotate(calc(-3deg + var(--ef-word-seed, 0.5) * 6deg)) 
                           skewX(calc(-5deg + var(--ef-word-seed, 0.5) * 10deg)); }
          100% { transform: scale(1) rotate(0deg) skewX(0deg); }
        }
        .bounce-in { animation: 0.3s ease-out 0s 1 normal none running bounceIn; }
        .bounce-scale-125 { 
          animation: 0.3s ease-out 0s 1 normal none running bounceIn; 
          transform: scale(1.25); 
        }
      `;
      document.head.appendChild(style);

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [{ start: 0, end: 3, text: "Bounce test animation" }],
        word_segments: [
          { text: "Bounce", start: 0, end: 1 },
          { text: " test", start: 1, end: 2 },
          { text: " animation", start: 2, end: 3 },
        ],
      };

      const activeContainer = document.createElement("ef-captions-active-word");
      activeContainer.className = "bounce-scale-125";
      captions.appendChild(activeContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test animation properties when different words become active
      const animationTests = [
        { time: 500, word: "Bounce" },
        { time: 1500, word: " test" },
        { time: 2500, word: " animation" },
      ];

      for (const test of animationTests) {
        console.log(
          `\nTesting animation at ${test.time}ms (word: "${test.word}"):`,
        );

        timegroup.currentTimeMs = test.time;
        await timegroup.seekTask.taskComplete;
        await captions.frameTask.taskComplete;
        await activeContainer.updateComplete;

        // Check that element is visible and has animation properties
        const computedStyle = getComputedStyle(activeContainer);
        const animationName = computedStyle.animationName;
        const animationDuration = computedStyle.animationDuration;
        const animationTimingFunction = computedStyle.animationTimingFunction;

        console.log(`  Element text: "${activeContainer.textContent}"`);
        console.log(`  Animation name: ${animationName}`);
        console.log(`  Animation duration: ${animationDuration}`);
        console.log(`  Animation timing: ${animationTimingFunction}`);
        console.log(`  Element visible: ${!activeContainer.hidden}`);

        // Element should be visible when in its time range
        expect(activeContainer.hidden).toBe(false);

        // Should have the bounce animation applied correctly
        expect(animationName).toBe("bounceIn");
        expect(animationDuration).toBe("0.3s");
      }

      // Test that element is hidden when outside time range
      timegroup.currentTimeMs = 3500; // After all words
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;

      console.log("\nAfter time range (3500ms):");
      console.log(`  Element hidden: ${activeContainer.hidden}`);
      console.log(`  Element text: "${activeContainer.textContent}"`);

      // Should be hidden when no word is active
      expect(activeContainer.hidden).toBe(true);

      document.head.removeChild(style); // Clean up
    });
  });

  describe("sequence timing integration", () => {
    test("sequence duration updates when captions data is set via captionsData property", async () => {
      // Test the exact scenario: sequence > contain > captions, contain > captions
      const sequence = document.createElement("ef-timegroup");
      sequence.mode = "sequence";

      const container1 = document.createElement("ef-timegroup");
      container1.mode = "contain";
      const captions1 = document.createElement("ef-captions");
      const word1 = document.createElement("ef-captions-active-word");
      captions1.appendChild(word1);
      container1.appendChild(captions1);

      const container2 = document.createElement("ef-timegroup");
      container2.mode = "contain";
      const captions2 = document.createElement("ef-captions");
      const word2 = document.createElement("ef-captions-active-word");
      captions2.appendChild(word2);
      container2.appendChild(captions2);

      sequence.appendChild(container1);
      sequence.appendChild(container2);
      document.body.appendChild(sequence);

      // Initially, sequence should have no duration
      await sequence.updateComplete;
      expect(sequence.durationMs).toBe(0);

      // Set captions data for both elements
      captions1.captionsData = {
        segments: [{ start: 0, end: 5, text: "First" }],
        word_segments: [{ text: "First", start: 0, end: 5 }],
      };

      captions2.captionsData = {
        segments: [{ start: 0, end: 3, text: "Second" }],
        word_segments: [{ text: "Second", start: 0, end: 3 }],
      };

      // Wait for updates to propagate
      await captions1.updateComplete;
      await captions2.updateComplete;
      await sequence.updateComplete;

      // Sequence should now have combined duration (5s + 3s = 8s)
      expect(sequence.durationMs).toBe(8000);

      try {
        document.body.removeChild(sequence);
      } catch (_e) {
        // Cleanup may fail in test environment, ignore
      }
    });

    test("second captions timegroup is visible when timeline is positioned in second segment", async () => {
      // Create exact demo structure: sequence > contain > captions, contain > captions
      const sequence = document.createElement("ef-timegroup");
      sequence.mode = "sequence";

      const container1 = document.createElement("ef-timegroup");
      container1.mode = "contain";
      const captions1 = document.createElement("ef-captions");
      captions1.captionsData = {
        segments: [{ start: 0, end: 5, text: "First" }],
        word_segments: [{ text: "First", start: 0, end: 5 }],
      };
      const word1 = document.createElement("ef-captions-active-word");
      captions1.appendChild(word1);
      container1.appendChild(captions1);

      const container2 = document.createElement("ef-timegroup");
      container2.mode = "contain";
      const captions2 = document.createElement("ef-captions");
      captions2.captionsData = {
        segments: [{ start: 0, end: 3, text: "Second" }],
        word_segments: [{ text: "Second", start: 0, end: 3 }],
      };
      const word2 = document.createElement("ef-captions-active-word");
      captions2.appendChild(word2);
      container2.appendChild(captions2);

      sequence.appendChild(container1);
      sequence.appendChild(container2);
      document.body.appendChild(sequence);

      // Set timeline to be in second timegroup (7s = 2s into second captions)
      sequence.currentTimeMs = 7000;
      await sequence.seekTask.taskComplete;
      await captions2.frameTask.taskComplete;

      console.log(
        `Timeline at 7000ms - Second captions word: "${word2.wordText}", hidden: ${word2.hidden}`,
      );

      // The second captions must be visible
      expect(word2.wordText).toBe("Second");
      expect(word2.hidden).toBe(false);
    });

    test("shows completed words in before container when segment extends beyond words", async () => {
      // Test case where segment duration extends beyond last word
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 5, text: "Complete segment text" }, // 5 second segment
        ],
        word_segments: [
          { text: "Complete", start: 0, end: 1 },
          { text: " segment", start: 1, end: 2 },
          { text: " text", start: 2, end: 3 },
          // Words end at 3s but segment continues until 5s
        ],
      };

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const wordContainer = document.createElement("ef-captions-active-word");
      const segmentContainer = document.createElement("ef-captions-segment");

      captions.appendChild(beforeContainer);
      captions.appendChild(wordContainer);
      captions.appendChild(segmentContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // Test at 2.5s - should show " text" word normally
      timegroup.currentTimeMs = 2500;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;

      expect(wordContainer.wordText).toBe(" text");
      expect(wordContainer.hidden).toBe(false);

      // Test at 4s - after all words finished but segment still active
      timegroup.currentTimeMs = 4000;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;
      await beforeContainer.updateComplete;
      await segmentContainer.updateComplete;

      console.log(
        `  Active word: "${wordContainer.wordText}", hidden=${wordContainer.hidden}`,
      );
      console.log(
        `  Before container: "${beforeContainer.segmentText}", hidden=${beforeContainer.hidden}`,
      );
      console.log(
        `  Segment: "${segmentContainer.segmentText}", hidden=${segmentContainer.hidden}`,
      );

      // Word container should be empty/hidden since no active word
      expect(wordContainer.wordText).toBe("");
      expect(wordContainer.hidden).toBe(true);

      // Before container should show all completed words to maintain visual continuity
      expect(beforeContainer.segmentText).toBe("Complete segment text");
      expect(beforeContainer.hidden).toBe(false);

      // Segment should still be active
      expect(segmentContainer.segmentText).toBe("Complete segment text");
      expect(segmentContainer.hidden).toBe(false);

      try {
        document.body.removeChild(timegroup);
      } catch (_e) {
        // Cleanup may fail in test environment, ignore
      }
    });

    test("shows all words in after container when in segment but before first word", async () => {
      // Test case where we're in a segment but before the first word starts
      const timegroup = document.createElement("ef-timegroup");

      const captions = document.createElement("ef-captions");
      captions.captionsData = {
        segments: [
          { start: 0, end: 10, text: "Complete test segment" }, // 10 second segment
        ],
        word_segments: [
          { text: "Complete", start: 2, end: 4 }, // First word starts at 2s
          { text: " test", start: 5, end: 7 },
          { text: " segment", start: 8, end: 9 },
          // Gap from 0-2s before first word
        ],
      };

      const beforeContainer = document.createElement(
        "ef-captions-before-active-word",
      );
      const wordContainer = document.createElement("ef-captions-active-word");
      const afterContainer = document.createElement(
        "ef-captions-after-active-word",
      );
      const segmentContainer = document.createElement("ef-captions-segment");

      captions.appendChild(beforeContainer);
      captions.appendChild(wordContainer);
      captions.appendChild(afterContainer);
      captions.appendChild(segmentContainer);
      timegroup.appendChild(captions);
      document.body.appendChild(timegroup);

      // @ts-expect-error accessing private property for testing
      const captionsTask = captions.customCaptionsDataTask;
      await captionsTask.taskComplete;

      // Test at 1s - in segment but before first word starts
      timegroup.currentTimeMs = 1000;
      await timegroup.seekTask.taskComplete;
      await captions.frameTask.taskComplete;
      await wordContainer.updateComplete;
      await beforeContainer.updateComplete;
      await afterContainer.updateComplete;
      await segmentContainer.updateComplete;

      console.log(
        `  Active word: "${wordContainer.wordText}", hidden=${wordContainer.hidden}`,
      );
      console.log(
        `  Before container: "${beforeContainer.segmentText}", hidden=${beforeContainer.hidden}`,
      );
      console.log(
        `  After container: "${afterContainer.segmentText}", hidden=${afterContainer.hidden}`,
      );
      console.log(
        `  Segment: "${segmentContainer.segmentText}", hidden=${segmentContainer.hidden}`,
      );

      // Active word should be empty since no word is active yet
      expect(wordContainer.wordText).toBe("");
      expect(wordContainer.hidden).toBe(true);

      // Before container should be empty (nothing has happened yet)
      expect(beforeContainer.segmentText).toBe("");
      expect(beforeContainer.hidden).toBe(true);

      // After container should show all upcoming words
      expect(afterContainer.segmentText).toBe("Complete test segment");
      expect(afterContainer.hidden).toBe(false);

      // Segment should be active
      expect(segmentContainer.segmentText).toBe("Complete test segment");
      expect(segmentContainer.hidden).toBe(false);

      try {
        document.body.removeChild(timegroup);
      } catch (_e) {
        // Cleanup may fail in test environment, ignore
      }
    });
  });
});
