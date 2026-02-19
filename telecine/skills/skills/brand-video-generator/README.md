# Brand Video Generator Skill

A comprehensive Agent Skill for generating strategic video composition plans from brand websites.

## What It Does

This skill analyzes a brand's website and generates a complete video production plan including:

1. **Brand Analysis**
   - Visual identity (colors, typography, design language)
   - Voice and messaging tone
   - Content hierarchy and key messages

2. **Creative Strategy**
   - Video objective and target audience
   - Core message and emotional arc
   - Visual treatment recommendations

3. **Scene Planning**
   - Scene-by-scene breakdown with timing
   - Visual content specifications
   - Motion and transition recommendations

4. **Asset Requirements**
   - Visual assets needed
   - Motion graphics specifications
   - Audio recommendations

## How It Works

The skill combines all analysis phases into a single workflow:

```
Website URL → Analysis → Creative Brief → Scene Plan → Asset List → Implementation Guide
```

Instead of separate skills for each phase (as originally proposed), this unified approach:
- Provides complete end-to-end planning in one session
- Maintains context across all phases
- Delivers a cohesive, actionable plan
- Can be refined iteratively

## Reference Library

The skill includes extensive reference materials:

### [color-psychology.md](references/color-psychology.md)
Emotional associations with colors, color combinations, and how to apply them in video. Includes:
- Primary and secondary color meanings
- Color combinations by mood
- Video-specific color usage
- Brand personality color mapping

### [typography-personalities.md](references/typography-personalities.md)
What font choices signal about brand personality and how to use them in video. Includes:
- Font category personalities (serif, sans-serif, display, monospace)
- Font pairing principles
- Video-specific typography guidelines
- Animation styles by font type

### [video-archetypes.md](references/video-archetypes.md)
Common video patterns and structures by industry and video type. Includes:
- Industry-specific patterns (SaaS, e-commerce, B2B, finance, etc.)
- Video type structures (demo, explainer, launch, testimonial, etc.)
- Length and pacing guidelines
- Platform-specific considerations

### [emotional-arcs.md](references/emotional-arcs.md)
Proven narrative structures that guide viewer emotions. Includes:
- 10 core emotional arc patterns
- When to use each arc
- How to pace emotional progression
- Matching arcs to brand personality

### [transition-styles.md](references/transition-styles.md)
Types of transitions, their emotional impact, and when to use them. Includes:
- 13+ transition types with specifications
- Duration guidelines
- Brand personality matching
- Platform considerations

### [visual-metaphors.md](references/visual-metaphors.md)
How to represent abstract concepts visually. Includes:
- 15+ common abstract concepts (speed, security, growth, trust, etc.)
- Visual metaphor options for each
- Animation and color recommendations
- Cultural considerations

### [composition-patterns.md](references/composition-patterns.md)
Common structural patterns for video composition with Editframe Elements. Includes:
- 14+ composition patterns with code examples
- Complete video structure templates
- Best practices for timing, layering, accessibility
- Quick reference table

## Usage

Provide the skill with:
- **URL**: Brand website to analyze
- **Video Type**: launch, product-demo, explainer, brand-awareness, social
- **Duration Target**: 15s, 30s, 60s, 90s (optional)
- **Platform**: web, instagram, tiktok, youtube, linkedin (optional)

The skill will generate a comprehensive plan including all phases.

## Example

See [EXAMPLE.md](EXAMPLE.md) for a complete walkthrough using Stripe.com as the example brand, including:
- Full brand analysis
- Creative brief
- Scene-by-scene breakdown
- Asset manifest
- Implementation notes
- Starter Editframe code

## Integration with Other Skills

This skill works alongside:
- **elements-composition**: Use to implement the video plan with HTML/Web Components
- **react-composition**: Use to implement with React components
- **motion-design**: Apply motion principles to the planned animations

## Workflow

Typical workflow:
1. Use `brand-video-generator` to analyze website and create plan
2. Review and refine the plan
3. Gather or create required assets
4. Use `elements-composition` or `react-composition` to build the video
5. Apply `motion-design` principles for animations
6. Iterate and refine

## Future Enhancements

Potential additions (not yet implemented):
- Industry-specific analysis patterns
- Competitive analysis integration
- Automated asset generation suggestions
- A/B testing recommendations
- Multi-language considerations
- Accessibility scoring

## Philosophy

This skill embodies several key principles:

1. **Strategic First**: Start with strategy before execution
2. **Brand-Aligned**: Every decision should reflect brand personality
3. **Audience-Focused**: Consider who's watching and why
4. **Actionable**: Provide specific, implementable recommendations
5. **Comprehensive**: Cover all aspects from analysis to implementation

## License

MIT
