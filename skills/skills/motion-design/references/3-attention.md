# Attention Flow

## Core Concept

**One Focus at a Time**

Human attention is sequential, not parallel. Motion competes for focus. Never animate unrelated elements simultaneously.

## Quick Reference: Stagger Delays

| Unit | Delay | Use Case |
|------|-------|----------|
| Character | 30-50ms | Text reveals, typing effects |
| Word | 80-120ms | Headline emphasis |
| Line | 200-300ms | Paragraph reveals |
| List item | 50-80ms | Navigation, bullet lists |
| Card | 100-150ms | Grid layouts, galleries |
| Section | 400ms+ | Page sections, major blocks |

## The Attention Rule

**At any given moment, only ONE thing should be moving (or a group moving as a single conceptual unit).**

### Bad (Simultaneous)
```
0ms: Title slides in (500ms)
0ms: Subtitle fades in (500ms)
0ms: Logo animates (500ms)
```
Result: Viewer doesn't know where to look, misses all three.

### Good (Sequential)
```
0ms:   Logo animates (400ms)
200ms: Title slides in (400ms) ← starts before logo finishes
400ms: Subtitle fades in (300ms) ← starts before title finishes
```
Result: Clear attention path, overlapping reduces total time but maintains sequence.

## Stagger: Rhythm Across Elements

**Stagger = delay between identical animations**

Creates rhythm and guides reading order without overwhelming attention.

### Stagger Timing by Granularity

| Unit | Delay | Use Case |
|------|-------|----------|
| Character | 30-50ms | Text reveals, typing effects |
| Word | 80-120ms | Headline emphasis |
| Line | 200-300ms | Paragraph reveals |
| List item | 50-80ms | Navigation, bullet lists |
| Card | 100-150ms | Grid layouts, galleries |
| Section | 400ms+ | Page sections, major blocks |

### Calculating Total Duration

```
Total = (NumItems - 1) × StaggerDelay + ItemDuration

Example: 5 cards, 120ms stagger, 300ms animation
Total = (5-1) × 120 + 300 = 780ms
```

**Keep total under 2 seconds** for UI. Beyond that feels slow.

## Stagger Patterns

### Sequential (Linear)
```
Item 1: 0ms
Item 2: 100ms
Item 3: 200ms
Item 4: 300ms
```
Most common. Reads naturally (top→bottom, left→right).

### Cascading (Accelerating)
```
Item 1: 0ms
Item 2: 80ms   (80ms after previous)
Item 3: 140ms  (60ms after previous)
Item 4: 180ms  (40ms after previous)
```
Builds momentum, energetic feel. Use for dramatic reveals.

### Wave (Center-out)
```
Item 1: 100ms  (center)
Item 2: 50ms   (one step out)
Item 3: 150ms  (one step out)
Item 4: 0ms    (edge)
Item 5: 200ms  (edge)
```
Focuses attention on center first, reveals context. Use when center is most important.

### Decelerating (Slowing)
```
Item 1: 0ms
Item 2: 50ms   (50ms after previous)
Item 3: 120ms  (70ms after previous)
Item 4: 220ms  (100ms after previous)
```
Gentle arrival, emphasizes final items. Use for settling into place.

## Reading Order

**Respect natural reading patterns unless intentionally disrupting:**

### Western Reading (Left → Right, Top → Bottom)
```
Grid animation order:
[1] [2] [3]
[4] [5] [6]
[7] [8] [9]
```

### Alternative Orders

**Diagonal (energetic):**
```
[1] [2] [4]
[3] [5] [7]
[6] [8] [9]
```

**Column-by-column (technical/data):**
```
[1] [4] [7]
[2] [5] [8]
[3] [6] [9]
```

**Center-out (focal emphasis):**
```
[5] [2] [4]
[7] [1] [3]
[9] [6] [8]
```

## Overlapping vs Sequential

### Full Sequential (Clear but Slow)
```
Item 1: 0-300ms
Item 2: 300-600ms    ← starts when Item 1 ends
Item 3: 600-900ms
Total: 900ms
```

### Overlapping (Faster, Still Clear)
```
Item 1: 0-300ms
Item 2: 120-420ms    ← starts at 40% of Item 1
Item 3: 240-540ms
Total: 540ms (40% faster)
```

**Optimal overlap: 30-50%** of item duration.

Too much overlap → feels simultaneous, loses sequence.
No overlap → feels sluggish, artificially delayed.

## Grouping: Treating Multiple as One

