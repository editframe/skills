# Advanced Animation Techniques

Polish techniques that add life and personality to motion.

## Skill 6: Squash & Stretch Application

**What it does:** Adds life through strategic deformation

### Volume Conservation Principle

**Physics rule:** When you compress one axis, the other axes must expand proportionally

```javascript
// Squash (compress Y, expand X)
element.style.transform = 'scaleY(0.8) scaleX(1.2)';

// Stretch (expand Y, compress X)
element.style.transform = 'scaleY(1.3) scaleX(0.85)';
```

**Volume = Width × Height stays constant:**
- 1.0 × 1.0 = 1.0 (normal)
- 0.8 × 1.25 = 1.0 (squashed)
- 1.3 × 0.77 = 1.0 (stretched)

### Material-Based Deformation Amount

**Rubber/Elastic (60-80% compression):**
```javascript
// Bouncing ball hitting ground
ball.animate([
  { transform: 'scaleY(1) scaleX(1)' },     // falling
  { transform: 'scaleY(0.6) scaleX(1.4)' }, // impact squash
  { transform: 'scaleY(1.3) scaleX(0.85)' },// stretch up
  { transform: 'scaleY(1) scaleX(1)' }      // return
], { duration: 400 });
```

**Soft/Organic (30-50% compression):**
```javascript
// Button press
button.animate([
  { transform: 'scale(1)' },
  { transform: 'scaleY(0.95) scaleX(1.05)' }
], { duration: 150 });
```

**Firm/Professional (10-20% compression):**
```javascript
// Card emphasis
card.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.02)' }  // subtle uniform scale
], { duration: 300 });
```

**Rigid/Steel (0-5% compression):**
```javascript
// Technical UI - almost no squash
element.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.01)' }  // barely noticeable
], { duration: 200 });
```

### Timing of Squash vs Stretch

**Squash (compression) = FAST:**
- Impact happens quickly
- 30-40% of total time

**Stretch (expansion) = SLOWER:**
- Recovery takes longer
- 60-70% of total time

```javascript
// 400ms total animation
ball.animate([
  { transform: 'scaleY(1)', offset: 0 },    // 0ms
  { transform: 'scaleY(0.7)', offset: 0.3 },// 120ms - fast squash
  { transform: 'scaleY(1)', offset: 1 }     // 400ms - slow stretch
], { duration: 400 });
```

### When to Apply vs Keep Rigid

**Apply squash & stretch:**
- ✅ Organic shapes (buttons, cards, icons)
- ✅ Playful brands
- ✅ Success/celebration moments
- ✅ User-initiated actions
- ✅ Emphasizing flexibility

**Keep rigid:**
- ✅ Professional/serious contexts
- ✅ Text (usually)
- ✅ Photos/realistic images
- ✅ Technical/mechanical UI
- ✅ Charts and data visualizations

### Subtle vs Exaggerated

**Subtle (UI work):**
- Scale to 102-105% max
- Barely perceptible
- Professional feel
- Use for: Business apps, tools, productivity

**Moderate (consumer apps):**
- Scale to 105-110%
- Noticeable but not cartoonish
- Friendly feel
- Use for: Social media, lifestyle apps

**Exaggerated (playful):**
- Scale to 120-150%
- Cartoon-like
- High energy
- Use for: Games, kids apps, celebrations

### Directional Deformation

**Match direction of motion:**

```javascript
// Moving right → stretch horizontally
element.animate([
  { transform: 'scaleX(1) scaleY(1)' },
  { transform: 'scaleX(1.2) scaleY(0.9)' }, // stretched in direction
  { transform: 'scaleX(1) scaleY(1)' }
], { duration: 300 });
```

**Moving down → stretch vertically:**
```javascript
element.animate([
  { transform: 'scaleX(1) scaleY(1)' },
  { transform: 'scaleX(0.9) scaleY(1.2)' }, // stretched downward
  { transform: 'scaleX(1) scaleY(1)' }
], { duration: 300 });
```

### Scale Overshoot Pattern

**Common UI pattern:**

