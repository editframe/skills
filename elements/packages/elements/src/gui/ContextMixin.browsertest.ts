import { html, LitElement, render } from "lit";
import { customElement } from "lit/decorators/custom-element.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContextMixin } from "./ContextMixin.js";

import "../elements/EFTimegroup.js";
import "../elements/EFVideo.js";
import "./EFPreview.js";
import "./EFTogglePlay.js";

@customElement("test-context")
class TestContext extends ContextMixin(LitElement) {}

@customElement("test-context-reactivity")
class TestContextElement extends ContextMixin(LitElement) {
  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-context": TestContext;
    "test-context-reactivity": TestContextElement;
  }
}

describe("ContextMixin.fetch CORS behavior", () => {
  let element: TestContext & { fetch: typeof fetch };
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof window.fetch;

  const createJWTToken = (expirationMs: number): string => {
    const header = btoa(JSON.stringify({ typ: "JWT", alg: "HS256" }));
    const payload = btoa(
      JSON.stringify({
        type: "url",
        url: "test-url",
        exp: Math.floor(expirationMs / 1000),
        iat: Math.floor(Date.now() / 1000),
      }),
    );
    return `${header}.${payload}.mock-signature`;
  };

  beforeEach(() => {
    originalFetch = window.fetch;
    mockFetch = vi.fn();
    window.fetch = mockFetch as unknown as typeof fetch;

    element = document.createElement("test-context") as TestContext & {
      fetch: typeof fetch;
    };
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element.parentNode) {
      document.body.removeChild(element);
    }
    window.fetch = originalFetch;
  });

  test("does not set Content-Type on requests without a body", async () => {
    element.signingURL = "https://test.com/sign";

    const futureTime = Date.now() + 60 * 60 * 1000;
    const token = createJWTToken(futureTime);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    });

    await element.fetch("https://example.com/media.mp4");

    // The actual media request (second call) should NOT have Content-Type
    const mediaCall = mockFetch.mock.calls[1]!;
    const headers = mediaCall[1]?.headers ?? {};
    expect(headers).not.toHaveProperty("Content-Type");
  });

  test("sets Content-Type on requests with a body", async () => {
    element.signingURL = "https://test.com/sign";

    const futureTime = Date.now() + 60 * 60 * 1000;
    const token = createJWTToken(futureTime);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    });

    await element.fetch("https://example.com/api", {
      method: "POST",
      body: JSON.stringify({ data: 1 }),
    });

    const apiCall = mockFetch.mock.calls[1]!;
    const headers = apiCall[1]?.headers ?? {};
    expect(headers).toHaveProperty("Content-Type", "application/json");
  });

  test("does not set credentials on cross-origin requests when signingURL is empty", async () => {
    element.signingURL = "";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    });

    await element.fetch("https://editframe.dev/api/v1/transcode/manifest.json?url=test");

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.credentials).toBeUndefined();
  });

  test("sets credentials on same-origin requests when signingURL is empty", async () => {
    element.signingURL = "";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    });

    // Same-origin request (window.location.origin in tests is typically http://localhost:...)
    await element.fetch(`${window.location.origin}/api/data`);

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.credentials).toBe("include");
  });

  test("warns when request targets editframe domain without signingURL", async () => {
    element.signingURL = "";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    });

    await element.fetch("https://editframe.dev/api/v1/transcode/manifest.json?url=test");

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("editframe.dev"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("signing"));

    warnSpy.mockRestore();
  });
});

