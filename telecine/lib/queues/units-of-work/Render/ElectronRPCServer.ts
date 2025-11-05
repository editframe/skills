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

export type CreateContextArgs = [{
  width?: number;
  height?: number;
  location: string;
  orgId: string;
  assetsBundle?: AssetsMetadataBundle;
  assetProvider?: AssetProvider;
}];
export type CreateContextResult = {
  contextId: string;
};

export type GetRenderInfoArgs = [{
  width?: number;
  height?: number;
  location: string;
  orgId: string;
  durationMs?: number;
  contextId?: string;
}];
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
export type RenderFragmentArgs = [{
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
}];
export type RenderFragmentResult = Uint8Array;

export type RenderStillArgs = [{
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
}];
export type RenderStillResult = Uint8Array;

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
    method: "disposeContext",
    contextId: string
  ): Promise<void>;
  call(
    method: "terminate"
  ): Promise<void>;
}

logger.debug("🔧 [RPC_SERVER] Creating engine and registering handlers...");

export const rpcServerReady = (async () => {
  try {
    await ElectronEngineManager.withEngine(async (electronEngine) => {
      logger.debug("🔧 [RPC_SERVER] Inside withEngine callback, engine created");

      // Context management
      const contexts = new Map<string, Awaited<ReturnType<typeof electronEngine.createContext>>>();
      let nextContextId = 1;

      logger.debug("🔧 [RPC_SERVER] Registering createContext handler...");
      registerRcpHandler("createContext", async ([{ width, height, location, orgId, assetsBundle, assetProvider }]: CreateContextArgs): Promise<CreateContextResult> => {
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
      });

      logger.debug("🔧 [RPC_SERVER] Registering disposeContext handler...");
      registerRcpHandler("disposeContext", async (contextId: string): Promise<void> => {
        const ctx = contexts.get(contextId);
        if (ctx) {
          await ctx[Symbol.asyncDispose]();
          contexts.delete(contextId);
        }
      });

      logger.debug("🔧 [RPC_SERVER] Registering getRenderInfo handler...");
      registerRcpHandler("getRenderInfo", async ([{ width, height, location, orgId, durationMs, contextId }]: GetRenderInfoArgs, _ctx): Promise<GetRenderInfoResult> => {
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
            throw new Error(`Invalid render dimensions: ${finalWidth}x${finalHeight}. Width and height must be positive numbers. Check that your timegroup element has valid CSS dimensions.`);
          }

          if (finalDurationMs <= 0) {
            throw new Error(`Invalid render duration: ${finalDurationMs}ms. Duration must be positive. Check that your timegroup has a valid duration attribute or media content.`);
          }

          if (finalWidth > 8192 || finalHeight > 8192) {
            throw new Error(`Render dimensions too large: ${finalWidth}x${finalHeight}. Maximum supported size is 8192x8192.`);
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
      });

      logger.debug("🔧 [RPC_SERVER] Registering renderFragment handler...");
      registerRcpHandler("renderFragment", async ([{ width, height, location, orgId, renderId, segmentDurationMs, segmentIndex, durationMs, fps, fileType, assetsBundle }]: RenderFragmentArgs, ctx): Promise<RenderFragmentResult> => {
        if (width <= 0 || height <= 0) {
          throw new Error(`Invalid fragment dimensions: ${width}x${height}. Width and height must be positive numbers.`);
        }

        if (durationMs <= 0) {
          throw new Error(`Invalid fragment duration: ${durationMs}ms. Duration must be positive.`);
        }

        if (segmentDurationMs <= 0) {
          throw new Error(`Invalid segment duration: ${segmentDurationMs}ms. Segment duration must be positive.`);
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

        segmentEncoder.on('frameRendered', frameRenderedHandler);
        segmentEncoder.on('encodingStarted', encodingStartedHandler);

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
          segmentEncoder.off('frameRendered', frameRenderedHandler);
          segmentEncoder.off('encodingStarted', encodingStartedHandler);
        }
      });

      logger.debug("🔧 [RPC_SERVER] Registering renderStill handler...");
      registerRcpHandler("renderStill", async ([{ width, height, location, orgId, renderId, durationMs, fps, outputConfig, assetsBundle, contextId }]: RenderStillArgs, ctx): Promise<RenderStillResult> => {
        if (width <= 0 || height <= 0) {
          throw new Error(`Invalid still dimensions: ${width}x${height}. Width and height must be positive numbers.`);
        }

        if (durationMs <= 0) {
          throw new Error(`Invalid still duration: ${durationMs}ms. Duration must be positive.`);
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
      });

      logger.debug("🔧 [RPC_SERVER] All handlers registered, waiting for keepalive...");
      await keepalive.promise;
      logger.debug("🔧 [RPC_SERVER] Keepalive resolved, exiting...");
    });

    logger.debug("🔧 [RPC_SERVER] withEngine completed");
  } catch (error) {
    logger.error({ error }, "❌ [RPC_SERVER] Fatal error");
    logger.error({ stack: error instanceof Error ? error.stack : String(error) }, "❌ [RPC_SERVER] Stack");
    process.exit(1);
  }
})();