```javascript
// Button appears: 0 → 102% → 100%
button.animate([
  { transform: 'scale(0)', opacity: 0 },
  { transform: 'scale(1.02)', opacity: 1, offset: 0.7 },
  { transform: 'scale(1)', opacity: 1 }
], {
  duration: 300,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
});
```

Overshoot = personality + settling motion

### Transform Origin

**Critical for natural squash & stretch:**

```css
/* Squash from bottom (like landing) */
transform-origin: center bottom;

/* Squash from top (like pressing) */
transform-origin: center top;

/* Squash from center (neutral) */
transform-origin: center center;
```

### Output

Squash & stretch specification:

```
Element: Success button
Material: Soft/organic (40% compression)
Direction: Vertical (user presses down)
Timing: 150ms total (60ms squash, 90ms stretch)
Transform origin: center center
Keyframes:
  0ms:   scaleY(1.0) scaleX(1.0)
  60ms:  scaleY(0.94) scaleX(1.06) - squash
  150ms: scaleY(1.0) scaleX(1.0) - stretch back
```

---

## Skill 7: Anticipation & Follow-Through

**What it does:** Adds preparation and continuation to motion

### Anticipation: The Windup

**Principle:** Before a major action, move slightly in the opposite direction

```javascript
// Ball being thrown
ball.animate([
  { transform: 'translateX(0)' },          // start
  { transform: 'translateX(-30px)' },      // windup (anticipation)
  { transform: 'translateX(400px)' }       // throw
], {
  duration: 600,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
});
```

**Why it works:** Prepares viewer for motion, adds weight and intention

### Timing Split

**20-30% anticipation, 70-80% action:**

```javascript
// 500ms total animation
element.animate([
  { transform: 'translateY(0)', offset: 0 },     // 0ms
  { transform: 'translateY(20px)', offset: 0.25 },// 125ms - anticipation
  { transform: 'translateY(-200px)', offset: 1 }  // 500ms - main action
], { duration: 500 });
```

### When to Use Anticipation

**Add anticipation:**
- ✅ User-initiated actions (clicks, swipes)
- ✅ Dramatic moments
- ✅ Heavy objects starting to move
- ✅ Character animation
- ✅ Playful brands

**Skip anticipation:**
- ✅ Quick feedback (hover states)
- ✅ System-initiated actions (notifications)
- ✅ Exits and dismissals
- ✅ Professional/serious contexts
- ✅ When speed is priority

### Follow-Through: The Tail

**Principle:** Flexible/secondary parts continue moving after primary parts stop

```javascript
// Character stops, but hair keeps moving
async function characterStop() {
  // Body stops quickly
  await body.animate({
    transform: ['translateX(200px)', 'translateX(0)']
  }, {
    duration: 300,
    easing: 'ease-out'
  }).finished;
  
  // Hair continues and settles (follow-through)
  hair.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-15deg)' },  // continues forward
    { transform: 'rotate(5deg)' },    // bounces back
    { transform: 'rotate(0deg)' }     // settles
  ], {
    duration: 400,
    easing: 'ease-in-out'
  });
}
```

### Overlapping Action

**Different parts move at staggered times:**

```javascript
// Container moves, content follows
container.animate({
  transform: ['translateY(-100px)', 'translateY(0)']
}, {
  duration: 400,
  easing: 'ease-out'
});

// Content starts moving 50ms later
setTimeout(() => {
  content.animate({
    transform: ['translateY(-20px)', 'translateY(0)']
  }, {
    duration: 350,
    easing: 'ease-out'
  });
}, 50);
```

Creates depth and realism.

### Delay Timing for Secondary Elements

**50-100ms delay = noticeable depth:**

```javascript
// Primary element
primary.animate({ opacity: [0, 1] }, {
  duration: 300,
  delay: 0
});

// Secondary follows 80ms later
secondary.animate({ opacity: [0, 1] }, {
  duration: 300,
  delay: 80  // follow-through delay
});
```

### Wave Effect Through Connected Elements

