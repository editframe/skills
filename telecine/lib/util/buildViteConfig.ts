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
      ssr: {
        noExternal: ["@editframe/elements"],
        resolve: {
          conditions: ["import", "module", "browser", "default"],
        },
      },
      optimizeDeps: {
        exclude: ["@editframe/elements"],
      },
      server: {
        allowedHosts: process.env.NODE_ENV === "production" ? undefined : true,
        // HMR server is passed in server.js via hmr.server
        // Client connects via window.location.hostname (main.localhost)
        hmr: process.env.VITE_HMR_HOST ? {
          protocol: "ws",
          clientPort: 3000,
          host: process.env.VITE_HMR_HOST, // Client-side connection URL only
        } : {
          protocol: "ws",
          clientPort: 3000,
        },
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
      // Inject environment variables for client-side
      define: {
        ...(process.env.VITE_HMR_HOST ? {
          'import.meta.env.VITE_HMR_HOST': JSON.stringify(process.env.VITE_HMR_HOST),
        } : {}),
        ...(process.env.VITE_WEB_HOST ? {
          'import.meta.env.VITE_WEB_HOST': JSON.stringify(process.env.VITE_WEB_HOST),
        } : {}),
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
        // Plugin to handle CSS imports during SSR only
        // CSS should be processed normally for client builds
        ...(isSsrBuild ? [{
          name: 'ssr-css-handler',
          enforce: 'pre',
          resolveId(id) {
            if (id.endsWith('.css')) {
              return { id, external: true };
            }
          },
          load(id) {
            if (id.endsWith('.css')) {
              return 'export default {}';
            }
          },
        }] : []),
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
