---
name: brand-video-generator
title: Brand Video Generator
description: Generate video compositions from brand websites. Analyzes visual identity, messaging, and content hierarchy to create scene-by-scene video plans.
order: 50
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Brand Video Generator

Transform a brand's website into a strategic video composition plan.

## Quick Start

Provide a website URL and video objective. The skill will:
1. Establish what makes this video specific and unrepeatable
2. Analyze brand visual identity (colors, typography, design language)
3. Analyze brand voice and messaging tone
4. Synthesize a creative brief
5. Plan scene-by-scene video structure with viewer-state tracking
6. Specify asset and motion requirements

## Input

- **URL**: Brand website to analyze
- **Video Type**: `launch` | `product-demo` | `explainer` | `brand-awareness` | `social`
- **Duration Target**: `15s` | `30s` | `60s` | `90s` (optional, will recommend if not specified)
- **Platform**: `web` | `instagram` | `tiktok` | `youtube` | `linkedin` (optional, affects format recommendations)

## CRITICAL: Tool Usage Requirements

**You MUST use browser tools to load the actual website before any analysis.**

1. Navigate to the URL with your available browser tools
2. Take screenshots of homepage and key pages
3. Inspect CSS to extract exact color hex codes
4. Download logo and brand assets (3-5 minimum)

**Do NOT:**
- Infer visual identity from text descriptions
- Assume design patterns based on industry
- Use text content as substitute for visual analysis
- Hallucinate brand colors, fonts, or design language
- Use `bars-n-tone.mp4` or any placeholder media in the final composition — use brand-color backgrounds, canvas animations, or actual product footage URLs instead

**If you cannot access the website with browser tools, STOP and report this.**

## Process

### Phase 0: Specificity Gate (MANDATORY — do this before touching the website)

Before any analysis, answer these four questions. Generic answers are disqualifying — if you can substitute another brand's name and the answer still holds, your answer is not specific enough.

**1. What is true about this brand that would be false about any competitor?**

The answer must be something structural or foundational — a decision, a relationship, a material fact about how the brand works or what it is. Not a marketing position (which can be copied) but a truth (which cannot).

**This answer must directly appear in the composition.** If your answer is "Glossier launched from Into The Gloss blog and user submissions," then Into The Gloss must be named or shown. If your answer is "they use real customer photos," specific customer attributions must appear. A philosophical reference to the truth without visual evidence is not specific enough.

Not specific enough:
- "They focus on quality and customer service" (every brand claims this)
- "They're authentic and community-driven" (every DTC brand says this)
- "They pioneered multiplayer design" (competitors have since copied this — it no longer differentiates)

Specific enough — by category:

*Software/developer tools*: "Their entire product is built on a single unified object model — a Charge in Radar is the same Charge in Connect and Billing; no translation layer." | "They removed the 'new file' concept entirely — there are no Figma files, only URLs."

*Consumer/lifestyle*: "They launched with no advertising — only photos submitted by real customers, which meant the product had to be worth photographing before it could be marketed." | "Every product is tested by the founder on herself for a minimum of 6 months before it ships."

*Physical goods / apparel*: "They don't sell seasons — they sell repairs. Their website has a 'Worn Wear' section that earns revenue from used items." | "The product is designed to be returned in the same bag it arrived in, zero-waste, no box."

*Food / beverage*: "They publish their supply chain — not as a PR move, but because the flavor is different depending on which farm and which harvest, and they name the farm on the bag."

**Temporal test**: Could a well-funded competitor truthfully claim the same thing next year? If yes, dig deeper. The answer you're looking for is structural — something that would take years to replicate, not months.

**2. What would be lost if this video never existed?**

