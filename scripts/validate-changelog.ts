/**
 * validate-changelog — Validate the structure and content of a changelog MDX file
 *
 * Usage: scripts/validate-changelog <path-to-mdx>
 *
 * Exits with code 0 if valid, 1 if invalid (errors written to stderr).
 * Also exports validateMDX(content, version) for programmatic use.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Parsing Helpers ──────────────────────────────────────────────────────────

function parseMDX(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) throw new Error("Missing frontmatter block (expected `---` delimited YAML)");

  const frontmatterStr = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterStr.split("\n").filter(Boolean)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) {
      const key = m[1].trim();
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

function extractComponents(body: string): Array<{
  type: string;
  props: Record<string, unknown>;
  fullMatch: string;
}> {
  const components: Array<{ type: string; props: Record<string, unknown>; fullMatch: string }> = [];
  const TAGS = ["ChangelogIntroCard", "CodeReveal", "TextMoment", "ChangelogOutroCard"];
  const openRE = new RegExp(`<(${TAGS.join("|")})(\\s)`, "g");
  let match: RegExpExecArray | null;

  while ((match = openRE.exec(body)) !== null) {
    const type = match[1];
    // From the position of the tag start, scan forward for the self-closing />
    // skipping over balanced {}, [], and quoted strings.
    const tagStart = match.index;
    let i = tagStart + 1; // skip '<'
    let depth = 0;
    let inStr: string | null = null;
    let end = -1;

    while (i < body.length) {
      const ch = body[i];

      if (inStr) {
        if (ch === inStr && body[i - 1] !== '\\') inStr = null;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      } else if (ch === '/' && body[i + 1] === '>' && depth === 0) {
        end = i + 2;
        break;
      }
      i++;
    }

    if (end === -1) continue;

    const fullMatch = body.slice(tagStart, end);
    // Props string is everything between tag name and />
    const propsStr = fullMatch.slice(1 + type.length, -2);
    const props = parseProps(propsStr);
    components.push({ type, props, fullMatch });
  }

  return components;
}

function parseProps(propStr: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let i = 0;

  while (i < propStr.length) {
    // Skip whitespace
    while (i < propStr.length && /\s/.test(propStr[i])) i++;
    if (i >= propStr.length) break;

    // Read key
    const keyStart = i;
    while (i < propStr.length && /\w/.test(propStr[i])) i++;
    if (i === keyStart) { i++; continue; }
    const key = propStr.slice(keyStart, i);

    // Skip whitespace
    while (i < propStr.length && /\s/.test(propStr[i])) i++;

    if (propStr[i] !== '=') {
      // Boolean prop — skip
      continue;
    }
    i++; // consume '='

    // Skip whitespace
    while (i < propStr.length && /\s/.test(propStr[i])) i++;

    if (i >= propStr.length) break;

    const ch = propStr[i];

    if (ch === '"' || ch === "'") {
      // Quoted string
      const quote = ch;
      i++;
      const start = i;
      while (i < propStr.length && propStr[i] !== quote) i++;
      props[key] = propStr.slice(start, i);
      i++; // consume closing quote
    } else if (ch === '{') {
      // Balanced brace extraction
      const val = extractBalanced(propStr, i, '{', '}');
      i += val.length;
      const inner = val.slice(1, -1).trim();
      // Try numeric
      if (/^-?\d+(\.\d+)?$/.test(inner)) {
        props[key] = Number(inner);
      } else {
        // Normalise JSX object/array syntax to JSON then parse
        try {
          props[key] = JSON.parse(jsxToJson(inner));
        } catch {
          props[key] = inner;
        }
      }
    } else {
      // Bare value up to next whitespace
      const start = i;
      while (i < propStr.length && !/\s/.test(propStr[i])) i++;
      const val = propStr.slice(start, i);
      props[key] = /^-?\d+$/.test(val) ? Number(val) : val;
    }
  }

  return props;
}

function extractBalanced(str: string, start: number, open: string, close: string): string {
  let depth = 0;
  let i = start;
  while (i < str.length) {
    if (str[i] === open) depth++;
    else if (str[i] === close) {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
    i++;
  }
  return str.slice(start);
}

/**
 * Loosely convert JSX object/array literal syntax to JSON-parseable string.
 * Handles: unquoted keys, single-quoted strings, trailing commas.
 */
function jsxToJson(src: string): string {
  return src
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')   // quote unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')            // single → double quotes
    .replace(/,\s*([}\]])/g, '$1');                 // trailing commas
}

// ─── Validation Logic ─────────────────────────────────────────────────────────

