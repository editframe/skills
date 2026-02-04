import EventEmitter from "node:events";
import type { BrowserWindow as BrowserWindowType } from "electron";
import { BrowserWindow } from "../../../electron-exec/electronReExport";
import { context, propagation } from "@opentelemetry/api";
import * as logging from "@/logging";
import { raceTimeout } from "@/util/raceTimeout";
import type {
  FramegenEngine,
  VideoRenderOptions,
} from "@/render/engines/FramegenEngine";
import { inspect } from "node:util";
import { createOrgSession } from "@/render/createOrgSession";
import { executeSpan } from "@/tracing";
import { sleep } from "@/util/sleep";
import type { AssetsMetadataBundle } from "./shared/assetMetadata";
import type { AssetProvider } from "@/render/AssetProvider";

interface ContextConfig {
  width: number;
  height: number;
  location: string;
  orgId: string;
  loadTimeoutMs?: number;
  assetsBundle?: AssetsMetadataBundle;
  assetProvider?: AssetProvider;
  clearStorage?: boolean;
  traceContext?: Record<string, unknown>;
}

export class ElectronEngine {
  static async create() {
    // This method creates the engine but doesn't create contexts yet
    // The actual context creation happens in createContext
    return new ElectronEngine();
  }

  constructor() {}

  close = async () => {
    // Nothing to close at the engine level since contexts manage their own BrowserWindows
  };

  async createContext(config: ContextConfig) {
    return await executeSpan("ElectronEngine.createContext", async (_span) => {
      const logger = logging.logger.child({ component: "ElectronEngine" });
      console.log("🔧 [ElectronEngine] Creating BrowserWindow...");
      const renderer = new BrowserWindow({
        x: 0,
        y: 0,
        enableLargerThanScreen: true,
        width: config.width,
        height: config.height + 1, // Add 1 pixel for verification strip
        resizable: true,
        show: false,
        frame: false,
        webPreferences: {
          backgroundThrottling: false,
          sandbox: false,
          offscreen: true,
          preload:
            "/app/lib/render/engines/ElectronEngine/preload_FRAMEGEN.cjs",
          session: await createOrgSession(
            config.orgId,
            config.assetsBundle,
            config.assetProvider,
          ),
        },
      });

      try {
        console.log("🔧 [ElectronEngine] BrowserWindow created, setting up...");
        renderer.webContents.setFrameRate(240);

        this.setupRendererHandlers(renderer, logger);
        this.setupApiRouting(renderer, config.orgId, logger);

        console.log("🔧 [ElectronEngine] About to load page:", config.location);
        await this.initializePage(
          renderer,
          config.location,
          config.loadTimeoutMs ?? 5000,
          logger,
        );
        console.log("🔧 [ElectronEngine] Page loaded successfully");

        const engineContext = new ElectronEngineContext(
          renderer,
          config,
          logger,
        );

        return engineContext;
      } catch (error) {
        if (!renderer.isDestroyed()) {
          renderer.destroy();
        }
        throw error;
      }
    });
  }

