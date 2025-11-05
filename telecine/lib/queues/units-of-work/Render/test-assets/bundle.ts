import path, { join } from "node:path";

import react from "@vitejs/plugin-react";
import { build } from "rolldown-vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import tsconfigPathsPlugin from "vite-tsconfig-paths";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const outDir = join(__dirname, "dist");

await build({
  root: path.resolve(__dirname),
  define: {
    RENDER_DATA: JSON.stringify({}),
  },
  build: {
    outDir,
    rollupOptions: {
      input: path.resolve(__dirname, "simpleTest.html"),
    },
  },
  plugins: [
    tsconfigPathsPlugin(),
    react({
      include: "**/*.{jsx,js,tsx,ts}",
      jsxRuntime: "automatic",
    }),
    viteSingleFile(),
  ],
});
