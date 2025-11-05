import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rollupTsConfigPaths from "rollup-plugin-tsconfig-paths";
import { fileURLToPath } from "node:url";
import { copyLuaScripts } from "../../lib/util/viteCopyLuaScripts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    target: "es2022",
    platform: "node",
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  plugins: [
    tsconfigPaths(),
    copyLuaScripts(
      path.resolve(__dirname, '../../lib/queues/lua'),
      path.resolve(__dirname, './dist/lua')
    ),
  ],
  appType: "custom",
  css: {
    postcss: ".",
  },
  build: {
    ssr: true,
    target: "es2022",
    rollupOptions: {
      treeshake: "recommended",

      output: {
        // IMPLEMENTATION GUIDELINES: Create single bundle file for easier deployment
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: 'server.js',
        chunkFileNames: 'server.js',
        assetFileNames: 'assets/[name].[ext]'
      },
      plugins: [rollupTsConfigPaths({})],
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
