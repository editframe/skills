import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "./EFImage.js";
import "../gui/EFPreview.js";
import { v4 } from "uuid";
import { TEST_SERVER_PORT } from "../../test/constants.js";

describe("EFImage", () => {
  describe("when rendering", () => {
    beforeEach(() => {
      // @ts-expect-error
      window.FRAMEGEN_BRIDGE = true;
    });
    afterEach(() => {
      delete window.FRAMEGEN_BRIDGE;
    });
    test("assetPath uses apiHost and files endpoint", () => {
      const preview = document.createElement("ef-preview");
      const element = document.createElement("ef-image");
      preview.apiHost = "https://editframe.com";
      preview.appendChild(element);
      document.body.appendChild(preview);
      element.assetId = "550e8400-e29b-41d4-a716-446655440000";
      expect(element.assetPath()).toBe(
        "https://editframe.com/api/v1/files/550e8400-e29b-41d4-a716-446655440000",
      );
      preview.remove();
    });
  });

  describe("attribute: asset-id", () => {
    test("determines assetPath", () => {
      const id = v4();
      const image = document.createElement("ef-image");
      const preview = document.createElement("ef-preview");
      preview.apiHost = "https://editframe.com";
      image.setAttribute("asset-id", id);
      preview.appendChild(image);
      document.body.appendChild(preview);
      expect(image.assetPath()).toBe(
        `https://editframe.com/api/v1/files/${id}`,
      );
      preview.remove();
    });

    test("honors apiHost", () => {
      const id = v4();
      const image = document.createElement("ef-image");
      const preview = document.createElement("ef-preview");
      image.setAttribute("asset-id", id);
      preview.appendChild(image);
      preview.apiHost = "test://";
      document.body.appendChild(preview);
      expect(image.assetPath()).toBe(`test:///api/v1/files/${id}`);
      preview.remove();
    });
  });

  describe("hasOwnDuration", () => {
    test("is false by default", () => {
      const image = document.createElement("ef-image");
      expect(image.hasOwnDuration).toBe(false);
    });

    test("is true when duration is set", () => {
      const image = document.createElement("ef-image");
      image.setAttribute("duration", "1s");
      expect(image.hasOwnDuration).toBe(true);
    });
  });

  describe("durationMs", () => {
    test("Can be set on element directly", () => {
      const image = document.createElement("ef-image");
      image.src =
        "https://editframe.com/api/v1/image_files/550e8400-e29b-41d4-a716-446655440000";
      image.duration = "1s";
      expect(image.durationMs).toBe(1000);
    });

    test("Can be set through setAttribute", () => {
      const image = document.createElement("ef-image");
      image.src =
        "https://editframe.com/api/v1/image_files/550e8400-e29b-41d4-a716-446655440000";
      image.setAttribute("duration", "1s");
      expect(image.durationMs).toBe(1000);
    });
  });

  describe("assetPath routing", () => {
    test("routes https src through assets image endpoint", () => {
      const image = document.createElement("ef-image");
      image.src = "https://example.com/image.jpg";
      expect(image.assetPath()).toBe(
        "/api/v1/assets/image?src=https%3A%2F%2Fexample.com%2Fimage.jpg",
      );
    });

    test("routes http src through assets image endpoint", () => {
      const image = document.createElement("ef-image");
      image.src = "http://example.com/image.jpg";
      expect(image.assetPath()).toBe(
        "/api/v1/assets/image?src=http%3A%2F%2Fexample.com%2Fimage.jpg",
      );
    });

    test("routes local file src through assets image endpoint", () => {
      const image = document.createElement("ef-image");
      image.src = "local-image.jpg";
      expect(image.assetPath()).toBe(
        "/api/v1/assets/image?src=local-image.jpg",
      );
    });

    test("file-id takes priority over src", () => {
      const image = document.createElement("ef-image");
      const preview = document.createElement("ef-preview");
      preview.appendChild(image);
      preview.apiHost = "https://api.test.com";
      document.body.appendChild(preview);
      image.src = "https://example.com/image.jpg";
      image.assetId = "test-asset-id";
      expect(image.assetPath()).toBe(
        "https://api.test.com/api/v1/files/test-asset-id",
      );
      preview.remove();
    });

    test("cross-origin src routes through assets endpoint to prevent canvas CORS taint", () => {
      const image = document.createElement("ef-image");
      image.src =
        "https://storage.googleapis.com/editframe-assets-7ac794b/1080-cat.jpeg";
      expect(image.assetPath()).toBe(
        "/api/v1/assets/image?src=https%3A%2F%2Fstorage.googleapis.com%2Feditframe-assets-7ac794b%2F1080-cat.jpeg",
      );
    });
  });

  describe("SVG rendering", () => {
    test("renders SVG with viewBox but no width/height attributes", async () => {
      const image = document.createElement("ef-image");
      document.body.appendChild(image);

      // Use data URI for SVG with only viewBox (no width/height)
      const svgContent =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#3b82f6" /></svg>';
      const dataUri = "data:image/svg+xml," + encodeURIComponent(svgContent);

      image.src = dataUri;
      image.style.width = "200px";
      image.style.height = "200px";

      await image.updateComplete;

      // With a data URI, EFImage renders an <img> element (direct URL path)
      const imgEl = image.imageRef.value;
      expect(imgEl).toBeDefined();
      expect(imgEl!.complete || imgEl!.naturalWidth > 0).toBe(true);

      document.body.removeChild(image);
    });
  });

  describe("WebP rendering", () => {
    test("remote URL renders canvas element (not img) to avoid CORS canvas taint", async () => {
      const image = document.createElement("ef-image");
      image.src = "https://example.com/image.webp";
      image.style.width = "100px";
      image.style.height = "100px";
      document.body.append(image);
      await image.updateComplete;

      // Remote URLs must go through the proxy path (canvas), not the direct img path,
      // so that ctx.drawImage() during rendering doesn't taint the canvas.
      expect(image.canvasRef.value).toBeDefined();
      expect(image.imageRef.value).toBeUndefined();

      image.remove();
    });

    test("loads remote WebP through proxy and populates canvas", async () => {
      // Uses localhost so the Node.js proxy middleware can reach it directly,
      // regardless of whether Traefik is in front for the browser connection.
      const image = document.createElement("ef-image");
      image.src = `http://localhost:${TEST_SERVER_PORT}/test.webp`;
      image.style.width = "100px";
      image.style.height = "100px";
      document.body.append(image);
      await image.updateComplete;
      await image.loadImage();

      expect(image.contentReadyState).toBe("ready");
      expect(image.hasAlpha).toBe(true);
      const canvasEl = image.canvasRef.value;
      expect(canvasEl).toBeDefined();
      expect(canvasEl!.width).toBeGreaterThan(0);
      expect(canvasEl!.height).toBeGreaterThan(0);

      image.remove();
    });

    test("loads WebP via canvas path and sets hasAlpha to true", async () => {
      const image = document.createElement("ef-image");
      image.src = "test.webp";
      image.style.width = "100px";
      image.style.height = "100px";
      document.body.append(image);
      await image.updateComplete;
      await image.loadImage();

      expect(image.contentReadyState).toBe("ready");
      expect(image.hasAlpha).toBe(true);
      const canvasEl = image.canvasRef.value;
      expect(canvasEl).toBeDefined();

      image.remove();
    });
  });

  describe("contentReadyState", () => {
    test("image with no src auto-readies (trivially ready)", async () => {
      const image = document.createElement("ef-image");
      document.body.append(image);
      await image.updateComplete;
      expect(image.contentReadyState).toBe("ready");
      image.remove();
    });

    test("image with src transitions to ready after load", async () => {
      const image = document.createElement("ef-image");
      const src =
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
        );

      image.src = src;
      image.style.width = "100px";
      image.style.height = "100px";
      document.body.append(image);
      await image.updateComplete;
      await image.loadImage();

      expect(image.contentReadyState).toBe("ready");
      image.remove();
    });

    test("emits contentchange on src change", async () => {
      const image = document.createElement("ef-image");
      const src1 =
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
        );
      image.src = src1;
      image.style.width = "100px";
      image.style.height = "100px";
      document.body.append(image);
      await image.updateComplete;
      await image.loadImage();

      const reasons: string[] = [];
      image.addEventListener("contentchange", ((e: CustomEvent) => {
        reasons.push(e.detail.reason);
      }) as EventListener);

      const src2 =
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>',
        );
      image.src = src2;
      await image.updateComplete;

      expect(reasons).toContain("source");
      image.remove();
    });
  });
});
