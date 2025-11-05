import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgVideoCount, OrgVideoMinutes } from "./org";

describe("OrgVideoCount", () => {
  test("displays video count when analytics data exists", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          video_count: 25
        }
      }
    };

    render(<OrgVideoCount record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("25")).toBeDefined();
  });

  test("displays 0 when no analytics data", () => {
    const mockRecord = {
      analytics: null
    };

    render(<OrgVideoCount record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("0")).toBeDefined();
  });

  test("displays 0 when analytics exists but video count is null", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          video_count: null
        }
      }
    };

    render(<OrgVideoCount record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("0")).toBeDefined();
  });
});

describe("OrgVideoMinutes", () => {
  test("displays formatted minutes when analytics data exists", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          total_duration_ms: {
            duration_ms: 1800000 // 30 minutes in milliseconds
          }
        }
      }
    };

    render(<OrgVideoMinutes record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("30.0")).toBeDefined();
  });

  test("displays 0.0 when no analytics data", () => {
    const mockRecord = {
      analytics: null
    };

    render(<OrgVideoMinutes record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("0.0")).toBeDefined();
  });

  test("displays 0.0 when analytics exists but duration is null", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          total_duration_ms: {
            duration_ms: null
          }
        }
      }
    };

    render(<OrgVideoMinutes record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("0.0")).toBeDefined();
  });

  test("handles partial minutes correctly", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          total_duration_ms: {
            duration_ms: 95000 // 1.583 minutes
          }
        }
      }
    };

    render(<OrgVideoMinutes record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("1.6")).toBeDefined();
  });

  test("handles very large durations", () => {
    const mockRecord = {
      analytics: {
        aggregate: {
          total_duration_ms: {
            duration_ms: 7200000 // 120 minutes
          }
        }
      }
    };

    render(<OrgVideoMinutes record={mockRecord} id="test-id" resourceType="orgs" resourceId="test-id" />);
    expect(screen.getByText("120.0")).toBeDefined();
  });
}); 