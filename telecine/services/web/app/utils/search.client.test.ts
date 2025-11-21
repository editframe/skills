import { describe, test, expect, beforeEach } from "vitest";
import { initializeSearch, search, isSearchInitialized, type SearchDocument } from "./search.client";

// Mock fetch for tests
global.fetch = async (url: string) => {
  if (url === "/api/v1/docs/search") {
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

    return new Response(JSON.stringify(mockDocs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

describe("search.client", () => {
  beforeEach(() => {
    // Reset module state
    const module = require("./search.client");
    module.searchIndex = null;
    module.documents = null;
  });

  test("initializes search index", async () => {
    expect(isSearchInitialized()).toBe(false);
    await initializeSearch();
    expect(isSearchInitialized()).toBe(true);
  });

  test("searches documents by title", async () => {
    await initializeSearch();
    const results = search("Test Document");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Test Document");
  });

  test("searches documents by content", async () => {
    await initializeSearch();
    const results = search("searching");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("searching");
  });

  test("returns empty array for empty query", async () => {
    await initializeSearch();
    const results = search("");
    expect(results).toEqual([]);
  });

  test("returns empty array for whitespace-only query", async () => {
    await initializeSearch();
    const results = search("   ");
    expect(results).toEqual([]);
  });

  test("limits results to top 20", async () => {
    await initializeSearch();
    // Create a query that would match many documents
    const results = search("content");
    expect(results.length).toBeLessThanOrEqual(20);
  });

  test("throws error if search called before initialization", () => {
    expect(() => {
      search("test");
    }).toThrow("Search not initialized");
  });

  test("fuzzy matching works", async () => {
    await initializeSearch();
    // Search with typo
    const results = search("Test Documnt"); // Missing 'e'
    expect(results.length).toBeGreaterThan(0);
  });
});

