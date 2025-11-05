import { defineConfig } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

export default defineConfig(
  createTsdownConfig({
    entry: ["src/index.ts", "src/node.ts", "src/resources/renders.bundle.ts"],
    platform: "node",
    additionalExports: {
      "./types.json": "./types.json",
    },
  }),
);