Not: "People wouldn't know about the product" (that's true of any video).
Yes (SaaS): "Nobody would see the contrast between how chaotic their industry is and how calm their workflow actually is."
Yes (consumer): "Nobody would see that this product exists because of one specific community — and that the community came first."
Yes (apparel): "Nobody would see that the brand's entire supply chain is a design decision, not just a supply chain."

**3. What should the viewer feel at the last frame that they didn't feel at the first frame?**

This is a feeling, not a fact. "Informed" is not a feeling. Name the specific emotional movement:
- SaaS: "Like this problem is finally solved" | "Like building again is possible"
- Consumer beauty: "Like they already belong to something before they've bought anything"
- Apparel: "Like buying less is somehow an act of defiance they want to be part of"
- Food: "Like they've been eating anonymous food their whole life and just found out it has a name"

**4. What formal choice does answer #1 force on this video?**

The brand truth must determine the video's **structure** — not just its content. If the truth could be dropped into any template without changing the template, it isn't constraining anything.

*Structure follows truth — by category:*

Software: "Linear is opinionated — it removes decisions. So each scene removes one element until only the essential thing remains." | "Stripe's product is invisible when working. So the video shows the product by showing its absence — everything working without friction."

Consumer/lifestyle: "Glossier's brand is made of user faces, not product shots. So the video is structured as a handoff — each face passes the screen to the next, as if the product is passing between real people." | "The brand's truth is that no one looks like the models — so the structure is the absence of the usual model shot."

Physical goods: "The brand's truth is repair over replacement. So the video structure is reversal — damaged → restored — and every scene runs against the usual product-fantasy direction."

The answer to this question is your point of view. If you cannot identify a structural consequence of the brand truth, you have not found the real truth yet.

**If you cannot answer all four with specific, non-transferable answers, ask the user for more context before proceeding.**

The answers to Phase 0 determine the form of the video. Return to them at every subsequent phase.

---

### Phase 0.5: Genre Determination (MANDATORY — before website analysis)

The video type given as input (`launch`, `product-demo`, `explainer`, `brand-awareness`, `social`) is a **functional objective**, not a genre. Genre is the formal language the video speaks — and it must match the brand's category, audience, and sensibility. Getting genre wrong produces a video that is technically correct but tonally alien.

**The genre question**: Given what you already know about this brand from Phase 0, what is the appropriate *formal register* for this video?

**Step 1: Classify the brand's primary appeal mode**

- **Rational appeal** — the product is chosen for what it *does*. Audience is evaluating capabilities, price, or fit. (Developer tools, B2B SaaS, financial services, medical)
- **Sensory/aesthetic appeal** — the product is chosen for how it *feels* or *looks*. Audience is seeking identity, mood, or experience. (Cosmetics, fashion, food, fragrance, interiors)
- **Community/identity appeal** — the product is chosen for *who else uses it*. Audience is seeking belonging or self-expression. (Lifestyle brands, streetwear, music, fitness culture)
- **Mixed** — both rational and one of the above (e.g., a premium running shoe: rational performance claims + identity appeal)

**Step 2: Determine appropriate genre from appeal mode + video objective**

Do not default to the genre you most often produce. Derive it from the combination.

| Appeal mode | Objective | Appropriate genre |
|---|---|---|
| Rational | Product demo / explainer | Feature demonstration, problem-solution, UI walkthrough |
| Rational | Launch / awareness | Announcement, reveal, proof-of-concept |
| Sensory/aesthetic | Awareness / social | Mood film, visual essay, texture reel |
| Sensory/aesthetic | Product | Product poetry — the object in motion, no narration |
| Community/identity | Awareness | Community portrait, faces film, cultural artifact |
| Community/identity | Social | Participatory/UGC-style, duet-ready, trend-adjacent |
| Mixed | Any | Hybrid: lead with sensory, resolve with rational — or vice versa depending on where in the funnel |

**Step 3: Verify genre fitness against Phase 0 answers**

The chosen genre must be compatible with the Phase 0 formal constraint. If Phase 0 Q4 says "the structure is absence — everything working without friction," a loud announcement-style genre is wrong even if the objective is a launch. Revise the genre or revise the constraint until they cohere.

**Anti-patterns by appeal mode:**

*Rational brands choosing sensory genre*: A B2B data pipeline company producing a wordless mood film confuses its audience. They came to evaluate, not feel. Give them something to evaluate.

*Sensory/aesthetic brands choosing rational genre*: A teen skincare brand producing a feature-list explainer with voiceover and UI screenshots kills the mood. The product is a feeling — make the video feel like that.

*Community brands erasing the community*: A streetwear brand producing a polished product-showcase with no people in it has removed the only thing that differentiates it.

**Output of this phase**: One sentence stating the genre and the reasoning.

Example: "Mood film — Glossier's appeal is sensory/community, the objective is brand awareness for Instagram, and the Phase 0 truth (brand built from user faces, not product shots) forces a community-portrait structure. A product demo would be genre-wrong."

Example: "Problem-solution explainer — Stripe's appeal is rational (developers evaluating infrastructure), the objective is a 60s explainer for web, and the Phase 0 truth (invisible product, absence of friction) is best expressed by contrasting a world with friction against one without."

See [references/genre-selection.md](references/genre-selection.md) for a full genre palette with formal characteristics and appropriate contexts.

---

### Phase 1: Brand Analysis

Extract from the loaded website **and any other material you can access** (social channels, existing video, press, packaging). The website is the minimum — brands whose primary communication is visual (consumer, lifestyle, fashion, food) often reveal more on Instagram or TikTok than on their homepage.

**Material intake — gather from all accessible sources:**

*Website*: Homepage, product pages, About page — extract visual identity, messaging hierarchy, and tone.

*Social channels* (if accessible via browser tools): What does the brand's Instagram/TikTok grid look like? What is the ratio of product shots to people shots to lifestyle shots? What is the cadence — polished campaign imagery, or raw UGC-style content? This reveals the brand's actual visual register, which often differs from the website.

*Existing brand video* (if available on website or YouTube): What genre does the brand already use? What is the editing tempo? Is there narration? Music-forward or dialogue-forward? Existing brand video is a strong signal — either match it (brand consistency) or deliberately depart from it (if the brief calls for something new).

*Packaging / physical materials* (if shown): For physical goods brands, the packaging design is often the densest visual identity signal. Color, material texture, typography choices here are more precise than any website could be.

**After intake, extract:**

**Visual Identity:**
- Color palette with exact hex codes (from CSS inspection if on website, or from visual estimation of photography)
- Typography (fonts and personality — clinical, handwritten, geometric, humanist?)
- Design language — the adjective that describes the brand's visual register (clinical precision, warm grain, maximalist energy, austere minimalism, playful chaos)
- Visual motifs: What recurring shapes, textures, or compositional choices appear across materials? (Soft grain on every photo? Hard diagonal compositions? Close-up skin texture? Abstract geometric patterns?)
- Photography style: Do people appear? If so, how — models or real people, posed or candid, diverse or singular aesthetic? This is a primary brand signal.

**Brand-Specific Visual Assets (MANDATORY):**
Before proceeding to creative brief, identify and note:
- The brand's logo form and any signature visual element
- 3-5 product shots or hero images from the website
- Any proprietary visual elements (icons, patterns, illustrations unique to this brand)

These must appear in the final composition. Generic visual representations (mountain silhouettes for outdoor brands, abstract lines for tech brands, gradient backgrounds) are prohibited unless they are literally the brand's own design language extracted from their materials. If brand-specific assets are limited, use:
- The actual logo (animated or static)
- Color-blocked backgrounds using exact brand hex codes
- Real screenshots or footage from the brand's existing video content

Canvas animations must depict brand-specific elements (the actual logo shape, actual product silhouettes, actual UI patterns) — not category-generic abstractions.

**Voice & Messaging:**
- Tone (friendly, authoritative, urgent, intimate, clinical, irreverent)
- Target audience: demographic signals from photography, copy register, and social content
- Core value propositions — **strip category-level claims** (see below)
- Emotional positioning: What does the brand want the viewer to feel *about themselves* after encountering the brand? (Empowered, seen, aspirational, smart, part of something)

**False differentiators — these describe every competitor too, ignore them:**
- "Real-time collaboration", "easy to use", "powerful", "fast", "reliable", "all-in-one"
- "Helps teams work better", "saves time", "increases productivity"
- "Trusted by thousands of companies"
- Developer/API brands: "instant deploys", "edge functions", "OAuth built in", "REST API", "100ms response times", "99.99% uptime", "zero config", "batteries included"
- Payment/fintech brands: "one platform", "payment chaos solved", "global payments", "secure transactions", "invisible infrastructure", "end-to-end payments"
- Design tools: "design and code together", "design faster", "multiplayer design", "browser-based", "files keep you apart"
- Workspace/productivity tools: "fragmented tools → unified workspace", "all-in-one", "where work happens", "write, plan, organize"
- Deployment platforms: "deploy on every git push", "preview URLs", "instant deploys", "global CDN", "serverless", "zero config deploys", "git push → live", "instant rollback", "edge network"
- Backend-as-a-service: "fragmented backend → unified platform", "Firebase alternative", "open source", "integrated platform", "one backend for everything"
- Consumer beauty/skincare: "clean ingredients", "dermatologist-tested", "for all skin types", "cruelty-free", "no harsh chemicals", "glow", "your skin but better"
- Lifestyle/apparel: "sustainable", "made with care", "designed for real life", "premium quality", "built to last", "timeless style", "wear it your way"
- Food/beverage: "real ingredients", "no artificial anything", "small batch", "crafted with love", "farm to table", "ethically sourced", "better for you"
- Fitness/wellness: "feel your best", "stronger every day", "your journey", "science-backed", "community-driven", "transform your body"

**The brand's marketing tagline is never the answer.** Your job is to find the structural truth underneath — what the brand *does architecturally* more than what it *claims in copy*.

For developer brands: what does this product ask developers to give up? (conventions, configurations, files) — that trade-off is usually the actual truth.
For design tools: what workflow step did this product eliminate that all predecessors required?
For workspace tools: what is the specific unit of information this product invented? (Notion's block, Coda's formula, Linear's issue)

A real differentiator is something that, if true about this brand, would be surprising or false about most competitors.

**Content Hierarchy:**
- Hero message (H1, above-fold)
- Supporting points (2-3 key benefits)
- Social proof (testimonials, metrics)
- Primary CTA

---

### Phase 2: Creative Brief

**Video Objective:**
- Primary goal (awareness, education, conversion)
- Key takeaway for viewer

**Message Structure:**
- Opening hook (3 seconds) — what earns the next 3 seconds?
- Core message (one sentence)
- Emotional arc (start → middle → end feeling from Phase 0)
- **Point of view** (Phase 0 answer #4): What structural/formal constraint does the brand truth impose? Name the constraint and explain how it will be visible in scene structure.
- Call-to-action — **must embody the PoV, not revert to generic marketing language.** "Try it free" abandons a perspective. A CTA that follows from the structural constraint ("Ship the thing you just built" for Vercel, "Close the issue" for Linear) maintains it.

**Visual Treatment:**
- Pacing (fast/medium/slow)
- Motion style (snappy/smooth)
- Color usage (how to apply brand palette)
- Overall mood (match brand personality)

---

### Phase 2.5: Video Worthiness Assessment (MANDATORY)

**Before planning scenes, answer these:**

1. **Visual Metaphors**: List 5+ specific visual metaphors you'll use (not just text)
2. **Motion Justification**: What will motion/animation add that static images cannot?
3. **Asset Inventory**: What visual assets are available? What can you create with Canvas API?
4. **Text Ratio**: Estimate % of screen time that's primarily text. If >50%, justify why this needs to be video.

Move the Visual Metaphor Quick Reference table from Phase 2.5 into Phase 3: Scene Planning, and add this enforcement rule immediately before the scene template:

**Scene 1 specificity gate**: The opening scene is most vulnerable to category-generic visuals. Before writing Scene 1, answer: "What would a competitor's video show for this same concept?" If your planned visual could appear in that competitor's video unchanged, it is not specific enough. For product-demos specifically:
- Do NOT open with abstract 'chaos' visualizations (tangled lines, scattered nodes, etc.)
- DO open with a recognizable pain point from this product's actual competitive landscape (e.g., for Linear: screenshot-style mockups of Jira's notification hell, Asana's nested project chaos, or the Slack-Jira-Notion tab-switching dance)
- The first 3 seconds must show something only THIS brand's users would recognize as their specific problem

**Visual Metaphor Quick Reference:**

These are starting points, not answers. The right-hand column is a generic default — replace it with something specific to this brand before using it.

| Concept | Generic default (avoid) | What to find instead |
|---------|------------------------|----------------------|
| Chaos/Complexity | Tangled bezier curves | What does chaos *look like for this product's users specifically*? |
| Collaboration | Converging dots, connecting lines | What does collaboration look like *in this product's actual interface*? (e.g., Figma: named cursors on a shared canvas) |
| Order/Simplicity | Grid layouts, organized patterns | What does resolution look like *in this product's own UI or workflow*? |
| Scale | Grid multiplication | What unit does this brand scale — requests, users, lines of code? Show that unit. |
| Speed | Motion blur, streaking lines | What is the before/after latency that this brand eliminates? Show the gap. |
| Growth | Upward arrows | What grows that is specific to this brand — is it a number, a graph, a team? |
| Connection | Network nodes | What specific things connect through this product that didn't connect before? |
| Transformation | Before/after morph | What is the named "before" state the brand's own users describe using? |

**Canvas API Opportunities** (use `frameTask` for generative graphics):
- Particle systems (energy, activity)
- Bezier curves (chaos, complexity, connections)
- Grid multiplication (scale, quantity)
- Orbital motion (energy, dynamism)
- Shape morphing (transformation)

**Video type determines visual strategy:**
- `product-demo`: Show the product in action — real UI screenshots if available, or styled HTML/CSS representations of the actual interface if not. Canvas animations for abstract mechanics only (data flow, request handling). Feature density: one demonstrable feature per scene — not a list.
- `explainer`: Metaphor allowed, but must be product-specific (see false differentiators). Each scene explains one thing.
- `brand-awareness` / `social` / `launch`: Metaphor and emotion over features. One image, one feeling, one motion.

**Quality Gate**: If you cannot identify 5+ visual elements that justify video format, reconsider your approach.

---

### Phase 3: Scene Planning

For each scene, use this template:

```
Scene [N]: [Name] ([start]s-[end]s)
- VIEWER STATE AT START: [What does the viewer feel/think/know entering this scene?]
- VIEWER STATE AT END:   [What has changed? What do they feel/think/know now?]
- STATE CHANGE MECHANISM: [What specific technique creates the shift? Options: contrast (before/after, with/without), surprise (expectation subverted), scale revelation (one thing revealed as many), effort elimination (50 lines → 1 line). If the mechanism is 'demonstration' or 'showing how it works', the scene is informational, not transformational — rewrite it.]
- PRIMARY VISUAL: [Main visual element - NOT just text]
- MOTION/ANIMATION: [How it moves, what animates, specific CSS or frameTask approach]
- VISUAL METAPHOR: [What concept this shows visually]
- Text: [Minimal - only if essential]
- JUSTIFICATION: [Why does this scene exist? What would be lost without it?]
```

**The viewer-state test**: If VIEWER STATE AT START and VIEWER STATE AT END are the same, the scene is not doing work. Cut it or change it until it does.

**Example:**

```
Scene 2: The Problem (4s-9s)
- VIEWER STATE AT START: Curious but skeptical — another infrastructure tool?
- VIEWER STATE AT END:   Recognized — this is the exact chaos they live with every day
- PRIMARY VISUAL: Canvas animation — 50 tangled bezier curves accumulating in real-time
- MOTION/ANIMATION: frameTask draws curves frame by frame, each adding complexity;
                    speed increases toward the end to convey overwhelm
- VISUAL METAPHOR: Infrastructure complexity made visible
- Text: "Managing infrastructure is chaos" (appears after curves fill the screen)
- JUSTIFICATION: The accumulating chaos is the exact feeling the product resolves.
                 Static image cannot show accumulation. Text alone cannot show it.
```

**Scene budget**: `floor(duration_seconds / 10)` is your maximum scene count. A 30s video gets 3 scenes. A 60s video gets 6. Start at the minimum and add only if the viewer-state arc requires it — not because you have things to say.

**Scene form variation**: No two adjacent scenes may use the same structural form (e.g., two consecutive scenes that are both "canvas animation + text overlay" or both "bullet list + headline"). Each scene should make a different visual move.

**Per-scene PoV check**: Each scene must visibly follow from Phase 0 answer #4. After writing each scene, ask: "Does this scene's structure exist because of the specific brand truth I identified, or would it appear in any video of this type?" If the latter, rewrite the scene or cut it. The structural constraint is the whole point — if it's not visible in scene 2, it won't be visible in scene 5 either.

---

### Phase 4: Asset Requirements

**Visual Assets:**
- List each asset: [name] - [type] - [source: website/Canvas API/generate]

**Specificity requirement for assets:**
- At least one named product must appear (not category — the actual product name from the website)
- At least one specific brand origin element (founding story detail, named community platform, specific location)
- User/community content must reference real sources (e.g., "placeholder for @username submission" or "Into The Gloss reader photo") — not generic "real people" claims
- If the brand has a known origin story (blog, founder story, community), it must be referenced visually, not just philosophically

**Motion Graphics:**
- Text animations (style, timing, specific CSS animation or `split` attribute)
- Canvas animations — **write the actual `addFrameTask` implementation**, not a description. A declared `<canvas>` element with no script is a broken composition. See `references/composition-patterns.md` for a complete example.
- Transitions (type, duration, CSS keyframes)

**Audio:**
- Music mood/tempo
- Voiceover tone (if needed)

---

## Output Format

### 1. Specificity Answers (Phase 0)
- What's unique: [non-transferable truth]
- What would be lost: [specific absence]
- Viewer feeling arc: [feeling at frame 1] → [feeling at last frame]

### 2. Brand Analysis
- Colors: [hex codes]
- Typography: [fonts]
- Design: [style]
- Tone: [voice]

### 3. Creative Brief
- Objective: [goal]
- Duration: [length]
- Core message: [one sentence]
- Scene count: [N scenes — justified]

### 4. Video Worthiness
- Visual metaphors: [list 5+]
- Motion justification: [why video?]
- Text ratio: [%]

### 5. Scene Breakdown
[Use Phase 3 template for each scene, including viewer-state fields]

After all scenes, add:
**PoV trace**: Restate Phase 0 answer #4 and show one sentence per scene explaining how each scene's structure follows from it. If any scene cannot be traced, rewrite or cut it.

### 6. Assets
- Visual: [list with sources]
- Motion: [animations/effects with implementation notes]
- Audio: [music mood]

---

## Completeness Check (before finalizing)

- Every scene in the plan is represented in the HTML
- No canvas element is present without a corresponding `addFrameTask` script
- The last scene is fully written — it does not trail off mid-sentence
- The PoV trace is complete — every scene can be traced to Phase 0 Q4
- The CTA does not read as generic marketing ("Try it free", "Get started", "Learn more") — it follows from the structural constraint

---

## Key Principles

- **Specificity over comprehensiveness**: One true thing beats five generic things
- **Viewer state is the measure**: Each scene must change how the viewer feels or thinks
- **Show, don't tell**: Use visual metaphors, not text slides
- **Motion must add meaning**: Animation should enhance understanding, not just decorate
- **The minimum that works**: Cut any scene that doesn't change viewer state

## Reference Files (Optional)

- [references/visual-metaphors.md](references/visual-metaphors.md) - Visual metaphor library
- [references/video-archetypes.md](references/video-archetypes.md) - Industry patterns
- [references/video-fundamentals.md](references/video-fundamentals.md) - Transitions, arcs, brand basics
- [references/editing.md](references/editing.md) - What to cut and when to stop
- [references/genre-selection.md](references/genre-selection.md) - Full genre palette with formal characteristics and appropriate contexts
