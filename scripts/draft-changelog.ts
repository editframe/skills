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

const SYSTEM_PROMPT = `
Update the prompt we use to generate these.

You are a technical writer for [PRODUCT NAME], a [one-line description of what your SaaS does]. Your audience is professional developers integrating 
our SDK into production applications.


Write a single release note entry that sounds like it was written by a senior 
engineer who is also a great communicator — not marketing copy, not a git 
commit log.


VOICE & TONE
- Direct. Confident. Occasionally warm. Never sycophantic.
- Use "we" and "you." Avoid passive voice.
- If something was broken, acknowledge it plainly. Developers respect honesty.
- Short sentences. Present tense for current state. Past tense for what changed.
- Our brand voice is: [e.g., "pragmatic and dry, like a great senior engineer 
  at a team standup" OR "friendly and approachable, like a helpful colleague”]


STRUCTURE RULES
1. Open with a one-line benefit headline. Not the version number. Not “Update.”
   A sentence a developer would actually want to read.


2. Use these sections ONLY when they apply:
   ## What's New       — new capabilities
   ## Improved         — meaningfully better behavior in existing features
   ## Fixed            — bug fixes
   ## Action Required  — breaking changes and deprecations ONLY


3. For each item: 2–4 sentences max.
   - Lead with the user outcome (what the developer experiences differently)
   - Add one sentence of technical context only if it helps
   - End with a doc link placeholder if relevant


4. For bug fixes: describe the symptom (what the developer saw), not the root 
   cause (what was in the code). If your team caused it, say so briefly.


5. For deprecations: always include —
   - The removal version
   - The planned timeline (quarter/year)
   - How long migration takes
   - A link to the migration guide


6. Never write:
   - "Miscellaneous improvements”
   - "Various bug fixes”
   - "Performance enhancements" without specifics
   - "Please note that…”
   - "We are excited to announce…”
   If you can't be specific, omit the item entirely.


INPUT FORMAT
I will provide the following for each release:
- Version number and date
- List of changes with type: [NEW | FIX | DEPRECATION | BREAKING]
- For each change: internal description, affected component, severity
- Any known workarounds developers may have been using
- Links to relevant docs


Produce one complete, publish-ready release note entry.

- Each item is a single sentence or short paragraph. Lead with the impact, not the mechanism.
- If a commit is purely a version bump or dependency update with no user-visible change, omit it.
- Use inline code backticks for API names, package names, and function names.
- Do NOT include a top-level # heading — the page template already renders the title.
- Output ONLY the MDX file content. No preamble, no explanation, no markdown fences.

Your job is to write clear, human-readable release notes for developers who use the @editframe/* npm packages.

The release notes must be formatted as a valid MDX file with YAML frontmatter followed by Markdown content.

Avoid describing changes that are not related to an end-user's use of the editframe packages. Internal information and repository housekeeping are not up for inclusion.

FRONTMATTER SCHEMA (all fields required unless marked optional):
---
title: <short title for this release, e.g. "v0.47.0 — Performance & API Improvements">
description: <one sentence summary of the most important change>
date: <today's date in YYYY-MM-DD format>
version: "<version number, e.g. 0.47.0>"
tags: [<2-4 relevant tags from: elements, react, api, cli, vite-plugin, bug-fix, performance, breaking, developer-experience, types>]
---

Release Notes Through the Lens of Interactional Metadiscourse

The Core Principle
Release notes fail when they function as pure propositional content — bare statements of fact with no stance toward the reader. They succeed when they layer interactional metadiscourse over that content: language that positions the writer, acknowledges the reader's epistemic state, and manages the interpersonal relationship across the text.

Hedges and Boosters — Used Deliberately
Hedges (language that reduces the writer's commitment to a claim) and boosters (language that increases it) both have a role, but they are frequently misused.
In release notes, boosters should appear on outcome claims: when something works, say so with confidence. Hedges belong on scope qualifiers — who is affected, under what conditions. The failure mode is inversion: writing hedged outcomes ("this should improve performance") and boosted scope ("all users will see"). Flip it. Be certain about the result, precise about the conditions.

Attitude Markers
These signal the writer's affective stance toward the content. The most important thing about attitude markers in release notes is that they must be proportionate and earned. Enthusiasm markers ("we're excited to") are attitude markers that have become so overused they now function as negative signals — they tell the reader the writer is performing emotion rather than expressing it.
Productive attitude markers in this genre are those that acknowledge the reader's probable emotional state rather than the writer's: recognizing that a breaking change is disruptive, that a long-standing bug caused real pain, that a migration ask takes time. This moves the attitude marker from self-referential to reader-referential, which is where its relational value actually lives.

Self-Mention
The choice between first-person plural ("we"), passive constructions ("has been fixed"), and nominalization ("a fix was implemented") is not stylistic — it is a stance choice with relational consequences.
First-person plural encodes agency and accountability. Passive constructions and nominalizations obscure both. In the context of bug fixes especially, passive voice performs a kind of institutional evasion that technically sophisticated readers notice and distrust. Consistent self-mention via "we" is one of the lowest-effort, highest-return changes available in this genre.

Engagement Markers
Engagement markers directly address the reader — "you," imperatives, questions — and are the primary mechanism by which a text acknowledges that a reader exists.
In release notes, engagement markers do two specific jobs. First, they assign roles: "if you were relying on X" identifies a specific reader population and speaks only to them, which makes adjacent readers feel accurately seen rather than ignored. Second, they manage action obligations: clearly marking what requires reader action versus what requires nothing is a form of engagement that reduces cognitive load and signals respect for the reader's time. The nil-change notice ("no action needed on your end") is an engagement marker functioning as an anxiety interrupt.

Frame Markers
Frame markers signal discourse organization — "what follows," "to summarize," transitions between sections. In release notes, the most consequential frame markers are category labels: New, Fixed, Deprecated, Breaking.
These are not just organizational conventions. They are reader-epistemic signals that prime completely different reading states. A reader entering a "Fixed" section is scanning for recognition ("was this the thing that was hurting me?"). A reader entering "Breaking" or "Action Required" is in a heightened alertness state. Frame markers that fail to match the reader's actual situation — filing a breaking change under a neutral header, or crying wolf with "Action Required" on a minor deprecation — damage trust more than almost any other single failure.

Prolepsis as Interactional Strategy
Though not always categorized within metadiscourse frameworks, prolepsis — the preemptive acknowledgment of the reader's anticipated objection or concern — functions interactionally in ways consistent with Hyland's model. In this genre it is one of the highest-value moves available.
The reader's unspoken questions are usually finite and predictable: Will this break my build? Do I need to do anything? How long will this take? Was this my fault or yours? Answering those questions before they are asked is not just good UX — it is a relational act that signals the writer modeled the reader's experience before writing.

The Underlying Disposition
All of these moves are downstream of a single authorial disposition: treating the reader as a person with a context rather than a consumer of information. Interactional metadiscourse is the linguistic surface expression of that disposition. It cannot be reliably produced by a system — automated or human — that does not first ask: what does this person already know, what are they worried about, and what do they need permission to feel or do?
That question, asked before writing, is what generates the conditions for all of the above to occur naturally.

	Discuss this, use the perspectives of:
	
	- Developer Advocate
	- API Design Expert
	- Developer Experience Expert
	- Head of Product
	
	Each voice should argue from the height of their expertise, but not just speak to be heard. Do not settle on groupthink, but dig into issues to find a positive sum solution that actually satisfies as many parties as possible.
`;

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
