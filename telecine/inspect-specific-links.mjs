import { chromium } from "playwright";
const PROD_URL = "https://editframe.com";

async function testLink(startPath, linkText) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().substring(0, 150));
  });

  try {
    await page.goto(`${PROD_URL}${startPath}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector("footer", { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document
        .querySelector("footer")
        ?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(300);

    const beforeUrl = page.url();
    errors.length = 0;

    await page.evaluate((text) => {
      const links = Array.from(document.querySelectorAll("footer a"));
      links.find((a) => a.textContent?.trim() === text)?.click();
    }, linkText);
    await page.waitForTimeout(1500);

    const afterUrl = page.url();
    const navigated = beforeUrl !== afterUrl;
    const hasError = errors.length > 0;

    console.log(
      `${startPath} → "${linkText}": ${navigated ? "✓ navigated to " + afterUrl : "✗ stayed at " + afterUrl}${hasError ? " [ERROR]" : ""}`,
    );
    if (hasError) console.log("  Error:", errors[0].substring(0, 100));
  } catch (e) {
    console.error(`Error testing ${startPath} → ${linkText}:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Test from the landing page
for (const link of [
  "Docs",
  "Pricing",
  "Anime.js",
  "SVG SMIL",
  "Blog",
  "Terms of Service",
]) {
  await testLink("/", link);
}

// Test from /with/animejs (pre-loads elements)
for (const link of ["Docs", "Pricing", "Anime.js", "SVG SMIL", "Blog"]) {
  await testLink("/with/animejs", link);
}
