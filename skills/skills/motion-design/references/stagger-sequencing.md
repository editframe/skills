# Stagger & Sequencing

**What it does:** Creates rhythmic patterns across multiple elements

### The Stagger Principle

**Stagger = delay between identical animations**

Instead of:
- All items appear at once (overwhelming)

Do:
- Each item appears slightly after previous (rhythm)

### Determining Stagger Delays

**Per-character text (30-50ms):**
```css
.char-1 { animation-delay: 0ms; }
.char-2 { animation-delay: 40ms; }
.char-3 { animation-delay: 80ms; }
.char-4 { animation-delay: 120ms; }
.char-5 { animation-delay: 160ms; }
```
**Pattern:** delay = index × 40ms

**Per-word text (80-120ms):**
```
word 1: delay 0ms
word 2: delay 100ms
word 3: delay 200ms
word 4: delay 300ms
```
**Pattern:** delay = index × 100ms

**Per-line text (200-300ms):**
```
line 1: delay 0ms
line 2: delay 250ms
line 3: delay 500ms
```
**Pattern:** delay = index × 250ms

**List items (50ms):**
```css
.item {
  animation: slideIn 300ms ease-out;
}
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
```

**Card groups (100-150ms):**
```
card 1: delay 0ms
card 2: delay 120ms
card 3: delay 240ms
```

**Major sections (400ms+):**
```
section 1: delay 0ms
section 2: delay 500ms
section 3: delay 1000ms
```

### Stagger Patterns

**Sequential (linear):**
```
Item 1: 0ms
Item 2: 100ms
Item 3: 200ms
Item 4: 300ms
```
Most common, reads top-to-bottom or left-to-right

**Cascading (accelerating):**
```
Item 1: 0ms
Item 2: 80ms    (80ms after previous)
Item 3: 140ms   (60ms after previous)
Item 4: 180ms   (40ms after previous)
```
Builds momentum, feels energetic

**Wave (center-out):**
```
Item 1: 100ms   (center)
Item 2: 50ms    (one step out)
Item 3: 150ms   (one step out)
Item 4: 0ms     (edges)
Item 5: 200ms   (edges)
```
Draws attention to center, then reveals context

**Decelerating (slowing):**
```
Item 1: 0ms
Item 2: 50ms    (50ms after previous)
Item 3: 120ms   (70ms after previous)
Item 4: 220ms   (100ms after previous)
```
Gentle arrival, emphasizes final items

### Calculating Total Duration

```javascript
const itemDuration = 300;
const staggerDelay = 80;
const numItems = 5;

// Total time = (numItems - 1) * stagger + duration
const totalDuration = (numItems - 1) * staggerDelay + itemDuration;
// = 4 * 80 + 300 = 620ms
```

Plan for total duration to keep experience snappy.

### No Simultaneous Motion Rule

**Bad:**
```
0ms: Sidebar slides in (500ms)
0ms: Content fades in (500ms)
0ms: Header drops down (500ms)
```
Three things competing for attention = chaos

**Good:**
```
0ms:   Sidebar slides in (400ms)
200ms: Content fades in (400ms)
400ms: Header drops down (300ms)
```
Sequential = clear, intentional

**Exception:** Background/ambient motion can run simultaneously if it's clearly not primary focus

### Increasing vs Decreasing Delays

**Increasing delays (crescendo):**
- Builds tension
- Draws out reveal
- Use for: Important content, emphasis

**Decreasing delays (decrescendo):**
- Releases tension
- Quick finish
- Use for: Wrapping up, de-emphasis

**Consistent delays:**
- Neutral, comfortable
- Use for: Most UI work

### Direction and Reading Order

**Western reading pattern (left → right, top → bottom):**
```
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]
```

**Respect reading order unless intentionally disrupting for effect**

**Grid animation patterns:**
- Row by row (easiest to follow)
- Column by column (less common)
- Diagonal (dynamic, energetic)
- Center-out (focal point emphasis)

### Stagger + Easing Combination

**All items should share:**
- Same duration
- Same easing function
- Same animation properties

**Only difference:**
- Delay/start time

```javascript
// Good - consistent animation, varied delay
items.forEach((item, i) => {
  item.animate({
    opacity: [0, 1],
    transform: ['translateY(20px)', 'translateY(0)']
  }, {
    delay: i * 80,      // ONLY THIS VARIES
    duration: 300,      // Same for all
    easing: 'ease-out'  // Same for all
  });
});
```

### Output

Stagger specification:

```
Element: Navigation items (8 items)
Pattern: Sequential, top to bottom
Base duration: 300ms
Stagger delay: 60ms per item
Total duration: (7 * 60) + 300 = 720ms
Easing: ease-out (shared)
Direction: Reading order (left to right)
```