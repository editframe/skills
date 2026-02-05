import { context, propagation } from "@opentelemetry/api";
import { registerRcpHandler, keepalive } from "@/electron-exec/RPC";
import { ElectronEngineManager } from "./shared/ElectronEngineManager";
import { createVideoRenderOptionsForSegment } from "@/render/createRenderOptionsForSegment";
import { SegmentEncoder } from "@/render/SegmentEncoder.server";
import { StillEncoder } from "@/render/StillEncoder";
import { OutputConfiguration } from "@editframe/api";
import type { AssetsMetadataBundle } from "./shared/assetMetadata";
import type { AssetProvider } from "@/render/AssetProvider";
import { logger } from "@/logging";
import { setSpanAttributes } from "@/tracing";

logger.debug("🔧 [RPC_SERVER] All imports complete");

// Store per-frame timing data for browser frame-by-frame renders
export interface FrameTimingData {
  frameNumber: number;
  cloneMs: number;
  seekMs: number;
  renderMs: number;
  captureMs: number;
  canvasMs: number;
  blobMs: number;
  serializeMs: number;
  ipcRoundTripMs: number;
  ipcOverheadMs: number;
  totalCaptureMs: number;
  jpegSize: number;
}

export interface SegmentTimingData {
  frames: FrameTimingData[];
  segmentIndex: number;
  totalMs: number;
}

const renderTimingData = new Map<string, SegmentTimingData[]>();

export type CreateContextArgs = [
  {
    width?: number;
    height?: number;
    location: string;
    orgId: string;
    assetsBundle?: AssetsMetadataBundle;
    assetProvider?: AssetProvider;
  },
];
export type CreateContextResult = {
  contextId: string;
};

export type GetRenderInfoArgs = [
  {
    width?: number;
    height?: number;
    location: string;
    orgId: string;
    durationMs?: number;
    contextId?: string;
  },
];
export type GetRenderInfoResult = {
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  assets: {
    efMediaSrcs: string[];
    efImageSrcs: string[];
  };
};
export type RenderFragmentArgs = [
  {
    width: number;
    height: number;
    location: string;
    orgId: string;
    renderId: string;
    segmentDurationMs: number;
    segmentIndex: number | "init";
    durationMs: number;
    fps: number;
    fileType: "standalone" | "fragment";
    assetsBundle?: AssetsMetadataBundle;
  },
];
export type RenderFragmentResult = Uint8Array;

export type RenderStillArgs = [
  {
    width: number;
    height: number;
    location: string;
    orgId: string;
    renderId: string;
    durationMs: number;
    fps: number;
    outputConfig: any;
    assetsBundle?: AssetsMetadataBundle;
    contextId?: string;
  },
];
export type RenderStillResult = Uint8Array;

export type RenderBrowserFullVideoArgs = [
  {
    width: number;
    height: number;
    location: string;
    orgId: string;
    durationMs: number;
    fps: number;
    canvasMode: "native" | "foreignObject";
    assetsBundle?: AssetsMetadataBundle;
  },
];
export type RenderBrowserFullVideoResult = Uint8Array;

export type RenderBrowserFrameByFrameArgs = [
  {
    width: number;
    height: number;
    location: string;
    orgId: string;
    renderId: string;
    segmentDurationMs: number;
    segmentIndex: number | "init";
    durationMs: number;
    fps: number;
    fileType: "standalone" | "fragment";
    canvasMode: "native" | "foreignObject";
    assetsBundle?: AssetsMetadataBundle;
  },
];
export type RenderBrowserFrameByFrameResult = Uint8Array;

