---
description: Available Editframe project templates.
metadata:
  author: editframe
  version: 0.45.7
---


# Templates

Available templates when running `npm create @editframe`.

## html

Minimal HTML/CSS/JavaScript starter. Best for web component compositions.

```
my-project/
├── index.html          # Composition markup
├── src/
│   ├── index.js        # Imports Editframe elements
│   ├── styles.css      # Tailwind CSS
│   └── assets/         # Media files
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

**Dependencies:** `@editframe/elements`, `@editframe/cli`, `@editframe/vite-plugin`, `tailwindcss`, `vite`

## react

Minimal React/TypeScript starter. Best for React-based compositions.

```
my-project/
├── index.html
├── src/
│   ├── main.tsx        # Entry point with TimelineRoot
│   ├── Video.tsx       # Composition component
│   ├── styles.css      # Tailwind CSS
│   └── assets/         # Media files
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

**Dependencies:** `@editframe/react`, `@editframe/cli`, `@editframe/vite-plugin`, `react`, `tailwindcss`, `vite`

## Common Structure

All templates include:

- **Vite** build system with `@editframe/vite-plugin`
- **`vite-plugin-singlefile`** inlines all JS and CSS into `dist/index.html` at build time, producing a single self-contained HTML file required by the cloud renderer and `npx editframe cloud-render`
- **Tailwind CSS** for styling
- **`npm start`** runs `editframe preview` for live development
- **`src/assets/`** directory for media files (video, audio, images)
- **`.gitignore`** configured for Node.js projects
