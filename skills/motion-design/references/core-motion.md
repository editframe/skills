# Core Motion Techniques

Essential skills for creating natural, polished motion.

## Skill 4: Easing Mastery

**What it does:** Selects and customizes acceleration/deceleration curves

### Understanding Easing as a Graph

Easing = relationship between **time** (x-axis) and **progress** (y-axis)

```
Linear (avoid):          Ease-out (entrances):
Progress                 Progress
|    /                   |   /---
|   /                    |  /
|  /                     | /
| /                      |/
|/______Time             |_______Time
Constant speed           Fast start, slow end

Ease-in (exits):         Ease-in-out (within):
Progress                 Progress
|      /                 |    ___/
|     /                  |   /
|    /                   |  /
|   /                    | /
|__/____Time             |/______Time
Slow start, fast end     Smooth both ends
```

**Slope = Speed:** Steeper slope = faster motion at that moment

### The Three Primary Easing Functions

**1. Ease-Out (Deceleration)**
- **Use for:** Entrances, appearing elements
- **Why:** Elements enter fast (grab attention) then slow (settle comfortably)
- **Feel:** Responsive, natural
- **Cubic bezier:** `cubic-bezier(0, 0, 0.2, 1)` or `ease-out`

```javascript
// Element entering screen
element.animate({
  opacity: [0, 1],
  transform: ['translateY(-20px)', 'translateY(0)']
}, {
  duration: 300,
  easing: 'cubic-bezier(0, 0, 0.2, 1)' // ease-out
});
```