export interface ElectronRPCClient {
  call(
    method: "createContext",
    ...args: CreateContextArgs
  ): Promise<CreateContextResult>;
  call(
    method: "getRenderInfo",
    ...args: GetRenderInfoArgs
  ): Promise<GetRenderInfoResult>;
  call(
    method: "renderFragment",
    ...args: RenderFragmentArgs
  ): Promise<RenderFragmentResult>;
  call(
    method: "renderStill",
    ...args: RenderStillArgs
  ): Promise<RenderStillResult>;
  call(
    method: "renderBrowserFullVideo",
    ...args: RenderBrowserFullVideoArgs
  ): Promise<RenderBrowserFullVideoResult>;
  call(
    method: "renderBrowserFrameByFrame",
    ...args: RenderBrowserFrameByFrameArgs
  ): Promise<RenderBrowserFrameByFrameResult>;
  call(
    method: "getBrowserFrameTiming",
    args: { renderId: string }
  ): Promise<SegmentTimingData[]>;
  call(
    method: "clearBrowserFrameTiming",
    args: { renderId: string }
  ): Promise<void>;
  call(method: "disposeContext", contextId: string): Promise<void>;
  call(method: "terminate"): Promise<void>;
}

logger.debug("🔧 [RPC_SERVER] Creating engine and registering handlers...");

