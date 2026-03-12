import { chromium, devices } from "playwright";

const BASE_URL = "http://main.localhost:3000";

async function inspectFooterLinks(path, viewportName, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: viewport,
    userAgent:
      viewportName === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    await page.waitForSelector("footer", { timeout: 15000 });

    // Scroll to footer
    await page.evaluate(() => {
      const footer = document.querySelector("footer");
      footer?.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      if (!footer) return { error: "No footer found" };

      const links = Array.from(footer.querySelectorAll("a"));
      const docsLink = links.find((a) => a.textContent?.trim() === "Docs");
      if (!docsLink)
        return {
          error: "No Docs link",
          links: links.map((a) => a.textContent?.trim()),
        };

      const rect = docsLink.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const topElement = document.elementFromPoint(centerX, centerY);
      const allElements = document.elementsFromPoint(centerX, centerY);

      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollY: window.scrollY,
        isInViewport:
          centerY > 0 &&
          centerY < window.innerHeight &&
          centerX > 0 &&
          centerX < window.innerWidth,
        clickPoint: { x: Math.round(centerX), y: Math.round(centerY) },
        isLinkOnTop: topElement === docsLink,
        topElement: topElement
          ? {
              tag: topElement.tagName.toLowerCase(),
              className: (topElement.className?.toString() || "").substring(
                0,
                200,
              ),
              position: window.getComputedStyle(topElement).position,
              zIndex: window.getComputedStyle(topElement).zIndex,
              pointerEvents: window.getComputedStyle(topElement).pointerEvents,
              display: window.getComputedStyle(topElement).display,
              isFooterLink: topElement === docsLink,
            }
          : null,
        stackOrder: allElements.slice(0, 6).map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: (el.className?.toString() || "").substring(0, 100),
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          pointerEvents: window.getComputedStyle(el).pointerEvents,
          isDocsLink: el === docsLink,
        })),
      };
    });

    console.log(`\n=== ${viewportName} ${path} ===`);
    console.log(
      `isLinkOnTop: ${result.isLinkOnTop}, isInViewport: ${result.isInViewport}`,
    );
    if (!result.isLinkOnTop && result.topElement) {
      console.log(
        "BLOCKING ELEMENT:",
        JSON.stringify(result.topElement, null, 2),
      );
    }
    if (result.stackOrder?.length > 0) {
      console.log(
        "Stack at click point:",
        result.stackOrder
          .map(
            (e) =>
              `${e.tag}[${e.position},z:${e.zIndex},ptr:${e.pointerEvents}]${e.isDocsLink ? " ← DOCS" : ""}`,
          )
          .join(" → "),
      );
    }
  } catch (e) {
    console.error(`Error on ${path}:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Desktop
await inspectFooterLinks("/pricing", "desktop-1280", {
  width: 1280,
  height: 800,
});
await inspectFooterLinks("/with/svg", "desktop-1280", {
  width: 1280,
  height: 800,
});
await inspectFooterLinks("/", "desktop-1280", { width: 1280, height: 800 });

// Mobile-like viewport
await inspectFooterLinks("/pricing", "mobile-390", { width: 390, height: 844 });
await inspectFooterLinks("/with/svg", "mobile-390", {
  width: 390,
  height: 844,
});
await inspectFooterLinks("/", "mobile-390", { width: 390, height: 844 });
