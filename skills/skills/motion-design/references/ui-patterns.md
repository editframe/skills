# UI Animation Patterns

Common interaction patterns and state transitions.

## Skill 10: Entrance & Exit Patterns

**What it does:** Specializes in appear/disappear transitions

### Entrance Patterns

**Fade + Slide (most common):**
```css
.fade-slide-in {
  animation: fadeSlideIn 300ms ease-out;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Scale + Fade:**
```css
.scale-fade-in {
  animation: scaleFadeIn 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes scaleFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Wipe/Reveal:**
```css
.wipe-in {
  animation: wipeIn 400ms ease-out;
}

@keyframes wipeIn {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0% 0 0); }
}
```

**Blur Focus:**
```css
.blur-in {
  animation: blurIn 400ms ease-out;
}

@keyframes blurIn {
  from {
    opacity: 0;
    filter: blur(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
```

### Exit Patterns

**Reverse or simplified versions of entrances**

**Key rule: Exits are 30-40% faster than entrances**

**Fade + Slide Out:**
```css
.fade-slide-out {
  animation: fadeSlideOut 200ms ease-in forwards;
}

@keyframes fadeSlideOut {
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

**Scale + Fade Out:**
```css
.scale-fade-out {
  animation: scaleFadeOut 200ms ease-in forwards;
}

@keyframes scaleFadeOut {
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

### Direction Selection

**From edge:**
- Slide from top/bottom/left/right
- Use when element is replacing something
- Directional = shows relationship

```css
.slide-from-right {
  animation: slideFromRight 300ms ease-out;
}

@keyframes slideFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

**From center:**
- Scale up from middle
- Use when element is appearing in place
- Non-directional = focus on content

```css
.scale-from-center {
  transform-origin: center center;
  animation: scaleFromCenter 300ms ease-out;
}

@keyframes scaleFromCenter {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
```

### Transform Origin Selection

```css
/* Appear from top-left corner */
transform-origin: top left;

/* Appear from center (most common) */
transform-origin: center center;

/* Appear from bottom (like rising) */
transform-origin: center bottom;

/* Appear from cursor position (advanced) */
transform-origin: var(--cursor-x) var(--cursor-y);
```

### Combining Properties

**Optimal combination: 2-3 properties max**

**Good combinations:**
- Opacity + Position ✅
- Opacity + Scale ✅
- Opacity + Position + Scale ✅
- Opacity + Blur ✅

**Too much:**
- Opacity + Position + Scale + Rotate + Blur ❌

```javascript
// Good: 3 properties
element.animate([
  { 
    opacity: 0,
    transform: 'translateY(20px) scale(0.95)'
  },
  { 
    opacity: 1,
    transform: 'translateY(0) scale(1)'
  }
], { duration: 300, easing: 'ease-out' });
```

### Clip-Path vs Transform Techniques

**Clip-path:**
- Reveals content progressively
- Good for wipes, reveals
- More CPU intensive

```javascript
element.animate([
  { clipPath: 'circle(0% at 50% 50%)' },
  { clipPath: 'circle(100% at 50% 50%)' }
], { duration: 500, easing: 'ease-out' });
```

**Transform:**
- Moves entire element
- GPU accelerated (faster)
- Use when possible

```javascript
element.animate({
  transform: ['translateY(100%)', 'translateY(0)']
}, { duration: 300, easing: 'ease-out' });
```

### Output

Entrance/exit specification:

```
Entrance:
  Pattern: Fade + slide
  Direction: From bottom (+20px)
  Duration: 320ms
  Easing: ease-out
  Properties: opacity (0→1), translateY (20px→0)

Exit:
  Pattern: Fade + slide (simplified)
  Direction: Up (-10px)
  Duration: 200ms
  Easing: ease-in
  Properties: opacity (1→0), translateY (0→-10px)
```

---

## Skill 16: State Transition Patterns

**What it does:** Handles common UI state changes

### Hover State

**Timing:**
- Entry: 150-200ms
- Exit: 200-300ms (slower exit feels better)

**Effects:**
- Subtle scale (1.02-1.05)
- Color shift
- Shadow/glow
- Lift (translateY)

```javascript
// Hover entry
button.addEventListener('mouseenter', () => {
  button.animate([
    { 
      transform: 'scale(1) translateY(0)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    { 
      transform: 'scale(1.02) translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
    }
  ], {
    duration: 150,
    fill: 'forwards',
    easing: 'ease-out'
  });
});

// Hover exit
button.addEventListener('mouseleave', () => {
  button.animate([
    { 
      transform: 'scale(1.02) translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
    },
    { 
      transform: 'scale(1) translateY(0)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  ], {
    duration: 250,
    fill: 'forwards',
    easing: 'ease-in-out'
  });
});
```

### Focus/Selection State

**Timing:** 200-300ms
**Persist:** Until deselect

```javascript
// Focus
input.addEventListener('focus', () => {
  input.animate([
    { 
      borderColor: '#ccc',
      boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)'
    },
    { 
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)'
    }
  ], {
    duration: 200,
    fill: 'forwards',
    easing: 'ease-out'
  });
});
```

**Selection (checkbox, radio):**
```javascript
checkbox.addEventListener('change', () => {
  if (checkbox.checked) {
    checkbox.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ], {
      duration: 300,
      easing: 'ease-in-out'
    });
  }
});
```

### Loading State

**Indeterminate loop: 1200-1500ms**

```javascript
// Spinner
spinner.animate([
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(360deg)' }
], {
  duration: 1200,
  iterations: Infinity,
  easing: 'linear'  // constant speed for spinners
});
```

**Progress indication:**
```javascript
// Progress bar
progressBar.animate([
  { transform: 'scaleX(0)', transformOrigin: 'left' },
  { transform: 'scaleX(1)', transformOrigin: 'left' }
], {
  duration: 2000,
  easing: 'ease-out'
});
```

**Skeleton loading:**
```javascript
// Pulsing placeholder
skeleton.animate([
  { opacity: 0.6 },
  { opacity: 1 },
  { opacity: 0.6 }
], {
  duration: 1500,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

### Success State

**Timing:** 600-1000ms
**Feel:** Celebratory

```javascript
successButton.animate([
  { 
    transform: 'scale(1)',
    backgroundColor: '#3b82f6'
  },
  { 
    transform: 'scale(1.15)',
    backgroundColor: '#22c55e',
    offset: 0.4
  },
  { 
    transform: 'scale(0.95)',
    backgroundColor: '#22c55e',
    offset: 0.7
  },
  { 
    transform: 'scale(1)',
    backgroundColor: '#22c55e'
  }
], {
  duration: 600,
  easing: 'ease-in-out'
});
```

**With particles (optional):**
```javascript
// Success confetti burst
for (let i = 0; i < 20; i++) {
  createParticle({
    velocity: random(-200, 200),
    angle: random(0, 360),
    color: '#22c55e',
    lifetime: 1000
  });
}
```

### Error State

**Timing:** 400-600ms
**Feel:** Urgent, attention-grabbing

```javascript
// Horizontal shake
errorInput.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(-15px)', offset: 0.2 },
  { transform: 'translateX(15px)', offset: 0.4 },
  { transform: 'translateX(-10px)', offset: 0.6 },
  { transform: 'translateX(10px)', offset: 0.8 },
  { transform: 'translateX(0)' }
], {
  duration: 400
});

// Color shift to red
errorInput.animate({
  borderColor: ['#ccc', '#ef4444']
}, {
  duration: 200,
  fill: 'forwards'
});
```

### Disabled State

**Timing:** 200ms
**Feel:** Fade out, unusable

```javascript
button.animate([
  { 
    opacity: 1,
    filter: 'grayscale(0)',
    cursor: 'pointer'
  },
  { 
    opacity: 0.5,
    filter: 'grayscale(1)',
    cursor: 'not-allowed'
  }
], {
  duration: 200,
  fill: 'forwards',
  easing: 'ease-out'
});
```

### Toggle State

**Clear on/off with distinct motion:**

```javascript
// Toggle switch
toggle.addEventListener('click', () => {
  const isOn = toggle.classList.toggle('on');
  
  toggle.animate([
    { 
      backgroundColor: isOn ? '#ccc' : '#22c55e',
      transform: isOn ? 'translateX(0)' : 'translateX(20px)'
    },
    { 
      backgroundColor: isOn ? '#22c55e' : '#ccc',
      transform: isOn ? 'translateX(20px)' : 'translateX(0)'
    }
  ], {
    duration: 200,
    fill: 'forwards',
    easing: 'ease-in-out'
  });
});
```

### Output

State transition specifications:

```
Hover:
  Entry: 150ms, scale(1.02), shadow increase, ease-out
  Exit: 250ms, scale(1), shadow decrease, ease-in-out

Focus:
  Duration: 200ms
  Effect: Border glow, ring shadow
  Persist: Until blur

Success:
  Duration: 600ms
  Sequence: Scale bounce (1→1.15→0.95→1)
  Color: Blue → Green
  Optional: Particle burst

Error:
  Duration: 400ms
  Effect: Horizontal shake (±15px)
  Color: Border → Red
  Feel: Urgent

Loading:
  Loop: 1200ms
  Type: Spinner rotation
  Easing: Linear (constant speed)
```