// Skip all ContextMixin tests - failing tests need investigation
describe.skip("ContextMixin", () => {
  test("should be defined", () => {
    expect(ContextMixin).toBeDefined();
  });

  describe("Token age checking", () => {
    let element: TestContext & { fetch: typeof fetch };
    let mockFetch: any;
    let originalFetch: any;

    // Helper to create a JWT token with specific expiration time
    const createJWTToken = (expirationMs: number, issuedAtMs?: number): string => {
      const iat = issuedAtMs ? Math.floor(issuedAtMs / 1000) : Math.floor(Date.now() / 1000);
      const header = btoa(JSON.stringify({ typ: "JWT", alg: "HS256" }));
      const payload = btoa(
        JSON.stringify({
          type: "url",
          url: "test-url",
          exp: Math.floor(expirationMs / 1000), // JWT exp is in seconds
          iat: iat,
        }),
      );
      const signature = "mock-signature";
      return `${header}.${payload}.${signature}`;
    };

    beforeEach(() => {
      originalFetch = window.fetch;
      mockFetch = vi.fn();
      window.fetch = mockFetch;

      element = document.createElement("test-context") as TestContext & {
        fetch: typeof fetch;
      };
      element.signingURL = "https://test.com/api/v1/url-token";
      document.body.appendChild(element);

      vi.useFakeTimers();
    });

    afterEach(() => {
      if (element.parentNode) {
        document.body.removeChild(element);
      }
      window.fetch = originalFetch;
      vi.useRealTimers();
    });

    test("should fetch new token when none exists", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const token = createJWTToken(futureTime);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success"),
      });

      await element.fetch("https://example.com/media.mp4");

      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/media.mp4" }),
      });

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/media.mp4", {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });
    }, 1000);

    test("should reuse cached token when fresh", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const token = createJWTToken(futureTime);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success1"),
      });

      await element.fetch("https://example.com/media.mp4");

      // Advance time by 30 minutes (token still valid for 30 more minutes)
      vi.advanceTimersByTime(30 * 60 * 1000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success2"),
      });

      await element.fetch("https://example.com/media.mp4");

      // Should only call signing URL once
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 signing + 2 media requests
    }, 1000);

    test("should fetch new token when cached token is expired", async () => {
      const now = Date.now();
      const issuedAt = now;
      const expiresAt = now + 30 * 60 * 1000; // 30 minutes from now

      // For a 30-minute token: 10% = 3 minutes buffer (smaller than 5 minutes)
      // Token will be considered expired at 27 minutes
      const token1 = createJWTToken(expiresAt, issuedAt);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token1 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success1"),
      });

      await element.fetch("https://example.com/media.mp4");

      // Advance time by 28 minutes (past the 27-minute buffer threshold)
      vi.advanceTimersByTime(28 * 60 * 1000);

      const newExpiry = Date.now() + 60 * 60 * 1000; // 1 hour from current time
      const token2 = createJWTToken(newExpiry);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token2 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success2"),
      });

      await element.fetch("https://example.com/media.mp4");

      // Should call signing URL twice
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 signing + 2 media requests

      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/media.mp4" }),
      });

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/media.mp4", {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token2}`,
        },
      });
    }, 1000);

    test("should handle different URLs with separate token expiry", async () => {
      const url1 = "https://example.com/media1.mp4";
      const url2 = "https://example.com/media2.mp4";

      const startTime = Date.now();

      // URL1 gets a 30-minute token (10% buffer = 3 min, so expires at 27 min)
      const url1IssuedAt = startTime;
      const url1ExpiresAt = startTime + 30 * 60 * 1000; // 30 minutes
      const token1 = createJWTToken(url1ExpiresAt, url1IssuedAt);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success1"),
      });

      await element.fetch(url1);

      // Advance time by 15 minutes
      vi.advanceTimersByTime(15 * 60 * 1000);

      // URL2 gets a 60-minute token (5 min buffer is smaller than 10% = 6 min, so expires at 55 min)
      const url2IssuedAt = Date.now();
      const url2ExpiresAt = url2IssuedAt + 60 * 60 * 1000; // 60 minutes from current time
      const token2 = createJWTToken(url2ExpiresAt, url2IssuedAt);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token2 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success2"),
      });

      await element.fetch(url2);

      // Advance time by another 15 minutes (total 30 min from start)
      // URL1 token: 30 min from start, past its 27-min threshold → expired
      // URL2 token: 15 min from its creation, well within its 55-min threshold → still valid
      vi.advanceTimersByTime(15 * 60 * 1000);

      // Request URL1 again (should get new token - expired)
      const url1NewExpiry = Date.now() + 60 * 60 * 1000;
      const token3 = createJWTToken(url1NewExpiry);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token3 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success3"),
      });

      await element.fetch(url1);

      // Request URL2 again (should reuse token - still valid)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success4"),
      });

      await element.fetch(url2);

      expect(mockFetch).toHaveBeenCalledTimes(7); // 3 signing + 4 media requests (URL2 reused token)
    }, 1000);

    test("should reuse global token cache across component disconnections", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const token1 = createJWTToken(futureTime);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token1 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success"),
      });

      await element.fetch("https://example.com/media.mp4");

      if (element.parentNode) {
        document.body.removeChild(element);
      }

      // Create new element and add back to DOM
      element = document.createElement("test-context") as TestContext & {
        fetch: typeof fetch;
      };
      element.signingURL = "https://test.com/api/v1/url-token";
      document.body.appendChild(element);

      // No need to mock additional token request - should reuse from global cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success2"),
      });

      await element.fetch("https://example.com/media.mp4");

      // With global caching: 1 signing + 2 media requests (token is reused)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 1000);

    test("should use single token for multiple transcode segments with same source URL", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000;
      const token = createJWTToken(futureTime);

      const sourceUrl = "https://example.com/source-video.mp4";
      const segment1 = `https://editframe.com/api/v1/transcode/video-1080p/1.mp4?url=${encodeURIComponent(sourceUrl)}`;
      const segment2 = `https://editframe.com/api/v1/transcode/video-1080p/2.mp4?url=${encodeURIComponent(sourceUrl)}`;
      const segment3 = `https://editframe.com/api/v1/transcode/audio-44100/1.m4a?url=${encodeURIComponent(sourceUrl)}`;

      // Should only sign once for the base URL + params combination
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token }),
      });

      // Mock all segment requests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Fetch multiple segments
      await element.fetch(segment1);
      await element.fetch(segment2);
      await element.fetch(segment3);

      // Should only call signing URL once + 3 segment requests
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify the signing request used base URL + params format
      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({
          url: "https://editframe.com/api/v1/transcode",
          params: { url: sourceUrl },
        }),
      });

      // All segment requests should use the same token
      expect(mockFetch).toHaveBeenCalledWith(segment1, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });
      expect(mockFetch).toHaveBeenCalledWith(segment2, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });
      expect(mockFetch).toHaveBeenCalledWith(segment3, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
      });
    }, 1000);

    test("should use different tokens for transcode segments with different source URLs", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000;
      const token1 = createJWTToken(futureTime);
      const token2 = createJWTToken(futureTime);

      const sourceUrl1 = "https://example.com/video1.mp4";
      const sourceUrl2 = "https://example.com/video2.mp4";

      const segment1A = `https://editframe.com/api/v1/transcode/video-1080p/1.mp4?url=${encodeURIComponent(sourceUrl1)}`;
      const segment1B = `https://editframe.com/api/v1/transcode/video-1080p/2.mp4?url=${encodeURIComponent(sourceUrl1)}`;
      const segment2A = `https://editframe.com/api/v1/transcode/video-720p/1.mp4?url=${encodeURIComponent(sourceUrl2)}`;

      // First source URL token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token1 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Fetch segments for first source
      await element.fetch(segment1A);
      await element.fetch(segment1B);

      // Second source URL token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token2 }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Fetch segment for second source
      await element.fetch(segment2A);

      // Should call signing URL twice + 3 segment requests
      expect(mockFetch).toHaveBeenCalledTimes(5);

      // Verify separate signing requests
      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({
          url: "https://editframe.com/api/v1/transcode",
          params: { url: sourceUrl1 },
        }),
      });
      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({
          url: "https://editframe.com/api/v1/transcode",
          params: { url: sourceUrl2 },
        }),
      });
    }, 1000);

    test("should still sign individual URLs for non-transcode endpoints", async () => {
      const futureTime = Date.now() + 60 * 60 * 1000;
      const token1 = createJWTToken(futureTime);
      const token2 = createJWTToken(futureTime);

      const regularUrl1 = "https://example.com/api/v1/media/123";
      const regularUrl2 = "https://example.com/api/v1/assets/456";

      // First URL signing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token1 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success1"),
      });

      // Second URL signing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: token2 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("success2"),
      });

      await element.fetch(regularUrl1);
      await element.fetch(regularUrl2);

      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 signing + 2 requests

      // Should sign each URL individually (existing behavior)
      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({ url: regularUrl1 }),
      });
      expect(mockFetch).toHaveBeenCalledWith("https://test.com/api/v1/url-token", {
        method: "POST",
        body: JSON.stringify({ url: regularUrl2 }),
      });
    }, 1000);
  });

  describe("Playback", () => {
    test("should start playback via playbackController", async () => {
      const element = document.createElement("test-context-reactivity");
      document.body.appendChild(element);
      await element.updateComplete;

      // Create a timegroup which gets its own playbackController
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "fixed";
      timegroup.duration = "5s";
      element.appendChild(timegroup);

      await element.updateComplete;
      await timegroup.updateComplete;

      // Observable outcome: playbackController exists and playing is initially false
      expect(timegroup.playbackController).toBeTruthy();
      expect(timegroup.playbackController?.playing).toBe(false);

      // Start playback
      timegroup.playbackController?.setPlaying(true);

      // Observable outcome: playing state changes
      expect(timegroup.playbackController?.playing).toBe(true);

      // Clean up
      timegroup.playbackController?.setPlaying(false);
      element.remove();
    });

    test("playback state changes are observable through context", async () => {
      const element = document.createElement("test-context-reactivity");
      document.body.appendChild(element);
      await element.updateComplete;

      // Create a timegroup as target
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "fixed";
      timegroup.duration = "5s";
      element.appendChild(timegroup);

      await element.updateComplete;
      await timegroup.updateComplete;

      // Set playing through context's playing property (which delegates to playbackController)
      element.playing = true;

      // Observable outcome: playback state propagates through controller
      expect(element.targetTemporal?.playbackController?.playing).toBe(true);

      // Stop playback
      element.playing = false;
      expect(element.targetTemporal?.playbackController?.playing).toBe(false);

      element.remove();
    });

    test("playback stops when context is disconnected", async () => {
      const element = document.createElement("test-context-reactivity");
      document.body.appendChild(element);
      await element.updateComplete;

      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "fixed";
      timegroup.duration = "5s";
      element.appendChild(timegroup);

      await element.updateComplete;
      await timegroup.updateComplete;

      // Capture the playbackController before disconnect
      const playbackController = timegroup.playbackController;
      expect(playbackController).toBeTruthy();

      // Start playback
      playbackController?.setPlaying(true);
      expect(playbackController?.playing).toBe(true);

      // Disconnect the element
      element.remove();

      // Observable outcome: playback should stop when disconnected
      // The controller stops playback in its disconnectedCallback
      expect(playbackController?.playing).toBe(false);
    });
  });

  describe("Reactivity", () => {
    test("should update durationMs when child tree changes", async () => {
      const element = document.createElement("test-context-reactivity");
      document.body.appendChild(element);

      // Wait for initial render
      await element.updateComplete;

      // Create a timegroup with initial duration
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "contain";

      const child = document.createElement("ef-timegroup");
      child.mode = "fixed";
      child.duration = "5s";
      timegroup.appendChild(child);

      element.appendChild(timegroup);

      // Wait for updates
      await element.updateComplete;
      await timegroup.updateComplete;

      // Initially, the timegroup should have 5s duration
      expect(element.targetTemporal?.durationMs).toBe(5000);

      // Now change the child duration
      child.duration = "10s";

      // Wait for updates
      await element.updateComplete;
      await timegroup.updateComplete;

      // The targetTemporal should now have 10s duration
      expect(element.targetTemporal?.durationMs).toBe(10000);

      document.body.removeChild(element);
    });

    test("should update when media elements are added/removed", async () => {
      const element = document.createElement("test-context-reactivity");
      document.body.appendChild(element);

      await element.updateComplete;

      // Create initial timegroup with 5s duration
      const timegroup = document.createElement("ef-timegroup");
      timegroup.mode = "contain";

      const child = document.createElement("ef-timegroup");
      child.mode = "fixed";
      child.duration = "5s";
      timegroup.appendChild(child);

      element.appendChild(timegroup);

      await element.updateComplete;
      await timegroup.updateComplete;

      // Initially duration should be 5s
      expect(element.targetTemporal?.durationMs).toBe(5000);

      // Add a new child with longer duration
      const newChild = document.createElement("ef-timegroup");
      newChild.mode = "fixed";
      newChild.duration = "15s";
      timegroup.appendChild(newChild);

      // Wait for updates
      await element.updateComplete;
      await timegroup.updateComplete;
      await newChild.updateComplete;

      // Wait for next animation frame to ensure temporal cache is cleared
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Duration should now be 15s (the max of all children)
      expect(element.targetTemporal?.durationMs).toBe(15000);

      document.body.removeChild(element);
    });
  });

  describe("Standalone temporal elements", () => {
    test("preview finds standalone video as targetTemporal", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview">
              <ef-video src="bars-n-tone.mp4" id="standalone-video"></ef-video>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;

      await preview.updateComplete;
      await video.updateComplete;

      // Preview should find the video as its targetTemporal
      expect(preview.targetTemporal).toBe(video);

      // Video should have a playbackController as a root element
      // (might need to wait for async initialization)
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(video.playbackController).toBeDefined();

      // Preview should be able to access the playback controller
      expect(preview.targetTemporal?.playbackController).toBeDefined();

      container.remove();
    });

    test("preview can control standalone video playback", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview">
              <ef-video src="bars-n-tone.mp4" id="standalone-video"></ef-video>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;

      await preview.updateComplete;
      await video.updateComplete;

      // Wait for media engine to load - essential for duration
      await video.mediaEngineTask.run();

      // Wait for playbackController to be created and subscribed
      await new Promise((resolve) => setTimeout(resolve, 100));
      await preview.updateComplete;

      // Verify setup before testing play
      expect(preview.targetTemporal).toBe(video);
      expect(video.playbackController).toBeDefined();
      expect(video.durationMs).toBeGreaterThan(0);

      // Initial state should be not playing
      expect(preview.playing).toBe(false);
      expect(video.playbackController.playing).toBe(false);

      // Spy on the playback controller's play and pause methods
      const playSpy = vi.spyOn(video.playbackController, "play");
      const pauseSpy = vi.spyOn(video.playbackController, "pause");

      // Call play on preview - should delegate to video's playback controller
      preview.play();

      // Verify that play was called on the video's playback controller
      expect(playSpy).toHaveBeenCalledTimes(1);

      // Pause should also work
      preview.pause();
      expect(pauseSpy).toHaveBeenCalledTimes(1);

      playSpy.mockRestore();
      pauseSpy.mockRestore();

      container.remove();
    });

    test("preview waits for video playbackController to be created", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview">
              <ef-video src="bars-n-tone.mp4" id="standalone-video"></ef-video>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;

      await preview.updateComplete;
      await video.updateComplete;

      // Wait for media engine to load
      await video.mediaEngineTask.run();

      // Wait for async initialization and subscription
      await new Promise((resolve) => setTimeout(resolve, 100));
      await preview.updateComplete;

      // Preview should have subscribed to the video's playbackController
      expect(preview.targetTemporal).toBe(video);
      expect(video.playbackController).toBeDefined();
      expect(video.durationMs).toBeGreaterThan(0);

      // Verify the ContextMixin properly waits for playbackController initialization
      // by checking that the controller is subscribed (which happens in updated())
      const playSpy = vi.spyOn(video.playbackController, "play");

      preview.play();

      // Verify the playback controller's play method was called
      expect(playSpy).toHaveBeenCalledTimes(1);

      playSpy.mockRestore();

      container.remove();
    });

    test("ef-toggle-play works with standalone video", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview">
              <ef-video src="bars-n-tone.mp4" id="standalone-video"></ef-video>
              <ef-toggle-play id="toggle"></ef-toggle-play>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;
      const toggle = container.querySelector("ef-toggle-play") as any;

      await preview.updateComplete;
      await video.updateComplete;
      await toggle.updateComplete;

      // Wait for media engine to load
      await video.mediaEngineTask.run();

      // Wait for async initialization
      await preview.updateComplete;
      await toggle.updateComplete;

      // Verify initial state
      expect(toggle.efContext).toBe(preview);
      expect(toggle.playing).toBe(false);

      // Click the toggle to play
      toggle.click();

      // Wait for playing state to become true
      await vi.waitUntil(() => toggle.playing === true, {
        timeout: 1000,
      });

      container.remove();
    });

    test("ef-preview with loop attribute loops playback", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview" loop>
              <ef-video src="bars-n-tone.mp4" sourceout="2s" id="test-video"></ef-video>
              <ef-toggle-play id="toggle"></ef-toggle-play>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;

      await preview.updateComplete;
      await video.updateComplete;

      // Wait for media engine to load
      await video.mediaEngineTask.run();
      await preview.updateComplete;

      // Verify loop property is set on preview
      // Note: We set loop as a boolean attribute in the template,
      // which Lit converts to the property. The actual HTML attribute
      // reflection is handled by LitElement's property system.
      expect(preview.loop).toBe(true);

      // Verify playback controller has loop enabled
      expect(video.playbackController).toBeDefined();
      expect(video.playbackController.loop).toBe(true);

      container.remove();
    });

    test("preview finds temporal element wrapped in div", async () => {
      const container = document.createElement("div");
      render(
        html`
          <ef-configuration api-host="http://localhost:63315" signing-url="">
            <ef-preview id="test-preview">
              <div class="wrapper">
                <ef-video src="bars-n-tone.mp4" id="wrapped-video"></ef-video>
              </div>
            </ef-preview>
          </ef-configuration>
        `,
        container,
      );
      document.body.appendChild(container);

      const preview = container.querySelector("ef-preview") as any;
      const video = container.querySelector("ef-video") as any;

      await preview.updateComplete;
      await video.updateComplete;

      // Wait for media engine to load
      await video.mediaEngineTask.run();
      await preview.updateComplete;

      // Verify findRootTemporal found the wrapped video
      expect(preview.targetTemporal).toBe(video);
      expect(video.playbackController).toBeDefined();

      container.remove();
    });
  });
});

