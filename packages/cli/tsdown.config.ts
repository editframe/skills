import { exec } from "node:child_process";
import { promisify } from "node:util";

import { defineConfig } from "tsdown";

import { createTsdownConfig } from "../tsdown.config.base.ts";

const execPromise = promisify(exec);

export default defineConfig(
  createTsdownConfig({
    platform: "node",
    hooks: {
      async onSuccess() {
        process.stderr.write("Marking dist/index.js as executable\n");
        await execPromise("chmod +x dist/index.js");
      },
    },
  }),
);
