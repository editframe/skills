import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";
import path from "node:path";

import tsconfigPaths from "vite-tsconfig-paths";
// @ts-ignore
import { viteAliases } from "./viteAliases";
import { copyLuaScripts } from "./viteCopyLuaScripts.js";

export const buildViteConfig = () => {
  return defineConfig(({ isSsrBuild }) => {
    return {
      root: ".",
      json: {
        stringify: true,
      },
      optimizeDeps: {
        exclude: ["@editframe/elements"],
      },
      server: {
        allowedHosts: process.env.NODE_ENV === "production" ? undefined : true,
        watch: {
          ignored: [
            "**/playwright-report/**/*",
            "/app/renders/**/*",
            "**/data/**/*",
            "**/test-snapshots/**/*",
            "**/temp/**",
          ],
        },
      },
      resolve: { alias: viteAliases },
      esbuild: {
        target: "es2022",
        include: /\.(m?[jt]s|[jt]sx)$/,
        exclude: [],
      },
      plugins: [
        mdx({
          remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
          rehypePlugins: [],
          providerImportSource: "@mdx-js/react",
          jsx: true,
          jsxRuntime: "automatic",
          jsxImportSource: "react",
        }),
        reactRouter(),
        tsconfigPaths(),
        copyLuaScripts(
          path.resolve(process.cwd(), 'lib/queues/lua'),
          path.resolve(process.cwd(), 'services/web/build/server/assets/lua')
        ),
      ],
      build: {
        target: "es2022",
        rollupOptions: {
          treeshake: "recommended",
          input: isSsrBuild ? "/app/services/web/server/app.ts" : undefined,
        },
      },
    };
  });
};
