import path from "node:path";
import { writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { bundleTestTemplate, type TestBundleInfo } from "../../test-utils/html-bundler";
import { createAssetsMetadataBundle } from "../../shared/assetMetadata";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";

export type RenderMode = "server" | "browser-full-video" | "browser-frame-by-frame";
export type CanvasMode = "native" | "foreignObject";

export interface RenderTimingBreakdown {
  bundleHtml?: number;
  getRenderInfo?: number;
  createAssetsBundle?: number;
  renderFragment?: number;
  writeFile?: number;
  electronRpcCreate?: number;
  electronRpcTerminate?: number;
  total: number;
}

export interface RenderResult {
  videoBuffer: Buffer;
  videoPath: string;
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  renderTimeMs: number;
  templateHash: string;
  renderMode: RenderMode;
  canvasMode?: CanvasMode;
  timing: RenderTimingBreakdown;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  outputDir?: string;
  testAgent?: Selectable<TestAgent>;
  testName?: string;
  renderMode?: RenderMode;
  canvasMode?: CanvasMode;
  electronRpc?: ElectronRPC;
}

/**
 * Shared output directory for all tests in this run.
 * Created once at module load time.
 */
const SHARED_OUTPUT_DIR = path.join(
  process.cwd(),
  "lib/queues/units-of-work/Render/tests/.test-output",
  `run-${Date.now()}`,
);

/**
 * Cache for bundled HTML templates.
 * Key: template hash
 * Value: bundle info
 * 
 * This cache persists across tests in the same run, avoiding
 * redundant Vite/Rolldown compilations for identical HTML.
 */
const bundleCache = new Map<string, TestBundleInfo>();

/**
 * Statistics for bundle caching
 */
let bundleCacheHits = 0;
let bundleCacheMisses = 0;

/**
 * Simple, focused render function for tests.
 * Takes HTML, renders to video, returns result.
 * 
 * Supports multiple rendering strategies:
 * - server (default): Electron offscreen rendering (fastest, most reliable)
 * - browser-full-video: Browser-based rendering with mediabunny encoder
 * - browser-frame-by-frame: Browser captures frames, FFmpeg encodes
 * 
 * Canvas modes (for browser strategies):
 * - native: Uses native canvas 2D rendering
 * - foreignObject: Uses SVG foreignObject (supports CSS better)
 */
export async function render(
  html: string,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const startTime = performance.now();
  const renderMode = options.renderMode ?? "server";
  const canvasMode = options.canvasMode ?? "foreignObject";
  
  // Route to appropriate render function based on mode
  if (renderMode === "browser-full-video" || renderMode === "browser-frame-by-frame") {
    return renderWithBrowser(html, options, renderMode, canvasMode);
  }
  
  // Default server rendering (Electron offscreen)
  return renderWithServer(html, options);
}

/**
 * Render using browser-based strategies (full-video or frame-by-frame)
 */
async function renderWithBrowser(
  html: string,
  options: RenderOptions,
  renderMode: "browser-full-video" | "browser-frame-by-frame",
  canvasMode: CanvasMode,
): Promise<RenderResult> {
  const startTime = performance.now();
  const timing: RenderTimingBreakdown = { total: 0 };
  const width = options.width ?? 640;
  const height = options.height ?? 360;
  const fps = options.fps ?? 30;
  const testAgent = options.testAgent ?? await getOrCreateTestAgent();
  
  // Use provided electronRpc or create a new one
  const electronRpc = options.electronRpc;
  if (!electronRpc) {
    throw new Error("electronRpc is required for browser rendering strategies. Create it in beforeAll() and pass it to render().");
  }
  
  // Dynamically import browser render functions to avoid initialization errors
  const { renderWithBrowserFullVideo, renderWithBrowserFrameByFrame } = await import("../../full-render/browser-render");
  
  try {
    const renderFn = renderMode === "browser-full-video" 
      ? renderWithBrowserFullVideo
      : renderWithBrowserFrameByFrame;
    
    const renderFnStart = performance.now();
    const result = await renderFn({
      html,
      testAgent,
      electronRpc,
      renderOptions: { width, height, fps },
      canvasMode,
      testFilePath: __filename,
      testTitle: options.testName ?? "smoke-test",
    });
    timing.renderFragment = performance.now() - renderFnStart;
    
    // Save to shared output directory with descriptive filename
    const writeStart = performance.now();
    const outputDir = options.outputDir || SHARED_OUTPUT_DIR;
    await mkdir(outputDir, { recursive: true });
    
    const modeSuffix = `${renderMode}-${canvasMode}`;
    const filename = options.testName
      ? `${sanitizeFilename(options.testName)}-${modeSuffix}.mp4`
      : `output-${modeSuffix}.mp4`;
    const videoPath = path.join(outputDir, filename);
    await writeFile(videoPath, result.finalVideoBuffer);
    timing.writeFile = performance.now() - writeStart;
    
    const renderTimeMs = performance.now() - startTime;
    timing.total = renderTimeMs;

    return {
      videoBuffer: result.finalVideoBuffer,
      videoPath,
      width,
      height,
      durationMs: result.renderInfo.durationMs,
      fps,
      renderTimeMs,
      templateHash: result.renderInfo.templateHash,
      renderMode,
      canvasMode,
      timing,
    };
  } catch (error) {
    // Don't close electronRpc on error - it's shared across tests
    throw error;
  }
}

/**
 * Render using server strategy (Electron offscreen)
 */
async function renderWithServer(
  html: string,
  options: RenderOptions,
): Promise<RenderResult> {
  const startTime = performance.now();
  const timing: RenderTimingBreakdown = { total: 0 };

  // Use provided test agent or create default one
  const testAgent = options.testAgent ?? await getOrCreateTestAgent();

  // Use provided electronRpc or create a new one (for backward compatibility)
  let electronRpc = options.electronRpc;
  let shouldCloseRpc = false;
  
  if (!electronRpc) {
    const rpcStart = performance.now();
    electronRpc = await createElectronRPC();
    timing.electronRpcCreate = performance.now() - rpcStart;
    shouldCloseRpc = true;
  }

  try {
    // Bundle HTML template (with caching)
    const bundleStart = performance.now();
    const testTitle = options.testName || `render-${Date.now()}`;
    const bundleInfo = await getCachedOrBundleTemplate(
      html,
      import.meta.url,
      testTitle,
    );
    timing.bundleHtml = performance.now() - bundleStart;

    // Get render info from template
    const getRenderInfoStart = performance.now();
    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}?noWorkbench=true`,
      orgId: testAgent.org.id,
    });
    timing.getRenderInfo = performance.now() - getRenderInfoStart;

    // Use provided dimensions or fall back to template dimensions
    const width = options.width ?? renderInfo.width;
    const height = options.height ?? renderInfo.height;
    const fps = options.fps ?? 30;

    // Create assets metadata bundle
    const assetsBundleStart = performance.now();
    const assetsBundle = await createAssetsMetadataBundle(
      renderInfo.assets,
      testAgent.org.id,
    );
    timing.createAssetsBundle = performance.now() - assetsBundleStart;

    // Render single fragment (full video)
    const renderFragmentStart = performance.now();
    const videoBuffer = await electronRpc.rpc.call("renderFragment", {
      width,
      height,
      location: `file://${bundleInfo.indexPath}?noWorkbench=true`,
      orgId: testAgent.org.id,
      renderId: `test-${bundleInfo.templateHash}`,
      segmentDurationMs: renderInfo.durationMs,
      segmentIndex: 0,
      durationMs: renderInfo.durationMs,
      fps,
      fileType: "standalone",
      assetsBundle,
    });
    timing.renderFragment = performance.now() - renderFragmentStart;

    // Save to shared output directory with descriptive filename
    const writeStart = performance.now();
    const outputDir = options.outputDir || SHARED_OUTPUT_DIR;
    await mkdir(outputDir, { recursive: true });

    const filename = options.testName ? `${sanitizeFilename(options.testName)}.mp4` : "output.mp4";
    const videoPath = path.join(outputDir, filename);
    await writeFile(videoPath, videoBuffer);
    timing.writeFile = performance.now() - writeStart;

    const renderTimeMs = performance.now() - startTime;
    timing.total = renderTimeMs;

    return {
      videoBuffer: Buffer.from(videoBuffer),
      videoPath,
      width,
      height,
      durationMs: renderInfo.durationMs,
      fps,
      renderTimeMs,
      templateHash: bundleInfo.templateHash,
      renderMode: "server",
      timing,
    };
  } finally {
    // Only shut down RPC if we created it locally (not shared)
    if (shouldCloseRpc) {
      const terminateStart = performance.now();
      await electronRpc.rpc.call("terminate");
      timing.electronRpcTerminate = performance.now() - terminateStart;
    }
  }
}

