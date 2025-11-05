import { defineConfig } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

export default defineConfig(
  createTsdownConfig({
    platform: "node",
    additionalExports: {
      "./types.json": "./types.json",
    },
  }),
);

