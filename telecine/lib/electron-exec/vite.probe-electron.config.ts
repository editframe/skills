import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rollupTsConfigPaths from "rollup-plugin-tsconfig-paths";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  esbuild: {
    target: "es2022",
    platform: "node",
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  plugins: [tsconfigPaths()],
  appType: "custom",
  root: repoRoot,
  build: {
    ssr: true,
    target: "es2022",
    rollupOptions: {
      external: ["electron"],
      treeshake: "recommended",
      output: {
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: "[name].electron.js",
        chunkFileNames: "[name].electron.js",
        assetFileNames: "assets/[name].[ext]",
      },
      plugins: [rollupTsConfigPaths({})],
    },
    emptyOutDir: false,
    outDir: path.resolve(repoRoot, "lib/electron-exec"),
    lib: {
      entry: path.resolve(repoRoot, "lib/electron-exec/probe-electron.ts"),
      name: "probe-electron",
      fileName: "probe-electron",
      formats: ["es"],
    },
  },
});
