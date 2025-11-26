import { logger } from "@/logging";
import { ElectronEngine } from "../ElectronEngine";

// IMPLEMENTATION GUIDELINES:
// Persistent Electron processes with on-demand context creation for maximum performance
// - Keep Electron processes alive (40-60x improvement vs spawning)
// - Create contexts on-demand (no pooling - different renders rarely share dimensions/org)
// - Dispose contexts immediately after use (clean memory management)
// - Centralized engine lifecycle management

export class ElectronEngineManager {
  private static engine: ElectronEngine | undefined;

  static async getOrCreateEngine(): Promise<ElectronEngine> {
    if (!ElectronEngineManager.engine) {
      logger.debug("Creating new Electron engine");
      ElectronEngineManager.engine = await ElectronEngine.create();
    }
    return ElectronEngineManager.engine;
  }

  static async closeEngine(): Promise<void> {
    if (ElectronEngineManager.engine) {
      logger.debug("Closing Electron engine");
      await ElectronEngineManager.engine.close();
      ElectronEngineManager.engine = undefined;
    }
  }

  static async withEngine<T>(
    operation: (engine: ElectronEngine) => Promise<T>,
  ): Promise<T> {
    const engine = await ElectronEngineManager.getOrCreateEngine();
    try {
      return await operation(engine);
    } catch (error) {
      logger.error("Error in withEngine operation, closing engine", error);
      await ElectronEngineManager.closeEngine();
      throw error;
    }
  }
}
