---
name: motion-design
description: Professional motion graphics principles and techniques. Use when creating animations, transitions, UI micro-interactions, or any time-based visual design. Covers timing, easing, physics, attention choreography, and advanced animation techniques.
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Motion Design

Professional motion graphics cognitive skills for creating purposeful, polished animations.

## Core Principle

**Motion should always serve communication, not decoration.** Every animation must have clear intent and guide viewer attention.

## Skill Categories

### Foundation (Start Here)
- [references/foundation.md](references/foundation.md) - Message analysis, attention choreography, timing intelligence

### Core Motion Techniques
- [references/core-motion.md](references/core-motion.md) - Easing mastery, physics simulation, stagger patterns

### Advanced Animation
- [references/advanced-techniques.md](references/advanced-techniques.md) - Squash & stretch, anticipation, follow-through, arcs, exaggeration

### UI Patterns
- [references/ui-patterns.md](references/ui-patterns.md) - Entrance/exit, state transitions, hover, focus, loading, success, error

### Specialized Techniques
- [references/text-animation.md](references/text-animation.md) - Typography-specific animation principles
- [references/color-transitions.md](references/color-transitions.md) - Color change strategies
- [references/particles-effects.md](references/particles-effects.md) - Particle systems and visual effects

### Composition & Structure
- [references/staging-composition.md](references/staging-composition.md) - Visual hierarchy, focal points, depth, clarity
- [references/material-weight.md](references/material-weight.md) - Expressing physical properties through motion
- [references/rhythm-pacing.md](references/rhythm-pacing.md) - Musical timing, beats, tempo
- [references/looping.md](references/looping.md) - Seamless infinite animations

### Process
- [references/iteration-process.md](references/iteration-process.md) - Systematic workflow from concept to polish

## Quick Reference

### Base Durations
- **Mobile UI**: 200-300ms
- **Desktop UI**: 300-500ms  
- **Cinematic**: 800-1200ms
- **Micro-interactions**: 150-250ms

### Common Timings
- Hover enter: 150-200ms
- Hover exit: 200-300ms
- Focus: 200-300ms
- Success: 600-1000ms
- Error: 400-600ms
- Loading loops: 1200-1500ms

### Easing Rules
- **Entrances**: ease-out (decelerating)
- **Exits**: ease-in (accelerating)
- **Within-screen**: ease-in-out (smooth)
- **Never**: linear (except mechanical)

### Stagger Delays
- Per character: 30-50ms
- Per word: 80-120ms
- Per line: 200-300ms
- List items: 50ms
- Card groups: 150ms
- Major sections: 400ms+

### One Focus at a Time
**Never** have multiple unrelated elements moving simultaneously. Motion competes for attention—sequence everything.

## Design Philosophy

1. **Message First** - What should the viewer remember/feel/do?
2. **Guide Attention** - One focus point at any moment
3. **Respect Physics** - Motion must feel plausible (unless stylized)
4. **Add Polish Last** - Get timing right before adding secondary motion
5. **Iterate Systematically** - Broad strokes → easing → secondary → polish
