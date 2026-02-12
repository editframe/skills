---
title: Render API
description: Render compositions to video and read custom data during rendering
type: reference
nav:
  parent: "Guides / Advanced Techniques"
  priority: 60
---

# Rendering

Render compositions to MP4 using the Editframe CLI.

## Quick Render

```bash
npx editframe render -o output.mp4
```

See the `editframe-cli` skill for full render command options, cloud rendering, and more.

## Custom Render Data

Pass dynamic data into compositions at render time:

```bash
npx editframe render --data '{"userName":"John","theme":"dark"}' -o video.mp4
```

Read the data in your composition with `getRenderData()`:

```typescript
import { getRenderData } from "@editframe/elements";

interface MyRenderData {
  userName: string;
  theme: "light" | "dark";
}

const data = getRenderData<MyRenderData>();
if (data) {
  console.log(data.userName);  // "John"
  console.log(data.theme);     // "dark"
}
```
