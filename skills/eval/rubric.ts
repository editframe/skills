/**
 * Evaluation rubric for Editframe video compositions.
 *
 * Used by the evaluate step (Step 2) of the eval pipeline.
 * The evaluator model scores a generated composition on five dimensions,
 * each with explicit criteria at every level so scoring is consistent
 * across runs and models.
 */

export interface DimensionScore {
  score: number // 0–5
  rationale: string // One or two sentences explaining the score
  evidence: string // Specific quote or pattern from the composition that drove the score
}

export interface EvalResult {
  taskId: string
  model: string
  timestamp: string
  scores: {
    motion: DimensionScore
    specificity: DimensionScore
    viewer_state: DimensionScore
    point_of_view: DimensionScore
    omission: DimensionScore
  }
  overall: number // Average of five dimensions
  feedback: FeedbackItem[]
}

export interface FeedbackItem {
  dimension: keyof EvalResult["scores"]
  severity: "critical" | "major" | "minor"
  observation: string // What the model did
  improvement: string // What it should have done instead
}

export interface Diagnosis {
  taskId: string
  feedbackItem: FeedbackItem
  skillFile: string // Which skill file is responsible
  currentText: string // The passage (or absence) in the skill that caused this
  cause: "present_wrong" | "missing" | "wrong_priority" // Type of skill gap
  proposedChange: string // Specific change to the skill file
}

// ─── Rubric criteria ────────────────────────────────────────────────────────

export const RUBRIC = {
  motion: {
    name: "Motion",
    description: "How central is motion to the composition? Is animation structural or decorative?",
    levels: {
      0: "No animation. All elements placed statically. Purely a layout.",
      1: "Token animation only — a single opacity fade or one CSS transition present but not meaningful.",
      2: "Basic transitions between scenes (crossfades), but nothing moves within scenes.",
      3: "CSS animations present on text or media within scenes. Motion is visible and intentional.",
      4: "Motion is structural: text splitting with stagger, --ef-progress driving properties, or time-based CSS variables used purposefully.",
      5: "Motion is the argument. addFrameTask, procedural canvas, or deeply coordinated stagger sequences where the form of the animation carries meaning the text cannot.",
    },
  },
  specificity: {
    name: "Specificity",
    description: "Could this video only be about this brand, or could any competitor substitute?",
    levels: {
      0: "Every element is generic. Swap the brand name and nothing changes.",
      1: "Brand name present but no specific details. Could be any company in this category.",
      2: "One or two specific brand facts used (color palette, known feature name), rest generic.",
      3: "Several specific brand truths visible in structure and choices. Would need real rework to apply to a competitor.",
      4: "The composition's structure reflects something true about this brand that is false about others. Form and content are in relationship.",
      5: "The video could not exist about any other subject. The specific truth about this brand determines the form of every scene.",
    },
  },
  viewer_state: {
    name: "Viewer State Change",
    description: "Does each scene change how the viewer feels, thinks, or understands?",
    levels: {
      0: "All scenes leave viewer in the same state. Information delivered but no experience of change.",
      1: "One scene produces a detectable shift. The rest are neutral.",
      2: "Two or three scenes change viewer state, but changes are weak or formulaic (curious → informed).",
      3: "Most scenes produce distinct shifts. The arc is traceable even if not fully earned.",
      4: "Every scene changes viewer state, and the changes build on each other. The final state is clearly different from the first.",
      5: "The viewer state arc is the composition's argument. Scene order is non-arbitrary — each state prepares the next.",
    },
  },
  point_of_view: {
    name: "Point of View",
    description: "Is there an authorial perspective visible, or does the composition feel like template fulfillment?",
    levels: {
      0: "Pure template. Hook → benefits → CTA. No choice that reveals a perspective.",
      1: "One non-obvious choice visible (unusual structure, an unexpected juxtaposition), but it doesn't connect to the subject.",
      2: "A perspective is implied but not committed to. Hedged.",
      3: "A clear perspective is present and consistent. You could describe the composition's point of view in one sentence.",
      4: "The point of view reflects something true about the subject. The perspective is earned, not imposed.",
      5: "The composition could only have been made by someone who understood this subject specifically. The form is an argument.",
    },
  },
  omission: {
    name: "Omission Discipline",
    description: "Is every scene earning its place? Is there padding?",
    levels: {
      0: "Obvious padding. Scenes that repeat each other, or exist only to fill time.",
      1: "One or two scenes could be cut without any loss.",
      2: "Some redundancy, but nothing egregious. Trimming would help.",
      3: "Most scenes are earning their place. The video could lose one scene with minor impact.",
      4: "Every scene is necessary. Removing any one would leave a felt gap.",
      5: "The composition has the minimum number of scenes to achieve its arc. There is nothing to cut.",
    },
  },
} as const

