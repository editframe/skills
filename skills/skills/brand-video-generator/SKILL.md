---
name: brand-video-generator
title: Brand Video Generator
description: Generate video compositions from brand websites. Analyzes visual identity, messaging, and content hierarchy to create scene-by-scene video plans.
order: 50
license: MIT
metadata:
  author: editframe
  version: "2.0"
---

# Brand Video Generator

Transform a brand's website into a video composition plan that could not have been made for any other brand.

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

## The Protocol

Execute these eight operations in order. Each operation constrains the next. Return to earlier operations if a later one fails.

---

### Operation 1: DERIVE the structural truth

**Find one thing that is true about this brand that would be false about any competitor.**

The answer must be:
- **Structural or foundational** — a decision, a relationship, a material fact about how the brand works. Not a marketing position (which can be copied) but a truth (which cannot).
- **Architecturally specific** — For technical products, identify the core design decision that shapes everything else. Examples: 'A payments API treats every financial operation as a programmable API object with the same interface — payment intents, subscriptions, and invoices share a design philosophy.' 'A browser-native design tool's multiplayer is not a feature — the file format assumes multiple simultaneous editors.' The truth should explain WHY the product works the way it does, not WHAT it does.
- **Temporal test**: Could a well-funded competitor truthfully claim the same thing next year? If yes, dig deeper.
- **Substitute test**: Swap the brand name. Does the answer still hold? If yes, it's not specific enough.

**This truth must appear in the composition as a concrete visual artifact, not just inform the tone.** If you cannot point to a specific element in the composition that would be false about a competitor, the truth has not been operationalized.

**Authorial perspective**: After identifying the structural truth, identify what the video will say about it that the brand does not say about itself. The brand's own marketing already states their positioning. Your composition must add a perspective the brand hasn't articulated:

