# Arc & Path Construction

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

**Method 1: Translate + Rotate:**
```css
@keyframes arc-simple {
  from {
    transform: translateX(0) translateY(0) rotate(0deg);
  }
  to {
    transform: translateX(200px) translateY(-50px) rotate(15deg);
  }
}
```

**Method 2: Motion Path (CSS):**
```css
.curved-path {
  offset-path: path('M 0 0 Q 150 -50, 300 0');
  animation: follow-path 500ms ease-in-out;
}

@keyframes follow-path {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
```

**Method 3: SVG Path:**
```css
.svg-motion {
  offset-path: path('M 10,10 C 50,5 70,30 100,50');
  offset-rotate: auto; /* element rotates to follow path */
  animation: trace 800ms ease-in-out;
}

@keyframes trace {
  to { offset-distance: 100%; }
}
```

### Arc Deviation Amount

**5-15% deviation from straight path:**

```css
/* Quadratic bezier curve */
.arc-motion {
  offset-path: path('M 0 0 Q 150 -30, 300 0');
  animation: arc 500ms ease-in-out;
}

@keyframes arc {
  to { offset-distance: 100%; }
}
```

**Conceptual:**
```
straight: (0,0) → (300,0)
arc peak: (150, -30)  /* 10% of horizontal distance */
```

Moving from (0,0) to (300,0):
- Straight line: y = 0 throughout
- Arc: peaks at y = -30 (10% of 300px)

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

### Motion Path Examples

**Quadratic bezier (simple curve):**
```css
.simple-arc {
  offset-path: path('M 0 0 Q 150 -50, 300 0');
  offset-rotate: 0deg; /* keep upright */
  animation: move 500ms ease-in-out;
}
```
**Path format:** `M startX startY Q controlX controlY, endX endY`

**Cubic bezier (S-curve):**
```css
.s-curve {
  offset-path: path('M 0 0 C 100 -50, 200 50, 300 0');
  offset-rotate: auto; /* rotate to follow curve */
  animation: move 800ms ease-in-out;
}
```
**Path format:** `M startX startY C control1X control1Y, control2X control2Y, endX endY`

**Circular arc:**
```css
.circular {
  offset-path: path('M 0 0 A 100 100 0 0 1 200 0');
  offset-rotate: auto;
  animation: orbit 1000ms ease-in-out;
}
```
**Path format:** `M startX startY A radiusX radiusY rotation largeArc sweep endX endY`

**Complex path:**
```css
.complex {
  offset-path: path('M 0 0 Q 50 -30, 100 -20 T 200 0 Q 250 20, 300 0');
  offset-rotate: auto;
  animation: wiggle 1200ms ease-in-out;
}
```

### Rotation Along Path

**Auto-rotation (follows path direction):**
```css
.auto-rotate {
  offset-path: path('M 0 0 Q 150 -40, 300 0');
  offset-rotate: auto; /* automatically rotates to face path direction */
  animation: move 500ms ease-in-out;
}
```

**Fixed rotation (stays upright):**
```css
.stay-upright {
  offset-path: path('M 0 0 Q 150 -40, 300 0');
  offset-rotate: 0deg; /* maintains original orientation */
  animation: move 500ms ease-in-out;
}
```

**Custom rotation offset:**
```css
.offset-rotation {
  offset-path: path('M 0 0 Q 150 -40, 300 0');
  offset-rotate: auto 90deg; /* rotates 90° from path direction */
  animation: move 500ms ease-in-out;
}
```

### Pendulum Arcs

**Swinging motion:**
```css
.pendulum {
  transform-origin: center top;
  animation: swing 2000ms ease-in-out infinite;
}

@keyframes swing {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(30deg); }
}
```

**Pattern:** 
```
left (-30°) → right (+30°) → left (-30°)
duration: 2000ms, ease-in-out for smooth transitions
```

### Physics-Based Arcs

**Throwing (parabolic):**
```css
.throw {
  offset-path: path('M 0 0 Q 100 -30, 200 100');
  animation: throw 800ms cubic-bezier(0.4, 0, 0.6, 1);
}
```
**Motion:** Horizontal at constant speed, vertical accelerates down

**Falling (accelerating down):**
```css
.fall {
  animation: fall 600ms ease-in;
}
@keyframes fall {
  to { transform: translateY(400px); }
}
```
**Easing:** ease-in = accelerates as it falls

**Rising (decelerating up):**
```css
.rise {
  animation: rise 600ms ease-out;
}
@keyframes rise {
  to { transform: translateY(-400px); }
}
```
**Easing:** ease-out = decelerates as it rises

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