# Color Transitions

Strategies for smooth color changes over time.

## Skill 18: Color Transition Strategy

**What it does:** Manages color changes over time

### Duration Guidelines

**Subtle color shifts (200-300ms):**
- Hover state changes
- Interactive feedback
- Small UI elements

```javascript
button.animate({
  backgroundColor: ['#3b82f6', '#2563eb']
}, {
  duration: 200,
  fill: 'forwards',
  easing: 'ease-in-out'
});
```

**Dramatic color changes (400-600ms):**
- State transitions (success, error)
- Theme switches
- Major UI changes

```javascript
card.animate({
  backgroundColor: ['#ffffff', '#22c55e']
}, {
  duration: 500,
  fill: 'forwards',
  easing: 'ease-in-out'
});
```

**Background color changes (600-1000ms):**
- Full-page theme changes
- Scene transitions
- Ambient color shifts

```javascript
body.animate({
  backgroundColor: ['#f3f4f6', '#1f2937']
}, {
  duration: 800,
  fill: 'forwards',
  easing: 'ease-in-out'
});
```

### Easing for Color

**Almost always: ease-in-out**

```javascript
element.animate({
  color: [startColor, endColor]
}, {
  easing: 'ease-in-out'  // smooth, comfortable
});
```

**Why:** 
- Color changes don't benefit from physics-based easing
- Smooth acceleration/deceleration feels natural
- Linear = jarring
- Ease-in/ease-out alone = feels incomplete

### Color Space Selection

**RGB (default) - Direct interpolation:**
```javascript
// Blue to Red via RGB
element.animate({
  backgroundColor: ['rgb(59, 130, 246)', 'rgb(239, 68, 68)']
}, { duration: 400 });
// Goes through purple/muddy middle colors
```

**HSL - Better for hue shifts:**
```javascript
// Blue to Red via HSL (rotate hue)
element.animate({
  backgroundColor: ['hsl(217, 91%, 60%)', 'hsl(0, 84%, 60%)']
}, { duration: 400 });
// Smoother transition through color wheel
```

**Use HSL when:**
- ✅ Shifting hue (blue → green)
- ✅ Want vibrant intermediate colors
- ✅ Rainbow/spectrum effects

**Use RGB when:**
- ✅ Brightness changes (dark → light)
- ✅ Saturation changes (gray → vivid)
- ✅ Simple color pairs

### Avoiding Jarring Shifts

**Don't change large areas too quickly:**

```javascript
// Bad: Full screen flashes color
body.animate({
  backgroundColor: ['white', 'black']
}, { duration: 100 });  // Too fast, jarring

// Good: Comfortable transition
body.animate({
  backgroundColor: ['white', 'black']
}, { duration: 600 });  // Smooth, comfortable
```

**Principle:** Larger area = longer duration needed

- Small button: 200ms OK
- Card: 300-400ms
- Section: 500-600ms
- Full page: 800-1000ms

### Combining with Other Properties

**Color + scale:**
```javascript
successButton.animate([
  { 
    backgroundColor: '#3b82f6',
    transform: 'scale(1)'
  },
  { 
    backgroundColor: '#22c55e',
    transform: 'scale(1.1)',
    offset: 0.5
  },
  { 
    backgroundColor: '#22c55e',
    transform: 'scale(1)'
  }
], {
  duration: 600,
  easing: 'ease-in-out'
});
```

**Color + opacity:**
```javascript
element.animate([
  { 
    backgroundColor: '#3b82f6',
    opacity: 0
  },
  { 
    backgroundColor: '#3b82f6',
    opacity: 1
  }
], {
  duration: 400,
  easing: 'ease-out'
});
```

### Accessible Contrast Maintenance

**Critical: Never drop below 4.5:1 contrast during transition**

```javascript
// Check intermediate color contrast
function getIntermediateColor(start, end, progress) {
  // Calculate color at progress point
  const color = interpolateColor(start, end, progress);
  
  // Verify contrast
  const contrast = calculateContrast(color, backgroundColor);
  if (contrast < 4.5) {
    console.warn('Contrast drops below minimum during transition');
  }
  
  return color;
}
```

**Strategy:**
- Test contrast at 0%, 25%, 50%, 75%, 100% of transition
- Adjust timing or intermediate colors if needed

### State-Based Color Systems

**Success = Green:**
```javascript
element.animate({
  backgroundColor: [currentColor, '#22c55e'],
  borderColor: [currentBorder, '#16a34a']
}, {
  duration: 500,
  fill: 'forwards'
});
```

**Error = Red:**
```javascript
element.animate({
  backgroundColor: [currentColor, '#ef4444'],
  borderColor: [currentBorder, '#dc2626']
}, {
  duration: 400,
  fill: 'forwards'
});
```

**Warning = Yellow/Orange:**
```javascript
element.animate({
  backgroundColor: [currentColor, '#f59e0b'],
  borderColor: [currentBorder, '#d97706']
}, {
  duration: 400,
  fill: 'forwards'
});
```

**Info = Blue:**
```javascript
element.animate({
  backgroundColor: [currentColor, '#3b82f6'],
  borderColor: [currentBorder, '#2563eb']
}, {
  duration: 400,
  fill: 'forwards'
});
```

### Gradient Transitions

**Animating gradients is expensive - use sparingly:**

```javascript
// Color stop transitions
element.animate([
  { 
    backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6)'
  },
  { 
    backgroundImage: 'linear-gradient(to right, #8b5cf6, #ec4899)'
  }
], {
  duration: 1000,
  easing: 'ease-in-out'
});
```

**Alternative (better performance):**
- Animate opacity of overlapping gradients
- Use pseudo-elements with transitions

### Theme Switching

**Dark mode toggle:**

```javascript
// Stagger color changes for smooth transition
await document.body.animate({
  backgroundColor: ['#ffffff', '#1f2937']
}, {
  duration: 600,
  fill: 'forwards',
  easing: 'ease-in-out'
}).finished;

// Then update text colors
await Promise.all(
  textElements.map((el, i) =>
    el.animate({
      color: ['#1f2937', '#f3f4f6']
    }, {
      duration: 400,
      delay: i * 20,
      fill: 'forwards',
      easing: 'ease-in-out'
    }).finished
  )
);
```

### Color Pulsing Effects

**Breathing animation:**

```javascript
notification.animate([
  { backgroundColor: '#3b82f6' },
  { backgroundColor: '#60a5fa' },  // lighter
  { backgroundColor: '#3b82f6' }
], {
  duration: 2000,
  iterations: Infinity,
  easing: 'ease-in-out'
});
```

**Use for:**
- Notifications
- Loading states
- Ambient effects
- Never for primary content (distracting)

### Performance Notes

**Color transitions are relatively cheap:**
- GPU can handle color interpolation well
- Much better than position/size changes for many elements

**But watch out for:**
- Animating colors on hundreds of elements simultaneously
- Complex gradients
- Filter effects (backdrop-blur, etc.)

### Output

Color transition specification:

```
Element: Success notification card
Transition: Neutral → Success
From: backgroundColor: #f3f4f6, borderColor: #d1d5db
To: backgroundColor: #d1fae5, borderColor: #22c55e
Duration: 500ms
Easing: ease-in-out
Color space: RGB (brightness change)
Contrast: Maintained >4.5:1 throughout
Combined with: Scale (1 → 1.05 → 1) for emphasis
```
