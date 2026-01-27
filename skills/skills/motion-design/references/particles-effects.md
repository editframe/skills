# Particles & Effects

Ambient and celebratory particle motion systems.

## Skill 19: Particle & Effects Systems

**What it does:** Adds ambient or celebratory particle motion

### When to Use Particles

**Good use cases:**
- ✅ Success moments (confetti)
- ✅ Magical/special interactions
- ✅ Background ambiance (subtle only)
- ✅ Celebratory feedback
- ✅ Premium feature indicators

**Avoid:**
- ❌ Regular UI interactions (distracting)
- ❌ Frequent actions (becomes noise)
- ❌ Loading states (adds confusion)
- ❌ Error states (wrong emotion)

### Birth Rate Calculation

**20-50 particles/second for most effects:**

```javascript
const birthRate = 30; // particles per second
const birthInterval = 1000 / birthRate; // 33ms between particles

const particleEmitter = setInterval(() => {
  createParticle();
}, birthInterval);
```

**Burst vs continuous:**

**Burst (celebration):**
```javascript
// Create 20 particles instantly
for (let i = 0; i < 20; i++) {
  createParticle({
    delay: i * 10  // slight stagger
  });
}
```

**Continuous (ambient):**
```javascript
// Emit particles over time
let emitted = 0;
const maxParticles = 50;
const emitter = setInterval(() => {
  if (emitted < maxParticles) {
    createParticle();
    emitted++;
  } else {
    clearInterval(emitter);
  }
}, 100);
```

### Lifetime Duration

**800-1500ms typical:**

```javascript
function createParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle';
  document.body.appendChild(particle);
  
  // Animate particle
  particle.animate([
    { 
      transform: 'translate(0, 0) scale(1)',
      opacity: 1
    },
    { 
      transform: `translate(${randomX}px, ${randomY}px) scale(0.5)`,
      opacity: 0
    }
  ], {
    duration: 1200,  // lifetime
    easing: 'ease-out'
  });
  
  // Remove after lifetime
  setTimeout(() => particle.remove(), 1200);
}
```

### Velocity and Gravity

**Initial velocity:**

```javascript
function createParticle() {
  const angle = random(0, Math.PI * 2);  // any direction
  const speed = random(100, 300);         // pixels per second
  
  const velocityX = Math.cos(angle) * speed;
  const velocityY = Math.sin(angle) * speed;
  
  animateParticle(velocityX, velocityY);
}
```

**Apply gravity:**

```javascript
function animateParticle(vx, vy) {
  const gravity = 500;  // pixels/sec²
  const lifetime = 1500;
  const fps = 60;
  const dt = 1000 / fps;
  
  let x = 0;
  let y = 0;
  let currentVy = vy;
  
  const interval = setInterval(() => {
    // Update velocity (gravity)
    currentVy += gravity * (dt / 1000);
    
    // Update position
    x += vx * (dt / 1000);
    y += currentVy * (dt / 1000);
    
    particle.style.transform = `translate(${x}px, ${y}px)`;
  }, dt);
  
  setTimeout(() => clearInterval(interval), lifetime);
}
```

### Randomness Variation

**±100ms lifetime variation:**
```javascript
const lifetime = 1200 + random(-100, 100);
```

**±20% speed variation:**
```javascript
const baseSpeed = 200;
const speed = baseSpeed + random(-baseSpeed * 0.2, baseSpeed * 0.2);
```

**Random directions:**
```javascript
const angle = random(0, Math.PI * 2);  // full circle

// Or specific range (upward cone)
const angle = random(-Math.PI / 4, Math.PI / 4) - Math.PI / 2;  // upward 90° cone
```

### Fade Out Timing

**Last 30% of lifetime:**

```javascript
particle.animate([
  { 
    opacity: 1,
    offset: 0 
  },
  { 
    opacity: 1,
    offset: 0.7  // maintain opacity for 70% of life
  },
  { 
    opacity: 0,
    offset: 1    // fade out last 30%
  }
], {
  duration: 1500
});
```

### Combining Multiple Particle Types

**Confetti example:**

```javascript
function createConfetti() {
  const types = [
    { color: '#ef4444', shape: 'square' },
    { color: '#3b82f6', shape: 'circle' },
    { color: '#22c55e', shape: 'triangle' },
    { color: '#f59e0b', shape: 'rectangle' }
  ];
  
  for (let i = 0; i < 30; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    createParticle({
      color: type.color,
      shape: type.shape,
      angle: random(0, Math.PI * 2),
      speed: random(150, 300),
      lifetime: random(1000, 1500),
      size: random(8, 16)
    });
  }
}
```

