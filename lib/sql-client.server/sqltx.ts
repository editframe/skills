import type pg from "pg";
import { pool } from "./pool";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { filterTraceData } from "./filterTraceData";

const tracer = opentelemetry.trace.getTracer("sql");

export const sqltx = async <T extends pg.QueryResultRow>(
  query: string,
  params: unknown[] = [],
) => {
  return await tracer.startActiveSpan("SQL transaction", async (span) => {
    span.setAttributes({
      query,
      params: JSON.stringify(params),
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<T>(query, params);
      await client.query("COMMIT");
      span.setAttributes({
        result: JSON.stringify(result.rows, filterTraceData),
      });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "unknown error",
      });
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      span.end();
    }
  });
};
