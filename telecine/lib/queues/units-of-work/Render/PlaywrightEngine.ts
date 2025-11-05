import EventEmitter from "node:events";

import {
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
  chromium,
} from "playwright";

import { logger } from "@/logging";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "@/render/engines/FramegenEngine";
import { RangeHeader } from "@/util/RangeHeader.server";
import { envString } from "@/util/env";
import { getStorageKeyForPath } from "@/util/getStorageKeyForPath";
import { raceTimeout } from "@/util/raceTimeout";
import { readIntoBuffer } from "@/util/readIntoBuffer";
import { storageProvider } from "@/util/storageProvider.server";
import type { AssetsMetadataBundle } from "./shared/assetMetadata";

const WEB_HOST = envString("WEB_HOST", "http://localhost:3000");

interface BrowserConfig {
  headless: boolean;
  executablePath: string;
  args: string[];
}

interface ContextConfig {
  width: number;
  height: number;
  location: string;
  orgId: string;
  assetsBundle?: AssetsMetadataBundle;
}


const createBrowserConfig = (): BrowserConfig => ({
  headless: false,
  executablePath:
    "/root/chrome-headless-shell/chrome-headless-shell-linux64/chrome-headless-shell",
  args: [
    "--headless",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--allow-file-access-from-files",
    "--run-all-compositor-stages-before-draw",
    "--disable-new-content-rendering-timeout",
    "--disable-threaded-animation",
    "--disable-threaded-scrolling",
    "--disable-checker-imaging",
    "--disable-image-animation-resync",
    "--disable-dev-shm-usage",
    "--enable-surface-synchronization",
    "--enable-begin-frame-control",
    "--deterministic-mode",
    "--disable-gpu-compositing",
    "--no-default-browser-check",
    "--no-first-run",
    "--disable-gpu-vsync=true",
    "--disable-gpu",
    "--disable-software-vsync",
    "--disable-extensions",
    "--disable-features=TranslateUI",
    "--disable-infobars",
  ],
});

export const createBrowser = (config: BrowserConfig = createBrowserConfig()) => {
  return chromium.launch(config);
}

export class PlaywrightEngine {
  static async create() {
    const config = createBrowserConfig();
    return new PlaywrightEngine(await createBrowser(config));
  }

  constructor(private readonly browser: Browser) { }

  close = async () => {
    await this.browser.close();
  };

  async createContext(config: ContextConfig) {
    const context = await this.browser.newContext({
      screen: { width: config.width, height: config.height },
      viewport: { width: config.width, height: config.height },
    });

    this.setupApiRouting(context, config.orgId, config.assetsBundle);

    const page = await context.newPage();
    this.setupPageLogging(page);

    const client = await context.newCDPSession(page);
    const engineContext = new PlaywrightEngineContext(context, page, client);

    await this.initializePage(page, config.location);

    return engineContext;
  }

  private setupApiRouting(context: BrowserContext, orgId: string, assetsBundle?: AssetsMetadataBundle) {
    context.route(`${WEB_HOST}/api/**`, async (route, request) => {
      const requestUrl = request.url();

      // Check if this is a fragment index request that can be served from bundle
      const fragmentIndexMatch = requestUrl.match(/\/api\/v1\/isobmff_files\/([^/]+)\/index$/);
      if (fragmentIndexMatch && assetsBundle) {
        const assetId = fragmentIndexMatch[1] ?? null;
        const fragmentIndex = assetId ? assetsBundle.fragmentIndexes[assetId] : null;

        if (fragmentIndex) {
          logger.debug({ assetId, requestUrl }, "Serving fragment index from bundle");

          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(fragmentIndex),
            headers: {
              "Cache-Control": "max-age=3600",
            },
          });
        }
      }

      // Fall back to storage file lookup
      const filePath = getStorageKeyForPath(
        requestUrl.replace(`${WEB_HOST}`, ""),
        orgId,
      );

      logger.debug(
        { requestUrl, filePath },
        "Intercepting API request",
      );

      if (!filePath) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: "Bad URL" }),
        });
      }

      const rangeHeader = request.headers().range;

      if (rangeHeader) {
        const range = RangeHeader.parse(rangeHeader);
        const readStream = await storageProvider.createReadStream(
          filePath,
          range,
        );
        const buffer = await readIntoBuffer(readStream);
        return route.fulfill({
          status: 206,
          body: buffer,
          headers: {
            "Content-Range": range.toHeader(),
          },
        });
      }

      const readStream = await storageProvider.createReadStream(filePath);
      const buffer = await readIntoBuffer(readStream);
      return route.fulfill({
        status: 200,
        body: buffer,
      });
    });
  }

  private setupPageLogging(page: Page) {
    page.on("console", (message) => {
      console.log("BROWSER: ", message.text());
    });
  }

  private async initializePage(page: Page, location: string) {
    await page.exposeBinding("EF_RENDERING", () => {
      return true;
    });
    await page.goto(location);
    await page.waitForFunction(
      () => {
        return window.EF_FRAMEGEN !== undefined;
      },
      { timeout: 3000 },
    );
  }
}

export class PlaywrightEngineContext implements FramegenEngine {
  constructor(
    private context: BrowserContext,
    private page: Page,
    private client: CDPSession,
  ) { }

  private isInitialized = false;

  initializerCallback?: (renderOptions: VideoRenderOptions) => void;
  beginFrameCallback?: (frameNumber: number, isLast: boolean) => void;
  eventEmitter = new EventEmitter();

