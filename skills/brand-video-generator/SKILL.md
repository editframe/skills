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

## Process

### Phase 1: Brand Analysis

#### Visual Identity
Fetch the website and extract:
- **Color Palette**: Primary, secondary, accent colors with hex codes
- **Typography**: Heading and body fonts, personality signals
- **Design Language**: Minimalist, maximalist, gradient-heavy, flat, etc.
- **Spatial Rhythm**: Whitespace usage, grid patterns, information density
- **Visual Motifs**: Recurring shapes, iconography style, image treatment

Reference [references/color-psychology.md](references/color-psychology.md) for color emotional associations.
Reference [references/typography-personalities.md](references/typography-personalities.md) for font personality signals.

#### Voice & Messaging
Analyze website copy for:
- **Tone**: Authoritative, friendly, urgent, aspirational, playful, serious
- **Target Audience**: Signals from language sophistication and topics
- **Value Propositions**: Core benefits and differentiators
- **Emotional Positioning**: What feeling the brand evokes
- **Narrative Structure**: Problem/solution, feature-led, transformation, etc.

#### Content Hierarchy
Extract and rank:
- **Hero Message**: Primary H1 and above-fold content
- **Supporting Points**: Secondary messages and benefits
- **Social Proof**: Testimonials, metrics, credibility markers
- **Call-to-Action**: Primary and secondary CTAs

### Phase 2: Creative Brief Synthesis

Combine analysis into strategic brief:

#### Video Objective
Based on video type and brand analysis, define:
- Primary goal (awareness, education, conversion, engagement)
- Success metrics concept
- Key takeaway for viewer

#### Core Message & Structure
- **Opening Hook** (first 3 seconds): Attention grabber
- **Core Message**: Main point to communicate
- **Supporting Points**: 2-3 key benefits/features
- **Emotional Arc**: Start feeling → middle feeling → end feeling
- **Call-to-Action**: What viewer should do next

#### Visual Treatment
Based on brand identity:
- **Pacing**: Fast/energetic vs slow/contemplative
- **Motion Style**: Snappy cuts vs smooth transitions
- **Color Usage**: How to apply brand colors
- **Typography Treatment**: How text should appear
- **Overall Mood**: Align with brand personality

Reference [references/video-archetypes.md](references/video-archetypes.md) for common patterns by industry.
Reference [references/emotional-arcs.md](references/emotional-arcs.md) for proven narrative structures.

### Phase 3: Scene Planning

Break brief into specific scenes with timing:

For each scene, define:
- **Duration**: Specific timing (e.g., "0s-3s", "3s-8s")
- **Visual Content**: What's on screen
- **Text Overlay**: Any text to display (if applicable)
- **Voiceover/Copy**: Spoken or written message
- **Transition**: How to transition to next scene
- **Motion Principles**: Animation style and timing

Reference [references/transition-styles.md](references/transition-styles.md) for transition types and emotional impact.
Reference [references/visual-metaphors.md](references/visual-metaphors.md) for representing abstract concepts.

#### Scene Structure Template

```
Scene 1: Hook (0s-3s)
- Visual: [Brand logo with dynamic entrance]
- Text: [Optional tagline]
- Motion: [Quick, energetic entrance]
- Purpose: Grab attention

Scene 2: Problem/Context (3s-8s)
- Visual: [Relevant imagery or abstract visual]
- Text: [Problem statement or context]
- Voiceover: [Narration if needed]
- Motion: [Smooth, building tension]
- Purpose: Establish relevance

Scene 3: Solution (8s-15s)
- Visual: [Product/service in action]
- Text: [Key benefit]
- Motion: [Confident, clear]
- Purpose: Present solution

[Continue for target duration...]

Final Scene: CTA
- Visual: [Brand logo + contact/action]
- Text: [Clear call-to-action]
- Motion: [Strong, decisive]
- Purpose: Drive action
```

### Phase 4: Asset Requirements

For each scene, specify:

#### Visual Assets Needed
- **Type**: Photography, illustration, abstract, product shot, data visualization, text-only
- **Style**: Match to brand visual identity
- **Source**: Extract from website, generate new, or use stock
- **Specifications**: Dimensions, format, any special requirements

#### Motion Graphics
- **Text Animations**: Style, timing, easing
- **Transitions**: Type and duration
- **Effects**: Any special effects needed

#### Audio
- **Music**: Mood, tempo, genre (based on brand personality)
- **Voiceover**: Tone, pacing (if needed)
- **Sound Effects**: Any accent sounds

## Output Format

Provide a comprehensive plan with these sections:

### 1. Brand Analysis Summary
```
Visual Identity:
- Primary Colors: [hex codes with emotional associations]
- Typography: [fonts and personality]
- Design Language: [classification]
- Overall Personality: [3-5 traits]

Voice & Messaging:
- Tone: [description]
- Target Audience: [description]
- Key Value Props: [list]
- Emotional Positioning: [description]

Content Hierarchy:
- Hero Message: [main message]
- Supporting Points: [2-3 points]
- Primary CTA: [action]
```

