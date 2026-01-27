# Systematic Iteration

## Core Concept

**Broad Strokes → Easing → Secondary → Polish**

Don't perfect details before structure is right. Iterate in phases, each building on the previous.

## The Four Phases

```
Phase 1: Broad Strokes    (40% of time)
    ↓
Phase 2: Easing           (20% of time)
    ↓
Phase 3: Secondary Motion (25% of time)
    ↓
Phase 4: Polish           (15% of time)
```

---

## Phase 1: Broad Strokes (40%)

**Goal: Get the sequence and rhythm right**

### Do
- Basic opacity and position only
- Round timing (200, 300, 500ms)
- Simple stagger (50, 100, 200ms)
- Linear easing (ignore curves for now)
- Test attention flow

### Don't
- Custom easing curves
- Squash & stretch
- Color transitions
- Particle effects
- Precise timing

### Success Criteria
- ✅ Sequence makes sense
- ✅ Attention flows correctly
- ✅ Nothing overlaps wrong
- ✅ Overall rhythm feels approximately right

### Example
```
// Phase 1: Basic structure only
Title card entrance:
  0ms:   opacity: 0, translateY: 40px
  300ms: opacity: 1, translateY: 0
  easing: linear  // ← ignore easing for now

At 30fps: 9 frames
Simple stagger for multiple elements: +100ms each
```

**If broad strokes feel wrong, stop.** Don't proceed to Phase 2. Fix the sequence first.

---

## Phase 2: Easing (20%)

**Goal: Make motion feel natural**

### Do
- Replace linear with appropriate easing
- Fine-tune timing (±50ms adjustments)
- Test at 0.5× and 2× speed
- Round to nearest 10ms when settled

### Easing Selection
- **Entrance:** ease-out (decelerating to rest)
- **Exit:** ease-in (accelerating away)
- **Within-screen:** ease-in-out (smooth start and stop)
- **Never:** linear (except spinners/mechanical)

### Success Criteria
- ✅ Motion feels natural, not robotic
- ✅ No jarring speed changes
- ✅ Comfortable to watch repeatedly
- ✅ Material choice is evident

### Example
```
// Phase 2: Add proper easing
Title card entrance:
  0ms:   opacity: 0, translateY: 40px
  330ms: opacity: 1, translateY: 0  // ← adjusted from 300ms
  easing: ease-out  // ← cubic-bezier(0, 0, 0.2, 1)

At 30fps: 10 frames (frame-aligned)
Stagger refined: +80ms each (was +100ms)
```

---

## Phase 3: Secondary Motion (25%)

**Goal: Add life and personality**

### Do
- Squash & stretch (material-appropriate)
- Anticipation & follow-through
- Scale overshoots (102-105%)
- Background dimming during focus
- Subtle rotation during motion

### Material-Based Deformation

**Playful (rubber) - for fun brands:**
```
Logo bounce entrance:
  0ms:   scale: 0.8
  245ms: scale: 1.08  (70% through animation)
  350ms: scale: 1

At 30fps: ~10 frames
Material: Rubber (energetic overshoot)
```

**Professional (glass) - for corporate:**
```
Title card entrance:
  0ms:   translateY: 40px, scale: 1
  210ms: translateY: 0, scale: 1.02  (70% through)
  300ms: translateY: 0, scale: 1

At 30fps: 9 frames
Material: Glass (subtle overshoot)
```

### Success Criteria
- ✅ Motion has personality
- ✅ Elements feel like they have weight
- ✅ Natural physics evident
- ✅ Not overdone (still serves message)

---

## Phase 4: Polish (15%)

**Goal: Handle edge cases and optimize**

### Do
- Micro-adjustments (±10ms)
- Edge case testing (long text, missing images)
- Performance optimization (will-change)
- Accessibility (prefers-reduced-motion)
- Cross-browser testing

### Edge Cases to Test
- Very long text (does it read in time?)
- Very short text (does timing still work?)
- Different aspect ratios (16:9, 9:16, 1:1)
- Different resolutions (SD, HD, 4K)
- Export format compatibility (H.264, ProRes, WebM)
- Audio sync (if applicable)
- Color space (sRGB, Rec.709, Rec.2020)

### Performance
- Pre-render heavy effects (particles, blur, 3D)
- Use appropriate motion blur (180° shutter for natural look)
- Optimize layer count in compositions
- Ensure smooth playback at target framerate (24/30/60fps)
- Check export file size vs quality tradeoff
- Test on target viewing platform (mobile, TV, cinema)

### Accessibility

For video content intended for diverse audiences:

```
Standard version:
- Full motion with bounces, particles, effects
- Fast-paced stagger patterns

Accessible version (when required):
- Simpler animations (cuts or dissolves)
- Longer durations (easier to follow)
- Reduced flash/strobe effects
- Lower contrast for motion elements
- Maintain core message clarity
```

**Accessibility guidelines:**
- No flashing faster than 3Hz (seizure risk)
- Sufficient contrast for legibility
- Longer read times for critical text
- Alternative static versions available
- Captions/subtitles always available

