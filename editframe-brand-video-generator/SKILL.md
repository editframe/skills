---
name: editframe-brand-video-generator
description: Generate video compositions from brand websites or descriptions. Produces an inspectable creative brief before generating HTML.
license: MIT
metadata:
  author: editframe
  version: 0.45.8
---


# Brand Video Generator

Two-pass pipeline. First produce an inspectable brief. Then generate the composition from it.

---

## Step 0 — Fetch the brand (do this first, before anything else)

**If a URL is supplied**: immediately fetch it with WebFetch or your browser tool — before reading any further instructions, before thinking about the brief, before any other action. Extract exact hex codes from the page's CSS. Download or note 3–5 brand assets (logo, product screenshots, key imagery). Do not proceed until you have done this.

**If you cannot access the URL**: stop here. Report the failure and ask whether to proceed from a text description instead.

**If only a text description is supplied**: ask the user for anything critical that's missing — specific product names, hex codes, recognizable visual marks — before generating the brief.

Do not infer colors or visual language from memory or text descriptions of a site. Only exact values from the live page are acceptable.

---

## Input

- **Brand**: URL or text description
- **Video Type**: `launch` | `product-demo` | `explainer` | `brand-awareness` | `social`
- **Duration**: `15s` | `30s` | `60s` | `90s` (optional)
- **Platform**: `web` | `instagram` | `tiktok` | `youtube` | `linkedin` (optional)

---

## Pass 1 — The Brief

Answer these four questions. Output them as a readable document the developer can inspect, correct, or approve before generation begins.

**Do not skip to HTML. The brief is required output.**

---

### 1. Structural truth

One thing true of this brand that is false of any direct competitor.

Not a marketing claim. A material fact: a decision the brand made, a relationship it has, a mechanism it invented. The truth must be structural — if a well-funded competitor could claim the same thing next year, dig deeper.

**Substitute test**: swap the brand name into the statement. Does it still hold? If yes, it's not specific enough.

Output:
```
Structural truth: [one sentence]
Substitute test: [why this fails for Competitor A and Competitor B]
```

---

### 2. Formal constraint

What the structural truth forces on the video's *mechanics* — not its subject matter.

Structure means timing, motion logic, and compositional form. If the truth is about removal, scenes must subtract elements. If it's about unification, the same visual element must thread through multiple contexts. If it's about community, real faces must appear.

State it as a rule: "Because [truth], this video [does X mechanically]."

Output:
```
Formal constraint: [one rule in motion terms]
Single argument: "This video argues [X] by showing [Y]."
```

If [Y] could illustrate a different argument, the form isn't embodying the truth yet — rewrite.

---

### 3. Authorial angle

What the video argues that the brand's own marketing does not say.

Complete: *"This video argues [X] which this brand's marketing never says because [Y]."*

If [X] is already on their homepage, the composition is illustration, not argument. Find the interpretation: what tension does this truth create? What does it reveal about the audience? What norm does it contradict?

**Category truth vs. brand angle:** If the authorial angle could be claimed by any direct competitor in the same category, it's a category truth, not an angle. 'Unification beats fragmentation' is true of ALL payment aggregators. A valid angle must reference something only THIS brand can claim:
- Their specific customer roster or market position
- Their specific technical decision that shaped the product's architecture
- Their specific philosophy made visible in a product choice competitors didn't make

**For payments APIs specifically**: 'Unified API' is category-level. Valid angles include: built unified from day one (vs. acquired-and-integrated competitors), developer-first design philosophy (documentation as product), specific mission statements ('increase GDP of the internet'), or the decision to expose primitives rather than hide complexity. State which architectural philosophy the video will argue.

Rewrite until the angle fails the substitute test.

**Category trap**: "fragmentation is bad, unification is good" is a category-level narrative any competitor can use. "This specific brand's unification works because [architectural reason no competitor has]" is a brand angle. If the argument could be the headline of a competitor's ad campaign, dig deeper.

Output:
```
Authorial angle: [one sentence]
Why the brand wouldn't say this: [one sentence]
```

---

### 4. Felt arc

The emotional journey from frame 1 to the last frame.

Name the emotion at entry and at exit. They must differ. Then define the minimum path — the fewest distinct state changes required to move between them.

Scene budget: `floor(duration_seconds / 10)` maximum. 15s → 2 scenes. 30s → 3. 60s → 6.

