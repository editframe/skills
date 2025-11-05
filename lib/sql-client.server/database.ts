import { Kysely, PostgresDialect } from "kysely";

import type { DB } from "./kysely-codegen";
import { pool } from "./pool";

const dialect = new PostgresDialect({
  pool: pool,
});

export const db = new Kysely<DB>({
  dialect,
});
