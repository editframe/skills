import { logger } from "@/logging";
import { PlaywrightEngine } from "../PlaywrightEngine";

// IMPLEMENTATION GUIDELINES: Centralize engine lifecycle management
// This eliminates global state and provides consistent cleanup patterns
export class PlaywrightEngineManager {
  private static engine: PlaywrightEngine | undefined;

  static async getOrCreateEngine(): Promise<PlaywrightEngine> {
    if (!PlaywrightEngineManager.engine) {
      logger.debug("Creating new playwright engine");
      PlaywrightEngineManager.engine = await PlaywrightEngine.create();
    }
    return PlaywrightEngineManager.engine;
  }

  static async closeEngine(): Promise<void> {
    if (PlaywrightEngineManager.engine) {
      logger.debug("Closing playwright engine");
      await PlaywrightEngineManager.engine.close();
      PlaywrightEngineManager.engine = undefined;
    }
  }

  static async withEngine<T>(
    operation: (engine: PlaywrightEngine) => Promise<T>,
  ): Promise<T> {
    const engine = await PlaywrightEngineManager.getOrCreateEngine();
    try {
      return await operation(engine);
    } catch (error) {
      logger.error("Error in withEngine operation, closing engine", error);
      await PlaywrightEngineManager.closeEngine();
      throw error;
    }
  }
}
