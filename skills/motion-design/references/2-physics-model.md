# Physics Model

## Core Concept

**Material + Weight + Force = Motion Profile**

Objects have physical properties that determine how they move. Express these through timing, deformation, and easing curves.

## Quick Reference

### Context Base Durations

- **Social media (mobile)**: 200-400ms (fast-paced, attention-grabbing)
- **Explainer videos**: 500-800ms (clear, readable)
- **Cinematic**: 1000-1600ms (dramatic, luxurious)
- **Transitions**: 300-600ms (context-dependent)

### Frame Rate Considerations

At **24fps**: 1 frame = ~42ms (round to multiples of 42ms)  
At **30fps**: 1 frame = ~33ms (round to multiples of 33ms)  
At **60fps**: 1 frame = ~17ms (round to multiples of 17ms)

Use frame-aligned timing for smooth motion.

### Weight Multipliers

- **Heavy**: 1.5-2.0× base duration (large text blocks, full-screen graphics)
- **Medium**: 1.0× base duration (title cards, standard elements)
- **Light**: 0.5-0.7× base duration (small icons, decorative elements)

### Duration Calculation Formula

```
Duration = Material.base × WeightMultiplier × DistanceFactor

Example:
Paper title card (800ms base) × Medium weight (1.0×) × 200px movement (2.0×)
= 800 × 1.0 × 2.0 = 1600ms

At 30fps: 1600ms ÷ 33ms = ~48 frames
At 24fps: 1600ms ÷ 42ms = ~38 frames
```

## Material Properties (Source of Truth)

Every animation chooses a material metaphor. The material determines all motion characteristics.

### Complete Material Matrix

| Material | Base Duration | Deformation | Bounce | Friction | Density |
|----------|---------------|-------------|---------|----------|---------|
| Feather  | 2000ms        | 80%         | 0%      | Low      | Very low |
| Paper    | 800ms         | 30-40%      | 10%     | Medium   | Low |
| Leather  | 500ms         | 20-30%      | 15%     | High     | Medium |
| Rubber   | 600ms         | 60-80%      | 80%     | High     | Medium |
| Wood     | 500ms         | 5-10%       | 20%     | Medium   | Medium |
| Plastic  | 350ms         | 10-20%      | 30%     | Low      | Medium |
| Glass    | 400ms         | 0%          | 25%     | Low      | Medium-high |
| Metal    | 300ms         | 0-5%        | 5%      | Medium   | High |
| Stone    | 600ms         | 0%          | 5%      | High     | Very high |
| Liquid   | 1400ms        | 100%        | 0%      | Variable | Low |

### Deriving Motion from Material

**Material determines timing:**
```
Playful logo (rubber):
  Duration: 600ms (rubber base)
  Deformation: scaleY(0.7) scaleX(1.3)
  Bounce: Returns past resting point by 80%
  Use: Fun brands, celebration moments
  
Professional title card (glass):
  Duration: 400ms (glass base)
  Deformation: None (rigid)
  Bounce: Minimal overshoot (5%)
  Use: Corporate, technical content
```

**Consistency rule:** All elements of the same material move similarly throughout the composition.

## Weight Scaling

Weight multiplies base duration and affects deformation:

### Weight Categories

**Light (0.5-0.7× base):**
- Small tooltips, badges, chips
- Fast start, floaty motion
- Minimal deformation (barely compresses)
- Example: Paper badge = 800ms × 0.6 = 480ms

**Medium (1.0× base):**
- Standard UI elements, cards, buttons
- Balanced motion
- Standard material deformation
- Example: Paper card = 800ms × 1.0 = 800ms

**Heavy (1.5-2.0× base):**
- Large modals, full-page transitions
- Slow start (inertia), momentum carries
- Increased deformation (more impact)
- Example: Paper modal = 800ms × 1.8 = 1440ms

### Volume Conservation

When objects deform, volume stays constant:

```
Volume = Width × Height = constant

Normal:    scaleX(1.0)  × scaleY(1.0)  = 1.0
Squashed:  scaleX(1.25) × scaleY(0.8)  = 1.0
Stretched: scaleX(0.85) × scaleY(1.3)  = 1.1 (close enough)
```

Compress one axis → expand the other proportionally.

## Force Applied (Easing)

Easing curves represent forces acting on objects:

### Gravity

**Falling (ease-in - accelerating):**
```
Object falls, gravity pulls harder over time
cubic-bezier(0.55, 0, 1, 0.45)
```

**Rising (ease-out - decelerating):**
```
Object thrown upward, gravity slows it
cubic-bezier(0, 0.55, 0.45, 1)
```

### Entrances vs Exits

**Entrance (ease-out):**
Object enters viewport, needs to decelerate to stop
```
Starting with momentum, slowing to rest
0% → fast → slow → 100%
```

**Exit (ease-in):**
Object accelerates away, doesn't need to stop
```
Starting at rest, speeding up to leave
0% → slow → fast → 100%
```

**Within-screen (ease-in-out):**
Object moves from A to B on screen, must start and stop
```
Starting at rest, accelerating, then decelerating
0% → slow → fast → slow → 100%
```

### Spring Physics

**For elastic materials (rubber, plastic):**

```javascript
// Tight spring (professional UI)
stiffness: 300
damping: 30
= Quick snap, 1-2 oscillations

// Loose spring (playful UI)  
stiffness: 100
damping: 15
= Gentle motion, 3-4 oscillations

// Critically damped (precise)
stiffness: 200
damping: 28 (2 × √stiffness)
= Fastest approach without overshoot
```