### Success Criteria
- ✅ Works across all target browsers
- ✅ Performs at 60fps
- ✅ Handles edge cases gracefully
- ✅ Accessible (reduced motion support)
- ✅ Mobile and desktop optimized

---

## Knowing When to Stop

### Animation is Done When
1. ✅ Serves the message clearly
2. ✅ Guides attention intentionally
3. ✅ Feels natural and polished
4. ✅ Performs smoothly (60fps)
5. ✅ Survives 10+ repeated views
6. ✅ Works on target devices
7. ✅ Handles edge cases
8. ✅ Passes accessibility checks

### Animation is Not Done If
- ❌ Tweaking timing by 5ms increments (over-polishing)
- ❌ Adding motion for motion's sake
- ❌ Can't explain why specific values chosen
- ❌ Haven't tested on real devices
- ❌ Feedback says it's distracting

### The 10-View Test

Watch the animation 10 times in a row:
- **Views 1-3:** Notice everything
- **Views 4-6:** Start to see flaws
- **Views 7-10:** Boring vs still pleasant?

**If annoying by view 7, simplify or remove.**

---

## Common Iteration Mistakes

### Mistake 1: Polishing Too Early

```javascript
// Bad: Perfect easing before sequence is right
element.animate([...], {
  duration: 347,  // overly precise
  easing: 'cubic-bezier(0.43, 0.01, 0.22, 0.99)'  // custom curve
});
```

**Sequence is still wrong!** Broad strokes first, always.

### Mistake 2: Not Testing Edge Cases

Only testing:
- Fast computer ✗
- Fast internet ✗
- Perfect data ✗
- Ideal device ✗

**Test worst cases:**
- Slow device
- Slow network
- Missing images
- Very long text
- Rapid interaction

### Mistake 3: Ignoring Feedback Patterns

Multiple people say "too fast" → it's too fast.

Don't defend your choice. Listen to patterns.

### Mistake 4: Over-Engineering

```
// Too complex for a simple title entrance
Title card with:
- 3D rotation on 3 axes
- Color shift through 5 hues
- Particle system
- Light bloom effect
- Depth of field animation
All in 600ms

Viewer gets: overwhelming blur, misses the title text
```

**Simpler is better.** Only add properties that serve the message. Title should be readable above all.

---

## Add vs Remove Decision

### Remove If
- ❌ Distracts from message
- ❌ Slows user progress
- ❌ Boring on 3rd+ view
- ❌ Performance issues
- ❌ Breaks on some devices
- ❌ Violates "one focus at a time"

### Add If
- ✅ Guides attention better
- ✅ Communicates state clearly
- ✅ Adds personality without distraction
- ✅ Makes interaction feel responsive
- ✅ Shows relationships between elements

**Default: Subtract when in doubt.**

---

## Testing at Different Speeds

Good animation works at multiple speeds:

```javascript
// Test at various playback rates
const speeds = [0.5, 1, 1.5, 2];

speeds.forEach(speed => {
  element.animate([...keyframes], {
    duration: baseDuration / speed,
    easing: easing
  });
});
```

**Quality test:**
- **0.5×:** Still feels intentional?
- **1×:** Perfect?
- **2×:** Doesn't break logic?

If it breaks at any speed, timing relationships are wrong.

---

## Getting Feedback at Right Stage

### After Phase 1 (Broad Strokes):
**Ask:** "Does the sequence make sense?"

Don't ask about easing or polish yet. Just sequence.

### After Phase 2 (Easing):
**Ask:** "Does the motion feel natural?"

Now curves matter. But don't ask about details yet.

### After Phase 3 (Secondary):
**Ask:** "Does it have personality?"

Deformation and weight should be evident.

### After Phase 4 (Polish):
**Ask:** "Are there any issues or edge cases?"

Now details matter.

**Don't ask for polish feedback when sequence is wrong!**

---

## Workflow Checklist

```
□ Phase 1: Broad Strokes (40%)
  □ Basic motion working
  □ Sequence is right
  □ Linear easing OK
  □ Round timing values
  
□ Phase 2: Easing (20%)
  □ Natural movement
  □ Correct curves applied
  □ Fine-tuned timing (±50ms)
  □ Material choice evident
  
□ Phase 3: Secondary Motion (25%)
  □ Squash & stretch added
  □ Anticipation on actions
  □ Follow-through on heavy elements
  □ Supporting animations
  
□ Phase 4: Polish (15%)
  □ Edge cases tested
  □ Performance optimized
  □ Accessibility implemented
  □ Cross-browser verified
  □ 10-view test passed
  
□ Done
  □ Serves message clearly
  □ Guides attention
  □ Performs at 60fps
  □ Works on all targets
```

---

## Time Investment Guide

For a typical UI animation project:

**Total time: 8 hours**
- Broad strokes: 3.2 hours (40%)
- Easing: 1.6 hours (20%)
- Secondary: 2 hours (25%)
- Polish: 1.2 hours (15%)

**If you find yourself:**
- Spending 50% on polish → too early, go back to broad strokes
- Spending 10% on broad strokes → rushing, will require rework
- Skipping phases → recipe for weak foundation

Respect the phase distribution. It's optimized for quality with minimum rework.
