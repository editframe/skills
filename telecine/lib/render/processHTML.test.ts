import { describe, test, expect } from "vitest";
import { createBundledHTMLDirectory } from "./processHTML";
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
