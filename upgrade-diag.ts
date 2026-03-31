/**
 * Playwright diagnostic: loads the thumbnail-filmstrip dev project and
 * observes the quality upgrade pipeline at a specific position.
 *
 * Run from the main worktree:
 *   npx tsx --no-warnings upgrade-diag.ts
 */

import { chromium } from "playwright";

const URL = "http://thumbnail-bench.localhost:4321/thumbnail-filmstrip.html";
const SEEK_TO_MS = 180_040; // ~3:00:04

async function main() {
  const browser = await chromium.launch({ headless: false, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  // Collect console messages tagged [UPG ...] plus warnings/errors.
  const upgLogs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (text.includes("[UPG") || type === "warning" || type === "error") {
      upgLogs.push(`[${(performance.now() / 1000).toFixed(2)}s] [${type}] ${text}`);
    }
  });

  console.log(`Loading ${URL} …`);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });
  console.log("Page loaded. Waiting 5 s for media engines to initialise …");
  await page.waitForTimeout(5_000);

  // Seek to the target position.
  console.log(`Seeking to ${SEEK_TO_MS} ms …`);
  await page.evaluate((seekMs) => {
    const tg = document.querySelector("ef-timegroup") as any;
    if (!tg?.playbackController) {
      console.error("[UPG DIAG] No playbackController on root timegroup");
      return;
    }
    tg.playbackController.currentTime = seekMs / 1000;
  }, SEEK_TO_MS);

  // Wait for seek + scheduler tasks.
  console.log("Waiting 30 s for scheduler tasks, JIT transcoding, and requestFrameRender …");
  await page.waitForTimeout(30_000);

  // Collect final state.
  const state = await page.evaluate(() => {
    const videos = document.querySelectorAll("ef-video");
    return Array.from(videos).map((v: any) => ({
      id: v.id,
      currentRenditionId: v.currentRenditionId,
      currentSourceTimeMs: v.currentSourceTimeMs,
      src: v.src?.toString()?.slice(-40),
    }));
  });

  // Collect scheduler snapshot.
  const schedulerSnap = await page.evaluate(() => {
    const tg = document.querySelector("ef-timegroup") as any;
    const scheduler = tg?.qualityUpgradeScheduler;
    if (!scheduler) return "no scheduler";
    return JSON.stringify(scheduler.getQueueSnapshot(), null, 2);
  });

  await browser.close();

  console.log("\n=== [UPG] Console Logs ===");
  for (const line of upgLogs) console.log(line);

  console.log("\n=== Video State ===");
  console.log(JSON.stringify(state, null, 2));

  console.log("\n=== Scheduler Snapshot ===");
  console.log(schedulerSnap);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
