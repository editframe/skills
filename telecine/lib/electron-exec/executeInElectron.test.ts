import { describe, test, expect, afterAll } from "vitest";

import {
  executeInElectron,
  executeInElectronWithRpc,
} from "./executeInElectron.ts";
import { createRpcClient } from "./RPC.ts";
import { execSync } from "node:child_process";
import { executeSpan } from "@/tracing";
import { logger } from "@/logging/index.ts";
import { testSpan } from "TEST/util/testSpan.ts";

describe("executeInElectron", () => {
  afterAll(() => {
    // Kill all Xvfb processes, which are spawned by the test script
    execSync("pkill -9 'Xvfb'");
  });

  test(
    "executes simple scripts",
    testSpan(async () => {
      const testScript = "/app/lib/electron-exec/test-script/success.ts";
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        await executeSpan(`execution-${i}`, async () => {
          const execution = await executeInElectron(testScript);
          await expect(execution.processExit).resolves.toBe(0);
        });
      }
    }),
    10000,
  );

  test(
    "errors propagate up",
    testSpan(async () => {
      const iterations = 3;
      const testScript = "/app/lib/electron-exec/test-script/error.ts";

      for (let i = 0; i < iterations; i++) {
        await executeSpan(`execution-${i}`, async () => {
          logger.debug(`execution-${i}`);
          const execution = await executeInElectron(testScript);
          await expect(execution.processExit).rejects.toThrow(
            "Electron process exited with code 1",
          );
        });
      }
    }),
  );

  test(
    "an RPC socket is available",
    testSpan(async () => {
      const testScript = "/app/lib/electron-exec/test-script/rpc.ts";
      const execution = await executeInElectronWithRpc(testScript);
      const result = await execution.rpc.call("testCall", {
        arg1: "testArg1",
        arg2: "testArg2",
      });
      expect(result).toMatchObject({
        arg1: "testArg1",
        arg2: "testArg2",
      });

      await execution.rpc.call("terminate");
    }),
  );

  test(
    "RPC keepalive extends timeout for long-running tasks",
    testSpan(async () => {
      const testScript = "/app/lib/electron-exec/test-script/rpc.ts";
      const execution = await executeInElectronWithRpc(testScript);

      for (let i = 0; i < 3; i++) {
        await executeSpan(`execution-${i}`, async () => {
          const result = await execution.rpc.call("longRunningTask", {
            durationMs: 100,
          });

          expect(result).toMatchObject({
            completedAt: expect.any(String),
            duration: expect.any(Number),
          });
        });
      }
      await execution.rpc.call("terminate");
    }),
    10000,
  );
});
