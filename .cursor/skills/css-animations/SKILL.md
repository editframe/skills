---
name: css-animations
description: CSS animation fill-mode requirements for Editframe timeline system. Use when creating CSS animations, debugging flashing/flickering issues, or when user mentions animation problems, fade effects, slide effects, or sequential animations.
---

# CSS Animation Fill-Mode for Editframe

Editframe's timeline system requires explicit `animation-fill-mode` to prevent flashing/flickering. The system pauses animations and manually controls them via `animation.currentTime`, meaning elements exist in the DOM before their animations start.

## Critical Rule

**Always specify fill-mode for CSS animations on Editframe elements.**

Without proper fill-mode, elements will "flash" to their natural state before/after animations.

## Quick Reference

| Animation Type | Fill-Mode | Example |
|---------------|-----------|---------|
| Fade-in | `backwards` or `both` | `animation: fade-in 1s backwards;` |
| Slide-in | `backwards` or `both` | `animation: slide-in 800ms backwards;` |
| Scale-in | `backwards` or `both` | `animation: zoom-in 600ms backwards;` |
| Fade-out | `forwards` or `both` | `animation: fade-out 500ms forwards;` |
| Slide-out | `forwards` or `both` | `animation: slide-out 500ms forwards;` |
| With delay | `backwards` or `both` | `animation: fade-in 1s 500ms backwards;` |
| Combined in/out | `both` | `animation: fade-in 1s backwards, fade-out 500ms forwards;` |

## Required Patterns

### Pattern 1: Delayed Animations → `backwards`

Any animation with a delay MUST use `backwards` or `both`.

```css
/* ❌ WRONG - Element shows natural state during 500ms delay */
animation: fade-in 1s 500ms;

/* ✅ CORRECT - Element shows initial keyframe during delay */
animation: fade-in 1s 500ms backwards;
```

### Pattern 2: Fade-In / Slide-In → `backwards`

Entrance effects MUST use `backwards` or `both`.

```css
/* ❌ WRONG - Element visible before animation starts */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.element {
  animation: fade-in 1s;
}

/* ✅ CORRECT - Element hidden until animation starts */
.element {
  animation: fade-in 1s backwards;
}
```

### Pattern 3: Fade-Out / Slide-Out → `forwards`

Exit effects MUST use `forwards` or `both`.

```css
/* ❌ WRONG - Element becomes visible again after fading out */
@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
.element {
  animation: fade-out 500ms;
}

/* ✅ CORRECT - Element stays hidden after animation */
.element {
  animation: fade-out 500ms forwards;
}
```

### Pattern 4: Sequential/Staggered → `backwards`

Elements in a sequence MUST use `backwards` or `both`.

```html
<!-- ❌ WRONG - Each element flashes during its delay -->
<ef-text style="animation: fade-in 1s 0s">First</ef-text>
<ef-text style="animation: fade-in 1s 500ms">Second</ef-text>
<ef-text style="animation: fade-in 1s 1s">Third</ef-text>

<!-- ✅ CORRECT - Elements hidden until their turn -->
<ef-text style="animation: fade-in 1s 0s backwards">First</ef-text>
<ef-text style="animation: fade-in 1s 500ms backwards">Second</ef-text>
<ef-text style="animation: fade-in 1s 1s backwards">Third</ef-text>
```

### Pattern 5: Combined Effects → `both`

Animations with entrance AND exit effects MUST use `both` or specify separately.

```css
/* ✅ CORRECT - Separate fill-modes */
animation: 
  fade-in 1s backwards,
  fade-out 500ms calc(var(--ef-duration) - 500ms) forwards;

/* ✅ ALSO CORRECT - Single animation with both */
animation: fade-in-out 2s both;
```

## Common Animation Examples

### Fade In
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.element {
  animation: fade-in 1s backwards;
}
```

### Fade Out
```css
@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
.element {
  animation: fade-out 500ms forwards;
}
```

### Slide In Left
```css
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.element {
  animation: slide-in-left 800ms backwards;
}
```

### Slide Out Right
```css
@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
.element {
  animation: slide-out-right 500ms forwards;
}
```

### Zoom In
```css
@keyframes zoom-in {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
.element {
  animation: zoom-in 600ms backwards;
}
```

### Combined Entrance and Exit
```css
.element {
  animation: 
    fade-in 1s backwards,
    fade-out 500ms calc(var(--ef-duration) - 500ms) forwards;
}
```

## Real-World Example

From the card-poetry template:

```html
<ef-timegroup
  mode="contain"
  style="
    animation:
      fadein 1250ms backwards,
      fadeout 500ms calc(var(--ef-duration) - 500ms) forwards;
  "
>
  <h1 style="animation: 1s slide-in-left ease-out backwards">
    9 of Spades
  </h1>
  <ef-image
    src="/assets/card.png"
    style="
      animation-composition: add;
      animation:
        4s rotate 4s,
        1s slide-in-left 0.25s ease-out backwards;
    "
  />
</ef-timegroup>
```

## Development Mode Validation

The system includes automatic validation that warns about:
- Delayed animations without `backwards`/`both`
- Fade-in effects without `backwards`
- Fade-out effects without `forwards`
- Transform animations without proper fill-mode

Check browser console for warnings like:
```
🎬 Editframe Animation Fill-Mode Warning
⚠️  Animation "fade-in" has a 500ms delay but no 'backwards' fill-mode.
   Fix: Add 'backwards' or 'both' to the animation shorthand.
   Example: animation: fade-in 1000ms 500ms backwards;
```

## When in Doubt

Use `both` as the safest default:
```css
animation: my-animation 1s both;
```

## Technical Background

CSS animations have four fill-mode values:
- `none` (default): No styles applied before/after animation
- `forwards`: Final keyframe styles persist after animation
- `backwards`: Initial keyframe styles applied before animation starts
- `both`: Combination of forwards and backwards

Editframe's timeline system requires explicit fill-modes because:
1. Elements are rendered before their timeline position
2. Animations are paused and controlled manually via `animation.currentTime`
3. Without fill-mode, browsers apply natural element styles instead of keyframe styles
4. This causes visible "flashing" as elements jump between natural and animated states

## Implementation Details

The validation system in `updateAnimations.ts`:
- Runs only in development mode (no production overhead)
- Analyzes animation keyframes to detect fade/transform patterns
- Provides actionable warnings with fix examples
- Tracks validated animations to avoid duplicate warnings

## Resources

- [MDN: animation-fill-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode)
- [MDN: CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- Implementation: `elements/packages/elements/src/elements/updateAnimations.ts`
