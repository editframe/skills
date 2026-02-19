import { readFileSync } from "node:fs";
import path from "node:path";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { defineConfig, type Plugin } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

// Plugin to handle CSS ?inline imports with Tailwind processing
const inlineCssPlugin = (): Plugin => ({
  name: "inline-css",
  resolveId(source, importer) {
    if (source.endsWith(".css?inline") && importer) {
      const resolved = path.resolve(
        path.dirname(importer),
        source.replace("?inline", ""),
      );
      return { id: `${resolved}?inline`, external: false };
    }
    return null;
  },
  async load(id) {
    if (id.endsWith("?inline")) {
      const filePath = id.replace("?inline", "");
      const css = readFileSync(filePath, "utf-8");

      // Process through Tailwind if it contains @tailwind directives
      if (css.includes("@tailwind")) {
        const _srcDir = path.resolve(path.dirname(filePath));
        const configPath = path.resolve(
          path.dirname(filePath),
          "../../tailwind.config.ts",
        );
        const result = await postcss([
          tailwindcss({ config: configPath }),
          autoprefixer(),
        ]).process(css, { from: filePath });

        return `export default ${JSON.stringify(result.css)}`;
      }

      return `export default ${JSON.stringify(css)}`;
    }
    return null;
  },
});

export default defineConfig(
  createTsdownConfig({
    entry: [
      "src/index.ts",
      "src/node.ts",
      "src/preview/renderTimegroupToVideo.ts",
      "src/preview/renderTimegroupToCanvas.ts",
    ],
    plugins: [inlineCssPlugin()],
    external: [/@editframe\/assets/],
    publint: false, // Disabled because CSS is built after tsdown
    additionalExports: {
      "./styles.css": "./dist/style.css",
      "./types.json": "./types.json",
    },
  }),
);
