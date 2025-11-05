import debug from "debug";
import { readFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pDebounce from "p-debounce";
import { execPromise } from "../../util/execPromise";
import { pool } from "../pool";

const log = debug("ef:sql");

const __dirname = fileURLToPath(dirname(import.meta.url));
const genPath = path.join(__dirname, "..", "kysely-codegen.ts");

const SKIP_SCHEMA = [
  "'pg_toast'",
  "'pg_catalog'",
  "'information_schema'",
  "'public'",
  "'test'",
  "'test2'",
  "'test3'",
];

const NOTIFY_SCHEMA_CHANGE_SQL = readFileSync(
  path.join(__dirname, "./notify-schema-changes.sql"),
  "utf-8",
);

const main = async () => {
  log("Getting schemas");
  const client = await pool.connect();

  const overrides = JSON.stringify({
    columns: {
      "process_isobmff.source_type": '"url" | "unprocessed_file"',
      "renders.metadata": "Record<string, string>",
      "renders.status": `"created" | "queued" | "rendering" | "complete" | "failed"`,
    },
  });

  const generateTypes = pDebounce(async () => {
    console.log("Generating types");
    const { stdout, stderr } = await execPromise(
      `npx kysely-codegen --dialect postgres --log-level info --out-file ${genPath} --overrides='${overrides}'`,
    );
    console.log("Types generated", { stdout, stderr });
  }, 100);

  await client.query(NOTIFY_SCHEMA_CHANGE_SQL);

  await client.query("LISTEN schema_changes");

  client.on("notification", async (msg) => {
    if (msg.channel === "schema_changes") {
      log("Schema changes detected:", msg);
      const schemas = msg.payload?.split(",") ?? [];
      if (schemas[0] === "") {
        log("No schema name supplied for change detection.");
        return;
      }

      if (schemas.every((s) => SKIP_SCHEMA.includes(`'${s}'`))) {
        log("Skipping schema changes in:", schemas);
        return;
      }
      log("Emitting schema changes detected in:", schemas);
      await generateTypes();
    }
  });

  await generateTypes();
};

main();
