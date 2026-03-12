import { chromium } from "playwright";

const BASE_URL = "http://main.localhost:3000";

async function inspectAfterDelay(path, viewportWidth) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });

    // Wait longer for any async element upgrades
    await page.waitForTimeout(3000);

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

      // Also check what custom elements are in the DOM
      const customElements = document.querySelectorAll(
        "ef-workbench, ef-canvas, ef-preview, ef-overlay-layer, ef-focus-overlay",
      );

      return {
        isLinkOnTop: topElement === docsLink,
        isInViewport:
          centerY > 0 &&
          centerY < window.innerHeight &&
          centerX > 0 &&
          centerX < window.innerWidth,
        clickPoint: { x: Math.round(centerX), y: Math.round(centerY) },
        customElementsPresent: Array.from(customElements).map((el) => ({
          tag: el.tagName.toLowerCase(),
          rect: (() => {
            const r = el.getBoundingClientRect();
            return {
              top: Math.round(r.top),
              left: Math.round(r.left),
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          })(),
          styles: {
            position: window.getComputedStyle(el).position,
            zIndex: window.getComputedStyle(el).zIndex,
          },
        })),
        topElement: topElement
          ? {
              tag: topElement.tagName.toLowerCase(),
              className: (topElement.className?.toString() || "").substring(
                0,
                200,
              ),
              isFooterLink: topElement === docsLink,
            }
          : null,
        stackOrder: allElements.slice(0, 8).map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: (el.className?.toString() || "").substring(0, 80),
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          isDocsLink: el === docsLink,
        })),
      };
    });

    console.log(`\n=== ${viewportWidth}px ${path} (after 3s delay) ===`);
    console.log(
      `isLinkOnTop: ${result.isLinkOnTop}, isInViewport: ${result.isInViewport}`,
    );
    if (result.customElementsPresent?.length > 0) {
      console.log("Custom elements present:", result.customElementsPresent);
    }
    if (!result.isLinkOnTop && result.topElement) {
      console.log("BLOCKING ELEMENT:", result.topElement);
    }
    if (result.stackOrder?.length > 0) {
      console.log(
        "Stack:",
        result.stackOrder
          .map(
            (e) =>
              `${e.tag}[${e.position},z:${e.zIndex}]${e.isDocsLink ? " ← DOCS" : ""}`,
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

await inspectAfterDelay("/with/svg", 1280);
await inspectAfterDelay("/with/animejs", 1280);
await inspectAfterDelay("/with/svg", 390);
