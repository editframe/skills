import pg from "pg";
import { poolConfig } from "./poolConfig";

export const pool = new pg.Pool(poolConfig);

// pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => {
//   return new Date(value);
// });

// pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value) => {
//   return new Date(value);
// });
