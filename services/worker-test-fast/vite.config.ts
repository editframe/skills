import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rollupTsConfigPaths from "rollup-plugin-tsconfig-paths";
import { copyLuaScripts } from "../../lib/util/viteCopyLuaScripts.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
        inlineDynamicImports: true,
        preserveModules: false,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
      plugins: [rollupTsConfigPaths({})],
    },
    emptyOutDir: true,
    outDir: "./dist",
  },
});

