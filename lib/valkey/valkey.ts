import { Redis as Valkey } from "iovalkey";

import { defineCommands } from "@/queues/defineCommands";
import { defineZFamCommands } from "@/queues/zfam";

const valkeyHost = process.env.VALKEY_HOST || "valkey";
const valkeyPort = Number.parseInt(process.env.VALKEY_PORT ?? "6379", 10);

console.info(`Connecting to valkey at ${valkeyHost}:${valkeyPort}`);

export const valkey = new Valkey({
  host: valkeyHost,
  port: valkeyPort,
});

defineZFamCommands(valkey);
defineCommands(valkey);
