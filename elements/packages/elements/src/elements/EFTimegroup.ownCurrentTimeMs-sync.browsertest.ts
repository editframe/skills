/**
 * Tests that ownCurrentTimeMs stays in sync with currentTimeMs on a root EFTimegroup
 * in all paths that bypass PlaybackController.
 *
 * Background:
 * EFTimegroup has two separate time storage locations:
 *   - EFTimegroup.#currentTime (seconds)  — read by currentTimeMs getter
 *   - EFTemporal mixin.#currentTimeMs (ms) — read by ownCurrentTimeMs when source="local"
 *
 * ownCurrentTimeMs uses source="local" (the mixin field) when:
 *   - No playbackController exists, AND
 *   - The element is the root timegroup
 *
 * The mixin field is ONLY updated by _setLocalTimeMs(), which previously was only
 * called inside seekForRender(). This left ownCurrentTimeMs returning 0 in:
 *   1. The `set currentTime` no-controller path (normal execute + queued seek)
 *   2. The `#runSeekTask` no-controller path (async re-quantization)
 *   3. The FRAMEGEN_BRIDGE path (headless rendering — no PlaybackController created)
 *
 * These tests verify the invariant: ownCurrentTimeMs === currentTimeMs at all times.
 */

import { afterEach, assert, beforeEach, describe, test } from "vitest";
import type { EFTimegroup } from "./EFTimegroup.js";
import "./EFTimegroup.js";

beforeEach(() => {
  while (document.body.children.length) {
    document.body.children[0]?.remove();
  }
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Helper: create a root timegroup with no PlaybackController
// ---------------------------------------------------------------------------

function makeNoControllerTimegroup(durationMs = 5000): EFTimegroup {
  const tg = document.createElement("ef-timegroup") as EFTimegroup;
  tg.setAttribute("data-no-playback-controller", "");
  tg.setAttribute("mode", "fixed");
  tg.setAttribute("duration", `${durationMs}ms`);
  document.body.appendChild(tg);
  return tg;
}

// ---------------------------------------------------------------------------
// 1. set currentTime — normal execute path (no seek in progress)
// ---------------------------------------------------------------------------

describe("ownCurrentTimeMs sync — set currentTime, no-controller", () => {
  test("ownCurrentTimeMs equals currentTimeMs immediately after set", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    tg.currentTimeMs = 2000;

    assert.approximately(
      tg.ownCurrentTimeMs,
      tg.currentTimeMs,
      50,
      "ownCurrentTimeMs should match currentTimeMs within one frame of quantization",
    );
  });

  test("ownCurrentTimeMs tracks multiple successive sets", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    for (const t of [500, 1000, 2500, 4999]) {
      tg.currentTimeMs = t;
      assert.approximately(
        tg.ownCurrentTimeMs,
        tg.currentTimeMs,
        50,
        `ownCurrentTimeMs should match currentTimeMs after seeking to ${t}ms`,
      );
    }
  });

  test("ownCurrentTimeMs is zero when currentTimeMs is zero", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    tg.currentTimeMs = 2000;
    tg.currentTimeMs = 0;

    assert.approximately(tg.ownCurrentTimeMs, 0, 50);
  });
});

// ---------------------------------------------------------------------------
// 2. set currentTime — queued (concurrent) seek path (#seekInProgress branch)
// ---------------------------------------------------------------------------

describe("ownCurrentTimeMs sync — queued seek, no-controller", () => {
  test("ownCurrentTimeMs reflects the pending seek target while first seek is in flight", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    // First seek starts the async seekTask
    tg.currentTimeMs = 1000;
    // Second seek arrives before first completes → hits the #seekInProgress branch
    // and queues as pendingSeekTime while still updating #currentTime
    tg.currentTimeMs = 3000;

    assert.approximately(
      tg.ownCurrentTimeMs,
      tg.currentTimeMs,
      50,
      "ownCurrentTimeMs should reflect queued seek target",
    );
  });

  test("ownCurrentTimeMs matches currentTimeMs after both seeks settle", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    tg.currentTimeMs = 1000;
    tg.currentTimeMs = 3000;

    // Wait for the full seek pipeline to drain
    await (tg as any).seekTask.taskComplete;

    assert.approximately(
      tg.ownCurrentTimeMs,
      tg.currentTimeMs,
      1,
      "ownCurrentTimeMs should match currentTimeMs exactly after seeks settle",
    );
  });
});

