#!/usr/bin/env node
/**
 * Patches rolldown-plugin-dts to fix a crash in TypeScript 5.7+ where
 * visitEachChildOfGetAccessorDeclaration calls startLexicalEnvironment on a
 * context that has no active lexical environment.
 *
 * The stripPrivateFields transformer blindly calls ts.visitEachChild on all
 * nodes. In TS 5.7+, visiting a GetAccessorDeclaration or SetAccessorDeclaration
 * calls visitParameterList -> startLexicalEnvironment, which requires the
 * transformation context to have an active lexical environment — but the
 * afterDeclarations context doesn't set one up.
 *
 * Fix: skip visitEachChild for accessor declarations since they cannot contain
 * PropertySignature nodes with private identifiers (what stripPrivateFields
 * is looking for).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let pluginPath;
try {
  pluginPath = dirname(require.resolve("rolldown-plugin-dts/package.json"));
} catch {
  console.log("rolldown-plugin-dts not found, skipping patch");
  process.exit(0);
}

const MARKER = "ts.isGetAccessorDeclaration(node)";
const ORIGINAL = `\t\treturn ts.visitEachChild(node, visitor, ctx);`;
const PATCHED = `\t\tif (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return node;\n\t\treturn ts.visitEachChild(node, visitor, ctx);`;

const distDir = resolve(pluginPath, "dist");
const files = readdirSync(distDir).filter((f) => f.endsWith(".mjs"));

for (const file of files) {
  const filePath = resolve(distDir, file);
  const content = readFileSync(filePath, "utf-8");

  if (!content.includes(ORIGINAL)) continue;
  if (content.includes(MARKER)) {
    console.log(`rolldown-plugin-dts already patched (${file}), skipping`);
    process.exit(0);
  }

  writeFileSync(filePath, content.replace(ORIGINAL, PATCHED), "utf-8");
  console.log(`Patched rolldown-plugin-dts: ${filePath}`);
  process.exit(0);
}

console.warn(
  "rolldown-plugin-dts patch target not found — plugin may have changed structure",
);