- **What tension or vulnerability does this truth create?** (e.g., a brand whose product is invisible infrastructure creates dependency the customer can't see)
- **What does this truth reveal about the audience?** (e.g., what does it say about a user community that they built the brand before the brand existed?)
- **What industry norm does this truth contradict or expose?** (e.g., a repair-first brand's approach implicitly argues that all other apparel brands design for disposal)

**The perspective test**: State your authorial angle in one sentence: "This video argues [X] which this brand's own marketing never says because [Y]." If you cannot complete this sentence, you are illustrating, not interpreting.

*If you cannot identify a non-transferable structural truth, ask the user for more context before proceeding.*

---

### Operation 2: CONSTRAIN the form

**What does the structural truth force on the video's mechanics — not just its content?**

The brand truth must determine the video's **structure**. "Structure" means timing, motion mechanics, and compositional logic — not narrative order or subject matter.

- If the truth is about *removal*, scenes must subtract elements — not add them.
- If the truth is about *speed*, transitions must feel fast — not claim fastness in text.
- If the truth is about *unification*, the same visual element must appear across multiple contexts within the video — not separate scenes claiming unity.
- If the truth is about *community*, real people must be present — abstract shapes cannot represent faces.

**State the formal constraint as a rule visible in motion**: "Because [truth], this video [does X mechanically]."

**Single-argument rule**: The video may make only ONE argument. State it as: "This video argues [X] by showing [Y]." If [Y] could illustrate a different argument, the form is not embodying the argument. Rewrite until the visual approach is inseparable from the claim.

*If you cannot identify a structural consequence of the brand truth, you have not found the real truth yet. Return to Operation 1.*

---

### Operation 3: SELECT the genre

**The video type given as input is a functional objective, not a genre.** Genre is the formal language the video speaks.

**Step 1: Classify the brand's primary appeal mode**

- **Rational appeal** — product chosen for what it *does* (developer tools, B2B SaaS, financial services)
- **Sensory/aesthetic appeal** — product chosen for how it *feels* or *looks* (cosmetics, fashion, food, interiors)
- **Community/identity appeal** — product chosen for *who else uses it* (lifestyle brands, fitness, music, culture)
- **Mixed** — rational + one of the above

**Step 2: Derive the genre from appeal mode + objective**

Do not default to the genre you most often produce. Derive it.

| Appeal mode | Objective | Genre |
|---|---|---|
| Rational | Demo / explainer | Feature demonstration, problem-solution, UI walkthrough |
| Rational | Launch / awareness | Announcement, reveal, proof-of-concept |
| Sensory/aesthetic | Awareness / social | Mood film, visual essay, texture reel |
| Sensory/aesthetic | Product | Product poetry — object in motion, no narration |
| Community/identity | Awareness | Community portrait, faces film, cultural artifact |
| Community/identity | Social | Participatory/UGC-style, trend-adjacent |
| Mixed | Any | Hybrid: lead with the dominant appeal mode |

**Step 3: Verify genre coherence with the formal constraint from Operation 2.**

The genre must be compatible with the mechanical constraint. If they conflict, revise one until they cohere.

*Output: one sentence — genre name + reasoning.*

See [references/genre-selection.md](references/genre-selection.md) for a full palette with formal characteristics.

---

### Operation 4: INTAKE the brand's visual vocabulary

Extract from the website AND all accessible materials (social channels, existing video, packaging). For sensory/aesthetic and community brands, Instagram or TikTok often reveals more than the homepage.

**Collect:**

- **Exact hex codes** for primary, secondary, and accent colors — from CSS inspection, not estimation. These hex codes MUST appear in the final composition's CSS. Category-generic palettes (earth tones for sustainability, blue for tech) are prohibited unless they are the brand's documented colors.
- **Typography** — font family names and weight/style variants actually used.
- **Visual register** — the adjective that describes the brand's visual language (clinical precision, warm grain, maximalist energy, austere minimalism).
- **Brand-specific visual elements** — 3+ elements unique to this brand that must appear in the composition: logo geometry, UI components, iconography, packaging forms, photographic style.
- **Named products and features** — List specific product names (not category descriptions) that must be referenced. For a payments API: the actual API objects and specific sub-products by their official names, proprietary terminology. Generic category terms ('fraud detection', 'subscriptions') are prohibited when branded names exist.
- **Verifiable metrics** — Extract actual numbers from the website that only this brand could claim. '700M+ API requests daily' is specific; 'millions of transactions' is generic. If no specific metrics are found, note this gap and ask the user.
- **Known marks** — if the brand has a recognizable logo silhouette or product shape, that form must appear in canvas animations, not a generic category shape.
- **Photography register** — do people appear? Models or real people, posed or candid? This is a primary brand signal.
- **Specific numbers** — extract actual metrics from the website for use in compositions.

**If working from training knowledge only (no live browser):**
- Use verifiable brand hex codes only — if uncertain, state this and use black/white until confirmed.
- Reference specific named products by their actual names — not category descriptions.
- Reference specific community artifacts by their actual names — no placeholder handles (@user, @reader, @customer are prohibited).
- Draw logo and product forms from their actual geometry — `fillRect()` for clothing or organic forms is prohibited.

**Composition brand-fit test**: Verify before finalizing: (1) brand hex codes appear in CSS, (2) at least one brand-specific UI element or visual mark is rendered, (3) any stated metrics match the website.

---

### Operation 5: PLAN the viewer state arc

**Before writing scenes, plan the emotional journey as a sequence of state changes.**

A state change is not a topic change. The viewer must *feel differently* — not just *know more*.

1. Define the **initial state**: What does the viewer feel at frame 1? (skepticism, indifference, mild curiosity — not awareness of the brand)

   **Viscerality test for problem states**: If the initial state involves frustration or pain, the scene must SHOW the friction, not declare it. 'You need a backend' is a declaration. A developer staring at three terminal windows, each failing differently, is shown frustration. The viewer must recognize their own experience, not be told about a category of experience.

2. Define the **final state**: What do they feel at the last frame that they didn't feel at the first? (Name the specific emotion — not "informed")
3. Define the **minimum path** between them: What is the fewest number of distinct state changes required to get from initial to final?

**Scene budget**: `floor(duration_seconds / 10)` is your maximum. A 15s video gets 1-2 scenes. A 30s video gets 3. A 60s video gets 6. For videos ≤20s: can this be told in 2 scenes? If you have more, collapse before planning.

**Every planned state must be:**
- **Felt, not registered** — "they now know what the brand does" is information, not state change. State change requires discomfort, recognition, surprise, or desire.
- **Escalating** — each successive state must have higher stakes or deeper consequence than the previous. Flat sequences are prohibited.
- **Distinct** — if two adjacent states could be described with the same feeling word, collapse them.

**For the opening state specifically**: The first scene must create tension, not state a value. The viewer must react to something before they can be informed.

---

### Operation 6: SEQUENCE the scenes

**Map scenes to state transitions. Each scene is responsible for exactly one state change.**

For each scene, complete this template:

```
Scene [N]: [Name] ([start]s-[end]s)
- VIEWER STATE AT START: [What does the viewer feel/think/know entering this scene?]
- VIEWER STATE AT END:   [What has changed? What do they feel/think/know now?]
- STATE DISTINCTNESS CHECK: [One emotion/state from this scene not available in any prior scene. If none, this scene is redundant — cut or redesign.]
- ADJACENT SCENE REGISTER CHECK (scenes 2+): [Previous scene's end state. Confirm this scene's end state is categorically different.]
- STATE CHANGE MECHANISM: [The specific technique: contrast, surprise, scale revelation, effort elimination. 'Demonstration' or 'showing how it works' = informational, not transformational — rewrite.]
- ESCALATION CHECK (scenes 2+): [How do stakes or intensity INCREASE from the previous scene?]
- CLAIM DEMONSTRATION CHECK (for structural claims): [If claiming a property (unified, fast, everywhere), what visual evidence proves it? Show the mechanism in action — not the outcome metric.]
- COMPETITOR DIFFERENTIATION CHECK (Scene 1): [Could this visual appear in a competitor's own marketing unchanged? If yes, rewrite. Name the specific pain this brand's users would recognize that no other brand's users would.]
- PROOF REQUIREMENT: [Evidence for any claim. Statistics alone are not proof — show the mechanism that made the number possible. Causation, not correlation.]
- PRIMARY VISUAL: [Main visual element — not just text]
- MOTION/ANIMATION: [How it moves; specific CSS or frameTask approach]
- VISUAL METAPHOR: [What concept this shows visually]
- Text: [Minimal — only if essential]
- JUSTIFICATION: [Why does this scene exist? What would be lost without it?]
- REDUNDANCY CHECK: [Every text element. Do any two communicate the same idea? Cut one.]
```

**After all scenes, write the PoV trace**: Restate the formal constraint from Operation 2. For each scene, one sentence explaining how its structure follows from that constraint. If a scene cannot be traced, cut or rewrite it.

**Sequencing rules:**
- No two adjacent scenes may use the same structural form (canvas + text overlay, canvas + text overlay = same form — prohibited).
- If 3+ items share the same structural relationship to a core concept, they must be consolidated into one scene showing the unified relationship — not enumerated as separate scenes.
- Feature sequences must build causally — each scene's impact must depend on the previous scene having landed. If scenes can be reordered without loss, they are a list, not an argument.
- Problem/pain scenes must run long enough for the viewer to inhabit the state — minimum 5-8s. Canvas accumulation animations must reach visual peak before the scene cuts.

---

### Operation 7: PROVE each claim visually

**Visual form must demonstrate, not assert.**

For every claim in the composition:
- **Structural claims** (unified, everywhere, consistent): show the same element appearing in multiple distinct contexts — not text stating the property.
- **Scale claims** (millions of users, transactions): show the mechanism that enabled that scale first — not the number alone.
- **Community claims** (real people, authentic): show actual human features, named individuals, or specific artifacts — not geometric abstractions. A circle is not a face.
- **Authenticity claims** (real skin, honest ingredients): the visual must communicate the claim without the text. Cover the text. Does the image alone prove it? If not, redesign.

**The substitute test applied to every scene**: Replace the brand name and colors. Could this scene appear in a competitor's video unchanged? If yes, the scene is decorating a generic concept, not proving a specific truth.

---

### Operation 8: ASSEMBLE the composition

Plan assets and implement the composition.

**Assets:**
- Visual: list each with source (website download / Canvas API / generate)
- At least one named product must appear (not category — the actual product name)
- At least one brand-specific visual mark must be rendered
- **Specificity floor for social/community brands:** For brands whose truth involves customer co-creation or community feedback, the composition MUST include at least one of: (1) a specific product name that resulted from customer input, (2) a verbatim customer quote or paraphrased real feedback, (3) a specific campaign, reformulation, or launch tied to the brand's listening practice. 'Customer feedback' as an abstract concept is prohibited — show the specific artifact that feedback created.

**Implementation:**
- Canvas animations: use `addFrameTask`, never `requestAnimationFrame`. The callback receives an `info` object: `(info) => { const { ownCurrentTimeMs, durationMs } = info; }`.
- Canvas animations must evolve with the narrative — the visual state at second 1 must differ from second 20. See [references/composition-patterns.md](references/composition-patterns.md).
- Text animations: specify CSS animation or `split` attribute.
- A `<canvas>` element with no `addFrameTask` script is a broken composition.

**Audio:**
- Music mood/tempo
- Voiceover tone (if needed)

---

## Completeness Check (before outputting)

- Scene count in plan matches scene count in HTML
- Scene durations sum to target duration
- Each scene title describes what the scene actually shows
- No canvas element without a complete `addFrameTask` script
- Output ends with complete closing tags (`</ef-timegroup>`, `</script>`, `</style>`)
- PoV trace is complete — every scene traces to the formal constraint from Operation 2
- CTA follows from the formal constraint — not generic marketing language
- If the composition would exceed output limits, split at a scene boundary and state this explicitly

---

## Key Principles

- **The form is the argument** — if the video's visual structure could hold a different brand's truth, it is not specific enough
- **State change, not information transfer** — scenes exist to change how the viewer feels, not what they know
- **Prove, don't assert** — every claim requires a visual demonstration of the mechanism
- **One argument** — a video that makes multiple claims makes none

## Reference Files

- [references/brand-examples.md](references/brand-examples.md) — Category-specific examples of structural truths, false differentiators, and visual specificity by vertical
- [references/composition-patterns.md](references/composition-patterns.md) — Canvas animation patterns, frameTask API, visual language consistency
- [references/genre-selection.md](references/genre-selection.md) — Full genre palette with formal characteristics
- [references/emotional-arcs.md](references/emotional-arcs.md) — Emotional arc patterns by video type
- [references/visual-metaphors.md](references/visual-metaphors.md) — Visual metaphor library
- [references/video-archetypes.md](references/video-archetypes.md) — Industry patterns
- [references/video-fundamentals.md](references/video-fundamentals.md) — Transitions, arcs, brand basics
- [references/editing.md](references/editing.md) — What to cut and when to stop
