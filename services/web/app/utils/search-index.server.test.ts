import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SearchDocument } from "./search.client";

describe("buildSearchIndex", () => {
  let tempDir: string;
  let docsDir: string;
  let restoreCwd: () => void;

  beforeEach(async () => {
    vi.resetModules();
    tempDir = join(tmpdir(), `search-index-test-${Date.now()}`);
    docsDir = join(tempDir, "services", "web", "app", "content", "docs");
    await mkdir(docsDir, { recursive: true });
    const originalCwd = process.cwd;
    process.cwd = () => tempDir;
    restoreCwd = () => {
      process.cwd = originalCwd;
    };
  });

  afterEach(async () => {
    restoreCwd();
    await rm(tempDir, { recursive: true, force: true });
  });

  test("indexes MDX files with frontmatter", async () => {
    const testFile = join(docsDir, "test.mdx");
    await writeFile(
      testFile,
      `---
meta:
  - title: Test Page
    name: description
    content: This is a test page
---

# Test Page

This is the content of the test page.
`,
    );

    const { buildSearchIndex } = await import("./search-index.server");
    const result = await buildSearchIndex(false);
    expect(result.documents.length).toBeGreaterThan(0);
    const testDoc = result.documents.find((doc) => doc.title === "Test Page");
    expect(testDoc).toBeDefined();
    expect(testDoc?.description).toBe("This is a test page");
    expect(testDoc?.content).toContain("This is the content");
  });

  test("extracts headings from MDX content", async () => {
    const testFile = join(docsDir, "headings.mdx");
    await writeFile(
      testFile,
      `---
meta:
  - title: Headings Test
---

# Main Heading
## Subheading
### Sub-subheading

Content here.
`,
    );

    const { buildSearchIndex } = await import("./search-index.server");
    const result = await buildSearchIndex(false);
    const doc = result.documents.find((d) => d.title === "Headings Test");
    expect(doc).toBeDefined();
    expect(doc?.headings).toContain("Main Heading");
    expect(doc?.headings).toContain("Subheading");
    expect(doc?.headings).toContain("Sub-subheading");
  });

  test("generates correct slugs for files", async () => {
    const testFile = join(docsDir, "010-getting-started", "010-intro.mdx");
    await mkdir(join(docsDir, "010-getting-started"), { recursive: true });
    await writeFile(
      testFile,
      `---
meta:
  - title: Introduction
---
# Introduction
`,
    );

    const { buildSearchIndex } = await import("./search-index.server");
    const result = await buildSearchIndex(false);
    const doc = result.documents.find((d) => d.title === "Introduction");
    expect(doc).toBeDefined();
    expect(doc?.slug).toContain("getting-started");
    expect(doc?.slug).toContain("intro");
  });
});

describe("writeSearchIndex", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `write-index-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("writes index to JSON file", async () => {
    const { writeSearchIndex } = await import("./search-index.server");
    const documents: SearchDocument[] = [
      {
        id: "/docs/test",
        title: "Test",
        description: "Test description",
        slug: "/docs/test",
        content: "Test content",
        headings: ["Test Heading"],
      },
    ];
    const metadata = null;

    const outputPath = join(tempDir, "search-index.json");
    await writeSearchIndex(outputPath, documents, metadata);

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.documents).toEqual(documents);
    expect(parsed.metadata).toBeNull();
  });
});
