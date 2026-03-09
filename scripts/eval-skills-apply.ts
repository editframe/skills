#!/usr/bin/env npx tsx
/**
 * eval-skills-apply — Step 4 of the skills evaluation pipeline (human-gated)
 *
 * Reads proposals.json from a prior eval run, shows each proposed change,
 * and applies the ones you approve via opencode run.
 *
 * FLAGS:
 *   --run-id <id>   required — the run directory to apply from
 *   --yes           apply all proposals without prompting (CI use)
 *   --dry-run       print proposals but don't apply any
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline";

const ROOT_DIR = join(__dirname, "..");
const EVAL_DIR = join(ROOT_DIR, "skills", "eval");
const RUNS_DIR = join(EVAL_DIR, "runs");

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (name: string) => args.includes(name);

const RUN_ID = flag("--run-id");
const YES_ALL = hasFlag("--yes");
const DRY_RUN = hasFlag("--dry-run");
const NO_VERIFY = hasFlag("--no-verify");

if (!RUN_ID) {
  console.error("Error: --run-id is required");
  console.error(
    "Usage: npx tsx scripts/eval-skills-apply.ts --run-id <run-id>",
  );
  process.exit(1);
}

const RUN_DIR = join(RUNS_DIR, RUN_ID);
const PROPOSALS_PATH = join(RUN_DIR, "proposals.json");
const SUMMARY_PATH = join(RUN_DIR, "summary.txt");

if (!existsSync(PROPOSALS_PATH)) {
  console.error(`No proposals.json found at ${PROPOSALS_PATH}`);
  console.error("Run eval-skills first to generate proposals.");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hr() {
  console.log("─".repeat(72));
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function applyChange(skillFile: string, change: any): boolean {
  const absolutePath = join(ROOT_DIR, skillFile);
  if (!existsSync(absolutePath)) {
    console.error(`  Skill file not found: ${absolutePath}`);
    return false;
  }

  const applyPrompt = `Edit the skill file at ${skillFile}.

The following change needs to be applied:

CAUSE: ${change.cause}
DIMENSION: ${change.dimension}
RATIONALE: ${change.rationale}

${change.currentText ? `CURRENT TEXT (find and replace/update this):\n"""\n${change.currentText}\n"""` : "CURRENT TEXT: (missing — this content needs to be added)"}

PROPOSED CHANGE:
"""
${change.proposedChange}
"""

Make only this specific, minimal change. Do not rewrite surrounding content.`;

  // Check if opencode is available before attempting to use it
  const whichResult = spawnSync("which", ["opencode"], { encoding: "utf8" });
  const opencodeAvailable = whichResult.status === 0;

  if (opencodeAvailable) {
    const result = spawnSync(
      "opencode",
      [
        "run",
        "--model",
        "anthropic/claude-opus-4-5",
        "--dir",
        ROOT_DIR,
        applyPrompt,
      ],
      {
        encoding: "utf8",
        stdio: ["inherit", "inherit", "inherit"],
        timeout: 120_000,
      },
    );
    if (result.status === 0) return true;
  }

  // Fallback: direct text substitution when opencode is unavailable or fails
  console.log("  [fallback] applying via direct text substitution");

  if (!change.currentText) {
    // No anchor text — append proposed change to end of file
    const existing = readFileSync(absolutePath, "utf8");
    writeFileSync(
      absolutePath,
      existing.trimEnd() + "\n\n" + change.proposedChange + "\n",
    );
    console.log("  [fallback] Appended proposed change to end of file");
    return true;
  }

  const content = readFileSync(absolutePath, "utf8");
  if (!content.includes(change.currentText)) {
    console.error(
      `  [fallback] currentText not found in ${skillFile} — cannot apply`,
    );
    return false;
  }

  const updated = content.replace(change.currentText, change.proposedChange);
  writeFileSync(absolutePath, updated);
  console.log("  [fallback] Direct substitution applied");
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Show summary if it exists
  if (existsSync(SUMMARY_PATH)) {
    console.log(readFileSync(SUMMARY_PATH, "utf8"));
    hr();
  }

  const proposals: Array<{ skillFile: string; changes: any[] }> = JSON.parse(
    readFileSync(PROPOSALS_PATH, "utf8"),
  );

  if (proposals.length === 0) {
    console.log("No proposals to apply.");
    return;
  }

  console.log(
    `\nFound ${proposals.length} skill file(s) with proposed changes.\n`,
  );

  let applied = 0;
  let skipped = 0;

  for (const proposal of proposals) {
    hr();
    console.log(`\nSkill file: ${proposal.skillFile}`);
    console.log(`Changes: ${proposal.changes.length}\n`);

    for (const change of proposal.changes) {
      console.log(
        `  [${change.severity?.toUpperCase()} ${change.dimension}] Task: ${change.taskId}`,
      );
      console.log(`  Cause: ${change.cause}`);
      console.log(`  Rationale: ${change.rationale}`);
      if (change.currentText) {
        console.log(
          `\n  Current text:\n    ${change.currentText.split("\n").join("\n    ")}`,
        );
      }
      console.log(
        `\n  Proposed change:\n    ${change.proposedChange.split("\n").join("\n    ")}\n`,
      );

      if (DRY_RUN) {
        console.log("  [dry-run] skipping");
        skipped++;
        continue;
      }

      let apply = YES_ALL;
      if (!YES_ALL) {
        const answer = await prompt("  Apply this change? [y/n/q] ");
        if (answer === "q") {
          console.log("\nQuitting.");
          process.exit(0);
        }
        apply = answer === "y" || answer === "yes";
      }

      if (apply) {
        console.log("  Applying...");
        const ok = applyChange(proposal.skillFile, change);
        if (ok) {
          console.log("  ✓ Applied");
          applied++;
        } else {
          console.log("  ✗ Failed");
          skipped++;
        }
      } else {
        console.log("  Skipped");
        skipped++;
      }
    }
  }

  hr();
  console.log(`\nDone. Applied: ${applied}  Skipped: ${skipped}`);

  if (applied > 0 && !DRY_RUN && !NO_VERIFY) {
    const verifyRunId = `${RUN_ID}-verify`;
    console.log(
      `\nRe-running eval to measure improvement (run: ${verifyRunId})...`,
    );
    hr();

    const evalResult = spawnSync(
      "npx",
      [
        "tsx",
        join(__dirname, "eval-skills.ts"),
        "--run-id",
        verifyRunId,
        "--skip-held-out",
      ],
      {
        encoding: "utf8",
        stdio: ["inherit", "inherit", "inherit"],
        cwd: ROOT_DIR,
      },
    );

    if (evalResult.status !== 0) {
      console.error("\nVerification eval failed — check output above.");
    } else {
      printScoreDelta(RUN_ID!, verifyRunId);
    }
  } else if (applied > 0 && !DRY_RUN && NO_VERIFY) {
    console.log("\nSkipping verification (--no-verify). To verify manually:");
    console.log(
      `  npx tsx scripts/eval-skills.ts --run-id ${RUN_ID}-verify --skip-held-out`,
    );
  }
}

// ─── Score delta ─────────────────────────────────────────────────────────────

function printScoreDelta(baseRunId: string, verifyRunId: string) {
  const baseScoresDir = join(RUNS_DIR, baseRunId, "scores");
  const verifyScoresDir = join(RUNS_DIR, verifyRunId, "scores");

  if (!existsSync(baseScoresDir) || !existsSync(verifyScoresDir)) return;

  const baseFiles = readdirSync(baseScoresDir).filter((f) =>
    f.endsWith(".json"),
  );
  const verifyFiles = new Set(
    readdirSync(verifyScoresDir).filter((f) => f.endsWith(".json")),
  );

  console.log(
    "\n─── Score Delta ────────────────────────────────────────────────────────",
  );
  console.log("Task                          Before  After   Delta");
  console.log(
    "────────────────────────────────────────────────────────────────────────",
  );

  let totalBefore = 0;
  let totalAfter = 0;
  let count = 0;

  for (const file of baseFiles) {
    if (!verifyFiles.has(file)) continue;

    const before = JSON.parse(readFileSync(join(baseScoresDir, file), "utf8"));
    const after = JSON.parse(readFileSync(join(verifyScoresDir, file), "utf8"));

    const delta = after.overall - before.overall;
    const sign = delta >= 0 ? "+" : "";
    const label = (before.taskId ?? file.replace(".json", "")).padEnd(30);

    console.log(
      `${label}  ${before.overall}/5   ${after.overall}/5   ${sign}${delta.toFixed(1)}`,
    );
    totalBefore += before.overall;
    totalAfter += after.overall;
    count++;
  }

  if (count > 0) {
    const avgBefore = Math.round((totalBefore / count) * 10) / 10;
    const avgAfter = Math.round((totalAfter / count) * 10) / 10;
    const avgDelta = avgAfter - avgBefore;
    const sign = avgDelta >= 0 ? "+" : "";
    console.log(
      "────────────────────────────────────────────────────────────────────────",
    );
    console.log(
      `${"Average".padEnd(30)}  ${avgBefore}/5   ${avgAfter}/5   ${sign}${avgDelta.toFixed(1)}`,
    );
  }

  console.log("");
  console.log("Review changes: git diff");
  console.log("Commit if improved: git add -p && git commit");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
