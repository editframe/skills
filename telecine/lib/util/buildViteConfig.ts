import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";
import path from "node:path";
import { createRequire } from "node:module";
// @ts-ignore
import { viteAliases } from "./viteAliases";
import { copyLuaScripts } from "./viteCopyLuaScripts.js";
import { buildSearchIndexPlugin } from "./buildSearchIndexPlugin";

const _require = createRequire(import.meta.url);
const elementsVersion: string = _require(
  "@editframe/elements/package.json",
).version;

export const buildViteConfig = () => {
  return defineConfig(({ isSsrBuild }) => {
    return {
      root: ".",
      json: {
        stringify: true,
      },
      ssr: {
        // Don't bundle @editframe packages during SSR - they contain browser-only code
        external: ["@editframe/elements", "@editframe/react"],
        // But allow R3F dependencies to be bundled
        noExternal: [
          "@react-three/offscreen",
          "@react-three/fiber",
          "three",
          "mitt",
        ],
        resolve: {
          conditions: ["import", "module", "browser", "default"],
        },
      },
      optimizeDeps: {
        exclude: ["@editframe/elements"],
        include: [
          "@react-three/offscreen",
          "@react-three/fiber",
          "@react-three/drei",
          "three",
          "mitt",
        ],
      },
      server: {
        allowedHosts: process.env.NODE_ENV === "production" ? undefined : true,
        // HMR server is passed in server.js via hmr.server
        // Client connects via window.location.hostname (main.localhost)
        hmr: process.env.VITE_HMR_HOST
          ? {
              protocol: "ws",
              clientPort: 3000,
              host: process.env.VITE_HMR_HOST, // Client-side connection URL only
            }
          : {
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
        ...(process.env.VITE_HMR_HOST
          ? {
              "import.meta.env.VITE_HMR_HOST": JSON.stringify(
                process.env.VITE_HMR_HOST,
              ),
            }
          : {}),
        ...(process.env.VITE_WEB_HOST
          ? {
              "import.meta.env.VITE_WEB_HOST": JSON.stringify(
                process.env.VITE_WEB_HOST,
              ),
            }
          : {}),
        __EF_TELEMETRY_ENABLED__: JSON.stringify(
          process.env.EF_TELEMETRY_ENABLED === "true",
        ),
        __EF_VERSION__: JSON.stringify(elementsVersion),
      },
      resolve: {
        alias: viteAliases,
        tsconfigPaths: true,
        // Ensure Vite can find dependencies when resolving from elements package source files
        dedupe: [
          "@react-three/fiber",
          "@react-three/offscreen",
          "@react-three/drei",
          "three",
          "mitt",
          "@editframe/elements",
        ],
      },
      oxc: {
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
        copyLuaScripts(
          path.resolve(process.cwd(), "lib/queues/lua"),
          path.resolve(process.cwd(), "services/web/build/server/assets/lua"),
        ),
        // Generate search index after client build completes
        ...(!isSsrBuild ? [buildSearchIndexPlugin()] : []),

        // Plugin to handle CSS imports during SSR only
        // CSS should be processed normally for client builds
        ...(isSsrBuild
          ? [
              {
                name: "ssr-css-handler",
                enforce: "pre",
                resolveId(id) {
                  if (id.endsWith(".css")) {
                    return `\0${id}`;
                  }
                },
                load(id) {
                  if (id.startsWith("\0") && id.endsWith(".css")) {
                    return "export default {}";
                  }
                },
              },
            ]
          : []),
      ],
      build: {
        target: "es2022",
        rolldownOptions: {
          treeshake: "recommended",
          input: isSsrBuild ? "/app/services/web/server/app.ts" : undefined,
          output: !isSsrBuild
            ? {
                codeSplitting: {
                  groups: [
                    {
                      test: /@editframe\/(elements|react)/,
                      name: "editframe-elements",
                    },
                  ],
                },
              }
            : undefined,
        },
      },
    };
  });
};
