# Physics Simulation Reasoning

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

```css
.falling {
  animation: fall 600ms cubic-bezier(0.55, 0, 1, 0.45);
}

@keyframes fall {
  from { transform: translateY(0); }
  to { transform: translateY(400px); }
}
```

**Conceptual:**
```
falling: start slow → accelerate → fast impact
rising: start fast → decelerate → gentle peak
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
```
Phase 1: Decelerate to stop (200ms)
  moveRight(50px) with ease-in
  
Pause: Momentum decay (100ms)
  
Phase 2: Accelerate in new direction (250ms)
  moveLeft(30px) with ease-out
```

Must slow down first, then accelerate in new direction.

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
```
bounce1: height 100%, duration 400ms
bounce2: height 70%, duration 280ms (70% of time)
bounce3: height 49%, duration 196ms (70% of time)
bounce4: height 34%, duration 137ms (70% of time)
```
Each bounce is ~70% of previous height and 70% of previous duration.

**Simplified UI bounce:**
```css
.bounce-in {
  animation: bounceIn 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounceIn {
  0% { transform: scale(0); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
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