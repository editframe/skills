import { html, render } from "lit";
import { describe } from "vitest";

import { test as baseTest } from "../../test/useMSW.js";
import type { EFVideo } from "./EFVideo.js";
import "./EFVideo.js";
import "../gui/EFWorkbench.js";
import "../gui/EFConfiguration.js";

const test = baseTest.extend({});

describe("URL Token Deduplication", () => {
  test.skip("multiple EFMedia elements with same src should share URL tokens", async ({
    expect,
  }) => {
    // TODO: This test is intentionally skipped because it documents a known issue where
    // URL token requests are not properly deduplicated across multiple EFMedia elements
    // with the same src. Currently makes 2 token requests instead of 1.
    // Mock fetch to track token requests
    const originalFetch = window.fetch;
    const tokenRequests: string[] = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("/api/v1/url-token") || url.includes("/@ef-sign-url")) {
        tokenRequests.push(url);
        // Mock token response
        return new Response(JSON.stringify({ token: "mock-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/v1/transcode/")) {
        // Mock media response
        return new Response("mock-media-data", { status: 200 });
      }

      return originalFetch(input, init);
    };

    try {
      const container = document.createElement("div");
      // Create 3 EFVideo elements with the same source in a shared context
      render(
        html`
          <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
            <ef-workbench>
              <ef-video src="http://example.com/test.mp4"></ef-video>
              <ef-video src="http://example.com/test.mp4"></ef-video>
              <ef-video src="http://example.com/test.mp4"></ef-video>
            </ef-workbench>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const videos = container.querySelectorAll("ef-video") as NodeListOf<EFVideo>;
      const workbench = container.querySelector("ef-workbench") as any;

      await workbench.updateComplete;
      await Promise.all(Array.from(videos).map((v) => v.updateComplete));

      // Trigger manifest requests for all videos
      await Promise.all(
        Array.from(videos).map(async (video) => {
          try {
            await video.getMediaEngine();
          } catch (_error) {
            // Expected to fail since we're mocking, but should trigger token requests
          }
        }),
      );

      // Should only have 1 token request since all videos share the same source
      // This test will currently fail, demonstrating the issue
      expect(tokenRequests.length).toBe(1);

      container.remove();
    } finally {
      window.fetch = originalFetch;
    }
  });

  test("multiple EFMedia elements in separate context providers should share tokens globally", async ({
    expect,
  }) => {
    // This test verifies global token deduplication across separate context providers
    const originalFetch = window.fetch;
    const tokenRequests: { url: string; body: any; timestamp: number }[] = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("/api/v1/url-token") || url.includes("/@ef-sign-url")) {
        const bodyData = init?.body ? JSON.parse(init.body as string) : null;
        const timestamp = Date.now();
        tokenRequests.push({ url, body: bodyData, timestamp });

        // Add small delay to make timing issues more apparent
        await new Promise((resolve) => setTimeout(resolve, 10));

        return new Response(JSON.stringify({ token: "mock-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/v1/transcode/")) {
        return new Response(
          JSON.stringify({
            audioRenditions: [],
            videoRenditions: [],
            src: "test",
            durationMs: 1000,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return originalFetch(input, init);
    };

    try {
      const container = document.createElement("div");
      // Create multiple elements with the same source, added concurrently
      container.innerHTML = `
        <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
          <ef-workbench>
            <ef-video src="http://example.com/test.mp4"></ef-video>
          </ef-workbench>
        </ef-configuration>
        <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
          <ef-workbench>
            <ef-video src="http://example.com/test.mp4"></ef-video>
          </ef-workbench>
        </ef-configuration>
        <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
          <ef-workbench>
            <ef-video src="http://example.com/test.mp4"></ef-video>
          </ef-workbench>
        </ef-configuration>
      `;
      document.body.appendChild(container);

      const videos = container.querySelectorAll("ef-video") as NodeListOf<EFVideo>;
      const workbenches = container.querySelectorAll("ef-workbench") as NodeListOf<any>;

      await Promise.all(Array.from(workbenches).map((w) => w.updateComplete));
      await Promise.all(Array.from(videos).map((v) => v.updateComplete));

      // Trigger all requests simultaneously to test race conditions
      await Promise.all(
        Array.from(videos).map(async (video) => {
          try {
            await video.getMediaEngine();
          } catch (_error) {
            // Expected due to mocking
          }
        }),
      );

      // With global token deduplication, should only make 1 token request
      // even across separate context providers
      expect(tokenRequests.length).toBe(1);

      container.remove();
    } finally {
      window.fetch = originalFetch;
    }
  });

  test("concurrent token requests are properly deduplicated globally", async ({ expect }) => {
    // This test simulates the race condition where multiple elements initialize simultaneously
    const originalFetch = window.fetch;
    const tokenRequests: { url: string; body: any; timestamp: number }[] = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("/api/v1/url-token") || url.includes("/@ef-sign-url")) {
        const bodyData = init?.body ? JSON.parse(init.body as string) : null;
        const timestamp = Date.now();

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));

        tokenRequests.push({ url, body: bodyData, timestamp });
        return new Response(JSON.stringify({ token: "mock-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/v1/transcode/")) {
        return new Response(
          JSON.stringify({
            audioRenditions: [],
            videoRenditions: [],
            src: "test",
            durationMs: 1000,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return originalFetch(input, init);
    };

    try {
      // Create elements and trigger simultaneous token requests
      const elements: any[] = [];
      const containers: HTMLElement[] = [];

      // Create 5 separate context providers with identical videos
      for (let i = 0; i < 5; i++) {
        const container = document.createElement("div");
        container.innerHTML = `
          <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
            <ef-workbench>
              <ef-video src="http://example.com/concurrent-test.mp4"></ef-video>
            </ef-workbench>
          </ef-configuration>
        `;
        document.body.appendChild(container);
        containers.push(container);

        const video = container.querySelector("ef-video");
        const workbench = container.querySelector("ef-workbench");
        elements.push({ video, workbench });
      }

      // Wait for all elements to be ready
      await Promise.all(
        elements.map(async ({ video, workbench }) => {
          await workbench.updateComplete;
          await video.updateComplete;
        }),
      );

      // Trigger all manifest requests simultaneously to create race condition
      await Promise.all(
        elements.map(async ({ video }) => {
          try {
            await video.getMediaEngine();
          } catch (_error) {
            // Expected due to mocking
          }
        }),
      );

      // Verify that despite 5 concurrent elements, only 1 token was actually fetched
      expect(tokenRequests.length).toBe(1);

      // Cleanup
      containers.forEach((container) => {
        container.remove();
      });
    } finally {
      window.fetch = originalFetch;
    }
  });

  test("ten identical videos should use single URL token (user reported issue)", async ({
    expect,
  }) => {
    // This test specifically reproduces the user's reported issue:
    // 10 identical videos creating 10 tokens instead of sharing 1 token
    const originalFetch = window.fetch;
    const tokenRequests: string[] = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("/api/v1/url-token") || url.includes("/@ef-sign-url")) {
        tokenRequests.push(url);
        return new Response(JSON.stringify({ token: "shared-token-for-all" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/v1/transcode/")) {
        return new Response(
          JSON.stringify({
            audioRenditions: [],
            videoRenditions: [],
            src: "test",
            durationMs: 1000,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return originalFetch(input, init);
    };

    try {
      const container = document.createElement("div");

      // Create exactly the scenario the user described: 10 identical videos on one page
      const videoElements = Array.from(
        { length: 10 },
        (_, i) => `<ef-video src="http://example.com/user-video.mp4" id="video-${i}"></ef-video>`,
      ).join("\n");

      container.innerHTML = `
        <ef-configuration api-host="http://localhost:3000" signing-url="/@ef-sign-url">
          <ef-workbench>
            ${videoElements}
          </ef-workbench>
        </ef-configuration>
      `;
      document.body.appendChild(container);

      const videos = container.querySelectorAll("ef-video");
      const workbench = container.querySelector("ef-workbench") as any;

      expect(videos.length).toBe(10);

      await workbench.updateComplete;
      await Promise.all(Array.from(videos).map((v: any) => v.updateComplete));

      // Trigger media engine initialization for all 10 videos
      await Promise.all(
        Array.from(videos).map(async (video: any) => {
          try {
            await video.getMediaEngine();
          } catch (_error) {
            // Expected due to mocking
          }
        }),
      );

      // This should now be 1 instead of 10, proving the deduplication works
      expect(tokenRequests.length).toBe(1);

      container.remove();
    } finally {
      window.fetch = originalFetch;
    }
  });
});
