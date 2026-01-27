# Image

Display static images in your composition.

## Import

```tsx
import { Image } from "@editframe/react";
```

## Props

- `src` - Image file URL (required)
- `alt` - Alt text for accessibility
- `className` - CSS classes for styling
- All standard img element attributes

## Basic Usage

```tsx
<Image src="/assets/logo.png" alt="Company Logo" />
```

## Full Background

```tsx
<Image 
  src="/assets/background.jpg"
  className="size-full object-cover"
  alt="Background"
/>
```

## Positioned Images

```tsx
<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  <Image 
    src="/assets/background.jpg"
    className="size-full object-cover"
  />
  <Image 
    src="/assets/logo.png"
    className="absolute top-8 right-8 w-32 h-32"
  />
</Timegroup>
```

## Object Fit

```tsx
{/* Cover - fills container, may crop */}
<Image src="/assets/photo.jpg" className="size-full object-cover" />

{/* Contain - fits within container, maintains aspect ratio */}
<Image src="/assets/photo.jpg" className="size-full object-contain" />

{/* Fill - stretches to fill */}
<Image src="/assets/photo.jpg" className="size-full object-fill" />
```

## Sized Images

```tsx
<Image src="/assets/icon.png" className="w-24 h-24" />
<Image src="/assets/banner.png" className="w-full h-32" />
<Image src="/assets/square.png" className="size-64" />
```

## With Effects

```tsx
{/* Blur */}
<Image src="/assets/bg.jpg" className="size-full object-cover blur-lg" />

{/* Opacity */}
<Image src="/assets/overlay.png" className="absolute inset-0 opacity-50" />

{/* Grayscale */}
<Image src="/assets/photo.jpg" className="size-full grayscale" />

{/* Rounded */}
<Image src="/assets/avatar.jpg" className="w-32 h-32 rounded-full" />
```

## Layered Images

```tsx
<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  {/* Background */}
  <Image 
    src="/assets/bg.jpg"
    className="absolute inset-0 object-cover blur-lg opacity-20"
  />
  
  {/* Foreground */}
  <Image 
    src="/assets/main.png"
    className="absolute inset-0 w-1/2 h-1/2 m-auto object-contain"
  />
</Timegroup>
```

## Dynamic Images

```tsx
interface ImageSlide {
  id: string;
  src: string;
  duration: string;
  caption: string;
}

const slides: ImageSlide[] = [
  { id: "1", src: "/assets/slide1.jpg", duration: "3s", caption: "Slide 1" },
  { id: "2", src: "/assets/slide2.jpg", duration: "3s", caption: "Slide 2" },
  { id: "3", src: "/assets/slide3.jpg", duration: "3s", caption: "Slide 3" },
];

<Timegroup workbench mode="sequence" className="w-[1920px] h-[1080px]">
  {slides.map((slide) => (
    <Timegroup 
      key={slide.id}
      mode="fixed" 
      duration={slide.duration}
      className="absolute w-full h-full"
    >
      <Image src={slide.src} className="size-full object-cover" />
      <Text duration={slide.duration} className="absolute bottom-8 left-8 text-white text-3xl">
        {slide.caption}
      </Text>
    </Timegroup>
  ))}
</Timegroup>
```

## Animated Image Transitions

```tsx
import { Image } from "@editframe/react";
import { useTimingInfo } from "@editframe/react";

const FadingImage = ({ src }: { src: string }) => {
  const { ref, percentComplete } = useTimingInfo();
  
  return (
    <Timegroup ref={ref} mode="fixed" duration="3s" className="absolute w-full h-full">
      <Image 
        src={src}
        className="size-full object-cover"
        style={{ opacity: percentComplete }}
      />
    </Timegroup>
  );
};
```
