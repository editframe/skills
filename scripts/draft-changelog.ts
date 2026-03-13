/**
 * draft-changelog — Generate a release notes MDX file using an LLM
 *
 * Usage: scripts/draft-changelog <new-version>
 *
 * Reads git commit history since the last version tag, sends it to the
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

function git(cmd: string): string {
  return execSync(cmd, { cwd: ROOT_DIR, encoding: "utf-8" }).trim();
}

function getPreviousTag(): string | null {
  try {
    return git("git describe --tags --abbrev=0");
  } catch {
    return null;
  }
}

function getCommits(fromTag: string | null): string {
  const range = fromTag ? `${fromTag}..HEAD` : "HEAD";
  const log = git(
    `git log ${range} --pretty=format:"--- COMMIT ---%n%s%n%b" --no-merges`,
  );
  return log.trim();
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a technical writer for Editframe, a programmatic video rendering SDK used by developers.
Your job is to write clear, human-readable release notes for developers who use the @editframe/* npm packages.

The release notes must be formatted as a valid MDX file with YAML frontmatter followed by Markdown content.

FRONTMATTER SCHEMA (all fields required unless marked optional):
---
title: <short title for this release, e.g. "v0.47.0 — Performance & API Improvements">
description: <one sentence summary of the most important change>
date: <today's date in YYYY-MM-DD format>
version: "<version number, e.g. 0.47.0>"
tags: [<2-4 relevant tags from: elements, react, api, cli, vite-plugin, bug-fix, performance, breaking, developer-experience, types>]
---

CONTENT RULES:
- Write in a direct, developer-focused tone. No marketing fluff.
- Group changes under these headings (omit a heading if there are no entries for it):
  ## Breaking Changes
  ## New Features
  ## Improvements
  ## Bug Fixes
  ## Under the Hood
- Each item is a single sentence or short paragraph. Lead with the impact, not the mechanism.
- If a commit is purely a version bump or dependency update with no user-visible change, omit it.
- Use inline code backticks for API names, package names, and function names.
- Do NOT include a top-level # heading — the page template already renders the title.
- Output ONLY the MDX file content. No preamble, no explanation, no markdown fences.`;

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
  const previousTag = getPreviousTag();
  process.stderr.write(
    `Drafting changelog for v${newVersion} (previous tag: ${previousTag ?? "none"})\n`,
  );

  const commits = getCommits(previousTag);
  const commitCount = commits ? commits.split("--- COMMIT ---").filter(Boolean).length : 0;
  process.stderr.write(`Found ${commitCount} commits\n`);

  process.stderr.write("Calling Anthropic API...\n");
  const mdx = await draftChangelog(newVersion, commits);

  const outputPath = writeOutput(newVersion, mdx);
  process.stdout.write(outputPath + "\n");
  process.stderr.write(`Changelog draft written to ${outputPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
