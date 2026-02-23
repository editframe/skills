import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rollupTsConfigPaths from "rollup-plugin-tsconfig-paths";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  esbuild: {
    target: "es2022",
    platform: "node",
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  plugins: [tsconfigPaths()],
  appType: "custom",
  root: __dirname,
  build: {
    ssr: true,
    target: "es2022",
    rollupOptions: {
      treeshake: "recommended",
      output: {
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: "main.js",
        chunkFileNames: "main.js",
        assetFileNames: "assets/[name].[ext]",
      },
      plugins: [rollupTsConfigPaths({})],
    },
    emptyOutDir: true,
    outDir: "./dist",
    lib: {
      entry: "./main.ts",
      name: "gpu-probe",
      fileName: "main",
      formats: ["es"],
    },
  },
});