```javascript
// Chain reaction through connected items
items.forEach((item, i) => {
  item.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-10px)' },
    { transform: 'translateY(0)' }
  ], {
    duration: 400,
    delay: i * 60,  // wave propagates
    easing: 'ease-in-out'
  });
});
```

### Anticipation + Follow-Through Combined

**Complete natural motion:**

```javascript
// Modal enters with anticipation and follow-through
modal.animate([
  { 
    transform: 'scale(0.8) translateY(20px)', 
    opacity: 0,
    offset: 0 
  },
  { 
    transform: 'scale(0.95) translateY(-5px)',  // anticipation (slight back)
    opacity: 0.7,
    offset: 0.2
  },
  { 
    transform: 'scale(1.02) translateY(0)',     // main action (overshoot)
    opacity: 1,
    offset: 0.7
  },
  { 
    transform: 'scale(1) translateY(0)',        // follow-through (settle)
    opacity: 1,
    offset: 1
  }
], {
  duration: 500,
  easing: 'ease-out'
});
```

### Output

Anticipation & follow-through specification:

```
Element: Modal entering
Anticipation: Yes (20% of timeline, slight scale down + up movement)
Main action: 60% (scale up to 102%)
Follow-through: 20% (settle to scale 100%)
Secondary elements: Delay 80ms after primary
Total duration: 500ms
```

---

## Skill 9: Arc & Path Construction

**What it does:** Defines natural motion trajectories

### Why Arcs Matter

**Straight lines = mechanical, unnatural**
**Curved paths = organic, natural**

Most natural motion follows curved paths:
- Throwing
- Swinging
- Falling
- Reaching
- Turning

### Creating Basic Arcs

**Translate + Rotate = Arc:**

```javascript
// Element moves in arc by combining linear movement with rotation
element.animate([
  { 
    transform: 'translateX(0) translateY(0) rotate(0deg)'
  },
  { 
    transform: 'translateX(200px) translateY(-50px) rotate(15deg)'
  }
], { duration: 400 });
```

### Arc Deviation Amount

**5-15% deviation from straight path:**

```javascript
// Moving from (0,0) to (300, 0)
// Straight line would be y=0 throughout
// Arc adds curve

element.animate([
  { transform: 'translate(0, 0)' },           // start
  { transform: 'translate(150px, -30px)' },   // peak (10% deviation)
  { transform: 'translate(300px, 0)' }        // end
], { duration: 500 });
```

### When to Use Straight Paths

**Mechanical/grid-based motion:**
- UI elements snapping to grid
- Menus sliding in/out
- Panels docking
- Technical/professional interfaces

```javascript
// Sidebar slides in - straight path is correct
sidebar.animate({
  transform: ['translateX(-100%)', 'translateX(0)']
}, { duration: 300 });
```

### Bezier Curve Paths

**CSS motion-path (advanced):**

```css
@keyframes arc-path {
  0% {
    offset-distance: 0%;
  }
  100% {
    offset-distance: 100%;
  }
}

.element {
  offset-path: path('M 0 0 Q 150 -50, 300 0');  /* Quadratic bezier arc */
  animation: arc-path 500ms ease-in-out;
}
```

### Combining Translation with Rotation

**Rotating along path feels natural:**

```javascript
// Element rotates to follow arc direction
element.animate([
  { 
    transform: 'translate(0, 0) rotate(-10deg)',
    offset: 0 
  },
  { 
    transform: 'translate(150px, -40px) rotate(0deg)',
    offset: 0.5
  },
  { 
    transform: 'translate(300px, 0) rotate(10deg)',
    offset: 1
  }
], { duration: 500 });
```

### Pendulum Arcs

**Swinging motion:**

