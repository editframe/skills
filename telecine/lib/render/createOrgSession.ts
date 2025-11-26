import { logger } from "@/logging";
import { getStorageKeyForPath } from "@/util/getStorageKeyForPath";
import { RangeHeader } from "@/util/RangeHeader.server";
import { createReadableStreamFromReadable } from "@react-router/node";
import { session } from "@/electron-exec/electronReExport";
import { envString } from "@/util/env";
import type { AssetsMetadataBundle } from "@/queues/units-of-work/Render/shared/assetMetadata";
import { defaultAssetProvider, type AssetProvider } from "./AssetProvider";

const WEB_HOST = envString("WEB_HOST", "http://localhost:3000");
const PROTOCOL = WEB_HOST.startsWith("https") ? "https" : "http";
const webHostUrl = new URL(WEB_HOST);

export async function createOrgSession(
  orgId: string,
  assetsBundle?: AssetsMetadataBundle,
  assetProvider: AssetProvider = defaultAssetProvider,
) {
  logger.debug(
    { orgId, PROTOCOL, hasBundleData: !!assetsBundle },
    "Creating org session",
  );
  const orgSession = session.fromPartition(orgId);

  await orgSession.clearStorageData({
    storages: ["localstorage"],
  });

  if (orgSession.protocol.isProtocolHandled(PROTOCOL)) {
    logger.debug("Protocol already handled");
    return orgSession;
  }

  // Register protocol handler for /api/* URLs
  orgSession.protocol.handle(PROTOCOL, async (request: Request) => {
    const requestUrl = new URL(request.url);
    const isApiRequest = requestUrl.pathname.startsWith("/api/");
    const isWebHostRequest = requestUrl.host === webHostUrl.host;

    // Only handle /api/* requests from WEB_HOST
    if (!isApiRequest || !isWebHostRequest) {
      return new Response(null, { status: 404 });
    }

    // Check if this is a fragment index request that can be served from bundle
    const fragmentIndexMatch = requestUrl.pathname.match(
      /^\/api\/v1\/isobmff_files\/([^/]+)\/index$/,
    );
    if (fragmentIndexMatch && assetsBundle) {
      const assetId = fragmentIndexMatch[1] ?? null;
      const fragmentIndex = assetId
        ? assetsBundle.fragmentIndexes[assetId]
        : null;

      if (fragmentIndex) {
        logger.debug(
          { assetId, requestUrl: request.url },
          "Serving fragment index from bundle",
        );

        return new Response(JSON.stringify(fragmentIndex), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=3600",
          },
        });
      }
    }

    // Fall back to storage file lookup
    const filePath = getStorageKeyForPath(requestUrl.pathname, orgId);

    logger.trace(
      { requestUrl: request.url, filePath },
      `Reading ${PROTOCOL} protocol`,
    );

    if (!filePath) {
      return new Response(JSON.stringify({ message: "Bad URL" }), {
        status: 404,
        statusText: "Not Found (bad URL)",
      });
    }

    const rangeHeader = request.headers.get("Range");

    if (rangeHeader) {
      const range = RangeHeader.parse(rangeHeader);
      const readStream = await assetProvider.createReadStream(filePath, range);
      return new Response(createReadableStreamFromReadable(readStream), {
        status: 206,
        headers: {
          // FIXME: we don't know the mime type here
          // "Content-Type": "video/mp4",
          "Content-Range": range.toHeader(),
        },
      });
    }

    const readStream = await assetProvider.createReadStream(filePath);

    return new Response(createReadableStreamFromReadable(readStream), {
      status: 200,
      headers: {
        // FIXME: we don't know the mime type here
        // "Content-Type": "video/mp4",
      },
    });
  });

  return orgSession;
}
