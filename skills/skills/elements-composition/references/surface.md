---
title: Surface Element
description: Mirror/duplicate of another element's canvas output
type: reference
topic: surface
order: 80
---

# ef-surface

Mirror/duplicate of another element's canvas output.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| target | string | - | ID of element to mirror (e.g., `ef-video`) |

## Basic Usage

```html
<ef-video id="main-video" src="video.mp4" class="size-full"></ef-video>
<ef-surface target="main-video" class="absolute top-4 right-4 w-32 h-20 rounded-lg"></ef-surface>
```

## Multiple Mirrors

```html live
<ef-timegroup mode="contain" workbench class="w-[720px] h-[480px] bg-black">
  <ef-video id="source" src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-cover"></ef-video>
  
  <!-- Corner thumbnails showing same video -->
  <ef-surface target="source" class="absolute top-4 left-4 w-24 h-16 rounded border border-white/50"></ef-surface>
  <ef-surface target="source" class="absolute top-4 right-4 w-24 h-16 rounded border border-white/50"></ef-surface>
</ef-timegroup>
```

## Use Cases

- Picture-in-picture showing same source
- Video wall / grid layouts
- Thumbnail previews
- Effects processing (apply CSS filters to surface)
