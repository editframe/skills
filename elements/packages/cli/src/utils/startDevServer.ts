import path from "node:path";
import { vitePluginEditframe as editframe } from "@editframe/vite-plugin";
import tailwindcss from "tailwindcss";
import { createServer, type ViteDevServer } from "vite";

import { withSpinner } from "./withSpinner.js";

export class DevServer {
  static async start(directory: string) {
    return new DevServer(await startDevServer(directory));
  }

  constructor(private devServer: ViteDevServer) {}

  get url() {
    return `http://localhost:${this.devServer.config.server.port}`;
  }
}

const startDevServer = async (directory: string) => {
  return await withSpinner("Starting vite...", async () => {
    const resolvedDirectory = path.resolve(process.cwd(), directory);
    const cacheRoot = path.join(resolvedDirectory, "assets");
    const devServer = await createServer({
      root: resolvedDirectory,
      css: {
        postcss: {
          plugins: [
            tailwindcss({
              content: [
                path.join(resolvedDirectory, "*.{html,css,js,ts,jsx,tsx}"),
                path.join(resolvedDirectory, "**/*.{html,css,js,ts,jsx,tsx}"),
              ],
            }),
          ],
        },
      },
      oxc: {
        include: /\.(m?[jt]s|[jt]sx)$/,
        exclude: [],
      },
      plugins: [
        editframe({
          root: resolvedDirectory,
          cacheRoot,
        }),
      ],
      build: {
        target: "es2022",
        rolldownOptions: {
          treeshake: {
            moduleSideEffects: false,
          },
        },
      },
    });
    await devServer.listen();
    return devServer;
  });
};
