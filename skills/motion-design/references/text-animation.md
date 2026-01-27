# Text Animation

Typography-specific animation principles and techniques.

## Skill 17: Text-Specific Animation

**What it does:** Specialized handling of typography in motion

### Per-Character vs Per-Word vs Per-Line

**Per-character (30-50ms stagger):**
- Attention-grabbing
- Playful, dynamic
- Use for: Headlines, short phrases, emphasis

```javascript
const text = 'HELLO';
text.split('').forEach((char, i) => {
  charElements[i].animate([
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], {
    delay: i * 40,
    duration: 300,
    easing: 'ease-out'
  });
});
```

**Per-word (80-120ms stagger):**
- Readable, natural
- Professional, clear
- Use for: Body text, paragraphs, descriptions

```javascript
const words = 'The quick brown fox jumps'.split(' ');
words.forEach((word, i) => {
  wordElements[i].animate([
    { opacity: 0, transform: 'translateX(-10px)' },
    { opacity: 1, transform: 'translateX(0)' }
  ], {
    delay: i * 100,
    duration: 400,
    easing: 'ease-out'
  });
});
```

**Per-line (200-300ms stagger):**
- Structured, clear hierarchy
- Serious, informative
- Use for: Lists, documentation, formal content

```javascript
lines.forEach((line, i) => {
  line.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    delay: i * 250,
    duration: 500,
    easing: 'ease-out'
  });
});
```

### Stagger Direction

**Reading order (most common):**
- Left to right for Latin scripts
- Top to bottom for vertical text
- Natural, familiar

```javascript
// Animate in reading order
characters.forEach((char, i) => {
  char.animate({ opacity: [0, 1] }, {
    delay: i * 40,  // sequential from first to last
    duration: 300
  });
});
```

**Reverse order:**
- Right to left
- Bottom to top
- Unexpected, draws attention

**Center-out:**
```javascript
// Calculate distance from center
const center = characters.length / 2;
characters.forEach((char, i) => {
  const distance = Math.abs(i - center);
  char.animate({ opacity: [0, 1] }, {
    delay: distance * 40,  // center first, edges last
    duration: 300
  });
});
```

### Text Effects

**Fade + Slide:**
```javascript
word.animate([
  { 
    opacity: 0,
    transform: 'translateY(10px)'
  },
  { 
    opacity: 1,
    transform: 'translateY(0)'
  }
], {
  duration: 400,
  easing: 'ease-out'
});
```

**Scale:**
```javascript
char.animate([
  { 
    opacity: 0,
    transform: 'scale(0.5)'
  },
  { 
    opacity: 1,
    transform: 'scale(1)'
  }
], {
  duration: 300,
  easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
});
```

**Blur:**
```javascript
word.animate([
  { 
    opacity: 0,
    filter: 'blur(10px)'
  },
  { 
    opacity: 1,
    filter: 'blur(0px)'
  }
], {
  duration: 500,
  easing: 'ease-out'
});
```

**Typewriter:**
```javascript
// Reveal characters one by one with cursor
let visibleChars = 0;
const typewriter = setInterval(() => {
  if (visibleChars < text.length) {
    characters[visibleChars].style.opacity = 1;
    visibleChars++;
  } else {
    clearInterval(typewriter);
  }
}, 80);  // 80ms per character
```

### Weight Through Timing

**Light/unimportant = fast:**
```javascript
// Caption, metadata
subtitle.animate({ opacity: [0, 1] }, {
  duration: 250,  // quick
  delay: 0
});
```

**Important = slow:**
```javascript
// Headline, key message
headline.animate({ opacity: [0, 1] }, {
  duration: 600,  // deliberate
  delay: 300      // after subtitle
});
```

### Baseline vs Ascender vs Descender Animations

**Baseline (most common):**
```css
transform-origin: center baseline;
```

**Ascender (top of tall letters):**
```css
transform-origin: center top;
```

**Descender (bottom of hanging letters):**
```css
transform-origin: center bottom;
```

```javascript
// Rotate from baseline (natural)
letter.animate({
  transform: ['rotate(-10deg)', 'rotate(0deg)'],
  transformOrigin: 'center baseline'
}, { duration: 400 });
```

### Kerning During Animation

**Maintain spacing:**

```javascript
// Don't compress letter-spacing during animation
word.animate([
  { 
    transform: 'scaleX(0.5)',
    letterSpacing: '0.2em'  // compensate for compression
  },
  { 
    transform: 'scaleX(1)',
    letterSpacing: 'normal'
  }
], { duration: 300 });
```

### Line Height Adjustments

**Revealing paragraphs:**

```javascript
// Expand line height as text fades in
paragraph.animate([
  { 
    opacity: 0,
    lineHeight: '0'
  },
  { 
    opacity: 1,
    lineHeight: '1.6'
  }
], {
  duration: 500,
  easing: 'ease-out'
});
```

### Text Splitting Utilities

**Split by character:**
```javascript
function splitByCharacter(element) {
  const text = element.textContent;
  element.innerHTML = '';
  return text.split('').map(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.display = 'inline-block';
    element.appendChild(span);
    return span;
  });
}
```

**Split by word:**
```javascript
function splitByWord(element) {
  const text = element.textContent;
  element.innerHTML = '';
  return text.split(' ').map((word, i, arr) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.display = 'inline-block';
    element.appendChild(span);
    
    // Add space except after last word
    if (i < arr.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
    
    return span;
  });
}
```

### Legibility Principles

**Never animate:**
- ❌ Rapidly flashing text (seizure risk)
- ❌ Extreme distortion during movement
- ❌ Colors that fail contrast during transition

**Always maintain:**
- ✅ Sufficient contrast (4.5:1 minimum)
- ✅ Readable font size
- ✅ Clear letterforms (no extreme stretching)

### Performance Considerations

**Text rendering is expensive:**

```javascript
// Good: Transform and opacity only (GPU accelerated)
text.animate({
  opacity: [0, 1],
  transform: ['translateY(20px)', 'translateY(0)']
}, { duration: 300 });

// Avoid: Color changes on many elements
characters.forEach(char => {
  char.animate({ color: ['blue', 'red'] }, { duration: 300 });  // CPU intensive
});
```

**Use `will-change` for complex text animations:**
```css
.animated-text {
  will-change: transform, opacity;
}
```

### Output

Text animation specification:

```
Element: Hero headline ("Welcome to the Future")
Split: Per-word (5 words)
Stagger: 100ms between words
Direction: Reading order (left to right)
Effect: Fade + slide up
Duration: 400ms per word
Transform origin: Center baseline
Total time: (4 * 100) + 400 = 800ms
Easing: ease-out
Weight: Important (longer duration for emphasis)
```