  private setupRendererHandlers(
    renderer: BrowserWindowType,
    logger: typeof logging.logger,
  ) {
    renderer.on("unresponsive", () => {
      logger.error("Renderer unresponsive");
    });
    renderer.webContents.on("destroyed", () => {
      logger.debug("Renderer destroyed");
    });
    renderer.webContents.on(
      "render-process-gone",
      (_event: any, details: any) => {
        logger.error({ details }, "Renderer render-process-gone");
      },
    );

    renderer.webContents.ipc.on(
      "exportSpans",
      async (_event: any, endpoint: string, spansPayload: string) => {
        logger.debug(
          { endpoint, payloadLength: spansPayload.length },
          "Received spans from renderer",
        );
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: spansPayload,
          });

          if (response.ok) {
            logger.debug(
              "Successfully forwarded renderer spans to OTLP endpoint",
            );
          } else {
            const errorText = await response.text();
            logger.error(
              {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
              },
              "Failed to forward renderer spans",
            );
          }
        } catch (error) {
          logger.error(
            {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            "Error forwarding renderer spans",
          );
        }
      },
    );

    renderer.webContents.on("console-message", (event) => {
      const { level, message } = event;
      if (
        message.includes("Electron Security Warning") ||
        message.includes("Element ef-video scheduled an update") ||
        message.includes("Element ef-audio scheduled an update") ||
        message.includes("Element ef-waveform scheduled an update") ||
        message.includes("Element ef-timegroup scheduled an update") ||
        message.includes("Lit is in dev mode") ||
        message.startsWith("[vite]")
      ) {
        return;
      }

      console.log({ level, message });
      if (level === "info") {
        logger.info({ level, message }, "renderer console message");
      } else if (level === "debug") {
        logger.debug({ level, message }, "renderer console message");
      } else if (level === "warning") {
        logger.warn({ level, message }, "renderer console message");
      } else if (level === "error") {
        logger.error({ level, message }, "renderer console message");
      } else {
        console.log("renderer console message", { level, message });
        logger.info({ level, message }, "renderer console message");
      }
    });
  }

  private setupApiRouting(
    _renderer: BrowserWindowType,
    _orgId: string,
    _logger: typeof logging.logger,
  ) {
    // no-op: api routing is handled by createOrgSession and eletron protocol handling (allows using fetch/streaming)
  }

  private async initializePage(
    renderer: BrowserWindowType,
    location: string,
    loadTimeoutMs: number,
    logger: typeof logging.logger,
  ) {
    return executeSpan("ElectronEngine.initializePage", async (span) => {
      span.setAttribute("location", location);
      span.setAttribute("loadTimeoutMs", loadTimeoutMs);

      if (
        location.startsWith("http") ||
        location.startsWith("file:") ||
        location.startsWith("data:")
      ) {
        if (location.startsWith("file://")) {
          const fs = await import("node:fs/promises");
          // Strip query params and hash from file path for stat check
          const filePath = location.replace("file://", "").split(/[?#]/)[0];
          const stats = await fs.stat(filePath);
          span.setAttribute("fileSize", stats.size);
        }

        await raceTimeout(
          loadTimeoutMs,
          `Failed to load ${location} in ${loadTimeoutMs}ms`,
          renderer.loadURL(location),
        );
      } else {
        await raceTimeout(
          loadTimeoutMs,
          `Failed to load ${location} in ${loadTimeoutMs}ms`,
          renderer.loadFile(location),
        );
      }
    });
  }
}

export class ElectronEngineContext implements FramegenEngine {
  constructor(
    private renderer: BrowserWindowType,
    private config: ContextConfig,
    private logger: typeof logging.logger,
  ) {}

  private isInitialized = false;
  eventEmitter = new EventEmitter();

  get ipc() {
    return this.renderer.webContents.ipc;
  }

  get webContents() {
    return this.renderer.webContents;
  }

  get isClosed(): boolean {
    return this.webContents.isDestroyed();
  }

  onError(handler: (error: Error) => void): void {
    this.ipc.on("uncaughtError", (_event: any, error: any) => {
      this.logger.error({ error: inspect(error) }, "uncaughtError");
      handler(error);
    });
    this.ipc.on("error", (_event: any, error: any) => {
      this.logger.error({ error: inspect(error) }, "error");
      handler(error);
    });

    // Handle synchronized logging from renderer
    this.ipc.on("syncLog", (_event: any, sequence: number, message: string) => {
      const timestamp = performance.now().toFixed(2);
      this.logger.trace(`[${timestamp}ms] 🔍 RENDERER SYNC:`, message);
      // Send acknowledgment back to renderer
      this.webContents.send(`syncLogAck-${sequence}`);
    });
  }

  resize(width: number, height: number): Promise<void> {
    this.renderer.setSize(width, height);
    return Promise.resolve();
  }

  async initialize(renderOptions: VideoRenderOptions): Promise<void> {
    return executeSpan("ElectronEngine.initialize", async (span) => {
      if (this.isInitialized) {
        span.setAttribute("alreadyInitialized", true);
        return;
      }

      span.setAttributes({
        width: renderOptions.encoderOptions.video.width,
        height: renderOptions.encoderOptions.video.height,
        framerate: renderOptions.encoderOptions.video.framerate,
        durationMs: renderOptions.durationMs,
      });

      const otelEndpoint =
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://tracing:4318";

      const carrier = {};
      propagation.inject(context.active(), carrier);

      this.webContents.send(
        "initialize",
        renderOptions,
        carrier,
        `${otelEndpoint}/v1/traces`,
      );

      return raceTimeout(
        3000,
        "FRAMEGEN Initialization timeout. Failed to receive 'initialized' event within 3000ms. Avoid doing any async work in the initialize handler",
        new Promise<void>((resolve) => {
          this.ipc.once("initialized", () => {
            this.isInitialized = true;
            resolve();
          });
        }),
      );
    });
  }

  async beginFrame(
    frameNumber: number,
    isLast: boolean,
  ): Promise<Buffer | ArrayBuffer> {
    return executeSpan("ElectronEngine.beginFrame", async (span) => {
      span.setAttributes({
        frameNumber,
        isLast,
      });

      const carrier = {};
      propagation.inject(context.active(), carrier);

      return raceTimeout(
        5000,
        `FRAMEGEN BeginFrame timeout. Failed to receive 'frame' event within 5000ms`,
        new Promise<Buffer>((resolve, _reject) => {
          this.ipc.once(
            "frame",
            (_event: any, _frameNumber: number, data: ArrayBuffer) => {
              span.setAttribute("audioSamplesBytes", data.byteLength);
              resolve(Buffer.from(data));
            },
          );
          queueMicrotask(() => {
            this.webContents.send("beginFrame", frameNumber, isLast, carrier);
          });
        }),
      );
    });
  }

  async captureFrame(
    frameNumber: number,
    _fps: number,
  ): Promise<Buffer | ArrayBuffer> {
    return executeSpan("ElectronEngine.captureFrame", async (span) => {
      span.setAttribute("frameNumber", frameNumber);

      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        attempt++;
        span.setAttribute("attempt", attempt);

        let image: Electron.NativeImage | undefined;
        let bitmap: Buffer | undefined;
        try {
          const carrier = {};
          propagation.inject(context.active(), carrier);

          image = await new Promise<Electron.NativeImage>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Paint event timeout"));
            }, 5000);

            this.webContents.once(
              "paint",
              (_event: any, _dirtyRect: any, image: any) => {
                clearTimeout(timeout);
                if (
                  image.getSize().width === 0 ||
                  image.getSize().height === 0
                ) {
                  reject(new Error("Image is empty"));
                }
                resolve(image);
              },
            );

            this.webContents.send("triggerCanvas", carrier);
          });

          bitmap = image.toBitmap();
          span.setAttribute("bitmapBytes", bitmap.length);

          const isContentValid = this.verifyBitmapContent(bitmap, frameNumber);
          span.setAttribute("verificationPassed", isContentValid);

          if (isContentValid) {
            return bitmap;
          } else {
            await sleep(10);
            this.logger.warn(
              { frameNumber, attempt },
              "Frame verification failed, retrying",
            );
            if (attempt >= maxRetries) {
              throw new Error(
                `Frame verification failed after ${maxRetries} attempts`,
              );
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            { frameNumber, attempt, error: errorMessage },
            "Frame capture attempt failed",
          );
          if (attempt >= maxRetries) {
            if (
              image?.getSize().width === 0 ||
              image?.getSize().height === 0 ||
              !bitmap
            ) {
              this.logger.error(
                { frameNumber, maxRetries },
                "Frame capture failed after all retries, using blank frame",
              );
              const pixelCount = this.config.width * (this.config.height + 1);
              span.setAttribute("usingBlankFrame", true);
              return Buffer.alloc(pixelCount * 4);
            }
            return bitmap;
          }
        }
      }

      throw new Error("Unexpected error in captureFrame");
    });
  }

  // Verify frame content from bitmap by sampling verification strip
  private verifyBitmapContent(
    bitmap: Buffer,
    expectedFrameNumber: number,
  ): boolean {
    try {
      // Sample the verification strip pixel at the bottom row of the bitmap
      // Verification strip is at y = contentHeight (the last row)
      const contentWidth = this.config.width;
      const contentHeight = this.config.height;
      const totalWidth = contentWidth;

      const sampleX = Math.floor(contentWidth / 2);
      const sampleY = contentHeight;

      // BGRA format: 4 bytes per pixel, so pixel offset = (y * width + x) * 4
      const pixelOffset = (sampleY * totalWidth + sampleX) * 4;

      if (pixelOffset + 3 < bitmap.length) {
        const blue = bitmap[pixelOffset + 0] ?? 0; // BGRA format: B comes first
        const green = bitmap[pixelOffset + 1] ?? 0;
        const red = bitmap[pixelOffset + 2] ?? 0;

        // Decode 24-bit frame number from RGB values
        // R=high byte, G=middle byte, B=low byte (matching encoding in framegen.html)
        const decodedFrameNumber = red * (256 * 256) + green * 256 + blue;
        // Check if the decoded frame number matches expected frame number
        return decodedFrameNumber === expectedFrameNumber;
      }

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn({ error: errorMessage }, "Bitmap verification failed");
      return false;
    }
  }

  isBitmapEngine = true;

  [Symbol.asyncDispose] = async () => {
    const closePromise = new Promise<void>((resolve) => {
      this.renderer.on("closed", () => {
        resolve();
      });
    });
    // The documentation claims that closed is guaranteed to be emitted when destroy is called.
    // However, our tests are persuasive that it is not.
    // In theory, close can be prevented by onbeforeunload, but we'll have to deal with that
    // possibilities with timeouts.
    this.renderer.webContents.close();
    this.renderer.destroy();
    await raceTimeout(
      2000,
      "Timeout waiting for renderer to close",
      closePromise,
    );
  };

  async getRenderInfo() {
    return executeSpan("ElectronEngine.getRenderInfo", async (span) => {
      const renderInfo = await this.webContents.executeJavaScript(/* js */ `
      (async () => {
        const rootTimegroup = document.querySelector("ef-timegroup");

        if (!rootTimegroup) {
          throw new Error("No root timegroup found");
        }

        console.log("GetRenderInfo: rootTimegroup.durationMs before wait =", rootTimegroup.durationMs);

        await rootTimegroup.waitForMediaDurations();
        
        if (rootTimegroup.durationMs === 0) {
          throw new Error("Root timegroup duration is 0 after waiting for media durations");
        }

        console.log("GetRenderInfo: after waitForMediaDurations, durationMs =", rootTimegroup.durationMs);

        // Skip frameController.renderFrame for getRenderInfo - it's not necessary
        // and causes crashes when called multiple times on the same video element
        // The actual rendering will happen during the render phase
        console.log("GetRenderInfo: skipping frameController.renderFrame");
        console.log("rootTimegroup.outerHTML", rootTimegroup.outerHTML);
        console.log("rootTimegroup.durationMs", rootTimegroup.durationMs);
        console.log("rootTimegroup.currentTimeMs", rootTimegroup.currentTimeMs);
        const width = rootTimegroup.clientWidth;
        const height = rootTimegroup.clientHeight;
        const durationMs = Math.round(rootTimegroup.durationMs);
        const fps = rootTimegroup.fps ?? 30;

        console.log("GetRenderInfo: width", width);
        console.log("GetRenderInfo: height", height);
        console.log("GetRenderInfo: durationMs", durationMs);
        console.log("GetRenderInfo: fps", fps);


        const assets = {
          efMedia: new Set(),
          efImage: new Set(),
        };

        const elements = document.querySelectorAll("ef-audio, ef-video, ef-image");
        for (const element of elements) {
          switch (element.tagName) {
            case "EF-AUDIO":
            case "EF-VIDEO": {
              if (element.src) {
                assets.efMedia.add("src=" + element.src);
              }
              if (element.assetId) {
                assets.efMedia.add("asset-id=" + element.assetId);
              }
              
              break;
            }
            case "EF-IMAGE": {
              if (element.src) {
                assets.efImage.add("src=" + element.src);
              }
              if (element.assetId) {
                assets.efImage.add("asset-id=" + element.assetId);
              }
              break;
            }
          }
        }

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

      span.setAttributes({
        width: renderInfo.width,
        height: renderInfo.height,
        durationMs: renderInfo.durationMs,
        fps: renderInfo.fps,
        assetCount:
          renderInfo.assets.efMediaSrcs.length +
          renderInfo.assets.efImageSrcs.length,
      });

      return renderInfo as {
        width: number;
        height: number;
        durationMs: number;
        fps: number;
        assets: { efMediaSrcs: string[]; efImageSrcs: string[] };
      };
    });
  }
}
