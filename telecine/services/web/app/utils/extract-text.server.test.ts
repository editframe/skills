import { describe, test, expect } from "vitest";
import { extractTextFromMDX } from "./extract-text.server";

describe("extractTextFromMDX", () => {
  test("extracts plain text from MDX", () => {
    const mdx = `---
title: Test
---

# Heading

This is paragraph text.
`;

    const result = extractTextFromMDX(mdx);
    expect(result.content).toContain("This is paragraph text");
    expect(result.headings).toContain("Heading");
  });

  test("removes code blocks", () => {
    const mdx = `---
title: Test
---

# Code Example

\`\`\`javascript
const x = 1;
\`\`\`

Text after code.
`;

    const result = extractTextFromMDX(mdx);
    expect(result.content).not.toContain("const x = 1");
    expect(result.content).toContain("Text after code");
  });

  test("extracts multiple headings", () => {
    const mdx = `---
title: Test
---

# First Heading
## Second Heading
### Third Heading

Content.
`;

    const result = extractTextFromMDX(mdx);
    expect(result.headings).toContain("First Heading");
    expect(result.headings).toContain("Second Heading");
    expect(result.headings).toContain("Third Heading");
  });

  test("removes markdown links but keeps link text", () => {
    const mdx = `---
title: Test
---

[Link Text](https://example.com)

More text.
`;

    const result = extractTextFromMDX(mdx);
    expect(result.content).toContain("Link Text");
    expect(result.content).not.toContain("https://example.com");
  });

  test("removes component tags", () => {
    const mdx = `---
title: Test
---

<Component prop="value" />

Text content.
`;

    const result = extractTextFromMDX(mdx);
    expect(result.content).toContain("Text content");
    expect(result.content).not.toContain("<Component");
  });

  test("handles empty content", () => {
    const mdx = `---
title: Test
---
`;

    const result = extractTextFromMDX(mdx);
    expect(result.content).toBeDefined();
    expect(result.headings).toEqual([]);
  });
});