**Exception to "one focus" rule:** Elements that form a single conceptual unit can move together.

### Valid Grouping
```
Title card contains:
- Main headline
- Subheadline
- Decorative line

All animate together as one unit.
```

### Invalid Grouping (Should be Separate)
```
Bad: Animating title AND background graphic together
→ These aren't a conceptual unit
→ Should be sequenced (background first, then title)
```

**Test:** Would a viewer naturally perceive these as one element or separate elements?

## Attention Choreography Process

### 1. List All Elements
Identify everything that will move.

### 2. Prioritize by Importance
What must viewer see first, second, third?

### 3. Determine Groups
Which elements are conceptual units?

### 4. Assign Sequence
Create timeline respecting priority.

### 5. Add Stagger Within Groups
Apply appropriate delays for rhythm.

### Example: Explainer Video Opening

**Elements:**
- Brand logo
- Video title
- Subtitle text
- 4 key statistics
- Background graphic

**Priority:**
1. Logo (establishes brand)
2. Title (main message)
3. Subtitle (supports title)
4. Statistics (supporting data)
5. Background (context)

**Timeline at 30fps:**
```
0ms:     Logo animates (600ms / 18 frames)
300ms:   Title slides in (400ms / 12 frames) ← 50% overlap
500ms:   Subtitle fades in (300ms / 9 frames)
700ms:   Stat 1 (300ms / 9 frames)
800ms:   Stat 2 (300ms / 9 frames) ← 100ms stagger
900ms:   Stat 3 (300ms / 9 frames)
1000ms:  Stat 4 (300ms / 9 frames)
1300ms:  Background subtle fade (600ms / 18 frames) ← ambient

Total: 1900ms (~57 frames)
```

## Background Motion Exception

**Ambient/background motion can run during foreground focus:**

```
Foreground: Title animates (400ms) ← PRIMARY FOCUS
Background: Particle drift (continuous) ← ambient, not competing
```

**Requirements for background motion:**
- Much slower than foreground (or continuous loop)
- Very subtle (barely noticeable, 20-30% opacity)
- Clearly secondary (out of focus, low contrast, or peripheral)
- Enhances without distracting
- Never competes with primary narrative elements

## Anti-Patterns

### Simultaneous Unrelated Motion
```
Bad:
- Main title appears
- Background changes
- Lower third animates
All at same time

Fix: Sequence them. Background → wait 200ms → Title → wait 400ms → Lower third
```

### Too Many Staggers
```
Bad: 20 text lines with 200ms stagger = 4000ms (4 seconds!)
Result: Feels sluggish, viewer loses interest

Fix: 
- Reduce stagger to 80ms (1600ms total)
- Or: Group into 3 sets of lines, stagger sets not lines
- Or: Only stagger first 5 lines, remaining fade in together
```

### Ignoring Reading Order
```
Bad: Grid animates right-to-left (against Western reading)
Result: Feels backwards, unnatural

Fix: Animate in reading order unless intentionally surprising
```

### False Grouping
```
Bad: Entire page (50+ elements) animates as one unit
Result: Overwhelming, no guided attention

Fix: Break into logical groups, sequence the groups
```

## Implementation Example

**Text line reveal with stagger (30fps):**

```javascript
// In video composition at 30fps (33ms per frame)
const lines = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
const staggerFrames = 6;  // 6 frames = ~200ms at 30fps
const durationFrames = 9; // 9 frames = ~300ms at 30fps

lines.forEach((line, i) => {
  const startFrame = i * staggerFrames;
  const endFrame = startFrame + durationFrames;
  
  // Create keyframes for this line
  animateLine(line, {
    startFrame: startFrame,
    endFrame: endFrame,
    easing: 'ease-out'
  });
});

// Total duration: (4-1) × 6 + 9 = 27 frames (~900ms at 30fps)
```

## Attention Budget

**Users have limited attention. Spend it wisely.**

**High attention cost:**
- Large motion (200px+ movement)
- Color changes
- Multiple properties animating
- Long duration (800ms+)

**Low attention cost:**
- Small motion (20px movement)
- Opacity only
- Brief duration (200ms)

**Budget rule:** Reserve high-cost motion for primary actions. Use low-cost for secondary.

## Testing Attention Flow

**Watch the animation with these questions:**

1. Where does my eye go at each moment?
2. Is that where I *should* be looking?
3. Do I understand the sequence of importance?
4. Does anything compete for attention?
5. Is the total duration comfortable?

If any answer is no, revise the sequence.
