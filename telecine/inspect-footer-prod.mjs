import { chromium, webkit } from "playwright";

const PROD_URL = "https://editframe.com";

async function inspectFooterLinks(path, browserType, viewport) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    viewport: viewport,
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
        isLinkOnTop: topElement === docsLink,
        isInViewport:
          centerY > 0 &&
          centerY < window.innerHeight &&
          centerX > 0 &&
          centerX < window.innerWidth,
        topElement: topElement
          ? {
              tag: topElement.tagName.toLowerCase(),
              className: (topElement.className?.toString() || "").substring(
                0,
                200,
              ),
              isFooterLink: topElement === docsLink,
              position: window.getComputedStyle(topElement).position,
              zIndex: window.getComputedStyle(topElement).zIndex,
              width: Math.round(topElement.getBoundingClientRect().width),
              height: Math.round(topElement.getBoundingClientRect().height),
              top: Math.round(topElement.getBoundingClientRect().top),
              left: Math.round(topElement.getBoundingClientRect().left),
            }
          : null,
        stackOrder: allElements.slice(0, 6).map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: (el.className?.toString() || "").substring(0, 80),
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          isDocsLink: el === docsLink,
        })),
      };
    });

    const browserName = browserType.name();
    console.log(`\n=== ${browserName} ${viewport.width}px ${path} ===`);
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

// Test production with Chromium
await inspectFooterLinks("/pricing", chromium, { width: 1280, height: 800 });
await inspectFooterLinks("/", chromium, { width: 1280, height: 800 });

// Test with WebKit (Safari-like)
await inspectFooterLinks("/pricing", webkit, { width: 1280, height: 800 });
await inspectFooterLinks("/pricing", webkit, { width: 390, height: 844 });
await inspectFooterLinks("/", webkit, { width: 390, height: 844 });
