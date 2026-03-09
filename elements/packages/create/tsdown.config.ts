import { exec } from "node:child_process";
import { promisify } from "node:util";

import { defineConfig } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

const execPromise = promisify(exec);

export default defineConfig(
  createTsdownConfig({
    platform: "node",
    copy: [
      {
        from: "src/templates",
        to: "dist/templates",
      },
      {
        from: "src/skills",
        to: "dist/skills",
      },
    ],
    hooks: {
      async onSuccess() {
        await execPromise("chmod +x dist/index.js");
        console.error("chmod +x dist/index.js");
        console.error("Copied templates into dist");
      },
    },
  }),
);
