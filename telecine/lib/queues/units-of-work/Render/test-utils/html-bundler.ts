import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { createBundledHTMLDirectory } from "../../../../render/processHTML";
import { executeSpan } from "@/tracing";
// @ts-expect-error viteAliases is a .js file
import { viteAliases } from "@/util/viteAliases";
import { envString } from "@/util/env";

const _execFileAsync = promisify(execFile);

const execFileAsync = (
  file: string,
  args: readonly string[] | null | undefined,
  options: { cwd: string },
) => {
  return executeSpan("execFileAsync", async () => {
    return _execFileAsync(file, args, options);
  });
};

const writeIntoDirectory = async (
  tempDir: string,
  contents: Record<string, string>,
) => {
  return executeSpan("writeIntoDirectory", async (span) => {
    span.setAttributes({
      tempDir,
    });
    const writes = [];
    for (const [filename, content] of Object.entries(contents)) {
      writes.push(writeFile(path.join(tempDir, filename), content));
    }
    await Promise.all(writes);
    return tempDir;
  });
};

export interface TestBundleInfo {
  bundleDir: string;
  indexPath: string;
  templateHash: string;
}

const WEB_HOST = envString("WEB_HOST", "http://localhost:3000");

/**
 * Get test render directory path when sharing bundles across multiple tests.
 * Creates a .test.renders directory next to the test file for artifact browsing.
 */
export const getTestRenderDir = (
  testFilePath: string,
  testTitle: string,
  templateHash: string,
): string => {
  const titleSlug = testTitle.toLowerCase().replace(/\s+/g, "-");
  // Convert file:// URL to path if needed
  const normalizedPath = testFilePath.startsWith("file://")
    ? testFilePath.slice(7)
    : testFilePath;
  const testDir = path.dirname(normalizedPath);
  const testFileName = path.basename(normalizedPath);
  // Replace .test.ts or .ts with .test.renders
  const rendersDir = testFileName.replace(/\.test\.ts$|\.ts$/, ".test.renders");
  return path.join(testDir, rendersDir, `${titleSlug}-${templateHash.slice(0, 8)}`);
};

/**
 * Bundle HTML template into a directory structure
 */
export const bundleTestTemplate = async (
  html: string,
  testFilePath?: string,
  testTitle?: string,
  precomputedHash?: string,
): Promise<TestBundleInfo> => {
  return executeSpan("bundleTestTemplate", async () => {
    // Use pre-computed hash if provided (for caching optimization)
    const templateHash = precomputedHash ?? createHash("sha256")
      .update(html)
      .digest("hex")
      .substring(0, 16);

    let testRenderDir: string;
    if (testFilePath && testTitle) {
      // Write to .test.renders directory next to test file
      testRenderDir = getTestRenderDir(testFilePath, testTitle, templateHash);
    } else {
      // Fallback to temp directory
      const titleSlug = testTitle
        ? `${testTitle.toLowerCase().replace(/\s+/g, "-")}-`
        : "";
      testRenderDir = path.join(
        process.cwd(),
        "temp",
        `test-render-${titleSlug}${templateHash}`,
      );
    }

    const bundleDir = path.join(testRenderDir, "bundle");
    const indexPath = path.join(bundleDir, "dist", "index.html");

    await mkdir(bundleDir, { recursive: true });
    await createBundledHTMLDirectory(bundleDir, html);

    return {
      bundleDir,
      indexPath,
      templateHash,
    };
  });
};

/**
 * Bundle HTML template with additional script files that can be imported
 */
export const bundleTestTemplateWithScripts = async (
  html: string,
  scriptFiles: Record<string, string>,
  testTitle?: string,
): Promise<TestBundleInfo> => {
  return executeSpan("bundleTestTemplateWithScripts", async () => {
    const templateHash = createHash("sha256")
      .update(html)
      .digest("hex")
      .substring(0, 16);
    const titleSlug = testTitle
      ? `${testTitle.toLowerCase().replace(/\s+/g, "-")}-`
      : "";
    const testRenderDir = path.join(
      process.cwd(),
      "temp",
      `test-render-${titleSlug}${templateHash}`,
    );
    const bundleDir = path.join(testRenderDir, "bundle");
    const indexPath = path.join(bundleDir, "dist", "index.html");

    await mkdir(bundleDir, { recursive: true });

    const scriptImports = Object.keys(scriptFiles)
      .map((filename) => `import "./${filename}";`)
      .join("\n");

    await writeIntoDirectory(bundleDir, {
      "index.ts": /* TS */ `
          import "@editframe/elements";
          import "@editframe/elements/styles.css";
          ${scriptImports}
        `,
      "index.html": /* HTML */ `
          <!DOCTYPE html>
          <html>
          <head>
            <script type="module" src="./index.ts"></script>
            <link rel="stylesheet" href="./styles.css">
          </head>
          <body>
            <ef-configuration api-host="${WEB_HOST}">
              ${html}
            </ef-configuration>
          </body>
          </html>
        `,
      "styles.css": /* CSS */ `
          @tailwind base;
          @tailwind components;
          @tailwind utilities;
        `,
      "package.json": "{}",
      "vite.config.js": /* JS */ `
          import { viteSingleFile } from "vite-plugin-singlefile";

          export default {
            plugins: [viteSingleFile()],
            resolve: {
              alias: ${JSON.stringify(viteAliases)},
            }
          };
        `,
      "postcss.config.cjs": /* JS */ `
          module.exports = {
            plugins: {
              tailwindcss: {},
            },
          };
        `,
      "tailwind.config.js": /* JS */ `
          module.exports = {
            content: [
              "./index.html",${process.env.NODE_ENV === "production" ? "" : `"/app/lib/packages/packages/elements/src/**/*.ts"`}
            ],
            theme: {
              extend: {},
            },
            plugins: [],
          };
        `,
      ...scriptFiles,
    });

    const { stdout, stderr } = await execFileAsync(
      "node",
      [
        path.join(
          process.cwd(),
          "node_modules",
          "rolldown-vite",
          "bin",
          "vite.js",
        ),
        "build",
      ],
      {
        cwd: bundleDir,
      },
    );

    console.log(stdout);
    console.log(stderr);

    return {
      bundleDir,
      indexPath,
      templateHash,
    };
  });
};
