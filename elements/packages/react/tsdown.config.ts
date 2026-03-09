import { readFileSync } from "node:fs";
import path from "node:path";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { defineConfig, type Plugin } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

// Plugin to handle CSS ?inline imports from @editframe/elements with Tailwind processing
const inlineCssPlugin = (): Plugin => ({
  name: "inline-css",
  resolveId(source, importer) {
    if (source.endsWith(".css?inline") && importer) {
      const resolved = path.resolve(path.dirname(importer), source.replace("?inline", ""));
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
        const srcDir = path.resolve(path.dirname(filePath));
        const result = await postcss([
          tailwindcss({
            content: [path.join(srcDir, "**/*.ts")],
          }),
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
    entry: ["src/index.ts", "src/server.ts", "src/r3f/index.ts"],
    plugins: [inlineCssPlugin()],
    external: [
      /@editframe\/(elements|assets)/,
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
    ],
    additionalExports: {
      "./types.json": "./types.json",
    },
  }),
);
