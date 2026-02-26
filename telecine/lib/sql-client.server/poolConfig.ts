import debug from "debug";
import type { PoolConfig } from "pg";

const log = debug("ef:poolConfig");

export const poolConfig: PoolConfig = {
  max: Number.parseInt(process.env.POSTGRES_MAX_CONNECTIONS ?? "10", 10),
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 3000,
  maxUses: 1000,
  allowExitOnIdle: true,
  connectionString: process.env.DATABASE_URL,
};

if (!process.env.DATABASE_URL) {
  poolConfig.password = process.env.POSTGRES_PASSWORD;
  poolConfig.user = process.env.POSTGRES_USER;
  poolConfig.host = process.env.POSTGRES_HOST;
  poolConfig.database = process.env.POSTGRES_DB;
  if (process.env.POSTGRES_PORT) {
    poolConfig.port = Number.parseInt(process.env.POSTGRES_PORT, 10);
  }
}

const loggableConfig = structuredClone(poolConfig);
if (typeof loggableConfig.password === "string") {
  loggableConfig.password = loggableConfig.password.replaceAll(/./g, "*");
}

log(loggableConfig);
