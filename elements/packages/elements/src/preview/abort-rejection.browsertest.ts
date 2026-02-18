/**
 * Reproduction tests for unhandled rejection from fetch failures
 * during media engine loading.
 */
import { describe, test, expect } from "vitest";
import { html, render } from "lit";
import type { EFTimegroup } from "../elements/EFTimegroup.js";
import { captureTimegroupAtTime } from "./renderTimegroupToCanvas.js";
import "../elements/EFVideo.js";
import "../elements/EFTimegroup.js";

function getApiHost(): string {
  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");
  if (isLocalhost) {
    const port = 4322;
    return `http://main.localhost:${port}`;
  }
  return "";
}

describe("abort rejection reproduction", () => {
  test("captureTimegroupAtTime cleanup fires no unhandled rejection", async () => {
    const apiHost = getApiHost();
    if (!apiHost) {
      console.log("Skipping: no api host available");
      return;
    }

    // Instrument unhandledrejection to capture diagnostic info
    const unhandledRejections: Array<{
      reason: any;
      promiseId: string;
      stack: string;
    }> = [];

    const handler = (event: PromiseRejectionEvent) => {
      const info = {
        reason: event.reason,
        promiseId: String(event.promise),
        stack: event.reason?.stack || "no stack",
      };
      unhandledRejections.push(info);
      console.error(
        "[DIAGNOSTIC] unhandledrejection caught:",
        JSON.stringify({
          message: event.reason?.message,
          name: event.reason?.name,
          constructor: event.reason?.constructor?.name,
          stack: event.reason?.stack?.split("\n").slice(0, 5),
        }),
      );
    };
    window.addEventListener("unhandledrejection", handler);

    const container = document.createElement("div");
    render(
      html`
      <ef-configuration api-host="${apiHost}" signing-url="">
        <ef-preview>
          <ef-timegroup mode="contain" id="abort-repro-timegroup"
            style="width: 800px; height: 450px; background: #1a1a2e;">
            <ef-video src="bars-n-tone.mp4" style="width: 100%; height: 100%; object-fit: contain;"></ef-video>
          </ef-timegroup>
        </ef-preview>
      </ef-configuration>
    `,
      container,
    );
    document.body.appendChild(container);

    const timegroup = container.querySelector(
      "ef-timegroup",
    ) as EFTimegroup;
    await timegroup.updateComplete;

    try {
      await timegroup.waitForMediaDurations();
    } catch {
      // May fail without server
    }

    try {
      await captureTimegroupAtTime(timegroup, {
        timeMs: 2000,
        scale: 1,
      });
    } catch {
      // Expected to fail
    }

    // Wait for microtask queue and any async cleanup
    await new Promise((r) => setTimeout(r, 1000));

    container.remove();

    await new Promise((r) => setTimeout(r, 1000));

    window.removeEventListener("unhandledrejection", handler);

    // Log what we captured
    console.log(
      "[DIAGNOSTIC] Total unhandled rejections captured:",
      unhandledRejections.length,
    );
    for (const ur of unhandledRejections) {
      console.log("[DIAGNOSTIC] Rejection:", JSON.stringify({
        message: ur.reason?.message?.substring(0, 100),
        name: ur.reason?.name,
      }));
    }

    expect(unhandledRejections.length).toBe(0);
  });
});
