import debug from "debug";
import type { PoolConfig } from "pg";

const log = debug("ef:poolConfig");

export const poolConfig: PoolConfig = {
  min: Number.parseInt(process.env.POSTGRES_MIN_CONNECTIONS ?? "1", 1),
  max: Number.parseInt(process.env.POSTGRES_MAX_CONNECTIONS ?? "10", 10),
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 3000,
  maxUses: 1000,
  allowExitOnIdle: true,
  password: process.env.POSTGRES_PASSWORD,
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
};

if (process.env.POSTGRES_PORT) {
  poolConfig.port = Number.parseInt(process.env.POSTGRES_PORT, 10);
}

const loggableConfig = structuredClone(poolConfig);
if (typeof loggableConfig.password === "string") {
  loggableConfig.password = loggableConfig.password.replaceAll(/./g, "*");
}

log(loggableConfig);
