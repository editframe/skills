import { chromium } from "playwright";

const BASE_URL = "http://main.localhost:3000";

async function inspectFooterLinks(path) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });

    // Wait for footer to load
    await page.waitForSelector("footer", { timeout: 15000 });

    // Find the "Docs" footer link
    const result = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      if (!footer) return { error: "No footer found" };

      // Find the Docs link in footer
      const links = Array.from(footer.querySelectorAll("a"));
      const docsLink = links.find((a) => a.textContent?.trim() === "Docs");
      if (!docsLink)
        return {
          error: "No Docs link found",
          links: links.map((a) => a.textContent?.trim()),
        };

      const rect = docsLink.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // What element is at the center of the Docs link?
      const topElement = document.elementFromPoint(centerX, centerY);

      // Walk up the tree to understand the stacking
      function getElementInfo(el) {
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          className: el.className?.toString()?.substring(0, 100),
          position: styles.position,
          zIndex: styles.zIndex,
          display: styles.display,
          visibility: styles.visibility,
          pointerEvents: styles.pointerEvents,
          overflow: styles.overflow,
          opacity: styles.opacity,
          rect: {
            top: Math.round(el.getBoundingClientRect().top),
            left: Math.round(el.getBoundingClientRect().left),
            width: Math.round(el.getBoundingClientRect().width),
            height: Math.round(el.getBoundingClientRect().height),
          },
        };
      }

      // Get the element at cursor position and walk up 5 levels
      const elementsAtPoint = [];
      let el = topElement;
      while (
        el &&
        el !== document.documentElement &&
        elementsAtPoint.length < 6
      ) {
        elementsAtPoint.push(getElementInfo(el));
        el = el.parentElement;
      }

      // Also check if the footer link itself is the top element
      const isLinkOnTop = topElement === docsLink;
      const isLinkAncestor = docsLink.contains(topElement);

      return {
        docsLinkRect: {
          ...(rect.toJSON?.() || {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }),
        },
        clickPoint: { x: centerX, y: centerY },
        topElement: getElementInfo(topElement),
        isLinkOnTop,
        isLinkAncestor,
        docsLinkInfo: getElementInfo(docsLink),
        elementsAtPoint: elementsAtPoint.slice(0, 4),
      };
    });

    console.log(`\n=== ${path} ===`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Error on ${path}:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Test both pricing and svg pages
await inspectFooterLinks("/pricing");
await inspectFooterLinks("/with/svg");
