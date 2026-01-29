# Transitions

Create smooth transitions between sequence items using overlap and CSS animations.

## Overlap Attribute

Use `overlap` on sequence timegroups to make items overlap in time:

```html
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain"><!-- Scene 1 --></ef-timegroup>
  <ef-timegroup mode="contain"><!-- Scene 2 --></ef-timegroup>
</ef-timegroup>
```

This creates a 1-second overlap where both scenes are visible simultaneously.

## CSS Variables for Transitions

Use these variables to time animations:

- `--ef-duration` - Element's total duration (e.g., `"10s"`)
- `--ef-transition-duration` - Overlap duration for transitions
- `--ef-transition-out-start` - When fade-out should start (near end)

## Crossfade Transition

Fade out first clip while fading in second clip:

```html
<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
</style>

<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip1.mp4" 
      class="size-full"
      style="animation: 1s fade-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip2.mp4" 
      class="size-full"
      style="animation: 1s fade-in 0s"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**How it works:**
1. `overlap="1s"` makes clips overlap by 1 second
2. First clip fades out during last 1 second (`--ef-transition-out-start`)
3. Second clip fades in during first 1 second (`0s` delay)
4. Result: Smooth crossfade

## Slide Transition

Slide second clip in from the right:

```html
<style>
  @keyframes slide-in-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slide-out-left {
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
  }
</style>

<ef-timegroup mode="sequence" overlap="0.5s">
  <ef-timegroup mode="contain" class="absolute w-full h-full">
    <ef-video 
      src="clip1.mp4" 
      class="size-full"
      style="animation: 0.5s slide-out-left var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain" class="absolute w-full h-full">
    <ef-video 
      src="clip2.mp4" 
      class="size-full"
      style="animation: 0.5s slide-in-right 0s"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

## Zoom Transition

Zoom out first clip while zooming in second:

```html
<style>
  @keyframes zoom-in {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  @keyframes zoom-out {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(1.5); opacity: 0; }
  }
</style>

<ef-timegroup mode="sequence" overlap="0.8s">
  <ef-timegroup mode="contain" class="absolute w-full h-full">
    <ef-video 
      src="clip1.mp4" 
      class="size-full object-cover"
      style="animation: 0.8s zoom-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain" class="absolute w-full h-full">
    <ef-video 
      src="clip2.mp4" 
      class="size-full object-cover"
      style="animation: 0.8s zoom-in 0s"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

## Dissolve Transition

Gradual opacity transition with blur:

```html
<style>
  @keyframes dissolve-in {
    from { opacity: 0; filter: blur(10px); }
    to { opacity: 1; filter: blur(0); }
  }
  
  @keyframes dissolve-out {
    from { opacity: 1; filter: blur(0); }
    to { opacity: 0; filter: blur(10px); }
  }
</style>

<ef-timegroup mode="sequence" overlap="1.5s">
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip1.mp4" 
      class="size-full"
      style="animation: 1.5s dissolve-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip2.mp4" 
      class="size-full"
      style="animation: 1.5s dissolve-in 0s"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

## Multiple Clips with Transitions

Chain multiple clips with consistent transitions:

```html
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip1.mp4" 
      class="size-full"
      style="animation: 1s fade-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip2.mp4" 
      class="size-full"
      style="animation: 1s fade-in 0s, 1s fade-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip3.mp4" 
      class="size-full"
      style="animation: 1s fade-in 0s, 1s fade-out var(--ef-transition-out-start)"
    ></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="contain">
    <ef-video 
      src="clip4.mp4" 
      class="size-full"
      style="animation: 1s fade-in 0s"
    ></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**Pattern:**
- First clip: fade-out only
- Middle clips: fade-in and fade-out
- Last clip: fade-in only

## Transition Timing

Match overlap duration to animation duration:

```html
<!-- overlap="1s" matches animation duration of 1s -->
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain">
    <ef-video style="animation: 1s fade-out var(--ef-transition-out-start)"></ef-video>
  </ef-timegroup>
  <ef-timegroup mode="contain">
    <ef-video style="animation: 1s fade-in 0s"></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**Important:** Animation duration should match overlap duration for smooth transitions.

## No Overlap (Cut)

Omit `overlap` for instant cuts between clips:

```html
<ef-timegroup mode="sequence">
  <ef-timegroup mode="contain">
    <ef-video src="clip1.mp4" class="size-full"></ef-video>
  </ef-timegroup>
  <ef-timegroup mode="contain">
    <ef-video src="clip2.mp4" class="size-full"></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

## Tips

1. **Match durations** - Overlap and animation duration should be equal
2. **Use contain mode** - Wrap clips in `mode="contain"` timegroups
3. **Absolute positioning** - Add `class="absolute w-full h-full"` for overlays
4. **Test transitions** - Preview to ensure smooth timing
5. **Combine effects** - Mix opacity, transform, and filter for complex transitions

## See Also

- [css-variables.md](css-variables.md) - CSS variables reference
- [timegroup.md](timegroup.md) - Timegroup modes and sequencing
