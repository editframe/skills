import { randomUUID } from "node:crypto";
import path from "node:path";
import { PassThrough } from "node:stream";
import react from "@vitejs/plugin-react";
import * as tar from "tar";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import tsconfigPathsPlugin from "vite-tsconfig-paths";
import { createReadableStreamFromReadable } from "../utils/createReadableStreamFromReadable.ts";

interface BundlerOptions {
  root: string;
  renderData: any;
}

export const bundleRender = async (options: BundlerOptions) => {
  const outDir = path.join(process.cwd(), "renders", randomUUID());

  await build({
    root: options.root,
    define: {
      RENDER_DATA: JSON.stringify(options.renderData),
    },
    build: {
      outDir,
      rollupOptions: {
        input: path.resolve(options.root, "index.html"),
      },
    },
    plugins: [
      tsconfigPathsPlugin(),
      react({
        include: "**/*.{jsx,js,tsx,ts}",
        jsxRuntime: "automatic",
      }),
      viteSingleFile(),
    ],
  });

  const tarStream = tar.create(
    {
      gzip: true,
      cwd: outDir,
    },
    ["."],
  );

  const passthrough = new PassThrough();
  tarStream.pipe(passthrough);
  const tarReadStream = createReadableStreamFromReadable(passthrough);

  return tarReadStream;
};
