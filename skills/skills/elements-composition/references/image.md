---
title: Image Element
description: Static image element with duration control and CSS positioning
type: reference
nav:
  parent: "Elements / Media"
  priority: 12
  related: ["video", "surface"]
api:
  attributes:
    - name: src
      type: string
      required: true
      description: URL, path, or data URI
    - name: duration
      type: timestring
      description: Display duration
---

# ef-image

Static image element.

## Basic Usage

```html
<ef-image src="photo.jpg" duration="5s" class="size-full object-cover"></ef-image>
```

## Logo/Watermark Overlay

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full"></ef-video>
  <ef-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%233b82f6' width='80' height='80' rx='8'/%3E%3C/svg%3E" duration="5s" class="absolute top-4 right-4 w-16 h-16 opacity-80"></ef-image>
</ef-timegroup>
```

## Image Slideshow

```html live
<ef-timegroup mode="sequence" class="w-[720px] h-[480px] bg-black">
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full">
    <ef-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='480'%3E%3Crect fill='%23ef4444' width='720' height='480'/%3E%3Ctext x='360' y='250' fill='white' font-size='48' text-anchor='middle'%3ESlide 1%3C/text%3E%3C/svg%3E" duration="3s" class="size-full object-contain"></ef-image>
  </ef-timegroup>
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full">
    <ef-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='480'%3E%3Crect fill='%233b82f6' width='720' height='480'/%3E%3Ctext x='360' y='250' fill='white' font-size='48' text-anchor='middle'%3ESlide 2%3C/text%3E%3C/svg%3E" duration="3s" class="size-full object-contain"></ef-image>
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
