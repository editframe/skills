import { describe, test, expect, vi } from "vitest";

vi.mock("@/graphql.client", () => ({
  progressiveQuery: vi.fn(() => ({
    useQuery: () => ({ data: { rows: [] }, loading: false, error: null }),
  })),
}));

vi.mock("@/graphql", () => ({
  graphql: vi.fn(() => ({ definitions: [{ name: { value: "Files" } }] })),
}));

import { Files, VideoFiles, ImageFiles, CaptionFiles } from "./files";

describe("Files buildWhereClause", () => {
  const buildWhereClause = Files.index.buildWhereClause!;

  test("always filters out ephemeral files", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({ expires_at: { _is_null: true } });
  });

  test("combines type + status with ephemeral filter", () => {
    const result = buildWhereClause(
      new URLSearchParams("type=video&status=ready"),
    );
    expect(result).toEqual({
      type: { _eq: "video" },
      status: { _eq: "ready" },
      expires_at: { _is_null: true },
    });
  });
});

describe("VideoFiles buildWhereClause", () => {
  const buildWhereClause = VideoFiles.index.buildWhereClause!;

  test("includes type filter and ephemeral filter", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({
      type: { _eq: "video" },
      expires_at: { _is_null: true },
    });
  });

  test("includes status when provided", () => {
    const result = buildWhereClause(new URLSearchParams("status=ready"));
    expect(result).toEqual({
      type: { _eq: "video" },
      status: { _eq: "ready" },
      expires_at: { _is_null: true },
    });
  });
});

describe("ImageFiles (type view) buildWhereClause", () => {
  const buildWhereClause = ImageFiles.index.buildWhereClause!;

  test("includes type filter and ephemeral filter", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({
      type: { _eq: "image" },
      expires_at: { _is_null: true },
    });
  });
});

describe("CaptionFiles buildWhereClause", () => {
  const buildWhereClause = CaptionFiles.index.buildWhereClause!;

  test("includes type filter and ephemeral filter", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({
      type: { _eq: "caption" },
      expires_at: { _is_null: true },
    });
  });
});