```javascript
// Pendulum swinging side to side
element.animate([
  { transform: 'rotate(-30deg)', transformOrigin: 'center top' },
  { transform: 'rotate(30deg)', transformOrigin: 'center top' },
  { transform: 'rotate(-30deg)', transformOrigin: 'center top' }
], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

### Physics-Based Arcs

**Throwing (parabolic):**
```javascript
// Ball thrown horizontally
ball.animate([
  { transform: 'translate(0, 0)' },
  { transform: 'translate(200px, 100px)' }  // falls as moves
], {
  duration: 800,
  easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
});
```

**Falling (accelerating down):**
```javascript
element.animate([
  { transform: 'translateY(0)' },
  { transform: 'translateY(400px)' }
], {
  duration: 600,
  easing: 'ease-in'  // accelerates
});
```

**Rising (decelerating up):**
```javascript
element.animate([
  { transform: 'translateY(0)' },
  { transform: 'translateY(-400px)' }
], {
  duration: 600,
  easing: 'ease-out'  // decelerates
});
```

### Output

Arc specification:

```
Element: Card transitioning between positions
Path: Curved arc
Deviation: 8% from straight line (30px upward peak)
Rotation: -5deg → 0deg → +5deg (follows direction)
Easing: ease-in-out
Duration: 450ms
Physics: Organic motion, slight lift
```

---

## Skill 14: Exaggeration Calibration

**What it does:** Determines how much to push beyond realism

### Context-Appropriate Levels

**Professional/Business:**
- 2-5% exaggeration
- Subtle scale to 1.02
- Minimal bounce
- Refined, polished

**Consumer Apps:**
- 5-15% exaggeration  
- Scale to 1.05-1.10
- Moderate bounce
- Friendly, approachable

**Playful/Games:**
- 20-50% exaggeration
- Scale to 1.20-1.50
- Aggressive bounce
- Fun, energetic

### Success Moments

**Big celebration:**

```javascript
successButton.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.2)' },  // 20% exaggeration
  { transform: 'scale(0.95)' }, // undershoot
  { transform: 'scale(1)' }
], {
  duration: 600,
  easing: 'ease-in-out'
});
```

### Error States

**Aggressive shake:**

```javascript
errorField.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(-20px)' },  // exaggerated left
  { transform: 'translateX(20px)' },   // exaggerated right
  { transform: 'translateX(-15px)' },
  { transform: 'translateX(15px)' },
  { transform: 'translateX(0)' }
], {
  duration: 400
});
```

### Emphasis Scale

**Subtle (professional):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.02)'] }, { duration: 200 });
```

**Moderate (consumer):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.10)'] }, { duration: 300 });
```

**Aggressive (playful):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.25)'] }, { duration: 400 });
```

### Brand Personality Matching

Match exaggeration to brand voice:

- **Serious/Medical:** 1.01-1.02
- **Corporate/Finance:** 1.02-1.05
- **Tech/Startup:** 1.05-1.08
- **Social/Lifestyle:** 1.08-1.12
- **Games/Kids:** 1.15-1.30

### Readability Through Exaggeration

**Make important moments bigger:**

```javascript
// Regular list item
item.animate({ transform: ['translateY(20px)', 'translateY(0)'] }, {
  duration: 300
});

// Highlighted/important item - exaggerate motion
importantItem.animate({ transform: ['translateY(40px)', 'translateY(0)'] }, {
  duration: 400  // also longer duration
});
```

### Volume Conservation Even When Exaggerating

**Maintain physics even with cartoon motion:**

```javascript
// Exaggerated squash but conserves volume
element.animate([
  { transform: 'scaleY(1) scaleX(1)' },
  { transform: 'scaleY(0.5) scaleX(1.5)' },  // 50% squash, volume = 0.5 * 1.5 = 0.75
  { transform: 'scaleY(1) scaleX(1)' }
], { duration: 300 });
```

### When Realism Serves Better

**Skip exaggeration:**
- Data visualizations (precision matters)
- Photo galleries (don't distort images)
- Video players (realistic controls)
- Maps (spatial accuracy)
- Charts/graphs (accurate representation)

### Output

Exaggeration specification:

```
Context: Consumer social app
Brand: Friendly, approachable
Exaggeration level: Moderate (10%)
Success states: Scale to 1.15 with bounce
Errors: 20px shake amplitude
Hover: Scale to 1.05
Focus: Scale to 1.08
Overall tone: Noticeable but not cartoonish
```
