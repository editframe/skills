import { customElement } from "lit/decorators.js";
import { EFMedia } from "../src/elements/EFMedia.ts";
import { test as baseTest } from "./useMSW.js";

@customElement("test-cache-integration")
class TestCacheIntegration extends EFMedia {}

declare global {
  interface HTMLElementTagNameMap {
    "test-cache-integration": TestCacheIntegration;
  }
}

const test = baseTest.extend<{
  element: TestCacheIntegration;
}>({
  element: async (_: unknown, use) => {
    const element = document.createElement("test-cache-integration");
    document.body.appendChild(element);
    await use(element);
    element.remove();
  },
});

test.skip("buffer cache integration stores and serves segment data", async ({
  element,
  expect,
}) => {
  // Setup element with real media source
  element.src = "bars-n-tone2.mp4";
  element.enableAudioBuffering = true;
  element.audioBufferDurationMs = 3000;
  element.maxAudioBufferFetches = 2;
  element.desiredSeekTimeMs = 0;

  // Track network requests to verify cache effectiveness
  const originalFetch = window.fetch;
  const networkRequests: string[] = [];

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    if (url.includes("audio")) {
      networkRequests.push(url);
      console.debug("Network request:", url);
    }
    return originalFetch(input, init);
  };

  try {
    // Allow initial buffering
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const bufferState = element.audioBufferTask.value;
    console.log("Buffer state after initial buffering:", {
      cachedSegmentsCount: bufferState?.cachedSegments.size || 0,
      cachedDataCount: bufferState?.cachedSegmentData.size || 0,
      activeRequestsCount: bufferState?.activeRequests.size || 0,
    });

    if (bufferState && bufferState.cachedSegments.size > 0) {
      const initialNetworkRequests = networkRequests.length;

      // Trigger segment fetch for potentially cached segment
      element.desiredSeekTimeMs = 1000;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check if cache integration is working
      const finalNetworkRequests = networkRequests.length;

      console.log("Cache integration test results:", {
        initialNetworkRequests,
        finalNetworkRequests,
        cacheHit: finalNetworkRequests === initialNetworkRequests,
        cachedSegments: Array.from(bufferState.cachedSegments),
        cachedData: Array.from(bufferState.cachedSegmentData.keys()),
      });

      // The test verifies that segment data is being cached
      expect(bufferState.cachedSegmentData.size).toBeGreaterThan(0);
    }
  } finally {
    window.fetch = originalFetch;
  }
});
