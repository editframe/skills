import { readFileSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, beforeEach } from "vitest";

import { sql } from "../sql";

const __dirname = fileURLToPath(dirname(import.meta.url));

const TRUNCATE_TEST_DATA_FUNCTION = readFileSync(
  path.join(__dirname, "./truncate-test-data.sql"),
  "utf-8",
);

beforeAll(async () => {
  await sql(TRUNCATE_TEST_DATA_FUNCTION);
});

beforeEach(async () => {
  // TODO: Not sure how to do this in kysely. Leaving as sql for now.
  await sql(/* SQL */ "SELECT truncate_test_data()");
});
