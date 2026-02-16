import { customElement } from "lit/decorators.js";
import { describe } from "vitest";

import { test as baseTest } from "../../../../test/useMSW.js";
import { EFMedia } from "../../EFMedia.js";

// Helper function to create media engine with abort handling
async function createMediaEngine(element: EFMedia): Promise<any> {
  const controller = new AbortController();
  return element.getMediaEngine(controller.signal);
}

@customElement("test-media-engine")
class TestMediaEngine extends EFMedia {}

declare global {
  interface HTMLElementTagNameMap {
    "test-media-engine": TestMediaEngine;
  }
}

const testWithElement = baseTest.extend<{
  element: TestMediaEngine;
  configuration: HTMLElement;
}>({
  element: async ({}, use) => {
    const element = document.createElement("test-media-engine");

    // Set up element with required properties via attributes
    const apiHost = `${window.location.protocol}//${window.location.host}`;
    element.setAttribute("api-host", apiHost);

    document.body.appendChild(element);
    await use(element);
    element.remove();
  },
  configuration: async ({}, use) => {
    const config = document.createElement("ef-configuration") as any;
    document.body.appendChild(config);
    await use(config);
    config.remove();
  },
});

describe("makeMediaEngineTask", () => {
  describe("createMediaEngine - Engine Selection Logic", () => {
    testWithElement(
      "should return undefined for empty src when no assetId",
      async ({ element, expect }) => {
        element.setAttribute("src", "");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);
        expect(result).toBeUndefined();
      },
    );

    testWithElement(
      "should return undefined for whitespace-only src when no assetId",
      async ({ element, expect }) => {
        element.setAttribute("src", "   ");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);
        expect(result).toBeUndefined();
      },
    );

    testWithElement(
      "should return undefined for null src when no assetId",
      async ({ element, expect }) => {
        element.removeAttribute("src");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);
        expect(result).toBeUndefined();
      },
    );

    testWithElement(
      "should return undefined when assetId is provided but apiHost is missing",
      async ({ element, expect }) => {
        element.setAttribute("asset-id", "test-asset-123");
        element.setAttribute("api-host", "");
        await element.updateComplete;

        const result = await createMediaEngine(element);
        expect(result).toBeUndefined();
      },
    );

    testWithElement(
      "should choose AssetMediaEngine for local file paths",
      async ({ element, expect }) => {
        element.setAttribute("src", "bars-n-tone.mp4"); // Local test asset
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        // Should successfully create AssetMediaEngine (doesn't throw)
        expect(result).toBeDefined();
        expect(result.constructor.name).toBe("AssetMediaEngine");
      },
    );

    testWithElement(
      "should choose JitMediaEngine for remote URLs with cloud configuration",
      async ({ element, configuration, expect }) => {
        // Set up configuration for JIT mode
        configuration.setAttribute("media-engine", "cloud");
        (configuration as any).mediaEngine = "cloud"; // Set property for engine selection
        document.body.appendChild(configuration);
        configuration.appendChild(element);

        element.setAttribute("src", "http://web:3000/head-moov-480p.mp4");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        // Should successfully create JitMediaEngine
        expect(result).toBeDefined();
        expect(result.constructor.name).toBe("JitMediaEngine");
      },
    );

    testWithElement(
      "should default to JitMediaEngine for remote URLs without configuration",
      async ({ element, expect }) => {
        // No configuration element = defaults to JitMediaEngine
        element.setAttribute("src", "http://web:3000/head-moov-480p.mp4");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.constructor.name).toBe("JitMediaEngine");
      },
    );

    testWithElement(
      "should ignore empty assetId and use src for engine selection",
      async ({ element, expect }) => {
        element.setAttribute("asset-id", ""); // Empty assetId should be ignored
        element.setAttribute("src", "bars-n-tone.mp4");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.constructor.name).toBe("AssetMediaEngine");
      },
    );

    testWithElement(
      "should ignore whitespace-only assetId and use src for engine selection",
      async ({ element, expect }) => {
        element.setAttribute("asset-id", "   "); // Whitespace-only assetId should be ignored
        element.setAttribute("src", "bars-n-tone.mp4");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.constructor.name).toBe("AssetMediaEngine");
      },
    );
  });
});
