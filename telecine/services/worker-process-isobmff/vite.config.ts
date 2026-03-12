import path from "node:path";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { copyLuaScripts } from "../../lib/util/viteCopyLuaScripts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  oxc: {
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  plugins: [
    copyLuaScripts(
      path.resolve(__dirname, "../../lib/queues/lua"),
      path.resolve(__dirname, "./dist/lua"),
    ),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  appType: "custom",
  css: {
    postcss: ".",
  },
  build: {
    ssr: true,
    target: "es2022",
    rolldownOptions: {
      treeshake: "recommended",
      output: {
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: "server.js",
        chunkFileNames: "server.js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    emptyOutDir: true,
    outDir: "./dist",
    lib: {
      entry: "./server.ts",
      name: "worker-process-isobmff",
      fileName: "server",
      formats: ["es"],
    },
  },
});
