import { describe, test, expect } from "vitest";
import { parse } from "node-html-parser";
import {
  createBundledHTMLDirectory,
  extractAndRewriteImageSources,
  injectApiHost,
} from "./processHTML";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mkTempDir } from "@/util/tempFile";

describe("createBundledHTMLDirectory", () => {
  test("vite build succeeds and output contains render functions", { timeout: 60_000 }, async () => {
    await using tempDir = await mkTempDir(
      path.join(process.cwd(), "temp"),
    );
    const html = /* HTML */ `
      <ef-timegroup class="w-[1920px] h-[1080px]" mode="fixed" duration="1s">
        <div>test</div>
      </ef-timegroup>
    `;

    const distPath = await createBundledHTMLDirectory(tempDir.path, html);

    const indexHtml = await readFile(
      path.join(distPath, "index.html"),
      "utf-8",
    );
    expect(indexHtml).toContain("renderTimegroupToVideo");
    expect(indexHtml).toContain("captureTimegroupAtTime");
  });
});

describe("injectApiHost", () => {
  test("sets api-host on existing ef-configuration elements", () => {
    const { parse } = require("node-html-parser");
    const html = /* HTML */ `
      <!DOCTYPE html><html><body>
        <ef-configuration>
          <ef-timegroup mode="contain" class="w-[1080px] h-[1080px]">
            <ef-audio src="https://example.com/audio.mp3"></ef-audio>
          </ef-timegroup>
        </ef-configuration>
      </body></html>
    `;
    const doc = parse(html);
    injectApiHost(doc, "https://editframe.com");
    const config = doc.querySelector("ef-configuration");
    expect(config?.getAttribute("api-host")).toBe("https://editframe.com");
  });

  test("does not duplicate api-host if already set", () => {
    const { parse } = require("node-html-parser");
    const html = /* HTML */ `<ef-configuration api-host="https://existing.com"></ef-configuration>`;
    const doc = parse(html);
    injectApiHost(doc, "https://editframe.com");
    const config = doc.querySelector("ef-configuration");
    expect(config?.getAttribute("api-host")).toBe("https://editframe.com");
  });

  test("no-op when no ef-configuration present", () => {
    const { parse } = require("node-html-parser");
    const html = /* HTML */ `<ef-timegroup mode="fixed" duration="1s"></ef-timegroup>`;
    const doc = parse(html);
    expect(() => injectApiHost(doc, "https://editframe.com")).not.toThrow();
  });
});

describe("extractAndRewriteImageSources", () => {
  test("rewrites WebP src URL to file-id and asset-id", () => {
    const webpUrl = "https://example.com/image.webp";
    const doc = parse(/* HTML */ `
      <ef-timegroup mode="fixed" duration="1s">
        <ef-image src="${webpUrl}"></ef-image>
      </ef-timegroup>
    `);

    const rewrites = extractAndRewriteImageSources(doc);

    expect(rewrites).toHaveLength(1);
    expect(rewrites[0]!.url).toBe(webpUrl);
    expect(rewrites[0]!.imageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const image = doc.querySelector("ef-image");
    expect(image?.getAttribute("src")).toBeUndefined();
    expect(image?.getAttribute("file-id")).toBe(rewrites[0]!.imageId);
    expect(image?.getAttribute("asset-id")).toBe(rewrites[0]!.imageId);
  });

  test("rewrites multiple image sources independently", () => {
    const url1 = "https://example.com/a.webp";
    const url2 = "https://cdn.example.com/b.webp";
    const doc = parse(/* HTML */ `
      <ef-timegroup mode="fixed" duration="1s">
        <ef-image src="${url1}"></ef-image>
        <ef-image src="${url2}"></ef-image>
      </ef-timegroup>
    `);

    const rewrites = extractAndRewriteImageSources(doc);

    expect(rewrites).toHaveLength(2);
    expect(rewrites[0]!.url).toBe(url1);
    expect(rewrites[1]!.url).toBe(url2);
    expect(rewrites[0]!.imageId).not.toBe(rewrites[1]!.imageId);

    for (const image of doc.querySelectorAll("ef-image")) {
      expect(image.getAttribute("src")).toBeUndefined();
      expect(image.getAttribute("file-id")).toBeTruthy();
    }
  });

  test("ignores ef-image elements without http src", () => {
    const doc = parse(/* HTML */ `
      <ef-timegroup mode="fixed" duration="1s">
        <ef-image file-id="existing-id"></ef-image>
        <ef-image src="data:image/png;base64,abc"></ef-image>
      </ef-timegroup>
    `);

    const rewrites = extractAndRewriteImageSources(doc);

    expect(rewrites).toHaveLength(0);
  });

  test("each rewrite gets a unique UUID image ID", () => {
    const rewrites1 = extractAndRewriteImageSources(
      parse(/* HTML */ `<ef-image src="https://example.com/img.webp"></ef-image>`),
    );
    const rewrites2 = extractAndRewriteImageSources(
      parse(/* HTML */ `<ef-image src="https://example.com/img.webp"></ef-image>`),
    );

    expect(rewrites1[0]!.imageId).not.toBe(rewrites2[0]!.imageId);
  });
});
