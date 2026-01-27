# State Transition Patterns

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