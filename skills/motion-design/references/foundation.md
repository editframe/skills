# Foundation Skills

The three essential skills that guide all motion design decisions.

## Skill 1: Message & Intent Analysis

**What it does:** Translates communication goals into motion strategy

### Core Questions

1. **What's the single core message?** 
   - Extract one primary goal from requirements
   - Everything else is secondary

2. **What should the viewer feel?**
   - Playful, serious, urgent, calm, confident, friendly, professional
   - Emotion directly affects timing and easing choices

3. **Does motion serve communication or decoration?**
   - Communication: Guides attention, reveals structure, shows relationships
   - Decoration: Eye candy that distracts from message
   - **Always choose communication**

4. **What defines success?**
   - What should viewer remember?
   - What should viewer feel?
   - What should viewer do next?

5. **What's the context?**
   - Mobile vs desktop (affects timing and scale)
   - UI component vs explainer vs presentation
   - User-initiated vs automatic
   - First-time vs repeated viewing

### Brand Personality Mapping

**Playful brands:**
- Bounce, elastic easing
- Exaggerated timing
- Unexpected directions

**Professional brands:**
- Subtle, refined motion
- Ease-in-out curves
- 20-30% less exaggeration

**Urgent/Fast brands:**
- Quick timing (200-300ms)
- Sharp easing
- Direct paths

**Calm/Luxurious brands:**
- Slow timing (600-1000ms)
- Smooth easing
- Curved paths

### Output

A clear motion intent statement:

> "This animation should make the user feel confident that their action succeeded, using a quick (400ms) bounce to celebrate without disrupting their workflow."

---

## Skill 2: Attention Choreography

**What it does:** Plans the sequential flow of viewer focus

### The Golden Rule

**ONE FOCUS AT A TIME**

Human attention is a spotlight, not a floodlight. Multiple simultaneous motions = confusion and missed messages.

### Creating Attention Hierarchy

**Primary focus:**
- Largest motion range
- Highest contrast
- First in sequence
- The thing that must be seen

**Secondary focus:**
- Supports primary
- Smaller motion
- Lower contrast
- Comes after primary settles

**Tertiary focus:**
- Background elements
- Ambient motion only
- Never competes with primary/secondary

### Attention Budget

**Information per second:**
- Mobile: 1 concept per 2 seconds
- Desktop: 1 concept per 1.5 seconds  
- Presentation: 1 concept per 3-4 seconds

Pack more = viewer misses content

### Sequencing Rules

```
1. Establish context (background fades in)
   ↓ Wait 200-400ms
2. Introduce main element (hero image scales in)
   ↓ Wait until motion completes + 300ms
3. Add supporting elements (text fades in)
   ↓ Wait until motion completes + 200ms
4. Show actions (buttons fade in)
```

**Never skip the waits.** Attention needs time to shift.

### Staging Scenes

```
Scene 1: Context
- Background
- Container structure
Duration: 400ms + 300ms rest

Scene 2: Focus
- Primary content
- Hero element
Duration: 600ms + 400ms rest

Scene 3: Details
- Supporting text
- Metadata
Duration: 400ms + 200ms rest

Scene 4: Actions
- Buttons
- Next steps
Duration: 300ms + rest until user acts
```

### Hold Times for Comprehension

- Short text (1-5 words): 800ms
- Paragraph: 2-3 seconds
- Complex graphic: 3-4 seconds
- After surprise moment: 1-2 seconds

People need time to process what they see.

### Testing Attention Flow

Ask: "If I blur my vision, what moves?"
- Only one thing? ✅ Good
- Multiple things? ❌ Revise—sequence them

### Output

Timeline document:
```
0ms:     Background fades in (400ms)
400ms:   [REST - viewer sees empty canvas]
700ms:   Hero scales in (600ms, ease-out)
1300ms:  [REST - viewer sees hero]
1700ms:  Title slides in (400ms, ease-out)  
2100ms:  [REST - viewer reads title]
2500ms:  Subtitle fades in (300ms)
2800ms:  [REST - viewer reads subtitle]
3200ms:  CTA button scales in (300ms, bounce)
```

Every element gets dedicated attention time.

---

## Skill 3: Timing Intelligence