Output:
```
Entry state: [what the viewer feels at frame 1]
Exit state:  [what the viewer feels at the last frame]
Arc:         [entry] → [intermediate state if needed] → [exit]
Scene budget: [N scenes maximum]
```

---

### Brief checkpoint

After outputting the brief, pause and ask:

> "Does this brief look right? I'll generate the composition once you confirm, or adjust any section now."

If the user confirms or says to proceed: move to Pass 2.
If the user corrects any section: revise that section only, then ask again before generating.

---

## Pass 2 — The Composition

Generate HTML from the confirmed brief. Every decision traces back to the brief's formal constraint.

### The single gate

Before placing any element — scene, visual, canvas animation, line of text — ask:

> **Could a direct competitor's marketing team use this exact element unchanged?**

If yes: delete it and find what only this brand could use. Apply recursively.

### Scene rules

- Each scene earns its place by changing the viewer's emotional state. State the transition for every scene: "viewer enters feeling [X], exits feeling [Y]." Information-only scenes get cut.
- No two adjacent scenes may leave the viewer in the same state.
- Feature sequences must build causally — if scenes can be reordered without loss, they're a list, not an argument.
- Prove, don't assert: "unified" is shown by one element appearing in multiple contexts, not by text saying "unified."

### Hard stops

**Colors**: Use exact hex codes from the brief (extracted from CSS or provided). Do not estimate.

**Canvas**:
- Use `addFrameTask`, never `requestAnimationFrame`. Callback: `(info) => { const { ownCurrentTimeMs, durationMs } = info; }`
- A canvas without a complete `addFrameTask` script renders nothing — delete the scene rather than ship broken code
- If approaching output length, cut canvas scenes or replace with CSS animation; a working 3-scene video beats a broken 4-scene one
- Canvas visual state at second 1 must differ visibly from second 20

**People**: Circles and gradient blobs cannot represent faces. Use real photography or draw recognizable facial features.

**Logo geometry**: Render from the brand's actual geometry. `fillRect()` for clothing or organic forms is prohibited.

**Named products**: At least one specific product name (not a category description) must appear.

### Completeness check

Before outputting:
- [ ] Scene durations sum to target duration EXACTLY (e.g., 60s request = 60s total)
- [ ] No canvas element without a complete `addFrameTask` script
- [ ] Output ends with `</ef-timegroup>`, `</script>`, `</style>` — verify closing tags are present
- [ ] Every scene passes the substitutability gate
- [ ] The single argument is traceable through every scene
- [ ] **Final scene exists**: Composition must include a closing/CTA scene (typically 4-8s) that resolves the arc
- [ ] **Duration accounting**: List each scene's duration in a comment before output to verify sum: `<!-- Scene 1: 8s, Scene 2: 12s, Scene 3: 24s, Scene 4: 16s = 60s total -->`

**If approaching output length limits:** Stop adding scenes. A complete 45s video is better than a truncated 60s video. Reduce scene count or simplify canvas animations rather than producing incomplete code.

---

## Reference Files

- [references/brand-examples.md](references/brand-examples.md) — Structural truths, false differentiators, visual specificity by category
- [references/composition-patterns.md](references/composition-patterns.md) — Canvas patterns, frameTask API, visual specificity requirements
- [references/genre-selection.md](references/genre-selection.md) — Genre palette and fitness checks
- [references/emotional-arcs.md](references/emotional-arcs.md) — Arc patterns, short-form compression
- [references/editing.md](references/editing.md) — What to cut
- [references/visual-metaphors.md](references/visual-metaphors.md) — Visual metaphor library
- [references/video-archetypes.md](references/video-archetypes.md) — Industry patterns
- [references/typography-personalities.md](references/typography-personalities.md) — Font personality and timing
- [references/video-fundamentals.md](references/video-fundamentals.md) — Transitions, arcs, brand basics

### Factual verification requirement

Every statistic, figure, or quantified claim in the brief MUST be:
1. Directly sourced from the brand's website, press releases, or official communications
2. Attributed with specific context (what, where, when)
3. If no verifiable figure exists, state the structural truth qualitatively rather than fabricating a number

**Do not invent statistics.** When in doubt, quote the brand's own language verbatim rather than paraphrasing into invented specifics. The brand's actual tagline is more verifiable and more powerful than a plausible-sounding invented metric.
