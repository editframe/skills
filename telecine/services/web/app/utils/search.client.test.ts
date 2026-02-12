import { describe, test, expect, beforeEach, vi } from "vitest";
import type { SearchDocument } from "./search.client";

const mockDocs: SearchDocument[] = [
  {
    id: "/docs/test",
    title: "Test Document",
    description: "A test document",
    slug: "/docs/test",
    content: "This is test content about searching",
    headings: ["Test Heading"],
    category: "test",
  },
  {
    id: "/docs/example",
    title: "Example Page",
    description: "An example page",
    slug: "/docs/example",
    content: "Example content here",
    headings: ["Example Heading"],
    category: "examples",
  },
];

const mockFetch = vi.fn((url: string) => {
  if (url === "/api/v1/docs/search") {
    return Promise.resolve(
      new Response(JSON.stringify(mockDocs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }
  throw new Error(`Unexpected fetch: ${url}`);
});

describe("search.client", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockClear();
    vi.stubGlobal("fetch", mockFetch);
    const mod = await import("./search.client");
    if (!mod.isSearchInitialized()) {
      await mod.initializeSearch();
    }
  });

  test("initializes search index", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    const mod = await import("./search.client");
    expect(mod.isSearchInitialized()).toBe(false);
    await mod.initializeSearch();
    expect(mod.isSearchInitialized()).toBe(true);
  });

  test("searches documents by title", async () => {
    const { search } = await import("./search.client");
    const results = search("Test Document");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Test Document");
  });

  test("searches documents by content", async () => {
    const { search } = await import("./search.client");
    const results = search("searching");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("searching");
  });

  test("returns empty array for empty query", async () => {
    const { search } = await import("./search.client");
    const results = search("");
    expect(results).toEqual([]);
  });

  test("returns empty array for whitespace-only query", async () => {
    const { search } = await import("./search.client");
    const results = search("   ");
    expect(results).toEqual([]);
  });

  test("limits results to top 20", async () => {
    const { search } = await import("./search.client");
    const results = search("content");
    expect(results.length).toBeLessThanOrEqual(20);
  });

  test("throws error if search called before initialization", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", mockFetch);
    const { search } = await import("./search.client");
    expect(() => {
      search("test");
    }).toThrow("Search not initialized");
  });

  test("fuzzy matching works", async () => {
    const { search } = await import("./search.client");
    const results = search("Test Documnt");
    expect(results.length).toBeGreaterThan(0);
  });
});
