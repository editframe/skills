import { resolve as resolveTs } from "ts-node/esm";
import * as tsConfigPaths from "tsconfig-paths";
import { pathToFileURL } from "node:url";

const { absoluteBaseUrl, paths } = tsConfigPaths.loadConfig();
const matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);

export function resolve(specifier, ctx, defaultResolve) {
  const match = matchPath(specifier);
  try {
    return match
      ? resolveTs(pathToFileURL(`${match}`).href, ctx, defaultResolve)
      : resolveTs(specifier, ctx, defaultResolve);
  } catch (e) {
    console.log("resolve error", e);
    throw e;
  }
}

export { load, transformSource } from "ts-node/esm";
