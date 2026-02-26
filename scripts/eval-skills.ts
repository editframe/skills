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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import Anthropic from "@anthropic-ai/sdk"

import {
  buildGeneratePrompt,
  buildEvaluatePrompt,
  buildDiagnosePrompt,
  type EvalResult,
  type Diagnosis,
} from "../skills/eval/rubric.js"

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT_DIR   = join(__dirname, "..")
const SKILLS_DIR = join(ROOT_DIR, "skills", "skills")
const EVAL_DIR   = join(ROOT_DIR, "skills", "eval")
const RUNS_DIR   = join(EVAL_DIR, "runs")

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
const hasFlag = (name: string) => args.includes(name)

const GENERATOR_MODEL    = flag("--generator-model")  ?? "anthropic/claude-haiku-4-5"
const EVALUATOR_MODEL_ID = flag("--evaluator-model")  ?? "anthropic/claude-opus-4-5"
const TASK_FILTER        = flag("--tasks")?.split(",") ?? null
const SKIP_HELD_OUT      = hasFlag("--skip-held-out")
const RUN_ID             = flag("--run-id") ?? new Date().toISOString().replace(/[:.]/g, "-")

const RUN_DIR       = join(RUNS_DIR, RUN_ID)
const OUTPUTS_DIR   = join(RUN_DIR, "outputs")
const SCORES_DIR    = join(RUN_DIR, "scores")
const DIAGNOSES_DIR = join(RUN_DIR, "diagnoses")

// ─── Anthropic client (for evaluate + diagnose — plain API, no tools) ────────

const anthropic = new Anthropic()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stderr.write(`${msg}\n`)
}

function ensureDirs() {
  for (const dir of [RUNS_DIR, RUN_DIR, OUTPUTS_DIR, SCORES_DIR, DIAGNOSES_DIR]) {
    mkdirSync(dir, { recursive: true })
  }
}

function loadTasks() {
  const raw = JSON.parse(readFileSync(join(EVAL_DIR, "tasks.json"), "utf8"))
  let tasks = raw.tasks as any[]
  if (TASK_FILTER) tasks = tasks.filter((t: any) => TASK_FILTER.includes(t.id))
  if (SKIP_HELD_OUT) tasks = tasks.filter((t: any) => !t.held_out)
  return tasks
}

function loadSkillContent(): Record<string, string> {
  const result: Record<string, string> = {}
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".md")) {
        const rel = full.replace(SKILLS_DIR + "/", "skills/skills/")
        result[rel] = readFileSync(full, "utf8")
      }
    }
  }
  walk(SKILLS_DIR)
  return result
}

// ─── Step 1: GENERATE ────────────────────────────────────────────────────────
// Direct API call with skill content pre-loaded in the system prompt.

