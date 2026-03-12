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
    await page.waitForSelector("footer", { timeout: 15000 });

    // Scroll to the footer first
    await page.evaluate(() => {
      const footer = document.querySelector("footer");
      footer?.scrollIntoView({ behavior: "instant", block: "center" });
    });

    // Wait for any animations to settle
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      if (!footer) return { error: "No footer found" };

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

      function getElementInfo(el) {
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          className: (el.className?.toString() || "").substring(0, 150),
          position: styles.position,
          zIndex: styles.zIndex,
          display: styles.display,
          visibility: styles.visibility,
          pointerEvents: styles.pointerEvents,
          overflow: styles.overflow,
          opacity: styles.opacity,
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      }

      // Try elementFromPoint with the link's coordinates
      const topElement = document.elementFromPoint(centerX, centerY);

      // Also try elementsFromPoint to get ALL elements at that point
      const allElementsAtPoint = document.elementsFromPoint(centerX, centerY);

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollY: window.scrollY,
        docsLinkRect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        clickPoint: { x: centerX, y: centerY },
        isInViewport:
          centerY > 0 &&
          centerY < window.innerHeight &&
          centerX > 0 &&
          centerX < window.innerWidth,
        topElement: topElement
          ? {
              tag: topElement.tagName.toLowerCase(),
              id: topElement.id || undefined,
              className: (topElement.className?.toString() || "").substring(
                0,
                200,
              ),
              position: window.getComputedStyle(topElement).position,
              zIndex: window.getComputedStyle(topElement).zIndex,
              pointerEvents: window.getComputedStyle(topElement).pointerEvents,
              display: window.getComputedStyle(topElement).display,
              rect: (() => {
                const r = topElement.getBoundingClientRect();
                return {
                  top: Math.round(r.top),
                  left: Math.round(r.left),
                  width: Math.round(r.width),
                  height: Math.round(r.height),
                };
              })(),
              isFooterLink: topElement === docsLink,
            }
          : null,
        allElementsAtPoint: allElementsAtPoint.slice(0, 8).map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          className: (el.className?.toString() || "").substring(0, 150),
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          pointerEvents: window.getComputedStyle(el).pointerEvents,
          display: window.getComputedStyle(el).display,
          isDocsLink: el === docsLink,
        })),
        docsLinkInfo: getElementInfo(docsLink),
        isLinkOnTop: topElement === docsLink,
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

await inspectFooterLinks("/pricing");
await inspectFooterLinks("/with/svg");
await inspectFooterLinks("/");
