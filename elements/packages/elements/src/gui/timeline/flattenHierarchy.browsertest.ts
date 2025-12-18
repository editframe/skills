import { afterEach, describe, expect, test } from "vitest";
import "../../elements/EFTimegroup.js";
import "../../elements/EFVideo.js";
import "../../elements/EFAudio.js";
import "../../elements/EFImage.js";
import type { EFTimegroup } from "../../elements/EFTimegroup.js";
import { flattenHierarchy } from "./flattenHierarchy.js";

describe("flattenHierarchy", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("returns single row for root element with no children", async () => {
    const root = document.createElement("ef-timegroup") as EFTimegroup;
    root.id = "root";
    root.setAttribute("mode", "fixed");
    root.setAttribute("duration", "10s");
    document.body.appendChild(root);
    await root.updateComplete;

    const rows = flattenHierarchy(root);

    expect(rows).toEqual([{ element: root, depth: 0 }]);
  });

  test("flattens single level of children", async () => {
    const root = document.createElement("ef-timegroup") as EFTimegroup;
    root.id = "root";
    root.setAttribute("mode", "fixed");
    root.setAttribute("duration", "10s");

    const video = document.createElement("ef-video");
    video.id = "video1";
    video.setAttribute("src", "test.mp4");
    root.appendChild(video);

    const audio = document.createElement("ef-audio");
    audio.id = "audio1";
    audio.setAttribute("src", "test.mp3");
    root.appendChild(audio);

    document.body.appendChild(root);
    await root.updateComplete;

    const rows = flattenHierarchy(root);

    expect(rows).toEqual([
      { element: root, depth: 0 },
      { element: video, depth: 1 },
      { element: audio, depth: 1 },
    ]);
  });

  test("flattens nested timegroups depth-first", async () => {
    const root = document.createElement("ef-timegroup") as EFTimegroup;
    root.id = "root";
    root.setAttribute("mode", "fixed");
    root.setAttribute("duration", "10s");

    const nested = document.createElement("ef-timegroup") as EFTimegroup;
    nested.id = "nested";
    nested.setAttribute("mode", "fixed");
    nested.setAttribute("duration", "5s");

    const deepVideo = document.createElement("ef-video");
    deepVideo.id = "deep-video";
    deepVideo.setAttribute("src", "deep.mp4");
    nested.appendChild(deepVideo);

    root.appendChild(nested);

    const siblingAudio = document.createElement("ef-audio");
    siblingAudio.id = "sibling-audio";
    siblingAudio.setAttribute("src", "sibling.mp3");
    root.appendChild(siblingAudio);

    document.body.appendChild(root);
    await root.updateComplete;

    const rows = flattenHierarchy(root);

    expect(rows).toEqual([
      { element: root, depth: 0 },
      { element: nested, depth: 1 },
      { element: deepVideo, depth: 2 },
      { element: siblingAudio, depth: 1 },
    ]);
  });

  test("ignores non-temporal children", async () => {
    const root = document.createElement("ef-timegroup") as EFTimegroup;
    root.id = "root";
    root.setAttribute("mode", "fixed");
    root.setAttribute("duration", "10s");

    const video = document.createElement("ef-video");
    video.id = "video1";
    video.setAttribute("src", "test.mp4");
    root.appendChild(video);

    // Add a non-temporal element (should be ignored)
    const div = document.createElement("div");
    div.id = "not-temporal";
    root.appendChild(div);

    document.body.appendChild(root);
    await root.updateComplete;

    const rows = flattenHierarchy(root);

    expect(rows).toEqual([
      { element: root, depth: 0 },
      { element: video, depth: 1 },
    ]);
  });

  test("handles deeply nested hierarchy", async () => {
    const root = document.createElement("ef-timegroup") as EFTimegroup;
    root.id = "root";
    root.setAttribute("mode", "fixed");
    root.setAttribute("duration", "10s");

    const level1 = document.createElement("ef-timegroup") as EFTimegroup;
    level1.id = "level1";
    level1.setAttribute("mode", "fixed");
    level1.setAttribute("duration", "8s");

    const level2 = document.createElement("ef-timegroup") as EFTimegroup;
    level2.id = "level2";
    level2.setAttribute("mode", "fixed");
    level2.setAttribute("duration", "6s");

    const level3Video = document.createElement("ef-video");
    level3Video.id = "level3-video";
    level3Video.setAttribute("src", "deep.mp4");

    level2.appendChild(level3Video);
    level1.appendChild(level2);
    root.appendChild(level1);

    document.body.appendChild(root);
    await root.updateComplete;

    const rows = flattenHierarchy(root);

    expect(rows).toEqual([
      { element: root, depth: 0 },
      { element: level1, depth: 1 },
      { element: level2, depth: 2 },
      { element: level3Video, depth: 3 },
    ]);
  });
});

