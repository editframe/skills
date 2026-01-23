# Getting Started

Create a new Editframe Elements project.

## Create Project

```bash
npm create @editframe/elements
```

## Available Templates

- `blank-html` - Minimal HTML/CSS/JS project
- `blank-react` - Minimal React/TypeScript project
- `simple-demo` - HTML demo with sample assets
- `react-demo` - React demo with sample assets

## Quick Start (HTML)

```bash
npm create @editframe/elements -- blank-html -d my-project
cd my-project
npm install
npm start
```

## Quick Start (React)

```bash
npm create @editframe/elements -- blank-react -d my-project
cd my-project
npm install
npm start
```

## Project Structure

```
my-project/
├── index.html          # Main HTML file
├── src/
│   ├── index.js        # (HTML) or main.tsx (React)
│   ├── styles.css      # Tailwind CSS
│   └── assets/         # Media files
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Add Elements

After creating a project, add elements inside the root `ef-timegroup`:

```html
<ef-timegroup workbench mode="sequence" class="w-[1920px] h-[1080px] bg-black">
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="/assets/intro.mp4" class="size-full object-cover"></ef-video>
    <ef-text class="absolute bottom-8 text-white text-2xl">Title</ef-text>
  </ef-timegroup>
</ef-timegroup>
```

## Add Assets

Place media files in `src/assets/`:

```
src/assets/
├── video.mp4
├── music.mp3
├── logo.png
└── captions.json
```

Reference with `/assets/filename`:

```html
<ef-video src="/assets/video.mp4"></ef-video>
<ef-audio src="/assets/music.mp3"></ef-audio>
<ef-image src="/assets/logo.png"></ef-image>
```
