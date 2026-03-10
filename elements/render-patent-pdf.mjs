#!/usr/bin/env node
/**
 * Renders PROVISIONAL_PATENT.md to PDF with mermaid diagrams.
 * Steps:
 *   1. Extract each ```mermaid block, render to SVG via mmdc
 *   2. Embed SVGs as base64 data URIs in <img> tags (avoids file-server path issues in Puppeteer)
 *   3. Run md-to-pdf on the intermediate file
 *   4. Clean up temp files
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = join(__dirname, "PROVISIONAL_PATENT.md");
const OUTPUT = join(__dirname, "PROVISIONAL_PATENT.pdf");
const TMP = join(__dirname, ".patent-render-tmp");

mkdirSync(TMP, { recursive: true });

let markdown = readFileSync(INPUT, "utf8");
let diagramIndex = 0;

// Replace each ```mermaid...``` block with an <img> with an inline base64 SVG data URI
markdown = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (_, diagram) => {
  const name = `diagram-${diagramIndex++}`;
  const inputFile = join(TMP, `${name}.mmd`);
  const outputFile = join(TMP, `${name}.svg`);

  writeFileSync(inputFile, diagram);

  try {
    execSync(`mmdc -i "${inputFile}" -o "${outputFile}" --backgroundColor white 2>&1`, {
      stdio: "pipe",
    });
    console.log(`  rendered ${name}`);
  } catch (err) {
    console.warn(`  WARN: failed to render ${name}:`, err.message);
    return "```\n" + diagram + "```";
  }

  const svgBytes = readFileSync(outputFile);
  const b64 = svgBytes.toString("base64");
  return `<img src="data:image/svg+xml;base64,${b64}" style="max-width:100%;display:block;margin:1.5em auto;" />`;
});

const intermediateFile = join(TMP, "PROVISIONAL_PATENT_rendered.md");
writeFileSync(intermediateFile, markdown);

console.log("\nRunning md-to-pdf...");
execSync(
  `md-to-pdf "${intermediateFile}" --pdf-options '{"format":"Letter","margin":{"top":"1in","bottom":"1in","left":"1in","right":"1in"}}' 2>&1`,
  { stdio: "inherit" },
);

// md-to-pdf writes next to the input file
const generatedPdf = join(TMP, "PROVISIONAL_PATENT_rendered.pdf");
execSync(`cp "${generatedPdf}" "${OUTPUT}"`);

rmSync(TMP, { recursive: true, force: true });

console.log(`\nDone → ${OUTPUT}`);
