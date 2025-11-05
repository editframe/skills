import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rollupTsConfigPaths from "rollup-plugin-tsconfig-paths";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  esbuild: {
    target: "es2022",
    platform: "browser",
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  plugins: [tsconfigPaths()],
  appType: "custom",
  root: __dirname,
  css: {
    postcss: __dirname,
  },
  build: {
    ssr: true,
    target: "es2022",
    rollupOptions: {
      treeshake: "recommended",

      output: {
        // This must be false to preseve async imports that run AFTER the app server
        // has been specified. Otherwise the inlined imports happen at boot time.
        // Running imports late speeds up cold start and leads to better scaling behavior
        // in cloudrun.
        inlineDynamicImports: false,
        preserveModules: false,
      },
      plugins: [rollupTsConfigPaths({})],
    },
    emptyOutDir: true,
    outDir: "./dist",
    lib: {
      entry: "./src/server.ts",
      name: "telecine-transcribe",
      fileName: "server",
      formats: ["es"],
    },
  },
});