**2. Ease-In (Acceleration)**
- **Use for:** Exits, disappearing elements
- **Why:** Elements exit slowly (don't surprise) then fast (get out of the way)
- **Feel:** Intentional departure
- **Cubic bezier:** `cubic-bezier(0.4, 0, 1, 1)` or `ease-in`

```javascript
// Element leaving screen
element.animate({
  opacity: [1, 0],
  transform: ['translateY(0)', 'translateY(20px)']
}, {
  duration: 200,
  easing: 'cubic-bezier(0.4, 0, 1, 1)' // ease-in
});
```

**3. Ease-In-Out (S-Curve)**
- **Use for:** Movement within screen, position changes
- **Why:** Smooth start and end feels comfortable for visible repositioning
- **Feel:** Polished, professional
- **Cubic bezier:** `cubic-bezier(0.4, 0, 0.2, 1)` or `ease-in-out`

```javascript
// Element moving to new position
element.animate({
  transform: ['translateX(0)', 'translateX(200px)']
}, {
  duration: 400,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)' // ease-in-out
});
```

### Never Use Linear

`linear` = constant speed = robotic, unnatural

**Only exception:** Mechanical/technical animations where robot-feel is intentional (loading spinners, progress bars)

### Specialized Easing Functions

**Bounce (celebration, playfulness):**
```css
/* Element overshoots then settles */
cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

**Use for:** Success states, playful interactions, emphasis

**Elastic (springy, attention-grabbing):**
```css
/* Element oscillates before settling */
cubic-bezier(0.175, 0.885, 0.32, 1.275)
```

**Use for:** Notifications, errors that need attention, playful brands

**Anticipation (windup before action):**
```css
/* Slight reverse motion before main motion */
cubic-bezier(0.6, -0.28, 0.735, 0.045)
```

**Use for:** User-initiated actions, dramatic moments

**Overshoot (material design standard):**
```css
/* Subtle overshoot for UI elements */
cubic-bezier(0.4, 0, 0.2, 1)
```

**Use for:** Cards, dialogs, modals

### Customizing Cubic Bezier Curves

Four control points: `cubic-bezier(x1, y1, x2, y2)`

- **x1, y1:** First control point (controls start acceleration)
- **x2, y2:** Second control point (controls end deceleration)
- **Range:** 0-1 for normal curves, outside for special effects

**Brand personality through easing:**

**Energetic/Playful:**
```css
cubic-bezier(0.68, -0.25, 0.265, 1.25)  /* Bounce */
```

**Calm/Luxurious:**
```css
cubic-bezier(0.25, 0.1, 0.25, 1)  /* Slow, smooth */
```

**Fast/Tech:**
```css
cubic-bezier(0.4, 0, 0.6, 1)  /* Sharp deceleration */
```

**Professional/Business:**
```css
cubic-bezier(0.4, 0, 0.2, 1)  /* Material design standard */
```

### Testing Easing

1. Start with standard `ease-out`, `ease-in`, or `ease-in-out`
2. If it feels too safe/boring, customize
3. Adjust second control point (x2, y2) for more personality
4. Test at 0.5x and 2x speed to ensure it works at different rates

### Common Mistakes

❌ Using `ease` (inconsistent across browsers)
❌ Using linear for organic motion
❌ Ease-in for entrances (feels sluggish)
❌ Ease-out for exits (feels incomplete)
❌ Different easing for similar elements (inconsistent)

### Output

Specific easing function for each animation:

```
Hero entrance: cubic-bezier(0, 0, 0.2, 1) - ease-out
Modal close: cubic-bezier(0.4, 0, 1, 1) - ease-in
Card reposition: cubic-bezier(0.4, 0, 0.2, 1) - ease-in-out
Success button: cubic-bezier(0.68, -0.55, 0.265, 1.55) - bounce
Error shake: cubic-bezier(0.175, 0.885, 0.32, 1.275) - elastic
```

---

## Skill 5: Physics Simulation Reasoning

**What it does:** Applies realistic or stylized physics principles

### Material Property Mapping

Different materials move differently:

**Rubber (high elasticity):**
- Bounce: 80% of drop height
- Squash: 60-80% compression
- Timing: Quick compression, slower expansion
- Use for: Playful UI, success states

**Metal (rigid, heavy):**
- Bounce: 5-10% of drop height  
- Squash: 0-5% compression
- Timing: Fast fall, quick settle
- Use for: Professional UI, technical elements

**Paper (light, flexible):**
- Bounce: 0%
- Squash: 20-30% compression
- Timing: Slow fall, flutter
- Use for: Cards, sheets, documents

**Liquid (fluid):**
- Bounce: 0%
- Squash: 100% (spreads instead)
- Timing: Slow, continuous motion
- Use for: Backgrounds, organic shapes, loading states

**Glass (rigid, brittle):**
- Bounce: 20-30%
- Squash: 0%
- Timing: Clean, precise
- Use for: Modals, overlays, high-end UI

### Weight Expression

**Heavy objects (600-1000ms):**
- Slow start (high inertia)
- Momentum carries through
- Hard landing
- Example: Large modal, full-page transition

**Medium objects (300-500ms):**
- Balanced timing
- Controlled motion
- Soft landing
- Example: Cards, buttons, list items

**Light objects (150-300ms):**
- Quick start
- Floaty motion
- Gentle landing
- Example: Tooltips, notifications, badges

### Gravity Simulation

Standard gravity: 9.8 m/s²

**UI translation:**
- Falling elements accelerate (ease-in)
- Rising elements decelerate (ease-out)
- Neutral motion (ease-in-out)

```javascript
// Falling with gravity
element.animate({
  transform: ['translateY(0)', 'translateY(400px)']
}, {
  duration: 600,
  easing: 'cubic-bezier(0.55, 0, 1, 0.45)' // accelerate down
});
```

### Momentum and Inertia

**Inertia:** Objects resist changes in motion

**Starting from rest:**
- Slow acceleration at first
- Builds speed
- Use ease-out or cubic-bezier with slow start

**Stopping moving object:**
- Can't stop instantly
- Gradual deceleration
- Use ease-in or add overshoot

**Changing direction:**
- Must slow down first
- Then accelerate in new direction
- 2-phase animation

```javascript
// Direction change
await element.animate({
  transform: ['translateX(0)', 'translateX(50px)']
}, {
  duration: 200,
  easing: 'ease-out'
}).finished;

// Pause represents momentum decay
await new Promise(r => setTimeout(r, 100));

await element.animate({
  transform: ['translateX(50px)', 'translateX(-30px)']
}, {
  duration: 250,
  easing: 'ease-out'
}).finished;
```

### Friction and Air Resistance

**High friction (dragging):**
- Slow, constant deceleration
- Lower peak speed
- Longer timing
- Use for: Scrubbing, dragging, sliders

**Low friction (ice):**
- Maintains speed longer
- Sharp deceleration at end
- Faster timing
- Use for: Swipes, throws, momentum scrolling

### Bounce Physics

**Realistic bounce:**
```javascript
// Each bounce is ~70% of previous height
// Each bounce is faster
bounce1: { height: 100%, duration: 400ms }
bounce2: { height: 70%, duration: 280ms }
bounce3: { height: 49%, duration: 196ms }
bounce4: { height: 34%, duration: 137ms }
```

**Simplified UI bounce:**
```javascript
// Single overshoot and settle
element.animate({
  transform: ['scale(0)', 'scale(1.1)', 'scale(1)']
}, {
  duration: 400,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
});
```

### Spring Physics

**Spring constants:**
- **Stiffness:** How fast spring pulls back (higher = faster)
- **Damping:** How much energy is lost (higher = less oscillation)

**Tight spring (stiff=300, damp=30):**
- Quick snap to position
- 1-2 oscillations
- Use for: Buttons, small UI

**Loose spring (stiff=100, damp=15):**
- Gentle motion
- 3-4 oscillations  
- Use for: Modals, cards

**Critically damped (no oscillation):**
- Fastest approach without overshoot
- Use for: Professional UI, precise positioning

### Determining Realism Level

**High realism (simulation):**
- Games
- Physics demonstrations
- Scientific apps
- Complex multi-step animations

**Medium realism (physics-inspired):**
- Consumer apps
- Standard UI
- Follows physics principles loosely
- **Most common for UI work**

**Low realism (stylized):**
- Brand-heavy experiences
- Artistic apps
- Motion graphics
- Physics is suggestion only

### Output

Physics specifications:

```
Material: Paper-like cards
Weight: Light (250ms timing)
Elasticity: Slight bounce (scale to 1.05)
Friction: Medium (ease-in-out)
Gravity: Standard (falls with ease-in)
Realism: Medium (physics-inspired, not simulated)
```

---

## Skill 8: Stagger & Sequencing

**What it does:** Creates rhythmic patterns across multiple elements

### The Stagger Principle

**Stagger = delay between identical animations**

Instead of:
- All items appear at once (overwhelming)

Do:
- Each item appears slightly after previous (rhythm)

### Determining Stagger Delays

**Per-character text (30-50ms):**
```javascript
'HELLO'.split('').forEach((char, i) => {
  char.animate({ opacity: [0, 1] }, {
    delay: i * 40, // 40ms per character
    duration: 300
  });
});
```

**Per-word text (80-120ms):**
```javascript
'The quick brown fox'.split(' ').forEach((word, i) => {
  word.animate({ opacity: [0, 1] }, {
    delay: i * 100, // 100ms per word
    duration: 400
  });
});
```

**Per-line text (200-300ms):**
```javascript
lines.forEach((line, i) => {
  line.animate({ opacity: [0, 1] }, {
    delay: i * 250, // 250ms per line
    duration: 500
  });
});
```

**List items (50ms):**
```javascript
listItems.forEach((item, i) => {
  item.animate({ 
    opacity: [0, 1],
    transform: ['translateX(-20px)', 'translateX(0)']
  }, {
    delay: i * 50,
    duration: 300,
    easing: 'ease-out'
  });
});
```

**Card groups (100-150ms):**
```javascript
cards.forEach((card, i) => {
  card.animate({ 
    opacity: [0, 1],
    transform: ['translateY(20px)', 'translateY(0)']
  }, {
    delay: i * 120,
    duration: 400,
    easing: 'ease-out'
  });
});
```

**Major sections (400ms+):**
```javascript
sections.forEach((section, i) => {
  section.animate({ opacity: [0, 1] }, {
    delay: i * 500,
    duration: 600
  });
});
```

### Stagger Patterns

**Sequential (linear):**
```
Item 1: 0ms
Item 2: 100ms
Item 3: 200ms
Item 4: 300ms
```
Most common, reads top-to-bottom or left-to-right

**Cascading (accelerating):**
```
Item 1: 0ms
Item 2: 80ms    (80ms after previous)
Item 3: 140ms   (60ms after previous)
Item 4: 180ms   (40ms after previous)
```
Builds momentum, feels energetic

**Wave (center-out):**
```
Item 1: 100ms   (center)
Item 2: 50ms    (one step out)
Item 3: 150ms   (one step out)
Item 4: 0ms     (edges)
Item 5: 200ms   (edges)
```
Draws attention to center, then reveals context

**Decelerating (slowing):**
```
Item 1: 0ms
Item 2: 50ms    (50ms after previous)
Item 3: 120ms   (70ms after previous)
Item 4: 220ms   (100ms after previous)
```
Gentle arrival, emphasizes final items

### Calculating Total Duration

```javascript
const itemDuration = 300;
const staggerDelay = 80;
const numItems = 5;

// Total time = (numItems - 1) * stagger + duration
const totalDuration = (numItems - 1) * staggerDelay + itemDuration;
// = 4 * 80 + 300 = 620ms
```

Plan for total duration to keep experience snappy.

### No Simultaneous Motion Rule

**Bad:**
```
0ms: Sidebar slides in (500ms)
0ms: Content fades in (500ms)
0ms: Header drops down (500ms)
```
Three things competing for attention = chaos

**Good:**
```
0ms:   Sidebar slides in (400ms)
200ms: Content fades in (400ms)
400ms: Header drops down (300ms)
```
Sequential = clear, intentional

**Exception:** Background/ambient motion can run simultaneously if it's clearly not primary focus

### Increasing vs Decreasing Delays

**Increasing delays (crescendo):**
- Builds tension
- Draws out reveal
- Use for: Important content, emphasis

**Decreasing delays (decrescendo):**
- Releases tension
- Quick finish
- Use for: Wrapping up, de-emphasis

**Consistent delays:**
- Neutral, comfortable
- Use for: Most UI work

### Direction and Reading Order

**Western reading pattern (left → right, top → bottom):**
```
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]
```

**Respect reading order unless intentionally disrupting for effect**

**Grid animation patterns:**
- Row by row (easiest to follow)
- Column by column (less common)
- Diagonal (dynamic, energetic)
- Center-out (focal point emphasis)

### Stagger + Easing Combination

**All items should share:**
- Same duration
- Same easing function
- Same animation properties

**Only difference:**
- Delay/start time

```javascript
// Good - consistent animation, varied delay
items.forEach((item, i) => {
  item.animate({
    opacity: [0, 1],
    transform: ['translateY(20px)', 'translateY(0)']
  }, {
    delay: i * 80,      // ONLY THIS VARIES
    duration: 300,      // Same for all
    easing: 'ease-out'  // Same for all
  });
});
```

### Output

Stagger specification:

```
Element: Navigation items (8 items)
Pattern: Sequential, top to bottom
Base duration: 300ms
Stagger delay: 60ms per item
Total duration: (7 * 60) + 300 = 720ms
Easing: ease-out (shared)
Direction: Reading order (left to right)
```
