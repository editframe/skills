import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";

export const pgInstrumentation = new PgInstrumentation({ enhancedDatabaseReporting: true });
