import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createElectronRPC, type ElectronRPC } from "../../ElectronRPCClient";
import { bundleTestTemplate } from "../../test-utils/html-bundler";
import { createAssetsMetadataBundle } from "../../shared/assetMetadata";
import { makeTestAgent } from "TEST/util/test";
import type { Selectable } from "kysely";
import type { TestAgent } from "TEST/util/test";

export interface RenderResult {
  videoBuffer: Buffer;
  videoPath: string;
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  renderTimeMs: number;
  templateHash: string;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  outputDir?: string;
}

/**
 * Simple, focused render function for tests.
 * Takes HTML, renders to video, returns result.
 * No modes, no complexity - just render.
 */
export async function render(
  html: string,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const startTime = performance.now();

  // Create test agent if needed (cached per test run)
  const testAgent = await getOrCreateTestAgent();

  // Create Electron RPC connection
  const electronRpc = await createElectronRPC();

  try {
    // Bundle HTML template
    const testTitle = `render-${Date.now()}`;
    const bundleInfo = await bundleTestTemplate(
      html,
      import.meta.url,
      testTitle,
    );

    // Get render info from template
    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
    });

    // Use provided dimensions or fall back to template dimensions
    const width = options.width ?? renderInfo.width;
    const height = options.height ?? renderInfo.height;
    const fps = options.fps ?? 30;

    // Create assets metadata bundle
    const assetsBundle = await createAssetsMetadataBundle(
      renderInfo.assets,
      testAgent.org.id,
    );

    // Render single fragment (full video)
    const videoBuffer = await electronRpc.rpc.call("renderFragment", {
      width,
      height,
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
      renderId: `test-${bundleInfo.templateHash}`,
      segmentDurationMs: renderInfo.durationMs,
      segmentIndex: 0,
      durationMs: renderInfo.durationMs,
      fps,
      fileType: "standalone",
      assetsBundle,
    });

    // Save to output directory
    const outputDir =
      options.outputDir ||
      path.join(
        process.cwd(),
        "lib/queues/units-of-work/Render/tests/.test-output",
        testTitle,
      );
    await mkdir(outputDir, { recursive: true });

    const videoPath = path.join(outputDir, "output.mp4");
    await writeFile(videoPath, videoBuffer);

    const renderTimeMs = performance.now() - startTime;

    return {
      videoBuffer: Buffer.from(videoBuffer),
      videoPath,
      width,
      height,
      durationMs: renderInfo.durationMs,
      fps,
      renderTimeMs,
      templateHash: bundleInfo.templateHash,
    };
  } finally {
    // Clean up Electron RPC
    await electronRpc.rpc.call("terminate");
  }
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
  const testAgent = await getOrCreateTestAgent();
  const electronRpc = await createElectronRPC();

  try {
    const testTitle = `still-${Date.now()}`;
    const bundleInfo = await bundleTestTemplate(
      html,
      import.meta.url,
      testTitle,
    );

    const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
      location: `file://${bundleInfo.indexPath}`,
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
      location: `file://${bundleInfo.indexPath}`,
      orgId: testAgent.org.id,
      renderId: `test-still-${bundleInfo.templateHash}`,
      durationMs: renderInfo.durationMs,
      fps: 30,
      outputConfig: { container: format },
      assetsBundle,
    });

    const outputDir =
      options.outputDir ||
      path.join(
        process.cwd(),
        "lib/queues/units-of-work/Render/tests/.test-output",
        testTitle,
      );
    await mkdir(outputDir, { recursive: true });

    const imagePath = path.join(outputDir, `still.${format}`);
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
