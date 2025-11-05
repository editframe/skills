import type pg from "pg";
import { pool } from "./pool";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";

const tracer = opentelemetry.trace.getTracer("sql");

export const sqltxCallback = async (
  callback: (client: pg.PoolClient) => Promise<void>,
) => {
  return await tracer.startActiveSpan(
    "SQL transaction callback",
    async (span) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await callback(client);
        await client.query("COMMIT");
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "unknown error",
        });
        await client.query("ROLLBACK");
        throw error;
      } finally {
        span.end();
        client.release();
      }
    },
  );
};
