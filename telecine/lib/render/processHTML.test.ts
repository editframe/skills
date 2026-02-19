import { describe, test, expect } from "vitest";
import { createBundledHTMLDirectory, injectApiHost } from "./processHTML";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mkTempDir } from "@/util/tempFile";

describe("createBundledHTMLDirectory", () => {
  test("vite build succeeds and output contains render functions", async () => {
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
