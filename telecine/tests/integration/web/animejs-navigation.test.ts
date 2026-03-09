import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser } from "playwright";

const BASE_URL = process.env.WEB_HOST || "http://web:3000";

// These tests verify that the desktop navigation links container is visible
// when elements CSS is loaded alongside the app CSS. The elements CSS contains
// `.hidden { display: none }` without corresponding `md:flex` responsive utility,
// which can override the main app's `md:flex` rule when loaded as a later stylesheet.

describe("Navigation desktop links visibility on /with/* pages", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function getNavLinksContainerDisplay(path: string): Promise<string> {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    try {
      await page.goto(path, { waitUntil: "load" });
      // Wait for React hydration — nav links appear after useEffect sets mounted=true
      await page.waitForSelector('nav a[href="/skills"]', { state: "attached", timeout: 15_000 });
      return await page.evaluate(() => {
        const nav = document.querySelector("nav");
        // The desktop links container holds LandingNavLinks (Docs & Skills, Pricing).
        // Find it by locating a link inside it.
        const docsLink = nav?.querySelector('a[href="/skills"]');
        const linksContainer = docsLink?.parentElement;
        return linksContainer ? window.getComputedStyle(linksContainer).display : "not-found";
      });
    } finally {
      await context.close();
    }
  }

  it("/with/animejs nav desktop links container is visible at 1280px", async () => {
    const display = await getNavLinksContainerDisplay("/with/animejs");
    // At 1280px (> md breakpoint of 768px), the nav links container should be flex, not none.
    expect(display).toBe("flex");
  });

  it("/with/svg nav desktop links container is visible at 1280px (control)", async () => {
    const display = await getNavLinksContainerDisplay("/with/svg");
    expect(display).toBe("flex");
  });
});
