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
  silent?: boolean; // Suppress spinner output
}

export async function launchBrowserAndWaitForSDK(
  options: LaunchOptions,
  fn: (page: Page) => Promise<void>,
) {
  // Detect Chrome before launching (only for non-interactive renders)
  if (options.interactive !== true && !options.chromePath) {
    requireChrome();
  }

  const launchBrowser = async () => {
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

    // Enable GPU acceleration for headless rendering
    // This significantly improves canvas/WebGL performance for video rendering
    // Set EF_DISABLE_GPU=1 to disable GPU acceleration (for debugging/compatibility)
    const disableGpu = process.env.EF_DISABLE_GPU === "1";

    if (options.headless && options.interactive !== true && !disableGpu) {
      launchOptions.args = [
        // Core GPU acceleration flags
        "--enable-gpu", // Enable GPU hardware acceleration
        "--use-angle=default", // Use ANGLE for OpenGL (better compatibility)
        "--enable-accelerated-2d-canvas", // Hardware-accelerate canvas operations
        "--enable-webgl", // Enable WebGL
        "--enable-features=VaapiVideoDecoder", // Hardware video decoding (Linux)

        // Prevent fallback to software rendering
        "--disable-software-rasterizer",

        // System resource optimizations
        "--disable-dev-shm-usage", // Avoid /dev/shm issues (especially on Linux/Docker)

        // Optional: Uncomment if running in Docker or restricted environments
        // "--no-sandbox",
        // "--disable-setuid-sandbox",
      ];

      browserLog("Launching Chrome with GPU acceleration enabled");
    } else if (disableGpu) {
      browserLog("GPU acceleration disabled via EF_DISABLE_GPU");
    }

    return chromium.launch(launchOptions);
  };

  const browser = options.silent
    ? await launchBrowser()
    : await withSpinner("Launching chrome", launchBrowser);

  const loadSDK = async () => {
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

    browserLog("Loading url:", url);
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
  };

  const page = options.silent
    ? await loadSDK()
    : await withSpinner("Loading Editframe SDK", loadSDK);

  await fn(page);
  if (options.interactive !== true) {
    await browser.close();
    process.exit(0);
  }
}