/**
 * Sanitize test name to be filesystem-safe.
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Cache test agent to avoid recreating for every render
 */
let cachedTestAgent: Selectable<TestAgent> | null = null;

async function getOrCreateTestAgent(): Promise<Selectable<TestAgent>> {
  if (!cachedTestAgent) {
    cachedTestAgent = await makeTestAgent("test-render@example.org");
  }
  return cachedTestAgent;
}

/**
 * Check if bundle files exist on disk
 */
async function bundleExists(bundleInfo: TestBundleInfo): Promise<boolean> {
  try {
    await access(bundleInfo.indexPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bundle HTML template with caching.
 * 
 * Uses content-based hashing to avoid re-bundling identical HTML.
 * Checks cache first, then validates files exist on disk.
 * Falls back to bundling if cache miss or files deleted.
 */
async function getCachedOrBundleTemplate(
  html: string,
  testFilePath?: string,
  testTitle?: string,
): Promise<TestBundleInfo> {
  // Compute hash for cache key
  const templateHash = createHash("sha256")
    .update(html)
    .digest("hex")
    .substring(0, 16);
  
  // Check cache
  const cached = bundleCache.get(templateHash);
  if (cached) {
    // Verify files still exist on disk
    if (await bundleExists(cached)) {
      bundleCacheHits++;
      return cached;
    } else {
      // Cache entry is stale, remove it
      bundleCache.delete(templateHash);
    }
  }
  
  // Cache miss or stale entry - bundle now
  bundleCacheMisses++;
  const bundleInfo = await bundleTestTemplate(html, testFilePath, testTitle);
  bundleCache.set(templateHash, bundleInfo);
  
  return bundleInfo;
}

/**
 * Get bundle cache statistics (useful for debugging/testing)
 */
export function getBundleCacheStats() {
  return {
    hits: bundleCacheHits,
    misses: bundleCacheMisses,
    hitRate: bundleCacheHits + bundleCacheMisses > 0 
      ? (bundleCacheHits / (bundleCacheHits + bundleCacheMisses) * 100).toFixed(1) + '%'
      : 'N/A',
    cacheSize: bundleCache.size,
  };
}

/**
 * Clear bundle cache (useful for testing)
 */
export function clearBundleCache() {
  bundleCache.clear();
  bundleCacheHits = 0;
  bundleCacheMisses = 0;
}

/**
 * Render to still image (PNG/JPEG/WebP)
 */
export async function renderStill(
  html: string,
  options: RenderOptions & { format?: "webp" | "jpeg" | "png" } = {},
): Promise<{
  imageBuffer: Buffer;
  imagePath: string;
  width: number;
  height: number;
  templateHash: string;
}> {
  const testAgent = options.testAgent ?? await getOrCreateTestAgent();
  const electronRpc = await createElectronRPC();

  try {
    const testTitle = options.testName || `still-${Date.now()}`;
    const bundleInfo = await bundleTestTemplate(
      html,
      import.meta.url,
      testTitle,
    );

    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}?noWorkbench=true`,
      orgId: testAgent.org.id,
    });

    const width = options.width ?? renderInfo.width;
    const height = options.height ?? renderInfo.height;
    const format = options.format ?? "webp";

    const assetsBundle = await createAssetsMetadataBundle(
      renderInfo.assets,
      testAgent.org.id,
    );

    const imageBuffer = await electronRpc.rpc.call("renderStill", {
      width,
      height,
      location: `file://${bundleInfo.indexPath}?noWorkbench=true`,
      orgId: testAgent.org.id,
      renderId: `test-still-${bundleInfo.templateHash}`,
      durationMs: renderInfo.durationMs,
      fps: 30,
      outputConfig: { container: format },
      assetsBundle,
    });

    const outputDir = options.outputDir || SHARED_OUTPUT_DIR;
    await mkdir(outputDir, { recursive: true });

    const filename = options.testName 
      ? `${sanitizeFilename(options.testName)}.${format}` 
      : `still.${format}`;
    const imagePath = path.join(outputDir, filename);
    await writeFile(imagePath, imageBuffer);

    return {
      imageBuffer: Buffer.from(imageBuffer),
      imagePath,
      width,
      height,
      templateHash: bundleInfo.templateHash,
    };
  } finally {
    await electronRpc.rpc.call("terminate");
  }
}
