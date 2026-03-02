---
name: brand-video-generator
title: Brand Video Generator
description: Generate video compositions from brand websites. Analyzes visual identity, messaging, and content hierarchy to create scene-by-scene video plans.
order: 50
license: MIT
metadata:
  author: editframe
  version: "3.0"
---

# Brand Video Generator

Transform a brand's website into a video composition that could not have been made for any other brand.

## Input

- **URL**: Brand website to analyze
- **Video Type**: `launch` | `product-demo` | `explainer` | `brand-awareness` | `social`
- **Duration Target**: `15s` | `30s` | `60s` | `90s` (optional)
- **Platform**: `web` | `instagram` | `tiktok` | `youtube` | `linkedin` (optional)

## CRITICAL: Browser Access Required

**You MUST use browser tools to load the actual website before any analysis.**

1. Navigate to the URL with your available browser tools
2. Take screenshots of homepage and key pages
3. Inspect CSS to extract exact color hex codes
4. Download logo and brand assets (3-5 minimum)

**Do NOT** infer visual identity from text descriptions, assume design patterns from industry, or hallucinate brand colors, fonts, or design language.

**If you cannot access the website with browser tools, STOP and report this.**

---

## The Single Gate

Before placing any element — scene, visual, canvas animation, line of text — answer:

> **Could a direct competitor's marketing team use this exact element unchanged?**

If yes: delete it and find the element only this brand could use. Apply this gate at every decision, recursively. It is a factual substitutability test, not a style preference. Generic imagery fails it. Category tropes fail it. Marketing language fails it.

---

## Four questions to answer before writing any scene

**1. What is the structural truth?**
One thing true of this brand that would be false of any competitor. Not a marketing claim — a material fact about how the brand works: a decision it made, a relationship it has, a mechanism it invented. Test: swap the brand name — does it still hold? If yes, dig deeper. It must appear in the composition as a concrete visual artifact.

**2. What does that truth force on the video's mechanics?**
Structure means motion, timing, and compositional logic — not narrative order. If the truth is about removal, scenes subtract. If it's about unification, the same visual element must appear in multiple contexts. If it's about community, real faces must appear — abstract shapes cannot represent people. State it as: "Because [truth], this video [does X mechanically]."

**3. What does the video argue that the brand's own marketing does not say?**
Complete: "This video argues [X] which this brand's marketing never says because [Y]." If [X] is already on their homepage, the composition is illustration. Find the interpretation: what tension does this truth create? What does it reveal about the audience? What norm does it contradict?

**4. What is the felt transition from frame 1 to the last frame?**
Name the emotion at entry and the emotion at exit. They must differ. State it for each scene: "viewer enters feeling [X], exits feeling [Y]." If a scene does not change the viewer's emotional state — only adds information — cut it.

---

## Scene rules

- **Budget**: `floor(duration_seconds / 10)` maximum scenes. 15s → 2. 30s → 3. 60s → 6.
- **Each scene earns its place** by changing viewer state, not delivering information.
- **One argument**: the entire video makes one claim. State it as "This video argues [X] by showing [Y]." If [Y] could illustrate a different argument, rewrite until the form is inseparable from the claim.
- **Prove, don't assert**: structural claims require showing the mechanism. "Unified" is proven by showing one element operating across multiple contexts — not by text saying "unified."
- **Redundancy check**: if two scenes leave the viewer in the same emotional state, cut one.

---

## Hard stops (non-negotiable)

**Colors**: Extract exact hex codes from the brand's CSS. Use them. Do not estimate or infer from category.

**Canvas**:
- Use `addFrameTask`, never `requestAnimationFrame`. Callback signature: `(info) => { const { ownCurrentTimeMs, durationMs } = info; }`
- A canvas element without a **complete** `addFrameTask` script is a broken composition — delete the scene rather than ship incomplete code
- If approaching output length, cut canvas scenes or replace with CSS animation. A 3-scene video with working canvas beats a 4-scene video with a broken one
- Canvas visual state at second 1 must differ visibly from second 20

**People**: Abstract shapes (circles, gradient blobs) cannot represent faces. Use real photography or draw recognizable facial features.

**Logo geometry**: If the brand has a recognizable silhouette, render it from its actual geometry. `fillRect()` for organic or clothing forms is prohibited.

**Named products**: At least one specific product name (not a category description) must appear.

---

## Completeness check (before outputting)

- Scene durations sum to target duration
- No canvas element without a complete `addFrameTask` script
- Output ends with complete closing tags (`</ef-timegroup>`, `</script>`, `</style>`)
- Every scene passes the substitutability gate
- The single argument is traceable through every scene

---

## Key Principles

- **The form is the argument** — if the video's visual structure could hold a different brand's truth, it is not specific enough
- **State change, not information transfer** — scenes exist to change how the viewer feels, not what they know
- **Prove, don't assert** — every claim requires a visual demonstration of the mechanism
- **One argument** — a video that makes multiple claims makes none

---

## Reference Files

- [references/brand-examples.md](references/brand-examples.md) — Category structural truths, false differentiators, visual specificity by vertical
- [references/composition-patterns.md](references/composition-patterns.md) — Canvas patterns, frameTask API, brand-specific visual requirements
- [references/genre-selection.md](references/genre-selection.md) — Genre palette and fitness checks
- [references/emotional-arcs.md](references/emotional-arcs.md) — Emotional arc patterns, short-form compression
- [references/editing.md](references/editing.md) — What to cut and when to stop
- [references/visual-metaphors.md](references/visual-metaphors.md) — Visual metaphor library
- [references/video-archetypes.md](references/video-archetypes.md) — Industry patterns
- [references/typography-personalities.md](references/typography-personalities.md) — Font personality and video timing
- [references/video-fundamentals.md](references/video-fundamentals.md) — Transitions, arcs, brand basics
