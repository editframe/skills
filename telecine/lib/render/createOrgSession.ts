import { logger } from "@/logging";
import { getStorageKeyForPath } from "@/util/getStorageKeyForPath";
import { RangeHeader } from "@/util/RangeHeader.server";
import { createReadableStreamFromReadable } from "@react-router/node";
import { session } from "@/electron-exec/electronReExport";
import { envString } from "@/util/env";
import type { AssetsMetadataBundle } from "@/queues/units-of-work/Render/shared/assetMetadata";
import { defaultAssetProvider, type AssetProvider } from "./AssetProvider";
import { getMimeTypeFromPath } from "./getMimeTypeFromPath.js";

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
    logger.debug({ PROTOCOL, orgId }, "[CREATE_ORG_SESSION] Protocol already handled");
    return orgSession;
  }
  
  logger.debug({ PROTOCOL, orgId, WEB_HOST, hasBundle: !!assetsBundle }, "[CREATE_ORG_SESSION] Registering protocol handler");

  // Register protocol handler for /api/* URLs
  orgSession.protocol.handle(PROTOCOL, async (request: Request) => {
    const requestUrl = new URL(request.url);
    const isApiRequest = requestUrl.pathname.startsWith("/api/");

    logger.debug(
      { url: request.url, isApiRequest, pathname: requestUrl.pathname },
      "[PROTOCOL_HANDLER] Request received",
    );

    // Only handle /api/* requests
    // Accept requests to any host (localhost, web, etc.) to support different environments
    if (!isApiRequest) {
      logger.debug({ url: request.url }, "[PROTOCOL_HANDLER] Not an API request, returning 404");
      return new Response(null, { status: 404 });
    }

    // Check if this is a fragment index request that can be served from bundle
    const fragmentIndexMatch = requestUrl.pathname.match(
      /^\/api\/v1\/isobmff_files\/([^/]+)\/index$/,
    );
    logger.debug(
      { fragmentIndexMatch: !!fragmentIndexMatch, hasBundle: !!assetsBundle },
      "[PROTOCOL_HANDLER] Checking for fragment index match",
    );
    if (fragmentIndexMatch && assetsBundle) {
      const assetId = fragmentIndexMatch[1] ?? null;
      const fragmentIndex = assetId
        ? assetsBundle.fragmentIndexes[assetId]
        : null;

      logger.debug(
        { assetId, hasFragmentIndex: !!fragmentIndex, bundleKeys: Object.keys(assetsBundle.fragmentIndexes) },
        "[PROTOCOL_HANDLER] Fragment index lookup in bundle",
      );

      if (fragmentIndex) {
        logger.debug(
          { assetId, requestUrl: request.url },
          "[PROTOCOL_HANDLER] Serving fragment index from bundle",
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
    
    logger.debug(
      { pathname: requestUrl.pathname, filePath, orgId },
      "[PROTOCOL_HANDLER] Falling back to storage lookup",
    );

    logger.trace(
      { requestUrl: request.url, filePath },
      `Reading ${PROTOCOL} protocol`,
    );

    if (!filePath) {
      logger.warn({ pathname: requestUrl.pathname }, "[PROTOCOL_HANDLER] No file path found for request");
      return new Response(JSON.stringify({ message: "Bad URL" }), {
        status: 404,
        statusText: "Not Found (bad URL)",
      });
    }

    try {
      const rangeHeader = request.headers.get("Range");

      if (rangeHeader) {
        logger.debug({ filePath, range: rangeHeader }, "[PROTOCOL_HANDLER] Serving range request from storage");
        const range = RangeHeader.parse(rangeHeader);
        const readStream = await assetProvider.createReadStream(filePath, range);
        const mimeType = getMimeTypeFromPath(filePath) || "application/octet-stream";
        return new Response(createReadableStreamFromReadable(readStream), {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Range": range.toHeader(),
          },
        });
      }

      logger.debug({ filePath }, "[PROTOCOL_HANDLER] Serving from storage");
      const readStream = await assetProvider.createReadStream(filePath);
      const mimeType = getMimeTypeFromPath(filePath) || "application/octet-stream";

      return new Response(createReadableStreamFromReadable(readStream), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
        },
      });
    } catch (error) {
      logger.error({ error, filePath, requestUrl: request.url }, "[PROTOCOL_HANDLER] Error reading from storage");
      return new Response(JSON.stringify({ message: "Internal server error", error: String(error) }), {
        status: 500,
        statusText: "Internal Server Error",
      });
    }
  });

  return orgSession;
}
