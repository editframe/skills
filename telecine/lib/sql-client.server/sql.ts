import type pg from "pg";
import { pool } from "./pool";
import opentelemetry, { SpanStatusCode } from "@opentelemetry/api";
import { filterTraceData } from "./filterTraceData";

const tracer = opentelemetry.trace.getTracer("sql");

export const sql = async <T extends pg.QueryResultRow>(
  query: string,
  params: unknown[] = [],
) => {
  return await tracer.startActiveSpan("SQL query", async (span) => {
    span.setAttributes({
      query,
      params: JSON.stringify(params),
    });

    try {
      const result = await pool.query<T>(query, params);

      span.setAttributes({
        result: JSON.stringify(result.rows, filterTraceData),
      });

      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "unknown error",
      });
      throw error;
    } finally {
      span.end();
    }
  });
};
