# Squash & Stretch Application

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