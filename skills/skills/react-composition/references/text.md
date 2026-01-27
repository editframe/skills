# Text

Animated text with word-level control.

## Import

```tsx
import { Text, TextSegment } from "@editframe/react";
```

## Props

- `duration` - How long text displays - e.g. `"5s"`, `"1000ms"`
- `className` - CSS classes for styling
- All standard span/div attributes

## Basic Usage

```tsx
<Text duration="5s" className="text-white text-4xl">
  Hello World
</Text>
```

## Styled Text

```tsx
<Text 
  duration="3s" 
  className="text-white text-6xl font-bold text-center"
>
  Welcome to Editframe
</Text>
```

## Positioned Text

```tsx
<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  <Text 
    duration="5s"
    className="absolute top-8 left-8 text-white text-3xl"
  >
    Top Left
  </Text>
  
  <Text 
    duration="5s"
    className="absolute bottom-8 right-8 text-white text-2xl"
  >
    Bottom Right
  </Text>
</Timegroup>
```

## Word Segments

Control individual words with `TextSegment`:

```tsx
<Text duration="3s" className="text-white text-4xl">
  <TextSegment className="text-red-500">Red</TextSegment>
  {" "}
  <TextSegment className="text-blue-500">Blue</TextSegment>
  {" "}
  <TextSegment className="text-green-500">Green</TextSegment>
</Text>
```

## Dynamic Text

```tsx
interface TitleData {
  text: string;
  duration: string;
  className: string;
}

const titles: TitleData[] = [
  { text: "Scene 1", duration: "3s", className: "text-red-500" },
  { text: "Scene 2", duration: "3s", className: "text-blue-500" },
  { text: "Scene 3", duration: "3s", className: "text-green-500" },
];

<Timegroup workbench mode="sequence" className="w-[800px] h-[500px]">
  {titles.map((title, i) => (
    <Timegroup key={i} mode="fixed" duration={title.duration} className="absolute w-full h-full flex items-center justify-center">
      <Text duration={title.duration} className={`text-4xl ${title.className}`}>
        {title.text}
      </Text>
    </Timegroup>
  ))}
</Timegroup>
```

## Text with Background

```tsx
<Text 
  duration="5s"
  className="bg-black/50 text-white text-3xl px-4 py-2 rounded"
>
  Overlay Text
</Text>
```

## Multi-line Text

```tsx
<Text 
  duration="5s"
  className="text-white text-2xl text-center max-w-[600px]"
>
  This is a longer text that will wrap across multiple lines
  when it reaches the maximum width.
</Text>
```

## Animated Text with useTimingInfo

```tsx
import { Text } from "@editframe/react";
import { useTimingInfo } from "@editframe/react";

const FadingText = ({ children }: { children: React.ReactNode }) => {
  const { ref, percentComplete } = useTimingInfo();
  
  return (
    <Text 
      ref={ref}
      duration="5s"
      className="text-white text-4xl"
      style={{ opacity: percentComplete }}
    >
      {children}
    </Text>
  );
};
```
