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

Before any analysis, answer these three questions. Generic answers are disqualifying — if you can substitute another brand's name and the answer still holds, your answer is not specific enough.

**1. What is true about this brand that would be false about any competitor?**

Not: "They focus on quality and customer service" (every brand claims this).
Yes: "They were founded by two researchers who spent eight years on a single problem before launching."

**2. What would be lost if this video never existed?**

Not: "People wouldn't know about the product" (that's true of any video).
Yes: "Nobody would see the contrast between how chaotic their industry is and how calm their workflow actually is."

**3. What should the viewer feel at the last frame that they didn't feel at the first frame?**

This is a feeling, not a fact. "Informed" is not a feeling. "Like this problem is finally solved" is a feeling.

**4. What formal choice does answer #1 force on this video?**

The brand truth must determine the video's structure — not just its content. If the truth could be dropped into any problem-solution-CTA template without changing the template, it isn't constraining anything.

Not: "Linear is fast, so I'll use snappy cuts" (any brand could 'be fast').
Yes: "Linear is opinionated — it removes decisions. So each scene removes one element until only the essential thing remains."

Not: "Stripe handles money, so I'll show a payment form" (category imagery).
Yes: "Stripe's product is invisible when working. So the video shows the product by showing its absence — everything working without friction."

The answer to this question is your point of view. If you cannot identify a structural consequence of the brand truth, you have not found the real truth yet.

**If you cannot answer all four with specific, non-transferable answers, ask the user for more context before proceeding.**

The answers to Phase 0 determine the form of the video. Return to them at every subsequent phase.

---

### Phase 1: Brand Analysis

Extract from the loaded website:

**Visual Identity:**
- Color palette with exact hex codes
- Typography (fonts and personality)
- Design language (minimal, bold, playful, etc.)
- Visual motifs (shapes, icons, image style)

**Voice & Messaging:**
- Tone (friendly, authoritative, urgent, etc.)
- Target audience signals
- Core value propositions — **strip category-level claims** (see below)
- Emotional positioning

**False differentiators — these describe every competitor too, ignore them:**
- "Real-time collaboration", "easy to use", "powerful", "fast", "reliable", "all-in-one"
- "Helps teams work better", "saves time", "increases productivity"
- "Trusted by thousands of companies"
- Developer/API brands: "instant deploys", "edge functions", "OAuth built in", "REST API", "100ms response times", "99.99% uptime"
- Payment brands: "one platform", "payment chaos solved", "global payments", "secure transactions"
- Design tools: "design and code together", "design faster", "real-time collaboration"

A real differentiator is something that, if true about this brand, would be surprising or false about most competitors. For developer brands, look for: *what does this product ask developers to give up?* (conventions, configurations, frameworks) — that's usually the actual truth.

**The brand's own marketing copy is not a differentiator.** The brand's website says what it wants you to believe. Your job is to find the structural truth underneath — the thing the brand *does* more than what it *says*.

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

**Visual Metaphor Quick Reference:**

These are starting points, not answers. The right-hand column is a generic default — replace it with something specific to this brand before using it.

| Concept | Generic default (avoid) | What to find instead |
|---------|------------------------|----------------------|
| Chaos/Complexity | Tangled bezier curves | What does chaos *look like for this product's users specifically*? |
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

**Quality Gate**: If you cannot identify 5+ visual elements that justify video format, reconsider your approach.

---

### Phase 3: Scene Planning

For each scene, use this template:

```
Scene [N]: [Name] ([start]s-[end]s)
- VIEWER STATE AT START: [What does the viewer feel/think/know entering this scene?]
- VIEWER STATE AT END:   [What has changed? What do they feel/think/know now?]
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

**Per-scene PoV check**: Each scene must visibly follow from Phase 0 answer #4. After writing each scene, ask: "Does this scene's structure exist because of the specific brand truth I identified, or would it appear in any video of this type?" If the latter, rewrite the scene or cut it. The structural constraint is the whole point — if it's not visible in scene 2, it won't be visible in scene 5 either.

---

### Phase 4: Asset Requirements

**Visual Assets:**
- List each asset: [name] - [type] - [source: website/Canvas API/generate]

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
