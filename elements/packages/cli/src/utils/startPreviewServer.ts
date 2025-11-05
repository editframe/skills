import path from "node:path";
import { vitePluginEditframe as editframe } from "@editframe/vite-plugin";
import { createServer, type ViteDevServer } from "vite";

import { withSpinner } from "./withSpinner.js";

export class PreviewServer {
  static async start(directory: string) {
    return new PreviewServer(await startPreviewServer(directory));
  }

  constructor(private previewServer: ViteDevServer) {}

  get url() {
    return `http://localhost:${this.previewServer.config.server.port}`;
  }
}

const startPreviewServer = async (directory: string) => {
  return await withSpinner("Starting vite...", async () => {
    const resolvedDirectory = path.resolve(process.cwd(), directory);
    const cacheRoot = path.join(resolvedDirectory, "assets");
    const devServer = await createServer({
      server: {
        watch: null,
      },
      root: resolvedDirectory,
      plugins: [
        editframe({
          root: resolvedDirectory,
          cacheRoot,
        }),
      ],
    });
    await devServer.listen();
    return devServer;
  });
};
