#!/usr/bin/env npx tsx
/**
 * eval-skills — Step 1–3 of the skills evaluation pipeline
 *
 * STEPS:
 *   1. GENERATE  — run haiku against current skills to produce compositions
 *   2. EVALUATE  — run opus to score each composition against the rubric
 *   3. DIAGNOSE  — run opus to trace each problem back to a specific skill gap
 *
 * OUTPUT:
 *   skills/eval/runs/{timestamp}/
 *     outputs/{task-id}.html       — generated composition
 *     scores/{task-id}.json        — evaluation scores + feedback
 *     diagnoses/{task-id}.json     — skill gap diagnoses
 *     proposals.json               — consolidated proposed skill changes
 *     summary.txt                  — human-readable summary with score table
 *
 * THEN RUN: scripts/eval-skills-apply to review and apply proposals
 *
 * FLAGS:
 *   --tasks linear-product-demo,stripe-explainer   run specific tasks only
 *   --skip-held-out                                skip held-out tasks (default: include all)
 *   --generator-model anthropic/claude-haiku-4-5   model for generation (default: haiku)
 *   --evaluator-model anthropic/claude-opus-4-5    model for eval/diagnose (default: opus)
 *   --run-id <id>                                  resume or overwrite a specific run directory
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import {
  buildGeneratePrompt,
  buildEvaluatePrompt,
  buildDiagnosePrompt,
  type EvalResult,
  type Diagnosis,
} from "../skills/eval/rubric.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT_DIR = join(__dirname, "..");
const SKILLS_DIR = join(ROOT_DIR, "skills", "skills");
const EVAL_DIR = join(ROOT_DIR, "skills", "eval");
const RUNS_DIR = join(EVAL_DIR, "runs");

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (name: string) => args.includes(name);

const GENERATOR_MODEL =
  flag("--generator-model") ?? "anthropic/claude-haiku-4-5";
const EVALUATOR_MODEL_ID =
  flag("--evaluator-model") ?? "anthropic/claude-opus-4-5";
const TASK_FILTER = flag("--tasks")?.split(",") ?? null;
const SKIP_HELD_OUT = hasFlag("--skip-held-out");
const RUN_ID =
  flag("--run-id") ?? new Date().toISOString().replace(/[:.]/g, "-");
const TASKS_FILE = flag("--tasks-file") ?? join(EVAL_DIR, "tasks.json");

const RUN_DIR = join(RUNS_DIR, RUN_ID);
const OUTPUTS_DIR = join(RUN_DIR, "outputs");
const SCORES_DIR = join(RUN_DIR, "scores");
const DIAGNOSES_DIR = join(RUN_DIR, "diagnoses");

// ─── Anthropic client (for evaluate + diagnose — plain API, no tools) ────────

const anthropic = new Anthropic();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stderr.write(`${msg}\n`);
}

function ensureDirs() {
  for (const dir of [
    RUNS_DIR,
    RUN_DIR,
    OUTPUTS_DIR,
    SCORES_DIR,
    DIAGNOSES_DIR,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadConfig() {
  const raw = JSON.parse(readFileSync(TASKS_FILE, "utf8"));
  let tasks = raw.tasks as any[];
  if (TASK_FILTER) tasks = tasks.filter((t: any) => TASK_FILTER.includes(t.id));
  if (SKIP_HELD_OUT) tasks = tasks.filter((t: any) => !t.held_out);
  return {
    tasks,
    generateSkillPaths: raw.generateSkills as string[],
    diagnoseSkillPaths: raw.diagnoseSkills as string[],
  };
}

function loadSkillContent(): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) {
        const rel = full.replace(SKILLS_DIR + "/", "skills/skills/");
        result[rel] = readFileSync(full, "utf8");
      }
    }
  }
  walk(SKILLS_DIR);
  return result;
}

// ─── Step 1: GENERATE ────────────────────────────────────────────────────────
// Direct API call with skill content pre-loaded in the system prompt.

async function generate(
  task: any,
  skillContents: Record<string, string>,
  generateSkillPaths: string[],
): Promise<string> {
  const outputPath = join(OUTPUTS_DIR, `${task.id}.html`);

  if (existsSync(outputPath)) {
    log(`  [skip] ${task.id} — output already exists`);
    return readFileSync(outputPath, "utf8");
  }

  log(`  [generate] ${task.id} via ${GENERATOR_MODEL}`);

  const skillDump = generateSkillPaths
    .filter((p) => skillContents[p])
    .map((p) => `=== ${p} ===\n${skillContents[p]}`)
    .join("\n\n");

  const systemPrompt = `You are an expert Editframe video composition engineer. You have deep knowledge of Editframe's web component system and create motion-rich, brand-specific video compositions.

The following are your skill references:

${skillDump}`;

  const userPrompt = buildGeneratePrompt(task);

  const response = await anthropic.messages.create({
    model: GENERATOR_MODEL.replace("anthropic/", ""),
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract HTML — prefer fenced block, then raw ef- tags
  const htmlMatch =
    text.match(/```html\n([\s\S]*?)```/) ??
    text.match(/```\n(<[\s\S]*?)```/) ??
    text.match(/(<ef-(?:timegroup|configuration)[\s\S]*)/m);

  const html = htmlMatch ? (htmlMatch[1] ?? htmlMatch[0]).trim() : text.trim();

  writeFileSync(outputPath, html);
  log(`    → ${outputPath}`);
  return html;
}

// ─── Step 2: EVALUATE ────────────────────────────────────────────────────────
// Plain API call — structured JSON output, no tools needed.

async function evaluate(task: any, composition: string): Promise<EvalResult> {
  const scorePath = join(SCORES_DIR, `${task.id}.json`);

  if (existsSync(scorePath)) {
    log(`  [skip] ${task.id} scores — already exist`);
    return JSON.parse(readFileSync(scorePath, "utf8"));
  }

  log(`  [evaluate] ${task.id} via ${EVALUATOR_MODEL_ID}`);

  const prompt = buildEvaluatePrompt(composition, task);

  const response = await anthropic.messages.create({
    model: EVALUATOR_MODEL_ID.replace("anthropic/", ""),
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error(`No JSON in evaluate response for ${task.id}`);

  const parsed = JSON.parse(jsonMatch[0]);
  const scores = parsed.scores;
  const overall =
    (Object.values(scores) as any[]).reduce(
      (sum: number, d: any) => sum + d.score,
      0,
    ) / Object.keys(scores).length;

  const result: EvalResult = {
    taskId: task.id,
    model: GENERATOR_MODEL,
    timestamp: new Date().toISOString(),
    scores,
    overall: Math.round(overall * 10) / 10,
    feedback: parsed.feedback ?? [],
  };

  writeFileSync(scorePath, JSON.stringify(result, null, 2));
  log(
    `    → overall: ${result.overall}/5  (${Object.entries(result.scores)
      .map(([k, v]: any) => `${k[0].toUpperCase()}:${v.score}`)
      .join(" ")})`,
  );
  return result;
}

// ─── Step 3: DIAGNOSE ────────────────────────────────────────────────────────
// Plain API call — traces each feedback item back to a skill gap.

async function diagnose(
  task: any,
  evalResult: EvalResult,
  skillContents: Record<string, string>,
  diagnoseSkillPaths: string[],
): Promise<Diagnosis[]> {
  const diagPath = join(DIAGNOSES_DIR, `${task.id}.json`);

  if (existsSync(diagPath)) {
    log(`  [skip] ${task.id} diagnoses — already exist`);
    return JSON.parse(readFileSync(diagPath, "utf8"));
  }

  const criticalFeedback = evalResult.feedback.filter(
    (f) => f.severity === "critical" || f.severity === "major",
  );

  if (criticalFeedback.length === 0) {
    log(`  [skip] ${task.id} diagnoses — no critical/major feedback`);
    writeFileSync(diagPath, "[]");
    return [];
  }

  log(
    `  [diagnose] ${task.id} (${criticalFeedback.length} items) via ${EVALUATOR_MODEL_ID}`,
  );

  // Use the configured diagnose skill subset
  const diagnoseSkills = Object.fromEntries(
    diagnoseSkillPaths
      .filter((p) => skillContents[p])
      .map((p) => [p, skillContents[p]]),
  );
  const prompt = buildDiagnosePrompt(criticalFeedback, diagnoseSkills, task);

  const response = await anthropic.messages.create({
    model: EVALUATOR_MODEL_ID.replace("anthropic/", ""),
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch)
    throw new Error(`No JSON array in diagnose response for ${task.id}`);

  const raw: any[] = JSON.parse(jsonMatch[0]);

  // Validate feedbackIndex values — reject responses that misalign
  for (const [i, d] of raw.entries()) {
    const idx = d.feedbackIndex;
    if (
      idx !== undefined &&
      (typeof idx !== "number" || idx < 0 || idx >= criticalFeedback.length)
    ) {
      throw new Error(
        `diagnose response for ${task.id}[${i}] has feedbackIndex=${idx} but only ${criticalFeedback.length} feedback item(s)`,
      );
    }
  }

  const diagnoses: Diagnosis[] = raw.map((d: any, i: number) => ({
    taskId: task.id,
    feedbackItem: criticalFeedback[d.feedbackIndex ?? i],
    skillFile: d.skillFile,
    currentText: d.currentText ?? "",
    cause: d.cause,
    proposedChange: d.proposedChange,
    rationale: d.rationale,
  }));

  writeFileSync(diagPath, JSON.stringify(diagnoses, null, 2));
  log(`    → ${diagnoses.length} diagnoses`);
  return diagnoses;
}

// ─── Consolidate proposals ───────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = {
  critical: 2,
  major: 1,
  minor: 0,
};

function consolidateProposals(allDiagnoses: Diagnosis[]) {
  // Group by skillFile then by currentText to deduplicate same-passage proposals
  const byFile: Record<string, Map<string, any>> = {};

  for (const d of allDiagnoses) {
    if (!byFile[d.skillFile]) byFile[d.skillFile] = new Map();

    const key = d.currentText.trim();
    const existing = byFile[d.skillFile].get(key);
    const severity = d.feedbackItem?.severity ?? "minor";
    const dimension = d.feedbackItem?.dimension;
    const rationale = (d as any).rationale ?? "";

    if (!existing) {
      byFile[d.skillFile].set(key, {
        taskIds: [d.taskId],
        dimension,
        severity,
        cause: d.cause,
        currentText: d.currentText,
        proposedChange: d.proposedChange,
        rationale,
      });
    } else {
      // Merge: keep highest severity, accumulate task IDs and rationales
      existing.taskIds.push(d.taskId);
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) {
        existing.severity = severity;
        existing.dimension = dimension;
        existing.proposedChange = d.proposedChange;
      }
      if (rationale && !existing.rationale.includes(rationale)) {
        existing.rationale += ` Also: ${rationale}`;
      }
    }
  }

  const proposals = Object.entries(byFile).map(([file, changeMap]) => ({
    skillFile: file,
    changes: Array.from(changeMap.values()).map((c) => ({
      taskIds: c.taskIds,
      dimension: c.dimension,
      severity: c.severity,
      cause: c.cause,
      currentText: c.currentText,
      proposedChange: c.proposedChange,
      rationale: c.rationale,
    })),
  }));

  const proposalsPath = join(RUN_DIR, "proposals.json");
  writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2));
  return proposals;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function writeSummary(tasks: any[], results: EvalResult[], proposals: any[]) {
  const lines: string[] = [
    `Eval Run: ${RUN_ID}`,
    `Generator: ${GENERATOR_MODEL}`,
    `Evaluator: ${EVALUATOR_MODEL_ID}`,
    `Date: ${new Date().toLocaleString()}`,
    "",
    "─── Scores ────────────────────────────────────────",
    "Task                          Motion  Spec  ViewerΔ  PoV  Omit  Overall",
    "─────────────────────────────────────────────────────────────────────────",
  ];

  for (const r of results) {
    const s = r.scores;
    const task = tasks.find((t) => t.id === r.taskId);
    const label =
      `${task?.brand ?? r.taskId} (${task?.videoType ?? ""})`.padEnd(30);
    lines.push(
      `${label}  ${s.motion.score}/5    ${s.specificity.score}/5   ${s.viewer_state.score}/5      ${s.point_of_view.score}/5   ${s.omission.score}/5    ${r.overall}/5`,
    );
  }

  const overallAvg =
    results.reduce((sum, r) => sum + r.overall, 0) / (results.length || 1);
  lines.push(
    "─────────────────────────────────────────────────────────────────────────",
  );
  lines.push(`Average overall: ${Math.round(overallAvg * 10) / 10}/5`);
  lines.push("");
  lines.push(
    "─── Proposed Skill Changes ─────────────────────────────────────────────",
  );

  for (const p of proposals) {
    lines.push(
      `\n${p.skillFile} (${p.changes.length} change${p.changes.length === 1 ? "" : "s"})`,
    );
    for (const c of p.changes) {
      const taskLabel = c.taskIds
        ? c.taskIds.join(", ")
        : ((c as any).taskId ?? "");
      lines.push(
        `  [${c.severity?.toUpperCase()} ${c.dimension}] (${taskLabel}) ${c.rationale}`,
      );
    }
  }

  lines.push("");
  lines.push(
    `To apply: npx tsx scripts/eval-skills-apply.ts --run-id ${RUN_ID}`,
  );

  const summary = lines.join("\n");
  writeFileSync(join(RUN_DIR, "summary.txt"), summary);
  return summary;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();
  log(`\n=== eval-skills run: ${RUN_ID} ===\n`);

  const { tasks, generateSkillPaths, diagnoseSkillPaths } = loadConfig();
  log(`Tasks: ${tasks.map((t: any) => t.id).join(", ")}\n`);

  const skillContents = loadSkillContent();
  log(
    `Loaded ${Object.keys(skillContents).length} skill files (${generateSkillPaths.length} for generate, ${diagnoseSkillPaths.length} for diagnose)\n`,
  );

  const results = await Promise.all(
    tasks.map(async (task) => {
      log(`\n── ${task.id} ──────────────────────────────`);

      log("Step 1: Generate");
      const composition = await generate(
        task,
        skillContents,
        generateSkillPaths,
      );

      log("Step 2: Evaluate");
      const evalResult = await evaluate(task, composition);

      let diagnoses: Diagnosis[] = [];
      if (!task.held_out) {
        log("Step 3: Diagnose");
        diagnoses = await diagnose(
          task,
          evalResult,
          skillContents,
          diagnoseSkillPaths,
        );
      } else {
        log("Step 3: Diagnose [skipped — held-out task]");
      }

      return { evalResult, diagnoses };
    }),
  );

  const allEvalResults = results.map((r) => r.evalResult);
  const allDiagnoses = results.flatMap((r) => r.diagnoses);

  log("\n── Consolidating proposals ──────────────────");
  const proposals = consolidateProposals(allDiagnoses);

  log("\n── Summary ──────────────────────────────────");
  const summary = writeSummary(tasks, allEvalResults, proposals);
  process.stdout.write(summary + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
