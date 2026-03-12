import { describe, test, expect, vi } from "vitest";

vi.mock("@/graphql.client", () => ({
  progressiveQuery: vi.fn(() => ({
    useQuery: () => ({ data: { rows: [] }, loading: false, error: null }),
  })),
}));

vi.mock("@/graphql", () => ({
  graphql: vi.fn(() => ({ definitions: [{ name: { value: "Images" } }] })),
}));

import { ImageFiles } from "./image-files";

describe("ImageFiles buildWhereClause", () => {
  const buildWhereClause = ImageFiles.index.buildWhereClause!;

  test("always filters out ephemeral files", () => {
    const result = buildWhereClause(new URLSearchParams());
    expect(result).toEqual({ expires_at: { _is_null: true } });
  });
});
