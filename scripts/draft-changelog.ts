/**
 * draft-changelog — Generate a release notes MDX file using an LLM
 *
 * Usage: scripts/draft-changelog <new-version>
 *
 * Reads git commit history since the last version bump, sends it to the
 * Anthropic API, and writes a draft MDX file to:
 *   telecine/services/web/app/content/changelogs/<version>.mdx
 *
 * Requires ANTHROPIC_API_KEY to be set in the environment.
 * Hard-fails if the key is missing or the API call fails.
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// ─── Args & env validation ────────────────────────────────────────────────────

const newVersion = process.argv[2];
if (!newVersion) {
  process.stderr.write("Usage: scripts/draft-changelog <new-version>\n");
  process.stderr.write("Example: scripts/draft-changelog 0.47.0\n");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  process.stderr.write(
    "Error: ANTHROPIC_API_KEY is not set.\n" +
      "Set it in your environment before running prepare-release.\n",
  );
  process.exit(1);
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

function git(cmd: string, cwd = ROOT_DIR): string {
  return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
}

function getElementsDir(): string | null {
  const candidate = join(ROOT_DIR, "elements");
  try {
    execSync(`git -C "${candidate}" rev-parse --git-dir`, { stdio: "ignore" });
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Find the commit SHA of the previous version bump in a repo.
 *
 * Searches the log for "Bump version to v<X.Y.Z>" commits, returning the SHA
 * of the bump that precedes the target version. This is more reliable than
 * using tags, which may point to unrelated history in sibling repos.
 *
 * Returns null if no prior bump is found (first-ever release).
 */
function getPreviousBumpSha(repoDir: string, targetVersion: string): string | null {
  try {
    // Get all version bump commits in chronological order (oldest first)
    const log = git(
      `git log --oneline --no-merges --grep="^Bump version to v"`,
      repoDir,
    );
    if (!log) return null;

    const lines = log.split("\n").filter(Boolean);
    // lines are newest-first; reverse for ascending order
    lines.reverse();

    const targetLine = lines.findIndex((l) =>
      l.includes(`Bump version to v${targetVersion}`),
    );

    if (targetLine === -1) {
      // Target hasn't been bumped yet (pre-release). Use the most recent bump.
      const last = lines[lines.length - 1];
      return last ? last.split(" ")[0] ?? null : null;
    }

    if (targetLine === 0) return null; // no prior bump
    const prev = lines[targetLine - 1];
    return prev ? prev.split(" ")[0] ?? null : null;
  } catch {
    return null;
  }
}

function getCommits(repoDir: string, fromSha: string | null, label: string): string {
  const range = fromSha ? `${fromSha}..HEAD` : "HEAD";
  try {
    const log = git(
      `git log ${range} --pretty=format:"--- COMMIT [${label}] ---%n%s%n%b" --no-merges`,
      repoDir,
    );
    return log.trim();
  } catch {
    return "";
  }
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a technical writer for Editframe, a programmatic video rendering SDK for developers. Your audience is professional developers integrating @editframe/* npm packages into production applications.

Write release notes that sound like they were written by a senior engineer who is also a great communicator — not marketing copy, not a raw commit log.

VOICE & TONE
- Direct. Confident. Occasionally warm. Never sycophantic.
- Use "we" and "you." Avoid passive voice.
- If something was broken, acknowledge it plainly. Developers respect honesty.
- Short sentences. Present tense for current state. Past tense for what changed.
- Pragmatic and dry, like a great senior engineer at a team standup.

STRUCTURE
1. Open with a one-line benefit headline — not the version number, not "Update." A sentence a developer would actually want to read.

2. Use these sections ONLY when they apply:
   ## What's New       — new capabilities
   ## Improved         — meaningfully better behavior in existing features
   ## Fixed            — bug fixes (describe the symptom the developer saw, not the internal root cause)
   ## Action Required  — breaking changes and deprecations ONLY

3. Each item: 2–4 sentences max. Lead with the user outcome. Add one sentence of technical context only if it helps.

4. For breaking changes: always include what changed, migration path, and affected version.

5. Never write:
   - "Miscellaneous improvements" or "Various bug fixes"
   - "Performance enhancements" without specifics
   - "Please note that…" or "We are excited to announce…"
   If you can't be specific, omit the item entirely.

6. Omit internal housekeeping: version bump commits, snapshot updates, CI fixes, test-only changes, formatting commits, and anything that has no effect on a developer using the packages.

FRONTMATTER SCHEMA (all fields required):
---
title: <one-line benefit headline, e.g. "Local dev apiHost now resolves automatically">
description: <one sentence summary of the most important change>
date: "<today's date in YYYY-MM-DD format — must be quoted, e.g. \"2026-03-13\">"
version: "<version number, e.g. 0.46.1>"
tags: [<2-4 tags from: elements, react, api, cli, vite-plugin, bug-fix, performance, breaking, developer-experience, types>]
---

Output ONLY the MDX file content. No preamble, no explanation, no markdown fences.`;

async function draftChangelog(version: string, commits: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const userPrompt = `Write release notes for @editframe/* packages version ${version} (released ${today}).

Here are the commits since the last release:

${commits || "(no commits found — this may be the first release)"}

Generate the complete MDX file now.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return text.trim();
}

// ─── Output ───────────────────────────────────────────────────────────────────

function writeOutput(version: string, mdx: string): string {
  const outputDir = join(
    ROOT_DIR,
    "telecine",
    "services",
    "web",
    "app",
    "content",
    "changelogs",
  );
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${version}.mdx`);
  writeFileSync(outputPath, mdx + "\n");
  return outputPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const elementsDir = getElementsDir();

  // Elements repo: find the previous version bump commit as the range start.
  // Tags are unreliable across sibling repos — the bump commit is the canonical anchor.
  const elementsPrevSha = elementsDir ? getPreviousBumpSha(elementsDir, newVersion) : null;
  const elementsCommits = elementsDir
    ? getCommits(elementsDir, elementsPrevSha, "elements")
    : "";

  // Monorepo: same approach
  const monoreoPrevSha = getPreviousBumpSha(ROOT_DIR, newVersion);
  const monoRepoCommits = getCommits(ROOT_DIR, monoreoPrevSha, "monorepo");

  const elementCount = elementsCommits
    ? elementsCommits.split("--- COMMIT").filter(Boolean).length
    : 0;
  const monoCount = monoRepoCommits
    ? monoRepoCommits.split("--- COMMIT").filter(Boolean).length
    : 0;

  process.stderr.write(
    `Drafting changelog for v${newVersion}\n` +
      `  elements: ${elementCount} commits from ${elementsPrevSha?.slice(0, 8) ?? "beginning"}\n` +
      `  monorepo: ${monoCount} commits from ${monoreoPrevSha?.slice(0, 8) ?? "beginning"}\n`,
  );

  const allCommits = [elementsCommits, monoRepoCommits].filter(Boolean).join("\n\n");

  process.stderr.write("Calling Anthropic API...\n");
  const mdx = await draftChangelog(newVersion, allCommits);

  const outputPath = writeOutput(newVersion, mdx);
  process.stdout.write(outputPath + "\n");
  process.stderr.write(`Changelog draft written to ${outputPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