### Performance Considerations

**Particle count limits:**

```javascript
const MAX_PARTICLES = 100;
let activeParticles = 0;

function createParticle() {
  if (activeParticles >= MAX_PARTICLES) {
    return; // Skip if at limit
  }
  
  activeParticles++;
  
  // ... create particle ...
  
  setTimeout(() => {
    activeParticles--;
  }, lifetime);
}
```

**Use CSS transforms (GPU accelerated):**
```css
.particle {
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0); /* Force GPU layer */
}
```

**Avoid:**
- Animating `left`/`top` properties
- Large particle images (use simple shapes)
- Shadows on particles
- Blur effects on particles

### Particle Patterns

**Explosion (radial burst):**
```javascript
for (let i = 0; i < 20; i++) {
  const angle = (Math.PI * 2 * i) / 20;  // evenly distributed
  createParticle({
    angle,
    speed: 200
  });
}
```

**Fountain (upward spray):**
```javascript
function createFountainParticle() {
  const angle = random(-Math.PI / 3, Math.PI / 3) - Math.PI / 2;  // upward cone
  createParticle({
    angle,
    speed: random(200, 400),
    gravity: 800  // strong gravity pulls back down
  });
}
```

**Rain (downward):**
```javascript
function createRainDrop() {
  const x = random(0, window.innerWidth);
  createParticle({
    startX: x,
    startY: 0,
    angle: Math.PI / 2,  // straight down
    speed: random(300, 500),
    lifetime: 2000
  });
}
```

**Sparkle (stationary):**
```javascript
function createSparkle(x, y) {
  const sparkle = createElement('div', 'sparkle');
  sparkle.style.left = x + 'px';
  sparkle.style.top = y + 'px';
  
  sparkle.animate([
    { opacity: 0, transform: 'scale(0) rotate(0deg)' },
    { opacity: 1, transform: 'scale(1) rotate(180deg)', offset: 0.5 },
    { opacity: 0, transform: 'scale(0) rotate(360deg)' }
  ], {
    duration: 800,
    easing: 'ease-in-out'
  });
  
  setTimeout(() => sparkle.remove(), 800);
}
```

### Ambient Background Effects

**Subtle, non-distracting:**

```javascript
// Slow-moving background particles
function createAmbientParticle() {
  const particle = createParticleElement();
  
  particle.animate([
    { 
      transform: 'translate(0, 0)',
      opacity: 0.1
    },
    { 
      transform: `translate(${random(-50, 50)}px, ${random(-100, 100)}px)`,
      opacity: 0.3,
      offset: 0.5
    },
    { 
      transform: `translate(${random(-50, 50)}px, ${random(-200, -100)}px)`,
      opacity: 0
    }
  ], {
    duration: 5000,  // very slow
    easing: 'ease-in-out'
  });
}

// Emit rarely
setInterval(createAmbientParticle, 2000);  // every 2 seconds
```

**Rules for ambient particles:**
- Low opacity (0.1-0.3 max)
- Slow movement (3-5 seconds)
- Few particles (10-20 max on screen)
- No interaction with user content
- Turn off during important interactions

### Success Celebration Pattern

```javascript
function celebrateSuccess(element) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // First wave - burst
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    createParticle({
      x: centerX,
      y: centerY,
      angle,
      speed: 250,
      color: ['#22c55e', '#3b82f6', '#f59e0b'][i % 3],
      size: random(6, 12),
      lifetime: 1200
    });
  }
  
  // Second wave - delayed fountain
  setTimeout(() => {
    for (let i = 0; i < 15; i++) {
      const angle = random(-Math.PI / 4, Math.PI / 4) - Math.PI / 2;
      createParticle({
        x: centerX,
        y: centerY,
        angle,
        speed: 300,
        color: '#22c55e',
        size: random(4, 8),
        lifetime: 1000,
        delay: i * 30
      });
    }
  }, 200);
}
```

### Output

Particle system specification:

```
Effect: Success confetti burst
Trigger: Button click success
Birth: Burst (25 particles instantly)
Lifetime: 1200ms ± 100ms
Velocity: 200-300 px/s, radial distribution
Gravity: 500 px/s²
Colors: Green (#22c55e), blue (#3b82f6), orange (#f59e0b)
Shapes: Circles and squares
Size: 8-14px
Fade: Last 30% of lifetime
Max particles: 50 concurrent
Performance: GPU transforms, simple shapes
```