  onError(handler: (error: Error) => void): void {
    this.page.on("pageerror", (error) => {
      handler(error);
    });
  }

  resize(width: number, height: number): Promise<void> {
    return this.page.setViewportSize({ width, height });
  }

  async initialize(renderOptions: VideoRenderOptions): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    console.log("🔍 PlaywrightEngine.initialize: Before browser send", renderOptions);

    return raceTimeout(
      3000,
      "FRAMEGEN Initialization timeout. Failed to receive 'initialized' event within 3000ms. Avoid doing any async work in the initialize handler",
      this.page.evaluate(async (renderOptions) => {
        await window.EF_FRAMEGEN?.initialize(renderOptions);
      }, renderOptions),
    );
  }

  async beginFrame(
    frameNumber: number,
    isLast: boolean,
  ): Promise<Buffer | ArrayBuffer> {
    const result = await raceTimeout(
      5000,
      "FRAMEGEN BeginFrame timeout. Failed to receive 'frame' event within 5000ms",
      this.page.evaluate(
        ([frameNumber, isLast]) => {
          if (!window.EF_FRAMEGEN) {
            throw new Error("FRAMEGEN not initialized");
          }
          return window.EF_FRAMEGEN.beginFrame(frameNumber, isLast);
        },
        [frameNumber, isLast] as const,
      ),
    );

    if (typeof result === "string" && result.startsWith("data:")) {
      const base64Start = result.indexOf(",") + 1;
      const base64Data = result.slice(base64Start);
      return Buffer.from(base64Data, "base64");
    }

    return Buffer.from([]);
  }

  async captureFrame(
    _frameNumber: number,
    _fps: number,
  ): Promise<Buffer | ArrayBuffer> {
    const result = await raceTimeout(
      5000,
      "FRAMEGEN CaptureFrame timeout. Failed to receive 'frame' event within 5000ms",
      this.client.send("HeadlessExperimental.beginFrame", {
        screenshot: {
          format: "jpeg",
          quality: 100,
          optimizeForSpeed: true,
        },
      }),
    );
    if (!result.screenshotData) {
      throw new Error(
        "Failed to capture frame with HeadlessExperimental.beginFrame",
      );
    }
    return Buffer.from(result.screenshotData, "base64");
  }

  isBitmapEngine = false;

  [Symbol.asyncDispose] = async () => {
    await this.context.close().catch(error => {
      console.error("🔍 PlaywrightEngineContext.dispose: Error closing context", error);
    });
  };

  async getRenderInfo() {
    const renderInfo = await this.page.evaluate(/* js */ `
      (async () => {
        console.log("🔍 getRenderInfo: Starting...");
        const rootTimegroup = document.querySelector("ef-timegroup");

        if (!rootTimegroup) {
          throw new Error("No root timegroup found");
        }

        console.log("🔍 getRenderInfo: Found root timegroup, durationMs before waitForMediaDurations:", rootTimegroup.durationMs);

        const efVideos = document.querySelectorAll("ef-video");
        console.log("🔍 getRenderInfo: Found ef-video elements:", efVideos.length);
        
        for (let i = 0; i < efVideos.length; i++) {
          const video = efVideos[i];
          console.log("🔍 getRenderInfo: ef-video", i, "src:", video.src, "asset-id:", video.getAttribute("asset-id"), "sourceOut:", video.getAttribute("sourceOut"));
        }

        try {
          console.log("🔍 getRenderInfo: Calling waitForMediaDurations...");
          await rootTimegroup.waitForMediaDurations();
          console.log("🔍 getRenderInfo: waitForMediaDurations completed, durationMs after:", rootTimegroup.durationMs);
        } catch (error) {
          console.error("🔍 getRenderInfo: Error waiting for media durations", error);
        }

        const width = rootTimegroup.clientWidth;
        const height = rootTimegroup.clientHeight;
        const durationMs = Math.round(rootTimegroup.durationMs);
        const fps = rootTimegroup.fps ?? 30;

        console.log("🔍 getRenderInfo: Final values - width:", width, "height:", height, "durationMs:", durationMs, "fps:", fps);

        const elements = document.querySelectorAll("ef-audio, ef-video, ef-image");

        const assets = {
          efMedia: new Set(),
          efImage: new Set(),
        };

        console.log("🔍 getRenderInfo: ELEMENTS", JSON.stringify(Array.from(elements).map((e) => [e.tagName, e.src, e.assetId, e.durationMs, e.fragmentIndexTask?.value]), null, 2));

        for (const element of elements) {
          switch (element.tagName) {
            case "EF-AUDIO":
            case "EF-VIDEO": {
              if (element.src) {
                assets.efMedia.add(element.src);
              }
              break;
            }
            case "EF-IMAGE": {
              if (element.src) {
                assets.efImage.add(element.src);
              }
              break;
            }
          }
        }

        console.log("🔍 getRenderInfo: HTML: " + document.body.innerHTML.replace(/\\n/g, ""));

        return {
          width,
          height,
          durationMs,
          fps,
          assets: {
            efMediaSrcs: Array.from(assets.efMedia),
            efImageSrcs: Array.from(assets.efImage),
          },
        }
      })();
    `);
    return renderInfo as {
      width: number;
      height: number;
      durationMs: number;
      fps: number;
      assets: { efMediaSrcs: string[]; efImageSrcs: string[] };
    };
  }
}
