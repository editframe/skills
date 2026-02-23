/**
 * Cloud Run Job: GPU render test
 *
 * Renders a simple HTML composition on the GPU worker (via EGL + h264_nvenc),
 * uploads the resulting MP4 to GCS, and prints the download URL.
 *
 * Deploy + run via:
 *   telecine/scripts/deploy-gpu-render-test-job
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";

import { createElectronRPC } from "@/queues/units-of-work/Render/ElectronRPCClient";
import { createBundledHTMLDirectory } from "@/render/processHTML";
import { buildFragmentIds } from "@/queues/units-of-work/Render/fragments/buildFragmentIds";
import { createAssetsMetadataBundle } from "@/queues/units-of-work/Render/shared/assetMetadata";

const BUCKET = process.env.STORAGE_BUCKET ?? "telecine-dot-dev-data-4fedc83";
const ORG_ID = "gpu-test-org";
const WORK_SLICE_MS = 2000;

const HTML = `
<ef-timegroup class="w-[640px] h-[360px]" mode="fixed" duration="3s">
  <div class="w-full h-full flex items-center justify-center"
       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <span class="text-white font-bold" style="font-size: 48px;">GPU Render Test</span>
  </div>
</ef-timegroup>
`;

function step(msg: string) {
  process.stdout.write(`\n[gpu-render-test] === ${msg} ===\n`);
}

function log(msg: string) {
  process.stdout.write(`[gpu-render-test] ${msg}\n`);
}

function fail(msg: string) {
  process.stderr.write(`[gpu-render-test] FAIL: ${msg}\n`);
}

// ---------------------------------------------------------------------------
step("1. Bundle HTML");
const templateHash = createHash("sha256").update(HTML).digest("hex").substring(0, 16);
const bundleDir = `/tmp/gpu-render-test-${templateHash}`;
const indexPath = path.join(bundleDir, "dist", "index.html");

await mkdir(bundleDir, { recursive: true });
await createBundledHTMLDirectory(bundleDir, HTML);
log(`Bundle written to: ${bundleDir}`);

// ---------------------------------------------------------------------------
step("2. Spawn Electron RPC");
const electronRpc = await createElectronRPC();
log("Electron RPC ready");

// ---------------------------------------------------------------------------
step("3. Get render info");
const renderInfo = await electronRpc.rpc.call("getRenderInfo", {
  location: `file://${indexPath}`,
  orgId: ORG_ID,
});
log(`Render info: ${renderInfo.width}x${renderInfo.height} @ ${renderInfo.durationMs}ms`);

const assetsBundle = await createAssetsMetadataBundle(renderInfo.assets, ORG_ID);

// ---------------------------------------------------------------------------
step("4. Render fragments");
const renderId = `gpu-test-${Date.now()}`;
const fragmentIds = buildFragmentIds({
  duration_ms: renderInfo.durationMs,
  work_slice_ms: WORK_SLICE_MS,
});

log(`Rendering ${fragmentIds.length} fragments (${fragmentIds.join(", ")})`);

const segmentBuffers: Buffer[] = [];
for (const fragmentId of fragmentIds) {
  const start = Date.now();
  const buffer = await electronRpc.rpc.call("renderFragment", {
    width: renderInfo.width,
    height: renderInfo.height,
    location: `file://${indexPath}`,
    orgId: ORG_ID,
    renderId,
    segmentDurationMs: WORK_SLICE_MS,
    segmentIndex: fragmentId,
    durationMs: renderInfo.durationMs,
    fps: 30,
    fileType: "fragment",
    assetsBundle,
  });
  const elapsed = Date.now() - start;
  log(`Fragment ${fragmentId}: ${buffer.length} bytes in ${elapsed}ms`);
  segmentBuffers.push(Buffer.from(buffer));
}

await electronRpc.rpc.call("terminate");
await electronRpc.processExit;
log("Electron process exited cleanly");

// ---------------------------------------------------------------------------
step("5. Concatenate segments");
const finalBuffer = Buffer.concat(segmentBuffers);
log(`Final MP4: ${finalBuffer.length} bytes`);

// ---------------------------------------------------------------------------
step("6. Upload to GCS");
const gcsPath = `gpu-render-test/${renderId}/output.mp4`;
const storage = new Storage();
await storage.bucket(BUCKET).file(gcsPath).save(finalBuffer, {
  contentType: "video/mp4",
});

const signedUrl = await storage
  .bucket(BUCKET)
  .file(gcsPath)
  .getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

log(`Uploaded to gs://${BUCKET}/${gcsPath}`);
log(`Download URL (7-day signed):\n  ${signedUrl[0]}`);

// ---------------------------------------------------------------------------
process.stdout.write("\n[gpu-render-test] All steps completed.\n");
process.exit(0);
