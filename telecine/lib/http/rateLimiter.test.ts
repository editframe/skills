import { describe, test, expect } from "vitest";
import { authRateLimiter, strictAuthRateLimiter } from "./rateLimiter";

describe("rateLimiter", () => {
  test("authRateLimiter is defined and is a function (Express middleware)", () => {
    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter).toBe("function");
  });

  test("strictAuthRateLimiter is defined and is a function (Express middleware)", () => {
    expect(strictAuthRateLimiter).toBeDefined();
    expect(typeof strictAuthRateLimiter).toBe("function");
  });
});
