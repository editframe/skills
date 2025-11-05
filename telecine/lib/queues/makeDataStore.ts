import { Redis as Valkey } from "iovalkey";

import { defineZFamCommands } from "./zfam";
import { defineCommands } from "./defineCommands";

let dbIndex = 1;

export const makeDataStore = async () => {
  const valkey = new Valkey({
    host: "valkey",
    port: 6379,
    db: dbIndex,
  });
  // @ts-ignore
  valkey.db = dbIndex;
  dbIndex++;
  defineCommands(valkey);
  defineZFamCommands(valkey);
  await valkey.flushdb();
  return valkey;
};
