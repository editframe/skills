import { rm, stat } from "node:fs/promises";
import { join } from "node:path";

export interface ArtifactManagerOptions {
  verbose?: boolean;
  preserveOnError?: boolean;
}

/**
 * Manages test artifacts and cleanup
 */
export class TestArtifactManager {
  private artifacts: Set<string> = new Set();

  constructor(
    private baseDir: string,
    private options: ArtifactManagerOptions = {}
  ) { }

  /**
   * Register an artifact for cleanup
   */
  registerArtifact(path: string): void {
    this.artifacts.add(path);
    if (this.options.verbose) {
      console.log(`Registered artifact: ${path}`);
    }
  }

  /**
   * Register multiple artifacts
   */
  registerArtifacts(paths: string[]): void {
    paths.forEach(path => this.registerArtifact(path));
  }

  /**
   * Create a temporary file path within the base directory
   */
  createTempPath(filename: string): string {
    const path = join(this.baseDir, filename);
    this.registerArtifact(path);
    return path;
  }

  /**
   * Clean up all registered artifacts
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.artifacts).map(async (path) => {
      try {
        const stats = await stat(path);
        if (stats.isDirectory()) {
          await rm(path, { recursive: true, force: true });
        } else {
          await rm(path, { force: true });
        }

        if (this.options.verbose) {
          console.log(`Cleaned up artifact: ${path}`);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`Failed to clean up ${path}:`, error);
        }
      }
    });

    await Promise.all(promises);
    this.artifacts.clear();
  }

  /**
   * Get the base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Get all registered artifacts
   */
  getArtifacts(): string[] {
    return Array.from(this.artifacts);
  }

  /**
   * AsyncDisposable implementation for automatic cleanup
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.cleanup();
  }
} 