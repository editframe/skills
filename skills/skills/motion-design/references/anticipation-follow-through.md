# Anticipation & Follow-Through

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