async function generate(task: any, skillContents: Record<string, string>): Promise<string> {
  const outputPath = join(OUTPUTS_DIR, `${task.id}.html`)

  if (existsSync(outputPath)) {
    log(`  [skip] ${task.id} — output already exists`)
    return readFileSync(outputPath, "utf8")
  }

  log(`  [generate] ${task.id} via ${GENERATOR_MODEL}`)

  // Pre-load the most relevant skill files into the system prompt
  const generateSkillPaths = [
    "skills/skills/composition/SKILL.md",
    "skills/skills/composition/references/getting-started.md",
    "skills/skills/composition/references/scripting.md",
    "skills/skills/composition/references/css-variables.md",
    "skills/skills/composition/references/text.md",
    "skills/skills/motion-design/SKILL.md",
    "skills/skills/motion-design/references/0-editframe.md",
    "skills/skills/brand-video-generator/SKILL.md",
    "skills/skills/brand-video-generator/references/composition-patterns.md",
  ]
  const skillDump = generateSkillPaths
    .filter((p) => skillContents[p])
    .map((p) => `=== ${p} ===\n${skillContents[p]}`)
    .join("\n\n")

  const systemPrompt = `You are an expert Editframe video composition engineer. You have deep knowledge of Editframe's web component system and create motion-rich, brand-specific video compositions.

The following are your skill references:

${skillDump}`

  const userPrompt = buildGeneratePrompt(task)

  const response = await anthropic.messages.create({
    model: GENERATOR_MODEL.replace("anthropic/", ""),
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  // Extract HTML — prefer fenced block, then raw ef- tags
  const htmlMatch =
    text.match(/```html\n([\s\S]*?)```/) ??
    text.match(/```\n(<[\s\S]*?)```/) ??
    text.match(/(<ef-(?:timegroup|configuration)[\s\S]*)/m)

  const html = htmlMatch ? (htmlMatch[1] ?? htmlMatch[0]).trim() : text.trim()

  writeFileSync(outputPath, html)
  log(`    → ${outputPath}`)
  return html
}

// ─── Step 2: EVALUATE ────────────────────────────────────────────────────────
// Plain API call — structured JSON output, no tools needed.

async function evaluate(task: any, composition: string): Promise<EvalResult> {
  const scorePath = join(SCORES_DIR, `${task.id}.json`)

  if (existsSync(scorePath)) {
    log(`  [skip] ${task.id} scores — already exist`)
    return JSON.parse(readFileSync(scorePath, "utf8"))
  }

  log(`  [evaluate] ${task.id} via ${EVALUATOR_MODEL_ID}`)

  const prompt = buildEvaluatePrompt(composition, task)

  const response = await anthropic.messages.create({
    model: EVALUATOR_MODEL_ID.replace("anthropic/", ""),
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON in evaluate response for ${task.id}`)

  const parsed = JSON.parse(jsonMatch[0])
  const scores = parsed.scores
  const overall =
    Object.values(scores).reduce((sum: number, d: any) => sum + d.score, 0) /
    Object.keys(scores).length

  const result: EvalResult = {
    taskId: task.id,
    model: GENERATOR_MODEL,
    timestamp: new Date().toISOString(),
    scores,
    overall: Math.round(overall * 10) / 10,
    feedback: parsed.feedback ?? [],
  }

  writeFileSync(scorePath, JSON.stringify(result, null, 2))
  log(
    `    → overall: ${result.overall}/5  (${Object.entries(result.scores)
      .map(([k, v]: any) => `${k[0].toUpperCase()}:${v.score}`)
      .join(" ")})`,
  )
  return result
}

// ─── Step 3: DIAGNOSE ────────────────────────────────────────────────────────
// Plain API call — traces each feedback item back to a skill gap.

async function diagnose(
  task: any,
  evalResult: EvalResult,
  skillContents: Record<string, string>,
): Promise<Diagnosis[]> {
  const diagPath = join(DIAGNOSES_DIR, `${task.id}.json`)

  if (existsSync(diagPath)) {
    log(`  [skip] ${task.id} diagnoses — already exist`)
    return JSON.parse(readFileSync(diagPath, "utf8"))
  }

  const criticalFeedback = evalResult.feedback.filter(
    (f) => f.severity === "critical" || f.severity === "major",
  )

  if (criticalFeedback.length === 0) {
    log(`  [skip] ${task.id} diagnoses — no critical/major feedback`)
    writeFileSync(diagPath, "[]")
    return []
  }

  log(`  [diagnose] ${task.id} (${criticalFeedback.length} items) via ${EVALUATOR_MODEL_ID}`)

  const relevantSkills: Record<string, string> = {}
  const relevantPaths = [
    "skills/skills/composition/SKILL.md",
    "skills/skills/composition/references/getting-started.md",
    "skills/skills/brand-video-generator/SKILL.md",
    "skills/skills/brand-video-generator/references/composition-patterns.md",
    "skills/skills/motion-design/SKILL.md",
    "skills/skills/motion-design/references/0-editframe.md",
  ]
  for (const path of relevantPaths) {
    if (skillContents[path]) relevantSkills[path] = skillContents[path]
  }

  const prompt = buildDiagnosePrompt(criticalFeedback, relevantSkills, task)

  const response = await anthropic.messages.create({
    model: EVALUATOR_MODEL_ID.replace("anthropic/", ""),
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`No JSON array in diagnose response for ${task.id}`)

  const diagnoses: Diagnosis[] = JSON.parse(jsonMatch[0]).map((d: any, i: number) => ({
    taskId: task.id,
    feedbackItem: criticalFeedback[d.feedbackIndex ?? i],
    skillFile: d.skillFile,
    currentText: d.currentText ?? "",
    cause: d.cause,
    proposedChange: d.proposedChange,
    rationale: d.rationale,
  }))

  writeFileSync(diagPath, JSON.stringify(diagnoses, null, 2))
  log(`    → ${diagnoses.length} diagnoses`)
  return diagnoses
}

// ─── Consolidate proposals ───────────────────────────────────────────────────

function consolidateProposals(allDiagnoses: Diagnosis[]) {
  const byFile: Record<string, Diagnosis[]> = {}
  for (const d of allDiagnoses) {
    if (!byFile[d.skillFile]) byFile[d.skillFile] = []
    byFile[d.skillFile].push(d)
  }

  const proposals = Object.entries(byFile).map(([file, diags]) => ({
    skillFile: file,
    changes: diags.map((d) => ({
      taskId: d.taskId,
      dimension: d.feedbackItem?.dimension,
      severity: d.feedbackItem?.severity,
      cause: d.cause,
      currentText: d.currentText,
      proposedChange: d.proposedChange,
      rationale: (d as any).rationale ?? "",
    })),
  }))

  const proposalsPath = join(RUN_DIR, "proposals.json")
  writeFileSync(proposalsPath, JSON.stringify(proposals, null, 2))
  return proposals
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
  ]

  for (const r of results) {
    const s = r.scores
    const task = tasks.find((t) => t.id === r.taskId)
    const label = `${task?.brand ?? r.taskId} (${task?.videoType ?? ""})`.padEnd(30)
    lines.push(
      `${label}  ${s.motion.score}/5    ${s.specificity.score}/5   ${s.viewer_state.score}/5      ${s.point_of_view.score}/5   ${s.omission.score}/5    ${r.overall}/5`,
    )
  }

  const overallAvg = results.reduce((sum, r) => sum + r.overall, 0) / (results.length || 1)
  lines.push("─────────────────────────────────────────────────────────────────────────")
  lines.push(`Average overall: ${Math.round(overallAvg * 10) / 10}/5`)
  lines.push("")
  lines.push("─── Proposed Skill Changes ─────────────────────────────────────────────")

  for (const p of proposals) {
    lines.push(
      `\n${p.skillFile} (${p.changes.length} change${p.changes.length === 1 ? "" : "s"})`,
    )
    for (const c of p.changes) {
      lines.push(`  [${c.severity?.toUpperCase()} ${c.dimension}] ${c.rationale}`)
    }
  }

  lines.push("")
  lines.push(`To apply: npx tsx scripts/eval-skills-apply.ts --run-id ${RUN_ID}`)

  const summary = lines.join("\n")
  writeFileSync(join(RUN_DIR, "summary.txt"), summary)
  return summary
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs()
  log(`\n=== eval-skills run: ${RUN_ID} ===\n`)

  const tasks = loadTasks()
  log(`Tasks: ${tasks.map((t: any) => t.id).join(", ")}\n`)

  const skillContents = loadSkillContent()
  log(`Loaded ${Object.keys(skillContents).length} skill files\n`)

  const allEvalResults: EvalResult[] = []
  const allDiagnoses: Diagnosis[] = []

  for (const task of tasks) {
    log(`\n── ${task.id} ──────────────────────────────`)

    log("Step 1: Generate")
    const composition = await generate(task, skillContents)

    log("Step 2: Evaluate")
    const evalResult = await evaluate(task, composition)
    allEvalResults.push(evalResult)

    if (!task.held_out) {
      log("Step 3: Diagnose")
      const diagnoses = await diagnose(task, evalResult, skillContents)
      allDiagnoses.push(...diagnoses)
    } else {
      log("Step 3: Diagnose [skipped — held-out task]")
    }
  }

  log("\n── Consolidating proposals ──────────────────")
  const proposals = consolidateProposals(allDiagnoses)

  log("\n── Summary ──────────────────────────────────")
  const summary = writeSummary(tasks, allEvalResults, proposals)
  process.stdout.write(summary + "\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
