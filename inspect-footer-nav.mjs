import { chromium } from "playwright";

const PROD_URL = "https://editframe.com";

async function testNavigation(path) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

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

    const beforeUrl = page.url();
    const beforeScrollY = await page.evaluate(() => window.scrollY);

    // Find and click the Docs footer link
    const docsLink = page
      .locator("footer a")
      .filter({ hasText: "Docs" })
      .first();

    // Track navigation
    const navigationPromise = page
      .waitForNavigation({ timeout: 5000 })
      .catch(() => null);
    await docsLink.click();
    const navResult = await navigationPromise;

    await page.waitForTimeout(1000);
    const afterUrl = page.url();
    const afterScrollY = await page.evaluate(() => window.scrollY);

    console.log(`\n=== ${path} ===`);
    console.log(`Before URL: ${beforeUrl}`);
    console.log(`After URL: ${afterUrl}`);
    console.log(
      `Before scrollY: ${beforeScrollY}, After scrollY: ${afterScrollY}`,
    );
    console.log(`Navigation occurred: ${navResult !== null}`);
    console.log(`URL changed: ${beforeUrl !== afterUrl}`);
    console.log(
      `Scroll jumped to top: ${afterScrollY < 100 && beforeScrollY > 100}`,
    );
  } catch (e) {
    console.error(`Error on ${path}:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

await testNavigation("/pricing");
await testNavigation("/");
await testNavigation("/with/svg");
