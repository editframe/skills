import { executeRootSpan } from "@/tracing";
import type { TestContext } from "vitest";

export const testSpan =
  <T extends TestContext>(fn: (ctx: T) => Promise<void>) =>
  (ctx: T) =>
    executeRootSpan(ctx.task.name, () => fn(ctx));