// ---------------------------------------------------------------------------
// 3. #runSeekTask async re-quantization
// ---------------------------------------------------------------------------

describe("ownCurrentTimeMs sync — after seekTask completes, no-controller", () => {
  test("ownCurrentTimeMs matches currentTimeMs after seekTask async completion", async () => {
    const tg = makeNoControllerTimegroup();
    await tg.updateComplete;

    tg.currentTimeMs = 2500;
    await (tg as any).seekTask.taskComplete;

    assert.approximately(
      tg.ownCurrentTimeMs,
      tg.currentTimeMs,
      1,
      "ownCurrentTimeMs should match currentTimeMs exactly after seekTask re-quantizes",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. FRAMEGEN_BRIDGE path (headless rendering — no PlaybackController)
// ---------------------------------------------------------------------------

describe("ownCurrentTimeMs sync — FRAMEGEN_BRIDGE (headless rendering)", () => {
  beforeEach(() => {
    // @ts-expect-error
    window.FRAMEGEN_BRIDGE = true;
  });

  afterEach(() => {
    // @ts-expect-error
    delete window.FRAMEGEN_BRIDGE;
  });

  test("ownCurrentTimeMs equals currentTimeMs immediately after set (FRAMEGEN_BRIDGE)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "5000ms");
    document.body.appendChild(tg);
    await tg.updateComplete;

    tg.currentTimeMs = 3000;

    assert.approximately(
      tg.ownCurrentTimeMs,
      tg.currentTimeMs,
      50,
      "ownCurrentTimeMs should match currentTimeMs in headless rendering path",
    );
  });

  test("ownCurrentTimeMs tracks multiple seeks in FRAMEGEN_BRIDGE mode", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "5000ms");
    document.body.appendChild(tg);
    await tg.updateComplete;

    for (const t of [0, 1000, 2000, 3000, 4000]) {
      tg.currentTimeMs = t;
      assert.approximately(
        tg.ownCurrentTimeMs,
        tg.currentTimeMs,
        50,
        `ownCurrentTimeMs should match at ${t}ms in FRAMEGEN_BRIDGE mode`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. CSS animation positioning via updateAnimations (consequence test)
//    Verifies that the underlying consumer of ownCurrentTimeMs gets the
//    correct time, not 0, after a no-controller seek.
// ---------------------------------------------------------------------------

describe("ownCurrentTimeMs sync — CSS animation consequence", () => {
  test("CSS animation is positioned at the sought time after set currentTimeMs (no-controller)", async () => {
    const tg = document.createElement("ef-timegroup") as EFTimegroup;
    tg.setAttribute("data-no-playback-controller", "");
    tg.setAttribute("mode", "fixed");
    tg.setAttribute("duration", "4000ms");
    document.body.appendChild(tg);

    // Add an element with a CSS animation spanning the full duration
    const div = document.createElement("div");
    div.style.cssText =
      "animation: test-slide 4s linear both; width: 100px; height: 100px;";

    const style = document.createElement("style");
    style.textContent = `
      @keyframes test-slide {
        from { transform: translateX(0px); }
        to   { transform: translateX(400px); }
      }
    `;
    document.head.appendChild(style);
    tg.appendChild(div);
    await tg.updateComplete;

    // Seek to 50% of duration
    tg.currentTimeMs = 2000;
    await (tg as any).seekTask.taskComplete;

    // The animation's currentTime should be near 2000ms (50% of 4000ms animation)
    const animations = div.getAnimations();
    assert.isAbove(animations.length, 0, "element should have a CSS animation");
    const anim = animations[0]!;
    assert.approximately(
      Number(anim.currentTime),
      2000,
      100,
      "CSS animation currentTime should be near 2000ms after seeking to 50% (not stuck at 0)",
    );

    style.remove();
  });
});
