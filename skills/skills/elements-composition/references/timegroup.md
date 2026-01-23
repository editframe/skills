# ef-timegroup

Container for sequencing and grouping elements.

## Props

- `mode` - `"fixed"` | `"sequence"` | `"contain"` | `"fit"`
- `duration` - Explicit duration (for fixed mode)
- `workbench` - Enable timeline/hierarchy UI (root only)

## Modes

- `fixed` - Uses `duration` attribute
- `sequence` - Sum of children (sequential playback)
- `contain` - Longest child duration
- `fit` - Inherit from parent

## Root Timegroup

```html
<ef-timegroup mode="sequence" workbench class="relative h-[500px] w-[800px]">
  <!-- scenes here -->
</ef-timegroup>
```

## Scene (Fixed Duration)

```html
<ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
  <ef-video src="clip.mp4" class="size-full object-cover"></ef-video>
  <ef-text class="absolute top-4 left-4 text-white">Overlay</ef-text>
</ef-timegroup>
```

## Nested Sequence

```html
<ef-timegroup mode="sequence">
  <ef-timegroup mode="fixed" duration="3s"><!-- Scene 1 --></ef-timegroup>
  <ef-timegroup mode="fixed" duration="5s"><!-- Scene 2 --></ef-timegroup>
  <ef-timegroup mode="fixed" duration="4s"><!-- Scene 3 --></ef-timegroup>
</ef-timegroup>
```
