import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripJsoncComments(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === '"') {
      const start = i++;
      while (i < input.length) {
        if (input[i] === "\\") {
          i += 2;
          continue;
        }
        if (input[i++] === '"') break;
      }
      out += input.slice(start, i);
    } else if (input[i] === "/" && input[i + 1] === "*") {
      i += 2;
      while (
        i < input.length - 1 &&
        !(input[i] === "*" && input[i + 1] === "/")
      )
        i++;
      i += 2;
    } else if (input[i] === "/" && input[i + 1] === "/") {
      while (i < input.length && input[i] !== "\n") i++;
    } else {
      out += input[i++];
    }
  }
  return out;
}

/**
 * Derives Vite resolve.alias entries from tsconfig.json paths.
 * tsconfig.json is the single source of truth — all vitest configs read from here.
 *
 * Base package paths (e.g. @editframe/foo) are mapped to their src/ directory.
 * Sub-path exports (e.g. @editframe/foo/bar) are omitted — the directory alias
 * handles them naturally via Vite's prefix replacement.
 * TEST/* is mapped to the test/ directory as the TEST prefix.
 */
export function getAliasesFromTsconfig(): Record<string, string> {
  const raw = stripJsoncComments(
    readFileSync(path.join(__dirname, "tsconfig.json"), "utf-8"),
  );
  const { compilerOptions } = JSON.parse(raw);
  const paths: Record<string, string[]> = compilerOptions?.paths ?? {};
  const aliases: Record<string, string> = {};
  for (const [key, [first]] of Object.entries(paths)) {
    if (key === "TEST/*") {
      aliases["TEST"] = path.resolve(__dirname, first.replace("/*", ""));
    } else if (/^@[\w-]+\/[\w-]+$/.test(key)) {
      const resolved = path.resolve(__dirname, first);
      aliases[key] = resolved.endsWith("/index.ts")
        ? resolved.slice(0, -"/index.ts".length)
        : resolved;
    }
  }
  return aliases;
}
