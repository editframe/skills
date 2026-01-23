# ef-captions

Synchronized captions with word highlighting.

## Props

- `target` - Selector for `ef-video` or `ef-audio` element
- `captions-script` - ID of `<script>` element with JSON captions
- `captions-src` - URL to JSON captions file
- `captions-data` - Direct captions data object

## Basic Usage

```html
<ef-video id="my-video" src="video.mp4" class="size-full"></ef-video>

<ef-captions captions-script="captions-data" class="absolute bottom-8 left-4 right-4 text-center">
  <ef-captions-before-active-word class="text-white/60 text-xl"></ef-captions-before-active-word>
  <ef-captions-active-word class="text-yellow-300 text-xl font-bold"></ef-captions-active-word>
  <ef-captions-after-active-word class="text-white/40 text-xl"></ef-captions-after-active-word>
</ef-captions>

<script type="application/json" id="captions-data">
{
  "segments": [
    { "start": 0, "end": 3, "text": "Welcome to the demo." },
    { "start": 3, "end": 6, "text": "This shows captions." }
  ],
  "word_segments": [
    { "start": 0, "end": 0.5, "text": "Welcome" },
    { "start": 0.5, "end": 0.7, "text": "to" },
    { "start": 0.7, "end": 0.9, "text": "the" },
    { "start": 0.9, "end": 1.4, "text": "demo." },
    { "start": 3.0, "end": 3.4, "text": "This" },
    { "start": 3.4, "end": 3.8, "text": "shows" },
    { "start": 3.8, "end": 4.5, "text": "captions." }
  ]
}
</script>
```

## Caption Data Format

```json
{
  "segments": [
    { "start": 0, "end": 3, "text": "Sentence one." }
  ],
  "word_segments": [
    { "start": 0, "end": 0.5, "text": "Sentence" },
    { "start": 0.5, "end": 1.0, "text": "one." }
  ]
}
```

Times are in seconds relative to the parent timegroup.
