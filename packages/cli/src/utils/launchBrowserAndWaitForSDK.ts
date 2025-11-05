import chalk from "chalk";
import debug from "debug";
import { type Browser, chromium, type Page } from "playwright";

import { withSpinner } from "./withSpinner.js";

const browserLog = debug("ef:cli::browser");

interface LaunchOptions {
  url: string;
  headless?: boolean;
  interactive?: boolean;
  efInteractive?: boolean;
}

export async function launchBrowserAndWaitForSDK(
  options: LaunchOptions,
  fn: (page: Page) => Promise<void>,
) {
  const browser = await withSpinner("Launching chrome", async () => {
    return chromium.launch({
      channel: "chrome",
      headless: options.headless ?? true,
      // headless: false,
      devtools: options.interactive === true,
    });
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
    const url =
      options.url + (options.efInteractive ? "" : "?EF_NONINTERACTIVE=1");
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
