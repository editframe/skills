/**
 * This file contains globals that are pre-defined when running scripts/console in dev mode.
 */

import * as sqlLib from "../sql-client.server";
import * as valkeyLib from "../valkey/valkey";
import { sql } from "kysely";

// @ts-expect-error we're just shucking things right onto the global
global.sql = async function sql(query: string, values?: []) {
  const result = sqlLib.sql(query, values);
  console.table((await result).rows);
  return (await result).rows;
};

// @ts-expect-error we're just shucking things right onto the global
global.ksql = sql;

// @ts-expect-error we're just shucking things right onto the global
global.valkey = valkeyLib.valkey;

// @ts-expect-error we're just shucking things right onto the global
global.db = sqlLib.db;

// @ts-expect-error we're just shucking things right onto the global
global.values = sqlLib.values;
