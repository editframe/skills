# Staging & Composition

Managing visual hierarchy and clarity during motion.

## Skill 11: Staging & Composition

**What it does:** Manages visual hierarchy and clarity during motion

### Focal Point Establishment

**One clear focal point at any moment:**

```javascript
// Bad: Multiple competing focal points
header.animate({ transform: ['translateY(-100px)', 'translateY(0)'] }, { duration: 400 });
sidebar.animate({ transform: ['translateX(-300px)', 'translateX(0)'] }, { duration: 400 });
content.animate({ opacity: [0, 1] }, { duration: 400 });
// All start at same time - unclear where to look

// Good: Sequential focal points
await header.animate({ transform: ['translateY(-100px)', 'translateY(0)'] }, { duration: 300 }).finished;
await new Promise(r => setTimeout(r, 100)); // rest
await sidebar.animate({ transform: ['translateX(-300px)', 'translateX(0)'] }, { duration: 300 }).finished;
await new Promise(r => setTimeout(r, 100)); // rest
await content.animate({ opacity: [0, 1] }, { duration: 300 }).finished;
// Clear sequence - viewer knows where to look
```

### Background Dimming

**Reduce visual noise during important motion:**

```javascript
async function showModal(modal) {
  // First: Dim background
  await background.animate({
    filter: ['blur(0px) brightness(1)', 'blur(4px) brightness(0.7)']
  }, {
    duration: 300,
    fill: 'forwards',
    easing: 'ease-out'
  }).finished;
  
  // Then: Show modal (now it's clear focal point)
  await modal.animate({
    opacity: [0, 1],
    transform: ['scale(0.9)', 'scale(1)']
  }, {
    duration: 400,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }).finished;
}
```

### Contrast Management

**Moving elements need high contrast:**

```javascript
// Ensure element is visible during motion
function ensureContrast(element, background) {
  const bgColor = getComputedStyle(background).backgroundColor;
  const elementColor = getComputedStyle(element).color;
  
  const contrast = calculateContrast(bgColor, elementColor);
  
  if (contrast < 4.5) {
    // Add temporary shadow/glow during animation
    element.animate({
      filter: ['drop-shadow(0 0 0 transparent)', 'drop-shadow(0 0 8px rgba(0,0,0,0.5))']
    }, {
      duration: animationDuration,
      easing: 'ease-out'
    });
  }
}
```

### Size and Position for Emphasis

**Larger + centered = more important:**

```javascript
// Emphasize element by bringing to center and enlarging
element.animate([
  { 
    transform: `translate(${currentX}px, ${currentY}px) scale(1)`
  },
  { 
    transform: `translate(${centerX}px, ${centerY}px) scale(1.5)`
  }
], {
  duration: 500,
  easing: 'ease-in-out'
});
```

**Small + edge = less important:**
```javascript
// De-emphasize by moving to corner and shrinking
element.animate([
  { 
    transform: 'translate(0, 0) scale(1)'
  },
  { 
    transform: 'translate(20px, 20px) scale(0.7)'
  }
], {
  duration: 400,
  easing: 'ease-in-out'
});
```

### Motion Blur and Trails

**Add blur during fast motion:**

```javascript
// Fast movement gets motion blur
fastElement.animate([
  { 
    transform: 'translateX(0)',
    filter: 'blur(0px)'
  },
  { 
    transform: 'translateX(400px)',
    filter: 'blur(4px)',
    offset: 0.5  // peak blur at midpoint
  },
  { 
    transform: 'translateX(800px)',
    filter: 'blur(0px)'
  }
], {
  duration: 300,
  easing: 'ease-in-out'
});
```

**Trails for speed indication:**
```javascript
// Create trail effect with staggered clones
function createMotionTrail(element) {
  for (let i = 0; i < 3; i++) {
    const trail = element.cloneNode(true);
    trail.style.opacity = 0.3 - (i * 0.1);
    document.body.appendChild(trail);
    
    trail.animate([
      { transform: element.style.transform },
      { transform: getComputedStyle(element).transform }
    ], {
      duration: 150,
      delay: i * 30,
      fill: 'forwards'
    });
    
    setTimeout(() => trail.remove(), 200);
  }
}
```

### Depth Through Parallax

**Background moves slower than foreground:**

