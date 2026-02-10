import { afterEach, describe, expect, test } from "vitest";
import "@editframe/elements";
import type { EFVideo } from "@editframe/elements";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useMediaInfo - MediaInfoController", () => {
  test("controller reads intrinsicDurationMs from host element", async () => {
    // Import the controller class and test it directly with a Lit element
    const { MediaInfoController } = await import("./useMediaInfo.js");

    const video = document.createElement("ef-video") as EFVideo;
    document.body.appendChild(video);
    await video.updateComplete;

    let receivedInfo: { intrinsicDurationMs: number | undefined; loading: boolean } | null = null;
    const setMediaInfo = (info: any) => {
      if (typeof info === "function") {
        receivedInfo = info(receivedInfo);
      } else {
        receivedInfo = info;
      }
    };

    const controller = new MediaInfoController(video as any, setMediaInfo as any);
    controller.hostConnected();
    controller.syncNow();

    // Initially, no media engine loaded so intrinsicDurationMs is undefined
    expect(receivedInfo).toBeTruthy();
    expect(receivedInfo?.loading).toBe(true);
    expect(receivedInfo?.intrinsicDurationMs).toBeUndefined();

    controller.hostDisconnected();
  }, 5000);

  test("controller detects when intrinsicDurationMs changes via hostUpdated", async () => {
    const { MediaInfoController } = await import("./useMediaInfo.js");

    const video = document.createElement("ef-video") as EFVideo;
    document.body.appendChild(video);
    await video.updateComplete;

    const receivedInfos: Array<{ intrinsicDurationMs: number | undefined; loading: boolean }> = [];
    const setMediaInfo = (info: any) => {
      if (typeof info === "function") {
        receivedInfos.push(info(receivedInfos[receivedInfos.length - 1] ?? null));
      } else {
        receivedInfos.push(info);
      }
    };

    const controller = new MediaInfoController(video as any, setMediaInfo as any);
    controller.hostConnected();
    controller.syncNow();

    // Initial state: loading
    expect(receivedInfos.length).toBeGreaterThan(0);
    expect(receivedInfos[receivedInfos.length - 1].loading).toBe(true);

    // Simulate hostUpdated being called (as would happen after requestUpdate)
    controller.hostUpdated();

    // Still undefined, no new update pushed (value didn't change)
    const countBefore = receivedInfos.length;
    controller.hostUpdated();
    expect(receivedInfos.length).toBe(countBefore);

    controller.hostDisconnected();
  }, 5000);
});