### 2. Creative Brief
```
Video Objective: [goal]
Duration: [recommended length]
Target Platform: [platform considerations]

Core Message: [one sentence]
Emotional Arc: [start] → [middle] → [end]

Visual Treatment:
- Pacing: [fast/medium/slow]
- Motion Style: [description]
- Color Usage: [how to apply brand colors]
- Typography: [how text should appear]
```

### 3. Scene-by-Scene Breakdown
```
Scene 1: [Name] (0s-3s)
  Visual: [description]
  Text: [if any]
  Voiceover: [if any]
  Motion: [animation style]
  Transition Out: [type]
  Assets Needed: [list]

Scene 2: [Name] (3s-8s)
  [same structure]

[Continue for all scenes...]
```

### 4. Asset Manifest
```
Visual Assets:
1. [Asset name] - [type] - [specifications] - [source]
2. [...]

Motion Graphics:
1. [Description of animation/effect]
2. [...]

Audio:
- Music: [mood/genre/tempo]
- Voiceover: [tone/pacing] (if needed)
- SFX: [list if needed]
```

### 5. Implementation Notes
```
Technical Considerations:
- [Any special requirements]
- [Platform-specific notes]
- [Accessibility considerations]

Next Steps:
1. [First action item]
2. [Second action item]
3. [...]
```

## Common Scenarios

### Minimal Website Content
If website has limited content:
1. Extract what exists
2. Make reasonable inferences based on industry patterns
3. Flag low confidence areas
4. Suggest competitor analysis to fill gaps

### Inconsistent Brand Signals
If visual and messaging don't align:
1. Identify the dominant pattern (more evidence)
2. Flag the inconsistency in output
3. Provide both interpretations
4. Recommend which to prioritize for video

### Multiple Target Audiences
If brand serves multiple segments:
1. Identify primary audience for this video
2. Note secondary audiences
3. Tailor messaging accordingly

### Technical/Complex Products
For B2B or technical products:
1. Balance education with engagement
2. Use visual metaphors for abstract concepts
3. Focus on outcomes over features
4. Consider longer duration for proper explanation

## Best Practices

### Analysis
- Prioritize homepage and key landing pages
- Look for patterns, not one-off elements
- Consider mobile vs desktop design differences
- Note any seasonal or promotional content that may not represent core brand

### Creative Strategy
- Lead with benefit, not feature
- Show, don't just tell
- One main idea per video
- Strong hook in first 3 seconds
- Clear CTA at end

### Scene Planning
- Each scene should have one focus
- Transitions should feel motivated, not arbitrary
- Pacing should match brand personality
- Leave breathing room - don't cram too much

### Asset Specification
- Be specific about style and mood
- Consider production feasibility
- Prioritize assets that can be extracted from website
- Flag assets that require custom creation

## Integration with Editframe

Once you have the scene plan, use the `elements-composition` or `react-composition` skills to build the actual video:

```html
<ef-configuration api-host="..." media-engine="local">
  <ef-timegroup mode="sequence" workbench>
    <!-- Scene 1: Hook -->
    <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full bg-[brand-color]">
      <ef-text class="text-center text-4xl font-bold">Hook Text</ef-text>
    </ef-timegroup>
    
    <!-- Scene 2: Problem -->
    <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
      <ef-video src="scene2.mp4" class="size-full object-cover"></ef-video>
      <ef-text class="absolute bottom-8 text-white">Problem Statement</ef-text>
    </ef-timegroup>
    
    <!-- Continue for all scenes... -->
  </ef-timegroup>
</ef-configuration>
```

Reference [references/composition-patterns.md](references/composition-patterns.md) for common video composition structures.

## Iteration & Refinement

After generating initial plan:
1. Review brand analysis for accuracy
2. Validate creative brief aligns with business goals
3. Refine scene timing and content
4. Adjust asset requirements based on availability
5. Test with stakeholders before production

## Tips

- **Start broad, refine later**: First pass should capture overall strategy, details come in iteration
- **Use brand's own content**: Extract images, copy, and assets from website when possible
- **Respect brand guidelines**: If brand has published guidelines, prioritize those over inferences
- **Consider context**: Where will video be seen? Who's the audience? What's the goal?
- **Be opinionated**: Make strategic recommendations, don't just describe the website

## Reference Files

- [references/color-psychology.md](references/color-psychology.md) - Emotional associations with colors
- [references/typography-personalities.md](references/typography-personalities.md) - What font choices signal
- [references/video-archetypes.md](references/video-archetypes.md) - Common video patterns by industry
- [references/emotional-arcs.md](references/emotional-arcs.md) - Proven narrative structures
- [references/transition-styles.md](references/transition-styles.md) - Transition types and emotional impact
- [references/visual-metaphors.md](references/visual-metaphors.md) - Representing abstract concepts visually
- [references/composition-patterns.md](references/composition-patterns.md) - Video composition structures
