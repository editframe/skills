# ef-surface

Mirror/duplicate of another element's canvas output.

## Props

- `target` - ID of element to mirror (e.g., `ef-video`)

## Basic Usage

```html
<ef-video id="main-video" src="video.mp4" class="size-full"></ef-video>
<ef-surface target="main-video" class="absolute top-4 right-4 w-32 h-20 rounded-lg"></ef-surface>
```

## Multiple Mirrors

```html
<ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
  <ef-video id="source" src="video.mp4" class="size-full object-cover"></ef-video>
  
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
