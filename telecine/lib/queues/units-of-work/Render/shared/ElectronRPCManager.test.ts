import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/logging", () => {
  const infoFn = vi.fn();
  const debugFn = vi.fn();
  const errorFn = vi.fn();
  const warnFn = vi.fn();
  const instance = { info: infoFn, debug: debugFn, error: errorFn, warn: warnFn };
  return { logger: instance, makeLogger: vi.fn(() => instance) };
});

vi.mock("../ElectronRPCClient", () => ({
  createElectronRPC: vi.fn(),
}));

import { ElectronRPCManager } from "./ElectronRPCManager";
import * as logging from "@/logging";
import * as electronRPCClient from "../ElectronRPCClient";

const mockLogger = () => (logging as any).logger;
const mockCreateElectronRPC = () => (electronRPCClient.createElectronRPC as ReturnType<typeof vi.fn>);

describe("ElectronRPCManager observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton state between tests
    (ElectronRPCManager as any).rpcClient = undefined;
    (ElectronRPCManager as any).rpcPromise = undefined;
  });

  test("logs electronColdStart with durationMs on first getRPCClient call", async () => {
    const fakeClient = { rpc: { call: vi.fn() } };
    mockCreateElectronRPC().mockResolvedValue(fakeClient);

    await ElectronRPCManager.getRPCClient();

    const coldStartLogs = mockLogger().info.mock.calls.filter(
      ([obj]: [any]) => typeof obj === "object" && obj?.event === "electronColdStart",
    );
    expect(coldStartLogs).toHaveLength(1);
    expect(coldStartLogs[0]![0]).toMatchObject({
      event: "electronColdStart",
      electronStartMs: expect.any(Number),
    });
    expect(coldStartLogs[0]![0].electronStartMs).toBeGreaterThanOrEqual(0);
  });

  test("does not log electronColdStart on warm getRPCClient calls", async () => {
    const fakeClient = { rpc: { call: vi.fn() } };
    mockCreateElectronRPC().mockResolvedValue(fakeClient);

    await ElectronRPCManager.getRPCClient(); // cold
    vi.clearAllMocks();
    await ElectronRPCManager.getRPCClient(); // warm

    const coldStartLogs = mockLogger().info.mock.calls.filter(
      ([obj]: [any]) => typeof obj === "object" && obj?.event === "electronColdStart",
    );
    expect(coldStartLogs).toHaveLength(0);
  });

  test("isReady() returns false before first call and true after", async () => {
    const fakeClient = { rpc: { call: vi.fn() } };
    mockCreateElectronRPC().mockResolvedValue(fakeClient);

    expect(ElectronRPCManager.isReady()).toBe(false);
    await ElectronRPCManager.getRPCClient();
    expect(ElectronRPCManager.isReady()).toBe(true);
  });
});
