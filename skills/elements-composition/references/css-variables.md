# CSS Variables

Dynamic CSS variables for time-based animations.

## Available Variables

All temporal elements expose these CSS variables:

- `--ef-duration` - Total duration (e.g., `"10s"`)
- `--ef-progress` - Current progress as number (0-1)
- `--ef-transition-duration` - Overlap duration for transitions
- `--ef-transition-out-start` - Delay for fade-out animations

## --ef-duration

Element's total duration as a CSS time value.

```html
<ef-video src="video.mp4" class="size-full"></ef-video>

<style>
  ef-video {
    /* Fade out during last 2 seconds */
    animation: 2s fade-out calc(var(--ef-duration) - 2s);
  }
</style>
```

**Use cases:**
- Time animations relative to end of clip
- Calculate delays dynamically
- Avoid hardcoding durations

## --ef-progress

Current progress as a number from 0 to 1 (not a percentage).

**Important:** `--ef-progress` is stored as a number (0-1), not a CSS percentage. Multiply by 100% in calculations.

```html
<ef-timegroup mode="fixed" duration="5s">
  <div class="progress-bar"></div>
</ef-timegroup>

<style>
  .progress-bar {
    /* Width grows from 0% to 100% */
    width: calc(var(--ef-progress) * 100%);
    height: 4px;
    background: blue;
  }
</style>
```

**Use cases:**
- Progress bars
- Scale animations
- Opacity fades
- Position interpolation

### Why Not a Percentage?

CSS percentages resolve to pixel values based on element dimensions. Using a number (0-1) allows it to work correctly in all calculations:

```css
/* Good: Number multiplied by 100% */
width: calc(var(--ef-progress) * 100%);

/* Bad: Would be interpreted as pixels */
width: var(--ef-progress);
```

## --ef-transition-duration

Duration of overlap for transitions (only set when overlap exists).

```html
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip1.mp4"
      style="animation: fade-out var(--ef-transition-duration) var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**Use cases:**
- Match animation duration to overlap
- Dynamic transition timing
- Consistent fade durations

## --ef-transition-out-start

Delay for when fade-out should start (calculated as duration - overlap).

```html
<ef-video 
  src="video.mp4"
  style="animation: 1s fade-out var(--ef-transition-out-start)"
></ef-video>
```

**Use cases:**
- Fade out near end of clip
- Exit animations
- Transition timing

## Examples

### Progress Bar

```html
<ef-timegroup mode="fixed" duration="10s" class="relative">
  <div class="progress-container">
    <div class="progress-fill"></div>
  </div>
</ef-timegroup>

<style>
  .progress-container {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
  }
  
  .progress-fill {
    width: calc(var(--ef-progress) * 100%);
    height: 100%;
    background: #3b82f6;
    transition: width 0.1s linear;
  }
</style>
```

### Scale Animation

```html
<ef-timegroup mode="fixed" duration="3s">
  <div class="scaling-text">Hello World</div>
</ef-timegroup>

<style>
  .scaling-text {
    transform: scale(var(--ef-progress));
    opacity: var(--ef-progress);
  }
</style>
```

### Circular Progress

```html
<ef-timegroup mode="fixed" duration="5s">
  <svg class="circular-progress" viewBox="0 0 100 100">
    <circle class="progress-ring" cx="50" cy="50" r="40"></circle>
  </svg>
</ef-timegroup>

<style>
  .progress-ring {
    fill: none;
    stroke: #3b82f6;
    stroke-width: 8;
    stroke-dasharray: 251.2; /* 2 * PI * 40 */
    stroke-dashoffset: calc(251.2 * (1 - var(--ef-progress)));
    transform: rotate(-90deg);
    transform-origin: center;
  }
</style>
```

### Dynamic Positioning

```html
<ef-timegroup mode="fixed" duration="4s" class="relative w-full h-full">
  <div class="moving-box"></div>
</ef-timegroup>

<style>
  .moving-box {
    position: absolute;
    width: 100px;
    height: 100px;
    background: red;
    /* Move from left (0%) to right (100%) */
    left: calc(var(--ef-progress) * (100% - 100px));
  }
</style>
```

### Fade In and Out

```html
<ef-timegroup mode="fixed" duration="6s">
  <div class="fading-element">Content</div>
</ef-timegroup>

<style>
  .fading-element {
    /* Fade in first half, fade out second half */
    opacity: calc(1 - abs(var(--ef-progress) * 2 - 1));
  }
</style>
```

### Color Interpolation

```html
<ef-timegroup mode="fixed" duration="5s">
  <div class="color-changing">Text</div>
</ef-timegroup>

<style>
  .color-changing {
    /* Interpolate between colors using progress */
    color: rgb(
      calc(255 * var(--ef-progress)),
      calc(128 * (1 - var(--ef-progress))),
      255
    );
  }
</style>
```

### Rotation

```html
<ef-timegroup mode="fixed" duration="3s">
  <div class="rotating-element">↑</div>
</ef-timegroup>

<style>
  .rotating-element {
    /* Rotate 360 degrees over duration */
    transform: rotate(calc(var(--ef-progress) * 360deg));
  }
</style>
```

## Combining Variables

Use multiple variables together:

```html
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip.mp4"
      style="
        animation: 
          2s fade-in 0s,
          var(--ef-transition-duration) fade-out var(--ef-transition-out-start);
      "
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

## Browser Compatibility

CSS variables work in all modern browsers. For rendering, they're evaluated during frame capture.

## Performance

CSS variables are updated on each frame. Keep calculations simple for best performance:

```css
/* Good: Simple calculation */
width: calc(var(--ef-progress) * 100%);

/* Avoid: Complex nested calculations */
width: calc(calc(var(--ef-progress) * 50%) + calc(var(--ef-progress) * 50%));
```

## Tips

1. **Use --ef-progress for interpolation** - Perfect for smooth animations
2. **Multiply by 100% for percentages** - Don't use progress value directly
3. **Match transition durations** - Use `--ef-transition-duration` for consistency
4. **Test in preview** - Verify animations work before rendering
5. **Keep calculations simple** - Better performance and easier debugging

## See Also

- [transitions.md](transitions.md) - Transition examples using CSS variables
- [scripting.md](scripting.md) - JavaScript-based animations
