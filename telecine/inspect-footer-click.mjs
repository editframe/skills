import { chromium, webkit } from "playwright";

const PROD_URL = "https://editframe.com";

async function testClickBehavior(path, browserType, viewport) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport });
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

    // Get the actual href and computed style of the Docs footer link
    const result = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      const links = Array.from(footer?.querySelectorAll("a") || []);
      const docsLink = links.find((a) => a.textContent?.trim() === "Docs");
      if (!docsLink)
        return {
          error: "no link",
          links: links.map((a) => a.textContent?.trim()),
        };

      const rect = docsLink.getBoundingClientRect();

      // Check all elements at the link's position
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elementsAtPoint = document.elementsFromPoint(cx, cy);

      // Check what scrolls to top — look for any scroll handler on ancestors
      function hasScrollHandler(el) {
        const events = [];
        // Can't easily read event listeners from JS, but check onclick
        if (el.onclick) events.push("onclick");
        return events;
      }

      // Check loaded stylesheets
      const stylesheets = Array.from(document.styleSheets).map((ss) => {
        try {
          return { href: ss.href, rules: ss.cssRules?.length || 0 };
        } catch {
          return { href: ss.href, blocked: true };
        }
      });

      // Check if elements CSS is loaded
      const elementsStylesheet = stylesheets.find(
        (s) => s.href?.includes("elements") || s.href?.includes("style"),
      );

      // Check the actual computed href/display behavior
      return {
        href: docsLink.getAttribute("href"),
        computedDisplay: window.getComputedStyle(docsLink).display,
        isInViewport: cy > 0 && cy < window.innerHeight,
        clickPoint: { x: Math.round(cx), y: Math.round(cy) },
        topElement: document.elementFromPoint(cx, cy)?.tagName,
        elementsAtPoint: elementsAtPoint.slice(0, 5).map((el) => ({
          tag: el.tagName,
          class: (el.className?.toString() || "").substring(0, 80),
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          pointerEvents: window.getComputedStyle(el).pointerEvents,
          isLink: el === docsLink,
        })),
        allStylesheets: stylesheets.slice(0, 10),
        // Check how many stylesheets are from elements package
        elementsStylesheets: stylesheets.filter(
          (s) => s.href?.includes("elements") || s.href?.includes("@editframe"),
        ),
      };
    });

    console.log(`\n=== ${browserType.name()} ${viewport.width}px ${path} ===`);
    console.log("Docs link href:", result.href);
    console.log("Docs link display:", result.computedDisplay);
    console.log("Top element at click:", result.topElement);
    console.log(
      "Stack:",
      result.elementsAtPoint
        ?.map(
          (e) => `${e.tag}[ptr:${e.pointerEvents}]${e.isLink ? " ←LINK" : ""}`,
        )
        .join("→"),
    );
    if (result.elementsStylesheets?.length > 0) {
      console.log("Elements stylesheets loaded:", result.elementsStylesheets);
    }
    console.log(
      "All stylesheets:",
      result.allStylesheets
        ?.map((s) => `${s.href?.split("/").pop()} (${s.rules} rules)`)
        .join(", "),
    );
  } catch (e) {
    console.error(`Error:`, e.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

await testClickBehavior("/pricing", chromium, { width: 1280, height: 800 });
await testClickBehavior("/", chromium, { width: 1280, height: 800 });
