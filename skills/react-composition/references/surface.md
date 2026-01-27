# Surface

Mirror/reflect another element's content.

## Import

```tsx
import { Surface } from "@editframe/react";
```

## Props

- `for` - ID of the element to mirror (required)
- `className` - CSS classes for styling
- All standard div attributes

## Basic Usage

```tsx
import { Text, Surface } from "@editframe/react";

<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  <Text id="title" duration="5s" className="text-white text-4xl">
    Original Text
  </Text>
  
  <Surface 
    for="title"
    className="absolute top-32 blur-sm opacity-50"
  />
</Timegroup>
```

## Reflection Effect

```tsx
import { Video, Surface } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full bg-black flex items-center justify-center">
  <Video 
    id="main-video"
    src="/assets/clip.mp4"
    className="w-1/2"
  />
  
  {/* Reflection below */}
  <Surface 
    for="main-video"
    className="w-1/2 scale-y-[-1] opacity-30 blur-sm"
    style={{ marginTop: '2rem' }}
  />
</Timegroup>
```

## Multiple Surfaces

```tsx
<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  <Image 
    id="logo"
    src="/assets/logo.png"
    className="absolute top-8 left-8 w-32 h-32"
  />
  
  {/* Blurred background */}
  <Surface 
    for="logo"
    className="absolute inset-0 blur-3xl opacity-20 scale-150"
  />
  
  {/* Shadow effect */}
  <Surface 
    for="logo"
    className="absolute top-10 left-10 w-32 h-32 blur-md opacity-50"
  />
</Timegroup>
```

## Picture-in-Picture Effect

```tsx
import { Video, Surface } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full">
  {/* Main video */}
  <Video 
    id="main"
    src="/assets/main.mp4"
    className="size-full object-cover"
  />
  
  {/* PiP using surface */}
  <Surface 
    for="main"
    className="absolute bottom-4 right-4 w-64 h-36 border-2 border-white rounded shadow-lg"
  />
</Timegroup>
```

## Animated Text Copies

```tsx
import { Text, Surface } from "@editframe/react";

<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full bg-black flex items-center justify-center">
  {/* Original */}
  <Text 
    id="title"
    duration="5s"
    className="text-white text-6xl font-bold z-10"
  >
    IMPACT
  </Text>
  
  {/* Shadow layers */}
  <Surface 
    for="title"
    className="absolute text-red-500 blur-sm"
    style={{ transform: 'translate(-4px, -4px)' }}
  />
  <Surface 
    for="title"
    className="absolute text-blue-500 blur-sm"
    style={{ transform: 'translate(4px, 4px)' }}
  />
</Timegroup>
```

## Background Blur Effect

```tsx
import { Image, Surface } from "@editframe/react";

<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  {/* Blurred background */}
  <Surface 
    for="main-image"
    className="absolute inset-0 blur-2xl opacity-30 scale-110"
  />
  
  {/* Main image */}
  <Image 
    id="main-image"
    src="/assets/photo.jpg"
    className="absolute inset-0 w-2/3 h-2/3 m-auto object-contain z-10"
  />
</Timegroup>
```

## Video Wall Effect

```tsx
import { Video, Surface } from "@editframe/react";

<Timegroup mode="contain" className="absolute w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4">
  <Video 
    id="source"
    src="/assets/video.mp4"
    className="col-span-2 row-span-2 object-cover"
  />
  
  {/* Mirror to other grid cells */}
  <Surface for="source" className="object-cover opacity-60" />
  <Surface for="source" className="object-cover opacity-40 grayscale" />
  <Surface for="source" className="object-cover opacity-60 blur-sm" />
  <Surface for="source" className="object-cover opacity-40" />
  <Surface for="source" className="object-cover opacity-60 hue-rotate-90" />
  <Surface for="source" className="object-cover opacity-40 saturate-0" />
</Timegroup>
```

## Important Notes

- The `for` prop must match the `id` of another element
- Surface elements mirror content in real-time
- Surfaces don't affect performance significantly
- Use transforms and filters for creative effects
