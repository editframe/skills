import { expect } from "vitest";

export const getTestPrefix = () =>
  expect.getState().currentTestName ?? "TEST_PREFIX";
