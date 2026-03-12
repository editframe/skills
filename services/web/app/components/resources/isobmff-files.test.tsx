import { describe, test, expect, vi } from "vitest";

vi.mock("@/graphql.client", () => ({
  progressiveQuery: vi.fn(() => ({
    useQuery: () => ({ data: { rows: [] }, loading: false, error: null }),
  })),
}));

vi.mock("@/graphql", () => ({
  graphql: vi.fn(() => ({
    definitions: [{ name: { value: "IsobmffFiles" } }],
  })),
}));

vi.mock("@editframe/api", () => ({
  Client: vi.fn(),
  getTranscriptionProgress: vi.fn(),
}));

vi.mock("@editframe/elements", () => ({}));
vi.mock("@editframe/react", () => ({}));
vi.mock("@editframe/assets", () => ({}));

import { ISOBMFFFiles } from "./isobmff-files";

describe("ISOBMFFFiles buildWhereClause", () => {
  const buildWhereClause = ISOBMFFFiles.index.buildWhereClause!;

  test("always filters out ephemeral files", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({ expires_at: { _is_null: true } });
  });

  test("search filter works alongside ephemeral filter", () => {
    const result = buildWhereClause(new URLSearchParams("search=test-file"));
    expect(result).toEqual({
      filename: { _ilike: "%test-file%" },
      expires_at: { _is_null: true },
    });
  });

  test("empty search string is ignored", () => {
    const result = buildWhereClause(new URLSearchParams("search=  "));
    expect(result).toEqual({ expires_at: { _is_null: true } });
  });
});