export function validateMDX(content: string, version: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let frontmatter: Record<string, string>;
  let body: string;
  try {
    const parsed = parseMDX(content);
    frontmatter = parsed.frontmatter;
    body = parsed.body;
  } catch (e) {
    return { valid: false, errors: [(e as Error).message], warnings: [] };
  }

  const codename = frontmatter.codename;

  // Frontmatter validation
  const required = ["title", "description", "date", "version", "tags", "codename"];
  for (const key of required) {
    if (!frontmatter[key]) errors.push(`Missing required frontmatter field: ${key}`);
  }
  if (frontmatter.version !== version) {
    errors.push(`Frontmatter version "${frontmatter.version}" does not match filename version "${version}"`);
  }

  // Component extraction and validation
  const components = extractComponents(body);
  if (components.length === 0) {
    errors.push(`No ReleaseVideo components found in body`);
  } else {
    const compErrors = validateComponents(components, version, codename, warnings);
    errors.push(...compErrors);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateComponents(
  comps: Array<{ type: string; props: Record<string, unknown> }>,
  version: string,
  codename: string,
  warnings: string[]
): string[] {
  const errors: string[] = [];
  const total = comps.length;

  if (total < 4) errors.push(`Expected at least 4 scenes, got ${total}`);
  if (total > 5) errors.push(`Expected at most 5 scenes, got ${total}`);

  if (comps[0]?.type !== "ChangelogIntroCard") {
    errors.push(`First scene must be ChangelogIntroCard, got ${comps[0]?.type}`);
  }
  if (comps[total - 1]?.type !== "ChangelogOutroCard") {
    errors.push(`Last scene must be ChangelogOutroCard, got ${comps[total - 1]?.type}`);
  }

  const middleTypes = comps.slice(1, total - 1).map((c) => c.type);
  const codeRevealCount = middleTypes.filter((t) => t === "CodeReveal").length;
  if (codeRevealCount > 1) {
    errors.push(`At most one CodeReveal is allowed, got ${codeRevealCount}`);
  }
  for (let i = 1; i < total - 1; i++) {
    const t = comps[i].type;
    if (t !== "CodeReveal" && t !== "TextMoment") {
      errors.push(`Scene ${i + 1} must be CodeReveal or TextMoment, got ${t}`);
    }
  }

  for (let i = 0; i < comps.length; i++) {
    const { type, props } = comps[i];

    const dur = props.durationMs;
    if (typeof dur !== "number" || dur < 2000 || dur > 120000) {
      errors.push(`Scene ${i + 1} (${type}) durationMs must be a number between 2000 and 120000, got ${dur}`);
    }

    if (type === "ChangelogIntroCard") {
      if (props.version !== version) errors.push(`ChangelogIntroCard version must match frontmatter (${version})`);
      if (props.codename !== codename) errors.push(`ChangelogIntroCard codename must match frontmatter (${codename})`);
      if (!props.title || typeof props.title !== "string") {
        errors.push(`ChangelogIntroCard requires a title prop (the release headline, shown in right column)`);
      } else {
        const wordCount = (props.title as string).trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 8) warnings.push(`ChangelogIntroCard title is ${wordCount} words — keep to 8 or fewer for readability`);
      }
      if (props.illustration !== undefined) {
        warnings.push("ChangelogIntroCard: 'illustration' prop is deprecated and ignored");
      }
    }

    if (type === "CodeReveal") {
      const before = Array.isArray(props.before) ? props.before : [];
      const after = Array.isArray(props.after) ? props.after : [];
      if (before.length < 3) errors.push(`CodeReveal scene ${i + 1}: before array needs ≥3 lines (${before.length})`);
      if (after.length < 3) errors.push(`CodeReveal scene ${i + 1}: after array needs ≥3 lines (${after.length})`);
      if (before.length > 10 || after.length > 10) {
        warnings.push(`CodeReveal scene ${i + 1}: code length ${before.length}/${after.length} exceeds 10 lines; consider condensing`);
      }
    }

    if (type === "TextMoment") {
      const headline = props.headline as string | undefined;
      if (!headline || typeof headline !== "string") {
        errors.push(`TextMoment scene ${i + 1}: headline is required and must be a string`);
      } else {
        const wordCount = headline.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 6) warnings.push(`TextMoment scene ${i + 1}: headline exceeds 6 words (${wordCount})`);
      }
      if (props.body !== undefined && typeof props.body !== "string") {
        errors.push(`TextMoment scene ${i + 1}: body must be a string if present`);
      } else if (typeof props.body === "string") {
        const bodyWordCount = props.body.trim().split(/\s+/).filter(Boolean).length;
        if (bodyWordCount > 20) warnings.push(`TextMoment scene ${i + 1}: body exceeds 20 words (${bodyWordCount})`);
      }
      if (props.motif !== undefined) {
        errors.push(`TextMoment scene ${i + 1}: motif prop is no longer supported (remove it)`);
      }
    }

    if (type === "ChangelogOutroCard") {
      if (props.version !== version) errors.push(`ChangelogOutroCard version must match frontmatter (${version})`);
    }
  }

  return errors;
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

function main() {
  const mdxPath = process.argv[2];
  if (!mdxPath) {
    console.error("Usage: scripts/validate-changelog <path-to-mdx>");
    process.exit(1);
  }

  const content = readFileSync(mdxPath, "utf-8");
  const { frontmatter } = parseMDX(content);
  const version = frontmatter.version;

  const result = validateMDX(content, version);

  if (!result.valid) {
    for (const e of result.errors) {
      console.error(e);
    }
    process.exit(1);
  }

  for (const w of result.warnings) {
    console.warn(w);
  }

  const components = extractComponents(content);
  console.error(`✅ Changelog ${version} valid: ${components.length} scenes, CodeReveal ${components.some(c=>c.type==='CodeReveal')?'present':'absent'}`);
}

main();
