import chalk from "chalk";
import debug from "debug";
import { type Browser, chromium, type Page } from "playwright";

import { requireChrome } from "./detectChrome.js";
import { withSpinner } from "./withSpinner.js";

const browserLog = debug("ef:cli::browser");

interface LaunchOptions {
  url: string;
  headless?: boolean;
  interactive?: boolean;
  efInteractive?: boolean;
  nativeRender?: boolean;
  chromePath?: string;
  profile?: boolean;
  profileOutput?: string;
}

export async function launchBrowserAndWaitForSDK(
  options: LaunchOptions,
  fn: (page: Page) => Promise<void>,
) {
  // Detect Chrome before launching (only for non-interactive renders)
  if (options.interactive !== true && !options.chromePath) {
    requireChrome();
  }

  const browser = await withSpinner("Launching chrome", async () => {
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      channel: "chrome",
      headless: options.headless ?? true,
      devtools: options.interactive === true,
    };

    // Use custom Chrome path if provided
    if (options.chromePath) {
      launchOptions.executablePath = options.chromePath;
      // Don't use channel when providing explicit path
      delete launchOptions.channel;
    }

    return chromium.launch(launchOptions);
  });

  const page = await withSpinner("Loading Editframe SDK", async () => {
    const pageOptions: Parameters<Browser["newPage"]>[0] = {};
    if (options.interactive === true) {
      // By default, playwright uses its own viewport, so resizing the browser window
      // doesn't actually change the viewport. And the gui doesn't scale to fit.
      // This is not desirable for interactive mode, so we disable the viewport feature.
      pageOptions.viewport = null;
    }
    const page = await browser.newPage(pageOptions);
    page.on("console", (msg) => {
      browserLog(chalk.blue(`browser (${msg.type()}) |`), msg.text());
    });

    // Build URL with query parameters
    const urlParams = new URLSearchParams();
    if (!options.efInteractive) {
      urlParams.set("EF_NONINTERACTIVE", "1");
    }
    if (options.nativeRender) {
      urlParams.set("EF_NATIVE_RENDER", "1");
    }
    const url = options.url + (urlParams.toString() ? `?${urlParams.toString()}` : "");

    process.stderr.write("\nLoading url: ");
    process.stderr.write(url);
    process.stderr.write("\n");
    await page.goto(url);
    await page.waitForFunction(
      () => {
        return (
          // @ts-expect-error
          window.EF_REGISTERED
        );
      },
      [],
      { timeout: 10_000 },
    );
    return page;
  });
  await fn(page);
  if (options.interactive !== true) {
    await browser.close();
    process.exit(0);
  }
}