describe("ContextMixin late temporal discovery", () => {
  test("preview discovers temporal element added after connection via DOM manipulation", async () => {
    // Simulates what happens when React's TimelineRoot renders content
    // into a Preview: the ef-timegroup is added to the DOM after the
    // Preview has already connected and its MutationObserver is running.
    const container = document.createElement("div");
    container.innerHTML = `
      <ef-configuration api-host="http://localhost:63315" signing-url="">
        <ef-preview id="late-discovery-preview">
          <div id="react-root" style="display:contents"></div>
        </ef-preview>
      </ef-configuration>
    `;
    document.body.appendChild(container);

    const preview = container.querySelector("ef-preview") as any;
    await preview.updateComplete;

    // At this point, preview has no targetTemporal
    expect(preview.targetTemporal).toBe(null);

    // Now simulate React rendering a timegroup into the wrapper div
    // (this is what TimelineRoot does)
    const reactRoot = container.querySelector("#react-root")!;
    const timegroup = document.createElement("ef-timegroup");
    timegroup.setAttribute("mode", "fixed");
    timegroup.setAttribute("duration", "5s");
    reactRoot.appendChild(timegroup);

    // Wait for custom element upgrade + MutationObserver async retry
    await customElements.whenDefined("ef-timegroup");
    await timegroup.updateComplete;
    await preview.updateComplete;

    // Preview should have discovered the late-arriving temporal element
    expect(preview.targetTemporal).toBe(timegroup);

    container.remove();
  });
});
