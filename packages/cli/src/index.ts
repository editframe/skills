#!/usr/bin/env node
import "dotenv/config";
import { Option, program } from "commander";

import { VERSION } from "./VERSION.js";

program
  .name("editframe")
  .addOption(new Option("-t, --token <token>", "API Token").env("EF_TOKEN"))
  .addOption(
    new Option("--ef-host <host>", "Editframe Host")
      .env("EF_HOST")
      .default("https://editframe.dev"),
  )
  .addOption(
    new Option("--ef-render-host <host>", "Editframe Render Host")
      .env("EF_RENDER_HOST")
      .default("https://editframe.dev"),
  )
  .version(VERSION);

import "./commands/auth.js";
import "./commands/sync.js";
import "./commands/render.js";
import "./commands/preview.js";
import "./commands/process.js";
import "./commands/process-file.js";
import "./commands/check.js";
import "./commands/webhook.js";

program.parse(process.argv);