Maps to cubic-bezier:
```
Tight spring:   cubic-bezier(0.68, -0.1, 0.265, 1.1)
Loose spring:   cubic-bezier(0.68, -0.55, 0.265, 1.55)
Critically damped: cubic-bezier(0.36, 0, 0.66, 1)
```

## Distance Scaling

Duration scales with distance traveled:

```
Base distance: 100px
Base duration: Material.base

Distance factor = actualDistance / 100px

Final duration = Material.base × Weight × DistanceFactor
```

**Example:**
```
Paper card (800ms base)
Medium weight (1.0×)
Moving 250px (2.5×)
= 800 × 1.0 × 2.5 = 2000ms
```

**Practical limits:**
- Don't scale linearly beyond 3× distance (feels too slow)
- Use √distance for very long movements
- Example: 400px → use √4 = 2× instead of 4×

## Friction and Drag

**High friction (rough surfaces):**
```
Slow, constant deceleration
Longer timing
cubic-bezier(0.4, 0.1, 0.6, 0.9)
Use for: Dragging, scrubbing, sliders
```

**Low friction (smooth surfaces):**
```
Maintains speed, sharp stop
Faster timing
cubic-bezier(0.1, 0.7, 0.3, 1)
Use for: Swipes, throws, momentum scroll
```

## Bounce Dynamics

**Realistic bounce sequence:**
```
Drop from height H, duration D

Bounce 1: H × 100%, D × 100%
Bounce 2: H × 70%,  D × 70%
Bounce 3: H × 49%,  D × 49%
Bounce 4: H × 34%,  D × 34%
```

Each bounce is ~70% of previous height and duration.

**Simplified UI bounce (single overshoot):**
```javascript
// Button scale bounce
element.animate([
  { transform: 'scale(0)' },
  { transform: 'scale(1.08)' },  // 8% overshoot
  { transform: 'scale(1)' }
], {
  duration: 400,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
});
```

## Inertia and Momentum

**Heavy objects resist changes:**

```
Phase 1: Overcome inertia (slow start)
  Duration: 40% of total
  Easing: Slow at start
  
Phase 2: Momentum builds (constant speed)
  Duration: 30% of total
  Easing: Linear
  
Phase 3: Decelerate to stop (slow end)
  Duration: 30% of total
  Easing: Slow at end
```

**Direction changes require momentum decay:**
```
Moving right → stop → move left

Cannot change instantly. Must:
1. Decelerate to stop (200ms, ease-in)
2. Pause (50-100ms, shows momentum lost)
3. Accelerate new direction (250ms, ease-out)
```

## Implementation Pattern

**Determine material, weight, distance:**
```
1. Material (from intent): Glass
2. Weight: Medium (standard button)
3. Distance: 50px
4. Force: Gravity (falling in)

Calculation:
Base: 400ms (glass)
Weight: 1.0× (medium)
Distance: 0.5× (50px vs 100px base)
= 400 × 1.0 × 0.5 = 200ms

Easing: ease-in (falling)
Deformation: 0% (glass doesn't compress)
Bounce: 25% overshoot

Result:
duration: 200ms
transform: translateY(-50px) → translateY(0) → translateY(-12.5px) → translateY(0)
easing: cubic-bezier(0.55, 0, 1, 0.45) for fall, then bounce
```

## Common Animation Patterns for Video

### Title Card Entrance (400-600ms, ease-out)
```
At 30fps (12-18 frames):
opacity: 0 → 1
translateY: 40px → 0
scale: 0.95 → 1
```

### Title Card Exit (300-400ms, ease-in, 30% faster)
```
At 30fps (9-12 frames):
opacity: 1 → 0
translateY: 0 → -30px
```

### Logo Animation (800ms, bounce)
```
At 30fps (24 frames):
scale: 0 → 1.15 → 0.95 → 1
rotation: 0 → 5 → -3 → 0
easing: bounce/elastic
```

### Scene Transition - Wipe (500ms)
```
At 30fps (15 frames):
clipPath: inset(0 0 0 100%) → inset(0 0 0 0%)
easing: ease-in-out
```

### Scene Transition - Cross-dissolve (800ms)
```
At 30fps (24 frames):
Outgoing scene opacity: 1 → 0
Incoming scene opacity: 0 → 1
Overlap: 100% (simultaneous)
```

### Text Reveal - Typewriter
```
Per character: 50ms (1-2 frames at 30fps)
Total for 20 characters: ~1000ms
```

### Emphasis Pulse (600ms)
```
At 30fps (18 frames):
scale: 1 → 1.1 → 1
opacity: 1 → 1 → 1 (maintain)
Used for: Drawing attention to key information
```

## Common Physics Errors

**Error: Ignoring weight**
```
Bad: Full-screen graphic animates in 300ms (too fast for size)
Fix: Apply heavy multiplier: 300ms × 1.8 = 540ms
```

**Error: Violating volume conservation**
```
Bad: scaleX(1.5) scaleY(1.5) on squash (volume increases unnaturally)
Fix: scaleX(1.5) scaleY(0.67) (volume stays constant)
```

**Error: Wrong easing direction**
```
Bad: Title entrance with ease-in (feels like accelerating into wall)
Fix: Title entrance with ease-out (decelerating to rest)
```

**Error: Inconsistent material**
```
Bad: Title card has paper timing (800ms) but metal deformation (2%)
Fix: Use paper deformation (35%) to match timing
```

**Error: Not frame-aligned**
```
Bad: 347ms animation at 30fps (10.4 frames - fractional)
Fix: 330ms (10 frames) or 363ms (11 frames) - whole frame counts
```
