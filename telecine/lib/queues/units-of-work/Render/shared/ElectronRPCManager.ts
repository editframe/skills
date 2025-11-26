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

  static async getRPCClient(): Promise<ElectronRPC> {
    if (ElectronRPCManager.rpcClient) {
      return ElectronRPCManager.rpcClient;
    }

    if (!ElectronRPCManager.rpcPromise) {
      logger.debug("Creating new Electron RPC client");
      ElectronRPCManager.rpcPromise = createElectronRPC();

      try {
        ElectronRPCManager.rpcClient = await ElectronRPCManager.rpcPromise;
        return ElectronRPCManager.rpcClient;
      } catch (error) {
        // Reset promise on failure so next call can retry
        logger.error(
          "Failed to create Electron RPC client, will retry on next request",
          error,
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
