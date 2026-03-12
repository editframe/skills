import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { userEvent } from "@testing-library/user-event";

// Mock the progressive queries before importing the component
vi.mock("@/graphql.client", () => ({
  progressiveQuery: vi.fn(() => ({
    useQuery: () => ({
      data: { rows: [] },
      loading: false,
      error: null,
    }),
  })),
}));

// Mock the graphql function
vi.mock("@/graphql", () => ({
  graphql: vi.fn(() => ({ definitions: [{ name: { value: "AdminOrgs" } }] })),
}));

import { Orgs } from "./orgs";

describe("Admin Orgs Analytics", () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  test("displays date picker with default date", () => {
    const Filter = Orgs.index.TableHeader;
    if (!Filter) throw new Error("TableHeader not found");

    renderWithRouter(<Filter />);

    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInput).toBeDefined();
    expect(screen.getByText("(30 days ending on this date)")).toBeDefined();
  });

  test("buildVariables calculates correct date range", () => {
    const searchParams = new URLSearchParams("end_date=2023-12-25");
    const variables = Orgs.index.buildVariables?.(searchParams) as
      | { start_date: string; end_date: string }
      | undefined;

    expect(variables).toBeDefined();
    expect(variables?.end_date).toContain("2023-12-25");
    expect(variables?.start_date).toContain("2023-11-25"); // 30 days before
  });

  test("buildVariables uses today as default when no date provided", () => {
    const searchParams = new URLSearchParams();
    const variables = Orgs.index.buildVariables?.(searchParams) as
      | { start_date: string; end_date: string }
      | undefined;

    expect(variables).toBeDefined();
    expect(variables?.start_date).toBeDefined();
    expect(variables?.end_date).toBeDefined();

    // Should be approximately today and 30 days ago
    const today = new Date();
    const endDate = new Date(variables?.end_date as string);
    const timeDiff = Math.abs(today.getTime() - endDate.getTime());
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    expect(daysDiff).toBeLessThan(1); // Should be same day
  });

  test("analytics columns are included in table", () => {
    const columns = Orgs.index.columns;

    const videoColumn = columns.find((col) => col.name === "Videos (30d)");
    const minutesColumn = columns.find((col) => col.name === "Minutes (30d)");

    expect(videoColumn).toBeDefined();
    expect(minutesColumn).toBeDefined();
  });

  test("analytics fields are included in detail view", () => {
    const fields = Orgs.detail.fields;

    const videoField = fields.find((field) => field.name === "Videos (30d)");
    const minutesField = fields.find((field) => field.name === "Minutes (30d)");

    expect(videoField).toBeDefined();
    expect(minutesField).toBeDefined();
  });
});

// Test the search input race condition
describe("AdminOrgs Search Input Behavior", () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  test("search input should preserve all characters during rapid typing", async () => {
    const user = userEvent.setup();
    const Filter = Orgs.index.TableHeader;
    if (!Filter) throw new Error("TableHeader not found");

    renderWithRouter(<Filter />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name, website, or primary user...",
    ) as HTMLInputElement;

    // Test rapid typing - this should expose the race condition
    await user.type(searchInput, "Audio");

    // In the current implementation, some characters might be lost
    // This test will initially fail, demonstrating the issue
    expect(searchInput.value).toBe("Audio");
  });

  test("search input handles single character at a time", async () => {
    const user = userEvent.setup();
    const Filter = Orgs.index.TableHeader;
    if (!Filter) throw new Error("TableHeader not found");

    renderWithRouter(<Filter />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name, website, or primary user...",
    ) as HTMLInputElement;

    // Clear any existing value first
    await user.clear(searchInput);

    // Type one character at a time with delays (should work fine)
    await user.type(searchInput, "Test");

    expect(searchInput.value).toBe("Test");
  });

  test("search input preserves value after focus loss and regain", async () => {
    const user = userEvent.setup();
    const Filter = Orgs.index.TableHeader;
    if (!Filter) throw new Error("TableHeader not found");

    renderWithRouter(<Filter />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name, website, or primary user...",
    ) as HTMLInputElement;
    const dateInput = screen.getByDisplayValue(
      /\d{4}-\d{2}-\d{2}/,
    ) as HTMLInputElement;

    // Clear any existing value first
    await user.clear(searchInput);

    // Type in search, lose focus, regain focus
    await user.type(searchInput, "Test");
    await user.click(dateInput);
    await user.click(searchInput);

    expect(searchInput.value).toBe("Test");
  });
});