// ─── Prompt builders ─────────────────────────────────────────────────────────

export function buildEvaluatePrompt(composition: string, task: { brand: string; videoType: string; duration: string }): string {
  const criteria = Object.entries(RUBRIC)
    .map(([key, dim]) => {
      const levels = Object.entries(dim.levels)
        .map(([n, desc]) => `  ${n}: ${desc}`)
        .join("\n")
      return `### ${dim.name} (${key})\n${dim.description}\n\nScoring levels:\n${levels}`
    })
    .join("\n\n")

  return `You are evaluating a video composition generated by an AI model using Editframe's composition system.

The task was: Create a ${task.duration} ${task.videoType} video for ${task.brand}.

The composition is:
<composition>
${composition}
</composition>

Score the composition on each of the five dimensions below. Be specific and evidence-based — quote exact code or patterns from the composition to support your score. Do not inflate scores.

${criteria}

Respond with a JSON object matching this exact schema:
{
  "scores": {
    "motion":        { "score": 0-5, "rationale": "...", "evidence": "..." },
    "specificity":   { "score": 0-5, "rationale": "...", "evidence": "..." },
    "viewer_state":  { "score": 0-5, "rationale": "...", "evidence": "..." },
    "point_of_view": { "score": 0-5, "rationale": "...", "evidence": "..." },
    "omission":      { "score": 0-5, "rationale": "...", "evidence": "..." }
  },
  "feedback": [
    {
      "dimension": "motion|specificity|viewer_state|point_of_view|omission",
      "severity": "critical|major|minor",
      "observation": "What the model did",
      "improvement": "What it should have done instead"
    }
  ]
}

Only include feedback items for dimensions scoring 3 or below. Focus on the highest-severity gaps.`
}

export function buildDiagnosePrompt(
  feedback: FeedbackItem[],
  skillContents: Record<string, string>,
  task: { brand: string; videoType: string },
): string {
  const skillDump = Object.entries(skillContents)
    .map(([path, content]) => `=== ${path} ===\n${content}`)
    .join("\n\n")

  const feedbackText = feedback
    .map(
      (f, i) =>
        `${i + 1}. [${f.dimension}] ${f.severity.toUpperCase()}\n   Observation: ${f.observation}\n   Improvement needed: ${f.improvement}`,
    )
    .join("\n\n")

  return `You are diagnosing why an AI model produced a weak video composition, and determining what changes to the skills documentation would have prevented each problem.

The model was given these skills as its instructions:

${skillDump}

The model generated a video for: ${task.brand} (${task.videoType})

The evaluator identified these problems:
${feedbackText}

For each feedback item, analyze the current skill documentation and determine:
1. Which specific file and passage caused the problem (or what passage is missing)
2. Whether the skill actively caused the issue ("present_wrong"), failed to mention something critical ("missing"), or buried important guidance in the wrong location ("wrong_priority")
3. The minimal, specific change to that skill file that would have prevented this feedback

Be surgical. Do not propose rewriting whole files. The change should be the smallest edit that would have caused the model to behave differently.

Respond with a JSON array:
[
  {
    "feedbackIndex": 0,
    "skillFile": "skills/skills/composition/SKILL.md",
    "currentText": "exact quote from the skill that is wrong or missing (empty string if missing)",
    "cause": "present_wrong|missing|wrong_priority",
    "proposedChange": "Exact new text to add or replace. Be specific about where it goes.",
    "rationale": "One sentence explaining why this change would have prevented the feedback"
  }
]`
}

export function buildGeneratePrompt(task: {
  brand: string
  description: string
  videoType: string
  duration: string
  platform: string
}): string {
  return `Using the Editframe brand-video-generator skill, create a ${task.duration} ${task.videoType} video for ${task.brand}.

Brand description: ${task.description}
Platform: ${task.platform}

No URL is provided — use the brand description and your training knowledge as the brand knowledge source.

Run both passes of the skill without pausing for confirmation:

PASS 1 — Output the brief first (structural truth, formal constraint, authorial angle, felt arc). Use your training knowledge to name specific products, features, design decisions, and mechanisms that are true about ${task.brand} and false about its direct competitors.

PASS 2 — Immediately follow the brief with the complete HTML composition. Do not wait for confirmation.

HTML requirements:
- Use real Editframe web components (ef-timegroup, ef-video, ef-text, ef-audio, ef-image)
- Include CSS animations — text should move, not just appear
- Do NOT use bars-n-tone.mp4 — use brand-color backgrounds, canvas animations, or CSS backgrounds
- The composition must visibly follow from the formal constraint in the brief
- Canvas animations must be semantically connected to the structural truth

End your output with the complete HTML (no markdown fences). The brief prose comes first, then the raw HTML.`
}
