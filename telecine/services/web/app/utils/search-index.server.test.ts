import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildSearchIndex, writeSearchIndex, type SearchDocument } from "./search-index.server";

describe("buildSearchIndex", () => {
  let tempDir: string;
  let docsDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `search-index-test-${Date.now()}`);
    docsDir = join(tempDir, "services", "web", "app", "content", "docs");
    await mkdir(docsDir, { recursive: true });
  });

  afterEach(async () => {
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
`
    );

    // Mock the process.cwd() to return tempDir
    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    try {
      const index = await buildSearchIndex();
      expect(index.length).toBeGreaterThan(0);
      const testDoc = index.find((doc) => doc.title === "Test Page");
      expect(testDoc).toBeDefined();
      expect(testDoc?.description).toBe("This is a test page");
      expect(testDoc?.content).toContain("This is the content");
    } finally {
      process.cwd = originalCwd;
    }
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
`
    );

    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    try {
      const index = await buildSearchIndex();
      const doc = index.find((d) => d.title === "Headings Test");
      expect(doc).toBeDefined();
      expect(doc?.headings).toContain("Main Heading");
      expect(doc?.headings).toContain("Subheading");
      expect(doc?.headings).toContain("Sub-subheading");
    } finally {
      process.cwd = originalCwd;
    }
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
`
    );

    const originalCwd = process.cwd;
    process.cwd = () => tempDir;

    try {
      const index = await buildSearchIndex();
      const doc = index.find((d) => d.title === "Introduction");
      expect(doc).toBeDefined();
      expect(doc?.slug).toContain("getting-started");
      expect(doc?.slug).toContain("intro");
    } finally {
      process.cwd = originalCwd;
    }
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

    const outputPath = join(tempDir, "search-index.json");
    await writeSearchIndex(outputPath, documents);

    const { readFile } = await import("node:fs/promises");
    const content = await readFile(outputPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed).toEqual(documents);
  });
});