export const rpcServerReady = (async () => {
  try {
    await ElectronEngineManager.withEngine(async (electronEngine) => {
      logger.debug(
        "🔧 [RPC_SERVER] Inside withEngine callback, engine created",
      );

      // Context management
      const contexts = new Map<
        string,
        Awaited<ReturnType<typeof electronEngine.createContext>>
      >();
      let nextContextId = 1;

      logger.debug("🔧 [RPC_SERVER] Registering createContext handler...");
      registerRcpHandler(
        "createContext",
        async ([
          { width, height, location, orgId, assetsBundle, assetProvider },
        ]: CreateContextArgs): Promise<CreateContextResult> => {
          const contextId = `ctx-${nextContextId++}`;
          const carrier = {};
          propagation.inject(context.active(), carrier);

          const ctx = await electronEngine.createContext({
            width: width ?? 600,
            height: height ?? 400,
            location,
            orgId,
            assetsBundle,
            assetProvider,
            traceContext: carrier,
          });

          contexts.set(contextId, ctx);
          return { contextId };
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering disposeContext handler...");
      registerRcpHandler(
        "disposeContext",
        async ([contextId]: [string]): Promise<void> => {
          const ctx = contexts.get(contextId);
          if (ctx) {
            await ctx[Symbol.asyncDispose]();
            contexts.delete(contextId);
          }
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering getRenderInfo handler...");
      registerRcpHandler(
        "getRenderInfo",
        async (
          [
            { width, height, location, orgId, durationMs, contextId },
          ]: GetRenderInfoArgs,
          _ctx,
        ): Promise<GetRenderInfoResult> => {
          let infoContext;
          let shouldDispose = false;

          // Use pre-created context if provided, otherwise create new one
          if (contextId && contexts.has(contextId)) {
            infoContext = contexts.get(contextId)!;
          } else {
            const carrier = {};
            propagation.inject(context.active(), carrier);
            infoContext = await electronEngine.createContext({
              width: width ?? 600,
              height: height ?? 400,
              location,
              orgId,
              traceContext: carrier,
            });
            shouldDispose = true;
          }

          try {
            const extractedInfo = await infoContext.getRenderInfo();
            const finalWidth = width || extractedInfo.width;
            const finalHeight = height || extractedInfo.height;
            const finalDurationMs = durationMs || extractedInfo.durationMs;
            const finalFps = extractedInfo.fps;

            setSpanAttributes({
              width: finalWidth,
              height: finalHeight,
              durationMs: finalDurationMs,
              fps: finalFps,
              assets: extractedInfo.assets,
            });

            if (finalWidth <= 0 || finalHeight <= 0) {
              throw new Error(
                `Invalid render dimensions: ${finalWidth}x${finalHeight}. Width and height must be positive numbers. Check that your timegroup element has valid CSS dimensions.`,
              );
            }

            if (finalDurationMs <= 0) {
              throw new Error(
                `Invalid render duration: ${finalDurationMs}ms. Duration must be positive. Check that your timegroup has a valid duration attribute or media content.`,
              );
            }

            if (finalWidth > 8192 || finalHeight > 8192) {
              throw new Error(
                `Render dimensions too large: ${finalWidth}x${finalHeight}. Maximum supported size is 8192x8192.`,
              );
            }

            return {
              width: finalWidth,
              height: finalHeight,
              durationMs: finalDurationMs,
              fps: finalFps,
              assets: extractedInfo.assets,
            };
          } finally {
            if (shouldDispose) {
              await infoContext[Symbol.asyncDispose]();
            }
          }
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering renderFragment handler...");
      registerRcpHandler(
        "renderFragment",
        async (
          [
            {
              width,
              height,
              location,
              orgId,
              renderId,
              segmentDurationMs,
              segmentIndex,
              durationMs,
              fps,
              fileType,
              assetsBundle,
            },
          ]: RenderFragmentArgs,
          ctx,
        ): Promise<RenderFragmentResult> => {
          if (width <= 0 || height <= 0) {
            throw new Error(
              `Invalid fragment dimensions: ${width}x${height}. Width and height must be positive numbers.`,
            );
          }

          if (durationMs <= 0) {
            throw new Error(
              `Invalid fragment duration: ${durationMs}ms. Duration must be positive.`,
            );
          }

          if (segmentDurationMs <= 0) {
            throw new Error(
              `Invalid segment duration: ${segmentDurationMs}ms. Segment duration must be positive.`,
            );
          }

          const carrier = {};
          propagation.inject(context.active(), carrier);

          await using renderContext = await electronEngine.createContext({
            width,
            height,
            location,
            orgId,
            assetsBundle,
            traceContext: carrier,
          });

          const renderOptions = createVideoRenderOptionsForSegment({
            segmentDurationMs,
            segmentIndex,
            width,
            height,
            durationMs,
            fps,
            strategy: "v1",
          });

          renderOptions.showFrameBox = false;

          const abortController = new AbortController();

          const segmentEncoder = new SegmentEncoder({
            renderId,
            renderOptions,
            engine: renderContext,
            abortSignal: abortController.signal,
          });

          // Set up event-driven keepalives based on actual render progress
          const frameRenderedHandler = () => {
            ctx.sendKeepalive();
          };

          const encodingStartedHandler = () => {
            ctx.sendKeepalive();
          };

          segmentEncoder.on("frameRendered", frameRenderedHandler);
          segmentEncoder.on("encodingStarted", encodingStartedHandler);

          let fragmentBuffer: ArrayBuffer;
          try {
            if (fileType === "standalone") {
              fragmentBuffer = await segmentEncoder.generateStandaloneSegment();
            } else {
              fragmentBuffer = await segmentEncoder.generateFragmentBuffer();
            }
            return new Uint8Array(fragmentBuffer);
          } finally {
            // Clean up event listeners
            segmentEncoder.off("frameRendered", frameRenderedHandler);
            segmentEncoder.off("encodingStarted", encodingStartedHandler);
          }
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering renderStill handler...");
      registerRcpHandler(
        "renderStill",
        async (
          [
            {
              width,
              height,
              location,
              orgId,
              renderId,
              durationMs,
              fps,
              outputConfig,
              assetsBundle,
              contextId,
            },
          ]: RenderStillArgs,
          ctx,
        ): Promise<RenderStillResult> => {
          if (width <= 0 || height <= 0) {
            throw new Error(
              `Invalid still dimensions: ${width}x${height}. Width and height must be positive numbers.`,
            );
          }

          if (durationMs <= 0) {
            throw new Error(
              `Invalid still duration: ${durationMs}ms. Duration must be positive.`,
            );
          }

          let renderContext;
          let shouldDispose = false;

          // Use pre-created context if provided, otherwise create new one
          if (contextId && contexts.has(contextId)) {
            renderContext = contexts.get(contextId)!;
          } else {
            const carrier = {};
            propagation.inject(context.active(), carrier);
            renderContext = await electronEngine.createContext({
              width,
              height,
              location,
              orgId,
              assetsBundle,
              traceContext: carrier,
            });
            shouldDispose = true;
          }

          const parsedOutputConfig = OutputConfiguration.parse(outputConfig);

          const renderOptions = createVideoRenderOptionsForSegment({
            segmentDurationMs: durationMs,
            segmentIndex: 0,
            width,
            height,
            durationMs,
            fps,
            strategy: "v1",
          });

          renderOptions.showFrameBox = false;

          const abortController = new AbortController();

          const stillEncoder = new StillEncoder({
            renderId,
            outputConfig: parsedOutputConfig,
            engine: renderContext,
            renderOptions,
            abortSignal: abortController.signal,
          });

          ctx.sendKeepalive();

          try {
            const imageBuffer = await stillEncoder.encode();
            return new Uint8Array(imageBuffer);
          } finally {
            if (shouldDispose) {
              await renderContext[Symbol.asyncDispose]();
            }
          }
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering renderBrowserFullVideo handler...");
      registerRcpHandler(
        "renderBrowserFullVideo",
        async (
          [
            {
              width,
              height,
              location,
              orgId,
              durationMs,
              fps,
              canvasMode,
              assetsBundle,
            },
          ]: RenderBrowserFullVideoArgs,
          ctx,
        ): Promise<RenderBrowserFullVideoResult> => {
          if (width <= 0 || height <= 0) {
            throw new Error(
              `Invalid video dimensions: ${width}x${height}. Width and height must be positive numbers.`,
            );
          }

          if (durationMs <= 0) {
            throw new Error(
              `Invalid video duration: ${durationMs}ms. Duration must be positive.`,
            );
          }

          const carrier = {};
          propagation.inject(context.active(), carrier);

          await using renderContext = await electronEngine.createContext({
            width,
            height,
            location,
            orgId,
            assetsBundle,
            traceContext: carrier,
          });

          ctx.sendKeepalive();

          // Call renderTimegroupToVideo in the browser context
          logger.debug("🔧 [RPC_SERVER] Calling renderTimegroupToVideo in browser...", {
            canvasMode,
            width,
            height,
            durationMs,
            fps,
          });
          const videoBuffer = await renderContext.webContents.executeJavaScript(`
            (async () => {
              const rootTimegroup = document.querySelector('ef-timegroup');
              if (!rootTimegroup) {
                throw new Error('No root timegroup found');
              }

              // Wait for media to be ready
              await rootTimegroup.waitForMediaDurations();
              await rootTimegroup.frameController.renderFrame(rootTimegroup.currentTimeMs, {
                waitForLitUpdate: false,
              });

              const videoBuffer = await window.renderTimegroupToVideo(rootTimegroup, {
                fps: ${fps},
                codec: 'avc',
                returnBuffer: true,
                includeAudio: true,
                canvasMode: '${canvasMode}',
              });

              // Convert Uint8Array to regular Array so it can cross IPC boundary
              return Array.from(videoBuffer);
            })();
          `);

          logger.debug(`🔧 [RPC_SERVER] Browser render complete, buffer size: ${videoBuffer.length}`);
          
          return new Uint8Array(videoBuffer);
        },
      );

      logger.debug("🔧 [RPC_SERVER] Registering renderBrowserFrameByFrame handler...");
      registerRcpHandler(
        "renderBrowserFrameByFrame",
        async (
          [
            {
              width,
              height,
              location,
              orgId,
              renderId,
              segmentDurationMs,
              segmentIndex,
              durationMs,
              fps,
              fileType,
              canvasMode,
              assetsBundle,
            },
          ]: RenderBrowserFrameByFrameArgs,
          ctx,
        ): Promise<RenderBrowserFrameByFrameResult> => {
          if (width <= 0 || height <= 0) {
            throw new Error(
              `Invalid frame dimensions: ${width}x${height}. Width and height must be positive numbers.`,
            );
          }

          if (durationMs <= 0) {
            throw new Error(
              `Invalid frame duration: ${durationMs}ms. Duration must be positive.`,
            );
          }

          if (segmentDurationMs <= 0) {
            throw new Error(
              `Invalid segment duration: ${segmentDurationMs}ms. Segment duration must be positive.`,
            );
          }

          const carrier = {};
          propagation.inject(context.active(), carrier);

          await using renderContext = await electronEngine.createContext({
            width,
            height,
            location,
            orgId,
            assetsBundle,
            traceContext: carrier,
          });

          const renderOptions = createVideoRenderOptionsForSegment({
            segmentDurationMs,
            segmentIndex,
            width,
            height,
            durationMs,
            fps,
            strategy: "v1",
          });

          renderOptions.showFrameBox = false;
          // For simple tests without audio, disable audio encoding
          renderOptions.encoderOptions.noAudio = true;

          const abortController = new AbortController();

          logger.debug("🔧 [RPC_SERVER] Setting up browser frame-by-frame engine...", {
            canvasMode,
            segmentIndex,
            fileType,
          });

          // Storage for per-frame timing data
          let frameTiming: FrameTimingData[] = [];

          // Create a custom engine adapter that captures frames via browser executeJavaScript
          const browserFrameEngine = {
            isBitmapEngine: false, // We're providing JPEG frames
            onError: (handler: (error: Error) => void) => {
              renderContext.onError(handler);
            },
            initialize: async (renderOptions: VideoRenderOptions) => {
              logger.debug("🔧 [RPC_SERVER] Browser frame engine initialize() called", { renderOptions });
              // Initialize the timegroup in the browser
              await renderContext.webContents.executeJavaScript(`
                (async () => {
                  const rootTimegroup = document.querySelector('ef-timegroup');
                  if (!rootTimegroup) {
                    throw new Error('No root timegroup found');
                  }
                  await rootTimegroup.waitForMediaDurations();
                  await rootTimegroup.frameController.renderFrame(rootTimegroup.currentTimeMs, {
                    waitForLitUpdate: false,
                  });
                })();
              `);
              logger.debug("🔧 [RPC_SERVER] Browser frame engine initialize() complete");
            },
            beginFrame: async (frameNumber: number, _isLast: boolean) => {
              // Render audio for this frame
              const frameDurationMs = 1000 / fps;
              const fromMs = renderOptions.encoderOptions.fromMs + frameNumber * frameDurationMs;
              const toMs = fromMs + frameDurationMs;

              const audioArray = await renderContext.webContents.executeJavaScript(`
                (async () => {
                  const rootTimegroup = document.querySelector('ef-timegroup');
                  if (!rootTimegroup || !rootTimegroup.renderAudio) {
                    return [];
                  }
                  
                  const audioBuffer = await rootTimegroup.renderAudio(${fromMs}, ${toMs});
                  if (!audioBuffer || !audioBuffer.buffer) {
                    return [];
                  }
                  // Convert ArrayBuffer to Array for IPC serialization
                  return Array.from(new Uint8Array(audioBuffer.buffer));
                })();
              `);

              return Buffer.from(audioArray);
            },
            captureFrame: async (frameNumber: number, fps: number) => {
              ctx.sendKeepalive();
              const captureStartMs = performance.now();
              logger.debug("🔧 [RPC_SERVER] captureFrame() called", { frameNumber, fps });

              const frameDurationMs = 1000 / fps;
              const timeMs = renderOptions.encoderOptions.fromMs + frameNumber * frameDurationMs;

              // Capture frame with detailed timing collection
              const ipcStartMs = performance.now();
              const result = await renderContext.webContents.executeJavaScript(`
                (async () => {
                  const t0 = performance.now();
                  const rootTimegroup = document.querySelector('ef-timegroup');
                  if (!rootTimegroup) {
                    throw new Error('No root timegroup found');
                  }

                  // Time the capture operation
                  // Skip clone creation for headless server rendering (saves ~40ms per frame!)
                  const captureStart = performance.now();
                  const imageSource = await window.captureTimegroupAtTime(rootTimegroup, {
                    timeMs: ${timeMs},
                    scale: 1,
                    canvasMode: '${canvasMode}',
                    skipClone: true,
                  });
                  const captureMs = performance.now() - captureStart;
                  
                  // Extract granular timing from imageSource if available
                  const perfTiming = imageSource.__perfTiming || {};
                  const cloneMs = perfTiming.cloneMs || 0;
                  const seekMs = perfTiming.seekMs || 0;
                  const renderMs = perfTiming.renderMs || 0;

                  // Time canvas operations
                  const canvasStart = performance.now();
                  const canvas = document.createElement('canvas');
                  canvas.width = ${width};
                  canvas.height = ${height};
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(imageSource, 0, 0, ${width}, ${height});
                  const canvasMs = performance.now() - canvasStart;

                  // Time JPEG encoding
                  const blobStart = performance.now();
                  const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, 'image/jpeg', 0.95);
                  });
                  const blobMs = performance.now() - blobStart;
                  
                  // Time array buffer conversion (IPC serialization prep)
                  const serializeStart = performance.now();
                  const arrayBuffer = await blob.arrayBuffer();
                  const jpegData = Array.from(new Uint8Array(arrayBuffer));
                  const serializeMs = performance.now() - serializeStart;

                  const totalBrowserMs = performance.now() - t0;

                  return {
                    jpegData,
                    jpegSize: jpegData.length,
                    timing: {
                      cloneMs,
                      seekMs,
                      renderMs,
                      captureMs,
                      canvasMs,
                      blobMs,
                      serializeMs,
                      totalBrowserMs,
                    },
                  };
                })();
              `);
              const ipcRoundTripMs = performance.now() - ipcStartMs;
              
              // Calculate IPC overhead: total round-trip minus browser execution time
              const ipcOverheadMs = ipcRoundTripMs - result.timing.totalBrowserMs;

              const totalCaptureMs = performance.now() - captureStartMs;

              // Store timing for aggregation
              if (!frameTiming) {
                frameTiming = [];
              }
              frameTiming.push({
                frameNumber,
                cloneMs: result.timing.cloneMs,
                seekMs: result.timing.seekMs,
                renderMs: result.timing.renderMs,
                captureMs: result.timing.captureMs,
                canvasMs: result.timing.canvasMs,
                blobMs: result.timing.blobMs,
                serializeMs: result.timing.serializeMs,
                ipcRoundTripMs,
                ipcOverheadMs,
                totalCaptureMs,
                jpegSize: result.jpegSize,
              });

              logger.debug(`🔧 [RPC_SERVER] Frame ${frameNumber} timing: clone=${result.timing.cloneMs.toFixed(1)}ms seek=${result.timing.seekMs.toFixed(1)}ms render=${result.timing.renderMs.toFixed(1)}ms canvas=${result.timing.canvasMs.toFixed(1)}ms blob=${result.timing.blobMs.toFixed(1)}ms serialize=${result.timing.serializeMs.toFixed(1)}ms ipcRoundTrip=${ipcRoundTripMs.toFixed(1)}ms ipcOverhead=${ipcOverheadMs.toFixed(1)}ms total=${totalCaptureMs.toFixed(1)}ms size=${result.jpegSize}b`);

              return Buffer.from(result.jpegData);
            },
          };

          const segmentEncoder = new SegmentEncoder({
            renderId,
            renderOptions,
            engine: browserFrameEngine as any,
            abortSignal: abortController.signal,
          });

          // Set up event-driven keepalives
          const frameRenderedHandler = () => {
            ctx.sendKeepalive();
          };

          const encodingStartedHandler = () => {
            ctx.sendKeepalive();
          };

          segmentEncoder.on("frameRendered", frameRenderedHandler);
          segmentEncoder.on("encodingStarted", encodingStartedHandler);

          let fragmentBuffer: ArrayBuffer;
          const segmentStartMs = performance.now();
          try {
            logger.debug("🔧 [RPC_SERVER] Starting segment encoding...", { fileType });
            if (fileType === "standalone") {
              fragmentBuffer = await segmentEncoder.generateStandaloneSegment();
            } else {
              fragmentBuffer = await segmentEncoder.generateFragmentBuffer();
            }
            logger.debug("🔧 [RPC_SERVER] Segment encoding complete", { 
              bufferSize: fragmentBuffer?.byteLength ?? 0 
            });
            if (!fragmentBuffer) {
              throw new Error("Segment encoder returned undefined buffer");
            }

            // Store timing data for this segment
            const segmentTotalMs = performance.now() - segmentStartMs;
            const timingKey = renderId;
            if (!renderTimingData.has(timingKey)) {
              renderTimingData.set(timingKey, []);
            }
            renderTimingData.get(timingKey)!.push({
              frames: frameTiming,
              segmentIndex,
              totalMs: segmentTotalMs,
            });

            // Log aggregated timing stats
            if (frameTiming.length > 0) {
              const avgClone = frameTiming.reduce((sum, f) => sum + f.cloneMs, 0) / frameTiming.length;
              const avgSeek = frameTiming.reduce((sum, f) => sum + f.seekMs, 0) / frameTiming.length;
              const avgRender = frameTiming.reduce((sum, f) => sum + f.renderMs, 0) / frameTiming.length;
              const avgCapture = frameTiming.reduce((sum, f) => sum + f.captureMs, 0) / frameTiming.length;
              const avgCanvas = frameTiming.reduce((sum, f) => sum + f.canvasMs, 0) / frameTiming.length;
              const avgBlob = frameTiming.reduce((sum, f) => sum + f.blobMs, 0) / frameTiming.length;
              const avgSerialize = frameTiming.reduce((sum, f) => sum + f.serializeMs, 0) / frameTiming.length;
              const avgIpcRoundTrip = frameTiming.reduce((sum, f) => sum + f.ipcRoundTripMs, 0) / frameTiming.length;
              const avgIpcOverhead = frameTiming.reduce((sum, f) => sum + f.ipcOverheadMs, 0) / frameTiming.length;
              const totalDataSize = frameTiming.reduce((sum, f) => sum + f.jpegSize, 0);
              
              logger.info(`🔧 [RPC_SERVER] Segment ${segmentIndex} timing summary: ${frameTiming.length} frames, avgClone=${avgClone.toFixed(1)}ms avgSeek=${avgSeek.toFixed(1)}ms avgRender=${avgRender.toFixed(1)}ms avgCanvas=${avgCanvas.toFixed(1)}ms avgBlob=${avgBlob.toFixed(1)}ms avgSerialize=${avgSerialize.toFixed(1)}ms avgIpcRoundTrip=${avgIpcRoundTrip.toFixed(1)}ms avgIpcOverhead=${avgIpcOverhead.toFixed(1)}ms totalDataSize=${(totalDataSize / 1024 / 1024).toFixed(2)}MB segmentTotal=${segmentTotalMs.toFixed(0)}ms`);
            }

            return new Uint8Array(fragmentBuffer);
          } catch (error) {
            logger.error({ error, stack: error instanceof Error ? error.stack : undefined }, "🔧 [RPC_SERVER] Segment encoding failed");
            throw error;
          } finally {
            segmentEncoder.off("frameRendered", frameRenderedHandler);
            segmentEncoder.off("encodingStarted", encodingStartedHandler);
          }
        },
      );

      registerRcpHandler<[{ renderId: string }], SegmentTimingData[]>(
        "getBrowserFrameTiming",
        async ([{ renderId }]) => {
          const timing = renderTimingData.get(renderId) || [];
          logger.debug(`🔧 [RPC_SERVER] getBrowserFrameTiming(renderId=${renderId}) found ${timing.length} segments`);
          return timing;
        },
      );

      registerRcpHandler<[{ renderId: string }], void>(
        "clearBrowserFrameTiming",
        async ([{ renderId }]) => {
          logger.debug(`🔧 [RPC_SERVER] clearBrowserFrameTiming() called`, {
            renderId,
          });
          renderTimingData.delete(renderId);
        },
      );

      logger.debug(
        "🔧 [RPC_SERVER] All handlers registered, waiting for keepalive...",
      );
      await keepalive.promise;
      logger.debug("🔧 [RPC_SERVER] Keepalive resolved, exiting...");
    });

    logger.debug("🔧 [RPC_SERVER] withEngine completed");
  } catch (error) {
    logger.error({ error }, "❌ [RPC_SERVER] Fatal error");
    logger.error(
      { stack: error instanceof Error ? error.stack : String(error) },
      "❌ [RPC_SERVER] Stack",
    );
    process.exit(1);
  }
})();
