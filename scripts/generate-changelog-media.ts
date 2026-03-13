/**
 * generate-changelog-media — Generate voiceover + captions for a changelog entry
 *
 * Usage: scripts/generate-changelog-media <version>
 *   e.g: scripts/generate-changelog-media 0.46.1
 *
 * What it does:
 *   1. Reads telecine/services/web/app/content/changelogs/<version>.mdx
 *   2. Uses Claude to draft a conversational VO script from the prose sections
 *   3. Runs generate-changelog-voiceover.py (Qwen TTS + Whisper)
 *   4. Uploads the MP3 to gs://editframe-assets-7ac794b/changelog/
 *   5. Patches frontmatter: adds audioSrc
 *   6. Writes captions data file alongside the MDX
 *
 * Requires:
 *   - ANTHROPIC_API_KEY
 *   - gcloud CLI authenticated (for gsutil cp)
 *   - Python + qwen_tts + whisper installed (same env as hero voiceover)
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TELECINE_DIR = join(ROOT_DIR, "telecine");
const CHANGELOGS_DIR = join(TELECINE_DIR, "services", "web", "app", "content", "changelogs");
const PYTHON_SCRIPT = join(TELECINE_DIR, "services", "web", "scripts", "generate-changelog-voiceover.py");
const GCS_BUCKET = "gs://editframe-assets-7ac794b/changelog";
const CDN_BASE = "https://assets.editframe.com/changelog";

// ─── Args & env ───────────────────────────────────────────────────────────────

const version = process.argv[2];
if (!version) {
  process.stderr.write("Usage: scripts/generate-changelog-media <version>\n");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  process.stderr.write("Error: ANTHROPIC_API_KEY is not set.\n");
  process.exit(1);
}

const mdxPath = join(CHANGELOGS_DIR, `${version}.mdx`);
let mdxContent: string;
try {
  mdxContent = readFileSync(mdxPath, "utf-8");
} catch {
  process.stderr.write(`Error: ${mdxPath} not found.\n`);
  process.exit(1);
}

// ─── Extract prose (non-JSX sections) ────────────────────────────────────────

function extractProse(mdx: string): string {
  // Strip frontmatter
  const body = mdx.replace(/^---[\s\S]*?---\n/, "");
  // Remove JSX blocks (anything inside <ReleaseVideo>...</ReleaseVideo>)
  const withoutJsx = body.replace(/<ReleaseVideo[\s\S]*?<\/ReleaseVideo>/g, "");
  // Remove markdown headings markers but keep text
  return withoutJsx
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

// ─── Claude: draft VO script ──────────────────────────────────────────────────

const anthropic = new Anthropic();

interface VOSegment {
  key: string;
  text: string;
  last_word: string;
  discard?: boolean;
}

interface VOScript {
  version: string;
  instruct: string;
  segments: VOSegment[];
}

async function draftVOScript(version: string, prose: string): Promise<VOScript> {
  const system = `You are writing a voiceover script for a developer changelog video. The script will be read aloud by a text-to-speech voice.

WRITING FRAMEWORK — Interactional Metadiscourse
The script must do more than restate facts. It must position the writer, acknowledge the reader's context, and manage the relationship. Apply these moves:

HEDGES AND BOOSTERS — use asymmetrically:
- Be certain (boost) about outcomes: "This fixes the bug." Not "This should fix the bug."
- Be precise (hedge) about scope and conditions: "If you're running a local dev server..." Not "All users will see..."
- The failure mode is the inverse: hedged outcomes + boosted scope. Avoid it.

ATTITUDE MARKERS — reader-referential, not self-referential:
- Never: "We're excited to announce..." (performance of emotion, not expression of it)
- Do: acknowledge the reader's probable emotional state — relief at a fix, effort required for a migration
- Earned enthusiasm is fine; proportionality is required

SELF-MENTION — use "we" consistently:
- "We fixed..." not "This has been fixed..." or "A fix was implemented..."
- First-person plural encodes agency and accountability. Passive voice performs institutional evasion.

ENGAGEMENT MARKERS — speak directly to the reader:
- Use "you" and direct address to assign roles: "If you were relying on X..."
- Nil-change notices are engagement markers: "No action needed on your end."
- Clearly distinguish what requires reader action from what requires nothing

PROLEPSIS — preempt the reader's questions:
- The predictable unasked questions: Will this break my build? Do I need to do anything? How long will this take?
- Answer them before they arise.

FORMAT CONSTRAINTS:
- Total runtime: 20–35 seconds
- Each segment: 1–2 short sentences, written to be spoken aloud (contractions, natural rhythm)
- First segment MUST be a warmup preamble (discard: true): "Here are the release notes." last_word: "notes"
- Each segment needs a unique key: "01-intro", "02-change-name", etc.
- last_word: the final meaningful word of the segment (no punctuation) — used for Whisper alignment
- Segments must chain — read the whole script aloud before finalizing; it should sound like one continuous take

Return ONLY valid JSON, no markdown fences:
{
  "version": string,
  "instruct": string,  // voice character: e.g. "Clear, direct senior engineer. Measured pace. Warm but not effusive."
  "segments": [{ "key": string, "text": string, "last_word": string, "discard"?: boolean }]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system,
    messages: [
      {
        role: "user",
        content: `Write a voiceover script for Editframe changelog v${version}.\n\n${prose}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // Strip markdown fences if Claude wrapped the JSON
  const stripped = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    return JSON.parse(stripped);
  } catch (e) {
    process.stderr.write(`Failed to parse Claude response as JSON:\n${text}\n`);
    throw e;
  }
}

// ─── Patch MDX frontmatter ────────────────────────────────────────────────────

function patchFrontmatter(mdx: string, patches: Record<string, string>): string {
  return mdx.replace(/^(---\n)([\s\S]*?)(---)(\n)/, (_match, open, body, close, nl) => {
    let updated = body;
    for (const [key, value] of Object.entries(patches)) {
      const re = new RegExp(`^${key}:.*$`, "m");
      const line = `${key}: "${value}"`;
      if (re.test(updated)) {
        updated = updated.replace(re, line);
      } else {
        updated = updated.trimEnd() + "\n" + line + "\n";
      }
    }
    return open + updated + close + nl;
  });
}

// ─── Upload to GCS ────────────────────────────────────────────────────────────

function uploadToGCS(localPath: string, filename: string): string {
  const gcsPath = `${GCS_BUCKET}/${filename}`;
  process.stderr.write(`Uploading to ${gcsPath}...\n`);
  const result = spawnSync("gsutil", ["-h", "Cache-Control:public,max-age=31536000", "cp", localPath, gcsPath], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`gsutil cp failed with exit code ${result.status}`);
  }
  return `${CDN_BASE}/${filename}`;
}

// ─── Write captions JSON alongside the MDX ───────────────────────────────────

function writeCaptionsFile(version: string, captions: unknown): string {
  const captionsPath = join(CHANGELOGS_DIR, `${version}.captions.json`);
  writeFileSync(captionsPath, JSON.stringify(captions, null, 2) + "\n");
  return captionsPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  process.stderr.write(`Generating media for changelog v${version}\n`);

  const prose = extractProse(mdxContent);
  process.stderr.write(`Prose extracted (${prose.length} chars)\n`);

  process.stderr.write("Drafting VO script with Claude...\n");
  const voScript = await draftVOScript(version, prose);
  process.stderr.write(`Script: ${voScript.segments.length} segments\n`);
  for (const s of voScript.segments) {
    process.stderr.write(`  ${s.key}${s.discard ? " [discard]" : ""}: "${s.text.slice(0, 60)}..."\n`);
  }

  // Write script JSON to a temp file
  const tmpDir = join(tmpdir(), `changelog-media-${randomBytes(4).toString("hex")}`);
  mkdirSync(tmpDir, { recursive: true });
  const scriptJsonPath = join(tmpDir, "script.json");
  const outputJsonPath = join(tmpDir, "output.json");
  writeFileSync(scriptJsonPath, JSON.stringify(voScript, null, 2));

  process.stderr.write("Running TTS + Whisper (this takes a few minutes)...\n");
  const result = spawnSync(
    "python3",
    [PYTHON_SCRIPT, scriptJsonPath, outputJsonPath],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.stderr.write(`Python script failed with exit code ${result.status}\n`);
    process.exit(1);
  }

  const output = JSON.parse(readFileSync(outputJsonPath, "utf-8"));
  process.stderr.write(`Audio generated: ${output.durationMs}ms, ${output.captions.length} caption groups\n`);

  // Upload MP3
  const cdnUrl = uploadToGCS(output.mp3Path, output.mp3Filename);
  process.stderr.write(`CDN URL: ${cdnUrl}\n`);

  // Write captions file
  const captionsPath = writeCaptionsFile(version, output.captions);
  process.stderr.write(`Captions written: ${captionsPath}\n`);

  // Patch MDX frontmatter with audioSrc
  const patched = patchFrontmatter(mdxContent, { audioSrc: cdnUrl });
  writeFileSync(mdxPath, patched);
  process.stderr.write(`MDX patched: audioSrc added\n`);

  process.stdout.write(
    JSON.stringify({ audioSrc: cdnUrl, durationMs: output.durationMs, captionsPath }, null, 2) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