**What it does:** Determines duration for every motion based on multiple factors

### Base Duration Selection

**Context-based timing:**

| Context | Base Duration | Reason |
|---------|--------------|---------|
| Mobile UI | 200-300ms | Fast interactions, small screens |
| Desktop UI | 300-500ms | Larger distances, more comfortable pacing |
| Cinematic | 800-1200ms | Storytelling, emphasis, clarity |
| Micro-interaction | 150-250ms | Immediate feedback, subtle |
| Loading/Idle | 1200-1500ms | Comfortable loop timing |

### Distance-Based Adjustment

**The Farther Rule:** Longer distances need more time to feel right.

```javascript
// Example calculation
const baseTime = 300; // ms
const distance = elementMovesInPixels;
const screenSize = windowWidth;

// Distance factor: 0.5-2.0x
const distanceFactor = Math.min(2, Math.max(0.5, distance / (screenSize * 0.3)));
const duration = baseTime * distanceFactor;
```

**Practical examples:**
- 50px movement: 250ms
- 200px movement: 400ms
- 800px movement: 600ms
- Full screen: 800ms+

### Screen Size Compensation

**Same physical distance feels different at different screen densities**

Mobile (375px width):
- 100px move = 26% of screen = feels large = 400ms

Desktop (1920px width):
- 100px move = 5% of screen = feels small = 250ms

**Compensation strategy:**
- Calculate as % of viewport width
- Use that % to adjust timing

### Material/Weight-Based Timing

**Heavy objects move slower:**
- Feather: 2000ms to fall
- Paper: 800ms to fall
- Ball: 400ms to fall
- Stone: 600ms to fall (fast but with weight)
- Steel: 300ms to fall (dense, drops quickly)

**Timing = Mass × Resistance**

Large UI cards: +100-200ms vs small buttons
Dense info blocks: +50-100ms vs text snippets

### Emotional Tone Timing

**Fast (200-300ms):**
- Energetic, playful, urgent
- Tech, gaming, social media
- Youth-oriented brands

**Medium (300-500ms):**
- Balanced, professional
- Business, productivity
- General-purpose UI

**Slow (600-1000ms):**
- Serious, luxurious, calm
- Finance, legal, healthcare
- Premium brands

### Entrance vs Exit vs Within-Screen

**Entrance:** 300-500ms
- Coming from offscreen
- User expects to see it appear
- Needs time to be noticed

**Exit:** 200-300ms  
- Leaving screen
- User already saw it
- Faster feels responsive

**Within-screen:** 400-600ms
- Repositioning visible elements
- Needs smooth, comfortable feel
- Not too fast (jarring) or slow (sluggish)

### Proportional Timing for Related Elements

**Sibling elements should share base timing:**

```
Card 1 animates: 400ms
Card 2 animates: 400ms (same)
Card 3 animates: 400ms (same)

BUT different stagger delays:
Card 1: starts at 0ms
Card 2: starts at 100ms (0 + 100ms stagger)
Card 3: starts at 200ms (0 + 200ms stagger)
```

**Parent-child relationship:**
```
Parent container: 500ms
Child content: 300ms (60% of parent)
Child buttons: 250ms (50% of parent)
```

Children animate faster than parents.

### The 1.5x Rule

When in doubt, related motions should be:
- 1.5x faster for secondary elements
- 1.5x slower for primary emphasis

Primary hero: 600ms
Secondary details: 400ms (600 ÷ 1.5)

### Precision Matters

**Bad timing:**
- 300ms - Generic, safe
- 350ms - Also generic

**Good timing:**
- 320ms - Specific, intentional
- 280ms - Feels different from 300ms
- 450ms - Noticeably more relaxed

Aim for 20-50ms precision in timing choices.

### Testing Timing

1. Start with base duration
2. Watch it 10 times
3. Adjust by ±50ms increments
4. When it feels invisible but noticeable, stop
5. Round to nearest 10ms

### Output

Timing specification for each element:

```
Hero image: 480ms (large distance, emphasis)
Title: 320ms (medium distance, secondary)  
Subtitle: 280ms (short distance, tertiary)
Button: 240ms (small element, action)
Background: 600ms (full screen, foundation)
```

Every duration backed by reasoning.
