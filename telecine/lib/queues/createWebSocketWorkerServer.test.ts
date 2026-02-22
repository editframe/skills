import { describe, test, expect, vi } from "vitest";
import { createServer } from "node:http";

vi.mock("@/logging", () => {
  const instance = { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn(), child: vi.fn() };
  instance.child.mockReturnValue(instance);
  return { logger: instance, makeLogger: vi.fn(() => instance) };
});

vi.mock("@/tracing", () => ({
  executeRootSpan: vi.fn((_name: string, fn: (span: any) => any) =>
    fn({ setAttributes: vi.fn(), setAttribute: vi.fn(), recordException: vi.fn() }),
  ),
  executeSpan: vi.fn((_name: string, fn: (span: any) => any) =>
    fn({ setAttributes: vi.fn(), setAttribute: vi.fn() }),
  ),
}));

vi.mock("@/valkey/valkey", () => ({
  valkey: {
    zadd: vi.fn(),
    zremrangebyscore: vi.fn(),
    zrangebyscore: vi.fn(),
    multi: vi.fn(() => ({ zadd: vi.fn(), zremrangebyscore: vi.fn(), exec: vi.fn() })),
  },
}));

import { createWebSocketWorkerServer } from "./createWebSocketWorkerServer";
import { Worker } from "./Worker";
import { Queue } from "./Queue";

const makeWorker = () => {
  const queue = new Queue({
    name: `test-${Math.random()}`,
    storage: {
      zadd: vi.fn(),
      zremrangebyscore: vi.fn(),
    } as any,
  });
  return new Worker({
    queue,
    storage: {} as any,
    execute: vi.fn().mockResolvedValue(undefined),
  });
};

describe("createWebSocketWorkerServer", () => {
  describe("accepts an existing http.Server", () => {
    test("uses the provided server instead of creating a new one", async () => {
      const worker = makeWorker();
      const existingServer = createServer((_req, res) => res.writeHead(404).end());
      await new Promise<void>((resolve) => existingServer.listen(0, resolve));

      const result = createWebSocketWorkerServer(worker, existingServer);

      expect(result.server).toBe(existingServer);

      existingServer.close();
    });

    test("registers WebSocket upgrade handler on the provided server", async () => {
      const worker = makeWorker();
      const existingServer = createServer((_req, res) => res.writeHead(404).end());
      await new Promise<void>((resolve) => existingServer.listen(0, resolve));

      createWebSocketWorkerServer(worker, existingServer);

      expect(existingServer.listeners("upgrade").length).toBeGreaterThan(0);

      existingServer.close();
    });
  });
});
