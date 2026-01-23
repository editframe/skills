# ef-image

Static image element.

## Props

- `src` - URL, path, or data URI
- `duration` - Display duration

## Basic Usage

```html
<ef-image src="photo.jpg" duration="5s" class="size-full object-cover"></ef-image>
```

## Logo/Watermark Overlay

```html
<ef-timegroup mode="fixed" duration="5s">
  <ef-video src="video.mp4" class="size-full"></ef-video>
  <ef-image src="logo.png" duration="5s" class="absolute top-4 right-4 w-16 h-16 opacity-80"></ef-image>
</ef-timegroup>
```

## Image Slideshow

```html
<ef-timegroup mode="sequence">
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full">
    <ef-image src="slide1.jpg" duration="3s" class="size-full object-contain"></ef-image>
  </ef-timegroup>
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full">
    <ef-image src="slide2.jpg" duration="3s" class="size-full object-contain"></ef-image>
  </ef-timegroup>
</ef-timegroup>
```

## Data URI (Inline SVG)

```html
<ef-image
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%233b82f6' width='80' height='80' rx='8'/%3E%3C/svg%3E"
  duration="5s"
  class="absolute top-4 right-4 w-16 h-16">
</ef-image>
```
