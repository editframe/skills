import { afterEach, beforeEach, describe, expect, test } from "vitest";
import "./EFImage.js";
import "../gui/EFPreview.js";
import { v4 } from "uuid";

describe("EFImage", () => {
  describe("when rendering", () => {
    beforeEach(() => {
      // @ts-expect-error
      window.FRAMEGEN_BRIDGE = true;
    });
    afterEach(() => {
      delete window.FRAMEGEN_BRIDGE;
    });
    test("assetPath uses http:// protocol", () => {
      const workbench = document.createElement("ef-workbench");
      const element = document.createElement("ef-image");
      workbench.appendChild(element);
      element.assetId = "550e8400-e29b-41d4-a716-446655440000";
      expect(element.assetPath()).toBe(
        "https://editframe.com/api/v1/image_files/550e8400-e29b-41d4-a716-446655440000",
      );
    });
  });

  describe("attribute: asset-id", () => {
    test("determines assetPath", () => {
      const id = v4();
      const image = document.createElement("ef-image");
      image.setAttribute("asset-id", id);
      expect(image.assetPath()).toBe(
        `https://editframe.com/api/v1/image_files/${id}`,
      );
    });

    test("honors apiHost", () => {
      const id = v4();
      const image = document.createElement("ef-image");
      const preview = document.createElement("ef-preview");
      image.setAttribute("asset-id", id);
      preview.appendChild(image);
      preview.apiHost = "test://";
      document.body.appendChild(preview);
      expect(image.assetPath()).toBe(`test:///api/v1/image_files/${id}`);
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

  describe("direct URL support", () => {
    test("assetPath returns https URLs unchanged", () => {
      const image = document.createElement("ef-image");
      image.src = "https://example.com/image.jpg";
      expect(image.assetPath()).toBe("https://example.com/image.jpg");
    });

    test("assetPath returns http URLs unchanged", () => {
      const image = document.createElement("ef-image");
      image.src = "http://example.com/image.jpg";
      expect(image.assetPath()).toBe("http://example.com/image.jpg");
    });

    test("assetPath preserves local file behavior", () => {
      const image = document.createElement("ef-image");
      image.src = "local-image.jpg";
      expect(image.assetPath()).toBe("/@ef-image/local-image.jpg");
    });

    test("assetPath preserves asset-id priority over direct URL", () => {
      const image = document.createElement("ef-image");
      const preview = document.createElement("ef-preview");
      preview.appendChild(image);
      preview.apiHost = "https://api.test.com";
      image.src = "https://example.com/image.jpg";
      image.assetId = "test-asset-id";
      expect(image.assetPath()).toBe(
        "https://api.test.com/api/v1/image_files/test-asset-id",
      );
    });

    test("handles CORS fallback for direct URLs", () => {
      const image = document.createElement("ef-image");
      image.src =
        "https://storage.googleapis.com/editframe-assets-7ac794b/1080-cat.jpeg";
      expect(image.assetPath()).toBe(
        "https://storage.googleapis.com/editframe-assets-7ac794b/1080-cat.jpeg",
      );
      // Note: CORS fallback behavior is tested in the fetchImage task logic
    });
  });

  describe("SVG rendering", () => {
    test("renders SVG with viewBox but no width/height attributes", async () => {
      const image = document.createElement("ef-image");
      document.body.appendChild(image);
      
      // Create an SVG blob with only viewBox (no width/height)
      const svgContent = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#3b82f6" /></svg>';
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      
      image.src = url;
      image.style.width = "200px";
      image.style.height = "200px";
      
      await image.loadImage();
      
      const canvas = image.canvasRef.value;
      expect(canvas).toBeDefined();
      expect(canvas!.width).toBeGreaterThan(0);
      expect(canvas!.height).toBeGreaterThan(0);
      
      // Verify canvas has content (not blank)
      const ctx = canvas!.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const hasNonZeroPixels = imageData.data.some(byte => byte !== 0);
      expect(hasNonZeroPixels).toBe(true);
      
      URL.revokeObjectURL(url);
      document.body.removeChild(image);
    });
  });
});
