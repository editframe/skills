import type { Redis as ValKey } from "iovalkey";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadLuaScript = (name: string) => {
  return readFileSync(join(__dirname, "lua", `${name}.lua`), "utf-8");
};

declare module "iovalkey" {
  type ZFADD<R> = (
    families: string[],
    scope: string,
    suffix: string,
    score: number,
    value: string,
  ) => R;
  type ZFREM<R> = (families: string[], key: string, value: string) => R;
  type ZFPOP<R> = (families: string[], scope: string, suffix: string) => R;

  interface ChainableCommander {
    zfadd: ZFADD<ChainableCommander>;
    zfpop: ZFPOP<ChainableCommander>;
  }
  interface Redis {
    zfadd: ZFADD<Promise<void>>;
    zfpop: ZFPOP<Promise<{ value: string; score: string; key: string } | null>>;
  }
}

export const defineZFamCommands = (vk: ValKey) => {
  vk.defineCommand("zfadd", {
    numberOfKeys: 0,
    lua: loadLuaScript("zfadd"),
  });

  vk.defineCommand("zfpop", {
    numberOfKeys: 0,
    lua: loadLuaScript("zfpop"),
  });
};
