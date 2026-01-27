# Material & Weight Expression

Making objects feel like they have physical properties through timing.

## Skill 13: Material & Weight Expression

**What it does:** Makes objects feel like they have physical properties

### Timing for Weight

**The heavier something is, the longer it takes to move**

**Heavy (800-1200ms fall):**
```javascript
// Large modal, heavy card
heavyElement.animate({
  transform: ['translateY(-400px)', 'translateY(0)']
}, {
  duration: 900,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'  // heavy bounce
});
```

**Medium (400-600ms fall):**
```javascript
// Standard UI card
mediumElement.animate({
  transform: ['translateY(-400px)', 'translateY(0)']
}, {
  duration: 500,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'  // moderate bounce
});
```

**Light (200-400ms fall):**
```javascript
// Button, small chip
lightElement.animate({
  transform: ['translateY(-400px)', 'translateY(0)']
}, {
  duration: 300,
  easing: 'ease-out'  // light, quick
});
```

**Feather (1500-2500ms fall):**
```javascript
// Notification, toast
featherElement.animate([
  { transform: 'translateY(-200px)', opacity: 0 },
  { transform: 'translateY(-100px)', opacity: 0.5, offset: 0.3 },
  { transform: 'translateY(0)', opacity: 1 }
], {
  duration: 2000,
  easing: 'ease-out'  // very gentle
});
```

### Deformation for Flexibility

**Flexible materials deform more:**

**Rubber (60% deformation):**
```javascript
rubberBall.animate([
  { transform: 'scaleY(1) scaleX(1)' },
  { transform: 'scaleY(0.6) scaleX(1.4)' },  // heavy squash
  { transform: 'scaleY(1.3) scaleX(0.85)' }, // stretch
  { transform: 'scaleY(1) scaleX(1)' }
], { duration: 600 });
```

**Leather (30% deformation):**
```javascript
leatherCard.animate([
  { transform: 'scale(1)' },
  { transform: 'scaleY(0.97) scaleX(1.03)' }, // slight give
  { transform: 'scale(1)' }
], { duration: 300 });
```

**Wood (10% deformation):**
```javascript
woodenPanel.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.01)' }, // barely flexes
  { transform: 'scale(1)' }
], { duration: 200 });
```

**Metal (0-2% deformation):**
```javascript
metalButton.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(0.99)' }, // almost rigid
  { transform: 'scale(1)' }
], { duration: 150 });
```

### Bounce/Rebound for Elasticity

**Elastic materials bounce more:**

```javascript
// High elasticity (rubber ball)
ball.animate([
  { transform: 'translateY(-200px)' },
  { transform: 'translateY(0)' },       // ground
  { transform: 'translateY(-160px)' },  // 80% bounce
  { transform: 'translateY(0)' },       // ground
  { transform: 'translateY(-100px)' },  // 62.5% bounce
  { transform: 'translateY(0)' }        // settle
], {
  duration: 1200,
  easing: 'ease-in-out'
});

// Low elasticity (paper)
paper.animate([
  { transform: 'translateY(-200px)' },
  { transform: 'translateY(0)' },      // ground
  { transform: 'translateY(-20px)' },  // 10% bounce
  { transform: 'translateY(0)' }       // settle
], {
  duration: 800,
  easing: 'ease-out'
});
```

### Drag and Friction

**High friction = slow, resistant:**

```javascript
// Dragging heavy object across floor
dragElement.animate({
  transform: ['translateX(0)', 'translateX(200px)']
}, {
  duration: 800,  // slow due to friction
  easing: 'cubic-bezier(0.4, 0.1, 0.6, 0.9)'  // constant resistance
});
```

**Low friction = smooth glide:**

```javascript
// Ice skating motion
glideElement.animate({
  transform: ['translateX(0)', 'translateX(200px)']
}, {
  duration: 400,  // fast, smooth
  easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)'  // accelerates easily
});
```

### Inertia in Start/Stop

**Heavy objects resist changes in motion:**

```javascript
// Heavy element starting from rest
async function startHeavyMotion(element) {
  // Slow start (overcoming inertia)
  await element.animate({
    transform: ['translateX(0)', 'translateX(50px)']
  }, {
    duration: 400,
    easing: 'cubic-bezier(0.7, 0, 0.3, 1)'  // slow start
  }).finished;
  
  // Continue moving (has momentum now)
  await element.animate({
    transform: ['translateX(50px)', 'translateX(200px)']
  }, {
    duration: 300,
    easing: 'linear'  // constant speed
  }).finished;
  
  // Slow stop (momentum resists)
  await element.animate({
    transform: ['translateX(200px)', 'translateX(250px)']
  }, {
    duration: 400,
    easing: 'cubic-bezier(0, 0, 0.2, 1)'  // slow deceleration
  }).finished;
}
```

