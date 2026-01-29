# Generating Captions

Generate caption data for `ef-captions` using the Editframe CLI.

## Quick Start

```bash
npx @editframe/cli transcribe video.mp4 -o captions.json
```

This generates a JSON file with word-level timestamps that works with `ef-captions`.

## Installation Requirements

The transcribe command requires `whisper_timestamped` to be installed:

```bash
pip3 install whisper-timestamped
```

Verify installation:

```bash
npx @editframe/cli check
```

## Usage

### Basic Transcription

```bash
npx @editframe/cli transcribe input.mp4
```

Creates `captions.json` in the current directory.

### Custom Output File

```bash
npx @editframe/cli transcribe video.mp4 -o my-captions.json
```

### Different Language

```bash
npx @editframe/cli transcribe video.mp4 -l es -o spanish-captions.json
```

Supported languages: en, es, fr, de, it, pt, nl, and more.

## Automatic Transcription

During development, captions are generated automatically when you reference a video/audio file:

```html
<ef-captions for="my-video">
  <ef-captions-active-word class="text-yellow-300"></ef-captions-active-word>
</ef-captions>

<ef-video id="my-video" src="video.mp4"></ef-video>
```

The dev server detects the video and generates captions on first use.

## Output Format

The CLI generates JSON in the format required by `ef-captions`:

```json
{
  "segments": [
    { "start": 0, "end": 2500, "text": "Hello world" }
  ],
  "word_segments": [
    { "text": "Hello", "start": 0, "end": 800 },
    { "text": "world", "start": 900, "end": 2500 }
  ]
}
```

**Note:** Times are in milliseconds, not seconds.

## Use in Composition

```html
<script type="application/json" id="my-captions">
  <!-- paste captions.json content here -->
</script>

<ef-captions captions-script="my-captions">
  <ef-captions-before-active-word class="text-white/60"></ef-captions-before-active-word>
  <ef-captions-active-word class="text-yellow-300 font-bold"></ef-captions-active-word>
  <ef-captions-after-active-word class="text-white/40"></ef-captions-after-active-word>
</ef-captions>
```

Or load from file:

```html
<ef-captions captions-src="/path/to/captions.json">...</ef-captions>
```
