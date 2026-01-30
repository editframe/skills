---
name: brand-video-generator
description: Generate video compositions from brand websites. Analyzes visual identity, messaging, content hierarchy, and creates scene-by-scene video plans with asset requirements. Use when creating branded video content from a company website URL.
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Brand Video Generator

Transform a brand's website into a strategic video composition plan.

## Quick Start

Provide a website URL and video objective. The skill will:
1. Analyze brand visual identity (colors, typography, design language)
2. Analyze brand voice and messaging tone
3. Extract content hierarchy and key messages
4. Synthesize a creative brief
5. Plan scene-by-scene video structure
6. Specify asset requirements

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

**If you cannot access the website with browser tools, STOP and report this.**

## Process

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
- Core value propositions
- Emotional positioning

**Content Hierarchy:**
- Hero message (H1, above-fold)
- Supporting points (2-3 key benefits)
- Social proof (testimonials, metrics)
- Primary CTA

### Phase 2: Creative Brief

**Video Objective:**
- Primary goal (awareness, education, conversion)
- Key takeaway for viewer

**Message Structure:**
- Opening hook (3 seconds)
- Core message (one sentence)
- Supporting points (2-3 benefits)
- Emotional arc (start → middle → end feeling)
- Call-to-action

**Visual Treatment:**
- Pacing (fast/medium/slow)
- Motion style (snappy/smooth)
- Color usage (how to apply brand palette)
- Overall mood (match brand personality)

### Phase 2.5: Video Worthiness Assessment (MANDATORY)

**Before planning scenes, answer these:**

1. **Visual Metaphors**: List 5+ specific visual metaphors you'll use (not just text)
2. **Motion Justification**: What will motion/animation add that static images cannot?
3. **Asset Inventory**: What visual assets are available? What can you create with Canvas API?
4. **Text Ratio**: Estimate % of screen time that's primarily text. If >50%, justify why this needs to be video.

**Visual Metaphor Quick Reference:**

| Concept | Visual Approach | Motion Style |
|---------|----------------|--------------|
| Chaos/Complexity | Tangled lines, scattered elements | Chaotic bezier curves |
| Order/Simplicity | Grid layouts, organized patterns | Smooth, organized appearance |
| Scale | Grid multiplication, zooming out | Rapid appearance, growing |
| Speed | Motion blur, streaking lines | Fast movements, trails |
| Growth | Upward arrows, expanding circles | Upward/expanding animation |
| Connection | Network nodes, linked elements | Lines connecting, coming together |
| Transformation | Before/after, morphing shapes | Smooth morphing, chaos→order |

**Canvas API Opportunities** (use `frameTask` for generative graphics):
- Particle systems (energy, activity)
- Bezier curves (chaos, complexity, connections)
- Grid multiplication (scale, quantity)
- Orbital motion (energy, dynamism)
- Shape morphing (transformation)

**Quality Gate**: If you cannot identify 5+ visual elements that justify video format, reconsider your approach.

### Phase 3: Scene Planning

For each scene:

```
Scene [N]: [Name] ([start]s-[end]s)
- PRIMARY VISUAL: [Main visual element - NOT just text]
- MOTION/ANIMATION: [How it moves, what animates]
- VISUAL METAPHOR: [What concept this shows visually]
- Text: [Minimal - only if essential]
- JUSTIFICATION: [Why video vs static image?]
```

**Example:**

```
Scene 2: Problem (4s-9s)
- PRIMARY VISUAL: Canvas animation - 50 tangled bezier curves
- MOTION/ANIMATION: Curves draw in real-time, increasing complexity
- VISUAL METAPHOR: Chaos/complexity of current infrastructure
- Text: "Managing infrastructure is chaos"
- JUSTIFICATION: Animation shows chaos building, can't be static
```

### Phase 4: Asset Requirements

**Visual Assets:**
- List each asset: [name] - [type] - [source: website/Canvas API/generate]

**Motion Graphics:**
- Text animations (style, timing)
- Canvas animations (particle systems, bezier curves, etc.)
- Transitions (type, duration)

**Audio:**
- Music mood/tempo
- Voiceover tone (if needed)

## Output Format

### 1. Brand Analysis
- Colors: [hex codes]
- Typography: [fonts]
- Design: [style]
- Tone: [voice]
- Key messages: [2-3 points]

### 2. Creative Brief
- Objective: [goal]
- Duration: [length]
- Core message: [one sentence]
- Emotional arc: [start] → [end]
- Pacing: [fast/medium/slow]

### 3. Video Worthiness
- Visual metaphors: [list 5+]
- Motion justification: [why video?]
- Text ratio: [%]

### 4. Scene Breakdown
[Use Phase 3 template for each scene]

### 5. Assets
- Visual: [list with sources]
- Motion: [animations/effects]
- Audio: [music mood]

## Key Principles

- **Show, don't tell**: Use visual metaphors, not text slides
- **Motion must add meaning**: Animation should enhance understanding, not just decorate
- **Brand assets first**: Extract from website before creating new
- **One focus per scene**: Don't cram multiple ideas
- **Strong hook**: First 3 seconds must grab attention

## Reference Files (Optional)

- [references/visual-metaphors.md](references/visual-metaphors.md) - Visual metaphor library
- [references/video-archetypes.md](references/video-archetypes.md) - Industry patterns
- [references/video-fundamentals.md](references/video-fundamentals.md) - Transitions, arcs, brand basics