### Settling Behavior

**After movement, elements settle into place:**

```javascript
// Card lands and settles
card.animate([
  { 
    transform: 'translateY(-400px) rotate(0deg)',
    offset: 0 
  },
  { 
    transform: 'translateY(0) rotate(0deg)',
    offset: 0.6
  },
  { 
    transform: 'translateY(-20px) rotate(-2deg)',  // slight bounce
    offset: 0.75
  },
  { 
    transform: 'translateY(0) rotate(1deg)',       // settle
    offset: 0.9
  },
  { 
    transform: 'translateY(0) rotate(0deg)',       // final rest
    offset: 1
  }
], {
  duration: 800,
  easing: 'ease-out'
});
```

### Resistance Through Timing

**Slower timing = appears heavier/more resistance:**

```javascript
// Button press comparison

// Heavy button (stone)
stoneButton.animate({
  transform: ['scale(1)', 'scale(0.97)']
}, {
  duration: 200,  // resists pressing
  easing: 'ease-in-out'
});

// Light button (foam)
foamButton.animate({
  transform: ['scale(1)', 'scale(0.9)']  // more compression
}, {
  duration: 100,  // gives easily
  easing: 'ease-out'
});
```

### Material-Based Duration Ratios

**Consistent ratios across same material:**

```javascript
const materialTimings = {
  feather: { base: 2000, ratio: 2.5 },
  paper: { base: 800, ratio: 1.3 },
  wood: { base: 500, ratio: 1.0 },
  plastic: { base: 350, ratio: 0.7 },
  metal: { base: 300, ratio: 0.6 },
  stone: { base: 600, ratio: 1.2 }
};

// Calculate timing for any material
function getMaterialTiming(material, distance) {
  const { base, ratio } = materialTimings[material];
  const distanceFactor = distance / 100;  // normalize
  return base * ratio * distanceFactor;
}

// All wood elements move consistently
woodCard.duration = getMaterialTiming('wood', 200);   // 1000ms
woodButton.duration = getMaterialTiming('wood', 50);  // 250ms
```

### Weight Through Sound (When Applicable)

**Heavy = low frequency, Light = high frequency:**

```javascript
function playImpactSound(weight) {
  const frequency = weight === 'heavy' ? 100 : 
                    weight === 'medium' ? 300 : 
                    600;
  
  const duration = weight === 'heavy' ? 400 :
                   weight === 'medium' ? 200 :
                   100;
  
  // Play sound at calculated frequency
  playTone(frequency, duration);
}
```

### Density vs Size

**Small + heavy vs Large + light:**

```javascript
// Small stone (dense)
smallStone.animate({
  transform: ['translateY(-200px)', 'translateY(0)']
}, {
  duration: 400,  // fast fall but...
  easing: 'ease-in'  // heavy impact
});

// Large balloon (not dense)
largeBalloon.animate({
  transform: ['translateY(-200px)', 'translateY(0)']
}, {
  duration: 1800,  // slow fall
  easing: 'ease-out'  // gentle landing
});
```

### Material Property Matrix

| Material | Timing | Deformation | Bounce | Friction |
|----------|--------|-------------|---------|----------|
| Feather | 2000ms | 80% | 0% | Low |
| Paper | 800ms | 40% | 10% | Medium |
| Leather | 500ms | 30% | 15% | High |
| Rubber | 600ms | 60% | 80% | High |
| Wood | 500ms | 10% | 20% | Medium |
| Plastic | 350ms | 20% | 30% | Low |
| Glass | 400ms | 0% | 25% | Low |
| Metal | 300ms | 2% | 5% | Medium |
| Stone | 600ms | 0% | 5% | High |

### Output

Material & weight specification:

```
Element: Product card
Material: Paper-like
Weight: Light-medium
Timing: 650ms (base for 300px movement)
Deformation: 35% compression on press
Bounce: 12% on landing
Friction: Medium (ease-in-out)
Settling: 3-phase (land, bounce 12%, settle)
Inertia: Moderate (200ms to overcome at start)
Feel: Lightweight but substantial, tactile
```
