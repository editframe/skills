#!/usr/bin/env node
/**
 * Create a render with given HTML.
 * The Hasura event trigger on video2.renders INSERT will automatically
 * kick off the ProcessHTML → RenderInitializer → Fragment → Finalizer pipeline.
 *
 * Usage: ./scripts/run tsx scripts/create-render.ts --from <existing-render-id> --html '<html>'
 *        ./scripts/run tsx scripts/create-render.ts --from <existing-render-id> --html-file <path>
 *
 * The --from flag copies org_id/creator_id from an existing render.
 */

import { db } from "@/sql-client.server";
import * as fs from "node:fs";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

const fromRenderId = getArg("from");
const htmlFile = getArg("html-file");
const htmlInline = getArg("html");

if (!fromRenderId) {
  console.error(
    "Usage: tsx scripts/create-render.ts --from <existing-render-id> [--html '<html>'] [--html-file <path>]",
  );
  process.exit(1);
}

async function main() {
  // Get org_id and creator_id from existing render
  const source = await db
    .selectFrom("video2.renders")
    .where("id", "=", fromRenderId!)
    .select(["org_id", "creator_id"])
    .executeTakeFirst();

  if (!source) {
    console.error("Source render not found:", fromRenderId);
    process.exit(1);
  }

  // Read HTML
  let html: string;
  if (htmlInline) {
    html = htmlInline;
  } else if (htmlFile) {
    html = fs.readFileSync(htmlFile, "utf-8");
  } else {
    console.error("Provide HTML via --html '<content>' or --html-file <path>");
    process.exit(1);
  }

  console.log("Creating render...");
  console.log("  org_id:", source.org_id);
  console.log("  creator_id:", source.creator_id);
  console.log("  html length:", html.length);

  const outputConfig = {
    container: "mp4" as const,
    video: { codec: "h264" },
    audio: { codec: "aac" },
  };

  const render = await db
    .insertInto("video2.renders")
    .values({
      org_id: source.org_id,
      creator_id: source.creator_id,
      api_key_id: null,
      html,
      status: "created",
      strategy: "v1",
      fps: 30,
      output_config: outputConfig,
      metadata: {},
      work_slice_ms: 4000,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  console.log("\nRender created:", render.id);
  console.log("Hasura will trigger ProcessHTML → RenderInitializer automatically.");
  console.log("Debug with: ./scripts/debug-render", render.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
