import { executeInElectronWithRpc } from "@/electron-exec/executeInElectron";
import type { ElectronRPCClient } from "./ElectronRPCServer";

const scriptPath = "/app/lib/queues/units-of-work/Render/ElectronRPCServer.ts";

export const createElectronRPC = async () => {
  return executeInElectronWithRpc(scriptPath) as Promise<{
    processExit: Promise<number>;
    rpc: ElectronRPCClient;
  }>;
};

export type ElectronRPC = Awaited<ReturnType<typeof createElectronRPC>>;