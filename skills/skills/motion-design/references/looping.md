# Looping & Continuity

Creating seamless infinite animations.

## Skill 15: Looping & Continuity

**What it does:** Creates seamless infinite animations

### Loop Duration Selection

**Loading states (1200-1500ms):**
```javascript
spinner.animate([
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(360deg)' }
], {
  duration: 1200,
  iterations: Infinity,
  easing: 'linear'  // constant speed for spinners
});
```

**Idle animations (2000-4000ms):**
```javascript
// Breathing effect
logo.animate([
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(1.05)', opacity: 0.9 },
  { transform: 'scale(1)', opacity: 1 }
], {
  duration: 3000,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

**Ambient background (4000-8000ms):**
```javascript
// Slow background waves
background.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(-50px)' },
  { transform: 'translateX(0)' }
], {
  duration: 6000,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

### Seamless Start/End Matching

**Frame 0 = Frame N requirement:**

```javascript
// Seamless loop
element.animate([
  { 
    transform: 'translate(0, 0) rotate(0deg)',
    opacity: 1
  },
  { 
    transform: 'translate(50px, -20px) rotate(90deg)',
    opacity: 0.5,
    offset: 0.5
  },
  { 
    transform: 'translate(0, 0) rotate(0deg)',  // matches frame 0
    opacity: 1                                    // matches frame 0
  }
], {
  duration: 2000,
  iterations: Infinity
});
```

**Common mistake (jarring):**
```javascript
// Bad: doesn't match start
element.animate([
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(180deg)' }  // should be 360deg to match start
], {
  duration: 1000,
  iterations: Infinity
});
// Creates jump when looping
```

### Ease-In-Out for Smooth Endless Loops

**S-curve easing works best for loops:**

```javascript
// Smooth endless loop
element.animate([
  { transform: 'translateY(0)' },
  { transform: 'translateY(-20px)' },
  { transform: 'translateY(0)' }
], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out'  // no sudden speed changes
});
```

**Avoid ease-in/ease-out for loops:**
```javascript
// Bad: creates speed discontinuity at loop point
element.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.1)' },
  { transform: 'scale(1)' }
], {
  duration: 1500,
  iterations: Infinity,
  easing: 'ease-out'  // wrong - doesn't match loop speed
});
```

### Preventing Motion Sickness

**Avoid too much simultaneous rotation:**

```javascript
// Safe: Single axis rotation
spinner.animate({
  transform: ['rotate(0deg)', 'rotate(360deg)']
}, {
  duration: 1200,
  iterations: Infinity,
  easing: 'linear'
});

// Dangerous: Multiple axes rotating
element.animate({
  transform: [
    'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
    'rotateX(360deg) rotateY(360deg) rotateZ(360deg)'
  ]
}, {
  duration: 2000,
  iterations: Infinity
});
// Can cause nausea
```

**Safe rotation limits:**
- Single axis: Unlimited
- Two axes: <±15° max
- Three axes: Avoid for loops

### Idle State Animations

**Breathing (floating):**
```javascript
card.animate([
  { 
    transform: 'translateY(0)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  { 
    transform: 'translateY(-8px)',
    boxShadow: '0 8px 12px rgba(0,0,0,0.15)'
  },
  { 
    transform: 'translateY(0)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }
], {
  duration: 2500,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

**Pulsing:**
```javascript
notification.animate([
  { opacity: 1, transform: 'scale(1)' },
  { opacity: 0.8, transform: 'scale(0.98)' },
  { opacity: 1, transform: 'scale(1)' }
], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

**Glowing:**
```javascript
badge.animate([
  { boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' },
  { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
  { boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }
], {
  duration: 1800,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

### Variation Within Loops

**Prevent mechanical feeling:**

```javascript
// Add slight randomness to loop timing
function animateWithVariation() {
  const baseDuration = 2000;
  const variation = Math.random() * 200 - 100; // ±100ms
  const duration = baseDuration + variation;
  
  element.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(360deg)' }
  ], {
    duration: duration,
    iterations: 1
  }).finished.then(() => {
    // Start next loop with new random duration
    animateWithVariation();
  });
}
```

**Phase offset for multiple elements:**
```javascript
// Start loops at different phases
elements.forEach((el, i) => {
  const phase = (i / elements.length) * 2000; // stagger start
  
  setTimeout(() => {
    el.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)' },
      { transform: 'translateY(0)' }
    ], {
      duration: 2000,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }, phase);
});
```

### Loading Spinners

**Standard spinner:**
```javascript
spinner.animate([
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(360deg)' }
], {
  duration: 1000,
  iterations: Infinity,
  easing: 'linear'  // constant speed
});
```

**Dots animation:**
```javascript
dots.forEach((dot, i) => {
  dot.animate([
    { opacity: 0.3, transform: 'scale(1)' },
    { opacity: 1, transform: 'scale(1.2)' },
    { opacity: 0.3, transform: 'scale(1)' }
  ], {
    duration: 1200,
    delay: i * 200,  // staggered
    iterations: Infinity,
    easing: 'ease-in-out'
  });
});
```

**Progress indeterminate:**
```javascript
progressBar.animate([
  { 
    transform: 'translateX(-100%)',
    offset: 0
  },
  { 
    transform: 'translateX(0)',
    offset: 0.5
  },
  { 
    transform: 'translateX(100%)',
    offset: 1
  }
], {
  duration: 1500,
  iterations: Infinity,
  easing: 'cubic-bezier(0.65, 0, 0.35, 1)'
});
```

### Palindrome Loops

**Animate forward then reverse:**

```javascript
// direction: 'alternate' reverses each iteration
element.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(100px)' }
], {
  duration: 1000,
  iterations: Infinity,
  direction: 'alternate',  // forward, backward, forward, backward...
  easing: 'ease-in-out'
});
```

### Respecting Reduced Motion

**Disable loops for accessibility:**

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  element.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(360deg)' }
  ], {
    duration: 2000,
    iterations: Infinity
  });
} else {
  // Static or single-play alternative
  element.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration: 300,
    iterations: 1
  });
}
```

### Cleanup and Performance

**Stop loops when not visible:**

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Start loop
      startAnimation(entry.target);
    } else {
      // Stop loop
      stopAnimation(entry.target);
    }
  });
});

observer.observe(element);
```

**Cancel animations:**
```javascript
const animation = element.animate([...], { iterations: Infinity });

// Later, stop the loop
animation.cancel();
```

### Testing Loops

**Watch for at least 5 complete cycles:**
- First cycle might look fine
- Issues appear on 2nd, 3rd cycles
- Watch for jarring speed changes
- Check for memory leaks
- Verify no drift or shifting

### Output

Loop specification:

```
Element: Loading spinner
Duration: 1200ms per rotation
Iterations: Infinite
Easing: linear (constant rotation speed)
Direction: Forward only (clockwise)
Seamless: Yes (0deg === 360deg)
Motion safety: Single axis rotation only
Reduced motion: Fades to static icon
Visibility: Stops when offscreen
Performance: GPU-accelerated transform
```