```javascript
// Scroll-based parallax
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  
  // Background moves slowest
  background.style.transform = `translateY(${scrollY * 0.3}px)`;
  
  // Midground moves medium speed
  midground.style.transform = `translateY(${scrollY * 0.6}px)`;
  
  // Foreground moves with scroll (1:1)
  foreground.style.transform = `translateY(${scrollY}px)`;
});
```

### Layer Timing for Depth

**Further layers move first, closer layers follow:**

```javascript
async function revealScene() {
  // Background (furthest) - starts first
  background.animate({ opacity: [0, 1] }, {
    duration: 600,
    easing: 'ease-out'
  });
  
  await new Promise(r => setTimeout(r, 100));
  
  // Midground - starts 100ms later
  midground.animate({ opacity: [0, 1] }, {
    duration: 500,
    easing: 'ease-out'
  });
  
  await new Promise(r => setTimeout(r, 100));
  
  // Foreground (closest) - starts last
  foreground.animate({ opacity: [0, 1] }, {
    duration: 400,
    easing: 'ease-out'
  });
}
```

### Ensuring Legibility

**Text must be readable throughout animation:**

```javascript
// Check contrast at each animation frame
function animateWithContrast(text, background) {
  const frames = 10;
  for (let i = 0; i <= frames; i++) {
    const progress = i / frames;
    const textColor = interpolateColor(startColor, endColor, progress);
    const contrast = calculateContrast(textColor, bgColor);
    
    if (contrast < 4.5) {
      console.warn(`Contrast fails at ${progress * 100}% of animation`);
      // Adjust colors or add temporary shadow
    }
  }
}
```

**Avoid:**
- Text over complex moving backgrounds
- Rapid color changes while text is being read
- Distorting text beyond recognition
- Text disappearing before it's read

### Secondary Action Support

**Background elements support but don't distract:**

```javascript
// Primary action: Modal appears
modal.animate({
  opacity: [0, 1],
  transform: ['scale(0.8)', 'scale(1)']
}, {
  duration: 400,
  easing: 'ease-out'
});

// Secondary action: Subtle background particles (supports mood)
for (let i = 0; i < 5; i++) {
  createParticle({
    opacity: 0.2,  // very subtle
    speed: 50,     // slow
    size: 4        // small
  });
}
```

**Rules for secondary action:**
- Lower opacity (0.1-0.3)
- Slower speed
- Smaller size
- Fewer elements
- Never in same area as primary

### Framing and Negative Space

**Give motion room to breathe:**

```javascript
// Ensure elements don't animate too close to edges
function calculateSafeArea() {
  const margin = 40; // minimum margin from edge
  
  return {
    minX: margin,
    maxX: window.innerWidth - margin,
    minY: margin,
    maxY: window.innerHeight - margin
  };
}

// Constrain animation within safe area
element.animate({
  transform: [
    'translate(0, 0)',
    `translate(${clamp(targetX, safeArea.minX, safeArea.maxX)}px, 
                ${clamp(targetY, safeArea.minY, safeArea.maxY)}px)`
  ]
}, { duration: 400 });
```

### Grid and Alignment

**Align to visual grid during motion:**

```javascript
// Snap to 8px grid after animation completes
async function animateAndSnap(element, targetX, targetY) {
  await element.animate({
    transform: [`translate(0, 0)`, `translate(${targetX}px, ${targetY}px)`]
  }, {
    duration: 400,
    easing: 'ease-out'
  }).finished;
  
  // Snap to nearest 8px
  const snappedX = Math.round(targetX / 8) * 8;
  const snappedY = Math.round(targetY / 8) * 8;
  
  element.animate({
    transform: [
      `translate(${targetX}px, ${targetY}px)`,
      `translate(${snappedX}px, ${snappedY}px)`
    ]
  }, {
    duration: 150,
    easing: 'ease-out',
    fill: 'forwards'
  });
}
```

### Output

Staging & composition specification:

```
Scene: Product card reveal
Focal point: Product image (center, large)
Background: Dim to 70% brightness, blur 4px
Timing: Sequential (background → product → details → CTA)
Contrast: Product has drop-shadow during motion
Depth: 3 layers with parallax (background 0.3x, product 0.6x, UI 1x)
Secondary motion: Subtle sparkles (opacity 0.2, after primary settles)
Legibility: Minimum 4.5:1 contrast maintained
Grid: All elements snap to 8px grid after motion
```
