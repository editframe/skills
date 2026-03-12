import path from "node:path";
import { defineConfig } from "vite";
import { copyLuaScripts } from "../../lib/util/viteCopyLuaScripts.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
  root: __dirname,
  css: {
    postcss: __dirname,
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
      name: "worker-ingest-image",
      fileName: "server",
      formats: ["es"],
    },
  },
});
