import { customElement } from "lit/decorators.js";
import { describe } from "vitest";

import { test as baseTest } from "../../../../test/useMSW.js";
import { getApiHost } from "../../../../test/setup.js";
import { EFMedia } from "../../EFMedia.js";
import "../../../gui/EFConfiguration.js";

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
    const apiHost = getApiHost();
    const config = document.createElement("ef-configuration") as any;
    config.setAttribute("api-host", apiHost);
    config.apiHost = apiHost;

    const element = document.createElement("test-media-engine");
    config.appendChild(element);
    document.body.appendChild(config);

    await use(element);
    config.remove();
  },
  configuration: async ({}, use) => {
    const apiHost = getApiHost();
    const config = document.createElement("ef-configuration") as any;
    config.setAttribute("api-host", apiHost);
    config.apiHost = apiHost;
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
        // Move element out of ef-configuration so apiHost is unavailable
        document.body.appendChild(element);

        element.setAttribute("asset-id", "test-asset-123");
        await element.updateComplete;

        const result = await createMediaEngine(element);
        expect(result).toBeUndefined();
      },
    );

    testWithElement(
      "should create media engine for local file paths",
      async ({ element, expect }) => {
        element.setAttribute("src", "bars-n-tone.mp4");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.index).toBeTruthy();
        expect(result.transport).toBeTruthy();
        expect(result.timing).toBeTruthy();
      },
    );

    testWithElement(
      "should create media engine for remote URLs with configuration",
      async ({ element, configuration, expect }) => {
        document.body.appendChild(configuration);
        configuration.appendChild(element);

        element.setAttribute("src", "http://web:3000/head-moov-480p.mp4");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.index).toBeTruthy();
        expect(result.transport).toBeTruthy();
      },
    );

    testWithElement(
      "should create media engine for remote URLs without configuration",
      async ({ element, expect }) => {
        element.setAttribute("src", "http://web:3000/head-moov-480p.mp4");
        element.removeAttribute("asset-id");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.index).toBeTruthy();
      },
    );

    testWithElement(
      "should ignore empty assetId and use src for engine selection",
      async ({ element, expect }) => {
        element.setAttribute("asset-id", "");
        element.setAttribute("src", "bars-n-tone.mp4");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.index).toBeTruthy();
      },
    );

    testWithElement(
      "should ignore whitespace-only assetId and use src for engine selection",
      async ({ element, expect }) => {
        element.setAttribute("asset-id", "   ");
        element.setAttribute("src", "bars-n-tone.mp4");

        const result = await createMediaEngine(element);

        expect(result).toBeDefined();
        expect(result.index).toBeTruthy();
      },
    );
  });
});
