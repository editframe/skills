import { chromium } from "playwright";
const PROD_URL = "https://editframe.com";

async function testAllLinks(startPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const consoleMsgs = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleMsgs.push(msg.text().substring(0, 200));
  });

  try {
    await page.goto(`${PROD_URL}${startPath}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForSelector("footer", { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document
        .querySelector("footer")
        ?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(500);

    // Get all footer links
    const footerLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("footer a")).map((a) => ({
        text: a.textContent?.trim(),
        href: a.getAttribute("href"),
      }));
    });
    console.log(`\n=== ${startPath} footer links ===`);
    console.log(
      "Links:",
      footerLinks.map((l) => `${l.text}→${l.href}`).join(", "),
    );

    // Test clicking the "Docs" link
    consoleMsgs.length = 0;
    const beforeUrl = page.url();
    const beforeScroll = await page.evaluate(() => window.scrollY);

    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("footer a"));
      links.find((a) => a.textContent?.trim() === "Docs")?.click();
    });
    await page.waitForTimeout(2000);

    const afterUrl = page.url();
    const afterScroll = await page.evaluate(() => window.scrollY);

    console.log(
      `Docs click: ${beforeUrl} → ${afterUrl} (scroll: ${beforeScroll}→${afterScroll})`,
    );
    if (consoleMsgs.length > 0) console.log("Errors:", consoleMsgs);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Test the landing page specifically - does clicking "Docs" cause errors?
await testAllLinks("/");
await testAllLinks("/with/animejs");
await testAllLinks("/pricing");
