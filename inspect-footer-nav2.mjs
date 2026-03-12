import { chromium } from "playwright";

const PROD_URL = "https://editframe.com";

async function testNavigation(path) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Capture all console messages
  const consoleMsgs = [];
  page.on("console", (msg) => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));

  // Capture network requests after click
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));

  try {
    await page.goto(`${PROD_URL}${path}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector("footer", { timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const footer = document.querySelector("footer");
      footer?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(500);

    const beforeScrollY = await page.evaluate(() => window.scrollY);
    requests.length = 0; // clear previous requests

    // Record URL changes
    const urlHistory = [page.url()];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) urlHistory.push(frame.url());
    });

    // Click the link
    await page.evaluate(() => {
      const footer = document.querySelector("footer");
      const links = Array.from(footer?.querySelectorAll("a") || []);
      const docsLink = links.find((a) => a.textContent?.trim() === "Docs");
      if (docsLink) {
        console.log("Clicking docs link with href:", docsLink.href);
        docsLink.click();
      }
    });

    await page.waitForTimeout(2000);
    const afterScrollY = await page.evaluate(() => window.scrollY);
    const finalUrl = page.url();

    console.log(`\n=== ${path} ===`);
    console.log(`Final URL: ${finalUrl}`);
    console.log(`URL history:`, urlHistory);
    console.log(`ScrollY: ${beforeScrollY} → ${afterScrollY}`);
    console.log(
      `Network requests after click:`,
      requests
        .filter((r) => !r.includes("analytics") && !r.includes("tracker"))
        .slice(0, 5),
    );
    console.log(`Console:`, consoleMsgs.slice(-5));
  } catch (e) {
    console.error(`Error on ${path}:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

await testNavigation("/pricing");
await testNavigation("/with/svg");
await testNavigation("/");
