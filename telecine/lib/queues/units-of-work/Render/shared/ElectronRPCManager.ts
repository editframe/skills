import { logger } from "@/logging";
import { createElectronRPC, type ElectronRPC } from "../ElectronRPCClient";

// IMPLEMENTATION GUIDELINES:
// Centralized Electron RPC client management with proper concurrency handling
// - Single RPC client per worker process (eliminates race conditions)
// - Promise-based singleton prevents multiple concurrent creation attempts
// - Automatic cleanup and retry handling on failures
// - Centralized lifecycle management

export class ElectronRPCManager {
  private static rpcClient: ElectronRPC | undefined;
  private static rpcPromise: Promise<ElectronRPC> | undefined;

  static isReady(): boolean {
    return ElectronRPCManager.rpcClient !== undefined;
  }

  static async getRPCClient(): Promise<ElectronRPC> {
    if (ElectronRPCManager.rpcClient) {
      return ElectronRPCManager.rpcClient;
    }

    if (!ElectronRPCManager.rpcPromise) {
      const startMs = performance.now();
      ElectronRPCManager.rpcPromise = createElectronRPC();

      try {
        ElectronRPCManager.rpcClient = await ElectronRPCManager.rpcPromise;
        const electronStartMs = Math.round(performance.now() - startMs);
        logger.info({ event: "electronColdStart", electronStartMs }, "Electron RPC client started");
        return ElectronRPCManager.rpcClient;
      } catch (error) {
        logger.error(
          { event: "electronColdStartFailed" },
          "Failed to create Electron RPC client, will retry on next request",
        );
        ElectronRPCManager.rpcPromise = undefined;
        throw error;
      }
    }

    // Another call is already in progress, wait for it
    return await ElectronRPCManager.rpcPromise;
  }

  static async closeRPCClient(): Promise<void> {
    if (ElectronRPCManager.rpcClient) {
      logger.debug("Closing Electron RPC client");
      try {
        await ElectronRPCManager.rpcClient.rpc.call("terminate");
      } catch (error) {
        logger.warn("Error terminating Electron RPC client", error);
      }
      ElectronRPCManager.rpcClient = undefined;
      ElectronRPCManager.rpcPromise = undefined;
    }
  }
}
