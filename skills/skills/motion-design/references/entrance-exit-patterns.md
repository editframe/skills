# Entrance & Exit Patterns

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