import path from "node:path";
import { defineConfig } from "vite";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  oxc: {
    include: /\.(m?[jt]s|[jt]sx)$/,
    exclude: [],
  },
  resolve: {
    tsconfigPaths: true,
  },
  appType: "custom",
  root: repoRoot,
  build: {
    ssr: true,
    target: "es2022",
    rolldownOptions: {
      external: ["electron"],
      treeshake: "recommended",
      output: {
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: "[name].electron.js",
        chunkFileNames: "[name].electron.js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    emptyOutDir: false,
    outDir: path.resolve(repoRoot, "lib/queues/units-of-work/Render"),
    lib: {
      entry: path.resolve(
        repoRoot,
        "lib/queues/units-of-work/Render/ElectronRPCServer.ts",
      ),
      name: "ElectronRPCServer",
      fileName: "ElectronRPCServer",
      formats: ["es"],
    },
  },
});
