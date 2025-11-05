import path from "node:path";
import { vitePluginEditframe } from "@editframe/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  define: {
    'globalThis.EF_DEV_WORKBENCH': 'true',
  },
  plugins: [
    vitePluginEditframe({
      root: path.join(__dirname, "src"),
      cacheRoot: path.join(__dirname, "src", "assets"),
    }),
    viteSingleFile(),
  ],
});
